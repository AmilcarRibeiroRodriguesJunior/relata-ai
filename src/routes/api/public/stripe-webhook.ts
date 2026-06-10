import { createFileRoute } from "@tanstack/react-router";
import Stripe from "stripe";

export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secretKey = process.env.STRIPE_SECRET_KEY;
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

        if (!secretKey || !webhookSecret) {
          return new Response("Stripe not configured", { status: 500 });
        }

        const signature = request.headers.get("stripe-signature");
        if (!signature) {
          return new Response("Missing signature", { status: 400 });
        }

        const rawBody = await request.text();
        const stripe = new Stripe(secretKey);

        let event: Stripe.Event;
        try {
          event = await stripe.webhooks.constructEventAsync(
            rawBody,
            signature,
            webhookSecret,
          );
        } catch (err) {
          console.error("[stripe-webhook] signature verification failed", err);
          return new Response("Invalid signature", { status: 401 });
        }

        try {
          const { supabaseAdmin } = await import(
            "@/integrations/supabase/client.server"
          );

          const upgradeUser = async (userId: string) => {
            const { error } = await supabaseAdmin
              .from("profiles")
              .update({ plan: "pro" })
              .eq("id", userId);
            if (error) console.error("[stripe-webhook] upgrade failed", error);
          };

          const downgradeUser = async (userId: string) => {
            const { error } = await supabaseAdmin
              .from("profiles")
              .update({ plan: "free" })
              .eq("id", userId);
            if (error) console.error("[stripe-webhook] downgrade failed", error);
          };

          const findUserIdFromCustomer = async (customerId: string) => {
            const customer = await stripe.customers.retrieve(customerId);
            if (customer.deleted) return null;
            const ref = (customer as Stripe.Customer).metadata?.user_id;
            return ref ?? null;
          };

          switch (event.type) {
            case "checkout.session.completed": {
              const session = event.data.object as Stripe.Checkout.Session;
              const userId = session.client_reference_id;
              if (userId) {
                await upgradeUser(userId);
                // Persist mapping on the customer for future events
                if (session.customer && typeof session.customer === "string") {
                  await stripe.customers.update(session.customer, {
                    metadata: { user_id: userId },
                  });
                }
              }
              break;
            }
            case "invoice.paid":
            case "customer.subscription.created":
            case "customer.subscription.updated": {
              const obj = event.data.object as
                | Stripe.Invoice
                | Stripe.Subscription;
              const customerId =
                typeof obj.customer === "string" ? obj.customer : obj.customer?.id;
              if (customerId) {
                const userId = await findUserIdFromCustomer(customerId);
                if (userId) await upgradeUser(userId);
              }
              break;
            }
            case "customer.subscription.deleted":
            case "invoice.payment_failed": {
              const obj = event.data.object as
                | Stripe.Invoice
                | Stripe.Subscription;
              const customerId =
                typeof obj.customer === "string" ? obj.customer : obj.customer?.id;
              if (customerId) {
                const userId = await findUserIdFromCustomer(customerId);
                if (userId) await downgradeUser(userId);
              }
              break;
            }
            default:
              break;
          }
        } catch (err) {
          console.error("[stripe-webhook] handler error", err);
          return new Response("Handler error", { status: 500 });
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
