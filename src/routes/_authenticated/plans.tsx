import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// 🔗 Cole aqui o seu Payment Link da Stripe (Dashboard → Payment Links → Create)
const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/6oUbJ11ui3Ey6VQ3I90Fi01";

export const Route = createFileRoute("/_authenticated/plans")({
  component: Plans,
});

function Plans() {
  const { user } = Route.useRouteContext();
  const { data: profile } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()).data,
  });
  const plan = profile?.plan ?? "free";

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold">Escolha seu plano</h1>
        <p className="text-muted-foreground mt-2">Comece grátis e evolua quando precisar.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-8">
          <div className="text-sm font-medium text-muted-foreground">Free</div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-5xl font-bold">R$0</span>
            <span className="text-muted-foreground text-sm">/mês</span>
          </div>
          <ul className="mt-6 space-y-3 text-sm">
            {["3 uploads gratuitos", "Resumo executivo", "Exportação PDF básica"].map((f) => (
              <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-success" />{f}</li>
            ))}
          </ul>
          <Button variant="outline" className="w-full mt-8" disabled={plan === "free"}>
            {plan === "free" ? "Plano atual" : "Plano Free"}
          </Button>
        </Card>

        <Card className="p-8 border-primary/40 shadow-glow bg-gradient-to-b from-primary/5 to-transparent relative">
          <div className="absolute -top-3 left-8 px-3 py-1 bg-gradient-primary text-primary-foreground text-xs font-medium rounded-full">
            Mais popular
          </div>
          <div className="text-sm font-medium text-primary">Pro</div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-5xl font-bold">R$12,90</span>
            <span className="text-muted-foreground text-sm">/mês</span>
          </div>
          <ul className="mt-6 space-y-3 text-sm">
            {["Uploads ilimitados", "Histórico completo", "Relatórios avançados", "Gráficos detalhados", "Insights premium", "Exportação avançada"].map((f) => (
              <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" />{f}</li>
            ))}
          </ul>
          <Button
            className="w-full mt-8 bg-gradient-primary shadow-elegant"
            disabled={plan === "pro"}
            onClick={() => {
              if (!STRIPE_PAYMENT_LINK || STRIPE_PAYMENT_LINK.includes("XXXX")) {
                toast.error("Configure o link da Stripe em src/routes/_authenticated/plans.tsx");
                return;
              }
              window.location.href = `${STRIPE_PAYMENT_LINK}?client_reference_id=${user.id}&prefilled_email=${encodeURIComponent(user.email ?? "")}`;
            }}
          >
            {plan === "pro" ? "Plano atual" : "Assinar Pro"}
          </Button>
        </Card>
      </div>
    </div>
  );
}
