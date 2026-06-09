import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, TrendingUp, Sparkles, ArrowRight, Eye, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ReportView } from "@/components/report-view";
import type { ReportData } from "@/lib/report-analyzer";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

const FREE_LIFETIME_LIMIT = 3;

function Dashboard() {
  const { user } = Route.useRouteContext();
  const [selected, setSelected] = useState<{
    id: string;
    file_name: string;
    created_at: string;
    data: ReportData | null;
  } | null>(null);

  const { data: profile } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      return data;
    },
  });

  const { data: reports = [] } = useQuery({
    queryKey: ["reports", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("reports").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5);
      return data ?? [];
    },
  });

  const plan = profile?.plan ?? "free";
  const used = profile?.uploads_used ?? 0;
  const remaining = plan === "pro" ? Infinity : Math.max(0, FREE_LIFETIME_LIMIT - used);
  const limitReached = plan === "free" && remaining === 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 px-1">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold truncate">Olá, {profile?.name ?? "bem-vindo"} 👋</h1>
          <p className="text-sm text-muted-foreground mt-1">Aqui está um resumo da sua conta RelataAI.</p>
        </div>
        <Badge
          variant={plan === "pro" ? "default" : "secondary"}
          className={`self-start sm:self-auto text-xs px-3 py-1 ${plan === "pro" ? "bg-gradient-primary" : ""}`}
        >
          {plan === "pro" ? (<><Crown className="h-3 w-3 mr-1" /> Plano Pro</>) : "Plano Gratuito"}
        </Badge>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Uploads restantes</span>
            <Upload className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-3 text-3xl font-bold">
            {plan === "pro" ? "∞" : `${remaining}/${FREE_LIFETIME_LIMIT}`}
          </div>
          {plan === "free" && (
            <>
              <Progress value={(used / FREE_LIFETIME_LIMIT) * 100} className="mt-3 h-1.5" />
              <span className="text-xs text-muted-foreground mt-2 inline-block">
                {remaining > 0
                  ? `${remaining} de ${FREE_LIFETIME_LIMIT} uploads gratuitos restantes`
                  : "Limite gratuito atingido"}
              </span>
            </>
          )}
        </Card>
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Relatórios gerados</span>
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-3 text-3xl font-bold">{used}</div>
          <span className="text-xs text-muted-foreground">no total</span>
        </Card>
        <Card className="p-5 sm:p-6 bg-gradient-to-br from-primary/10 to-transparent border-primary/30 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Plano atual</span>
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <Badge variant={plan === "pro" ? "default" : "secondary"} className={plan === "pro" ? "bg-gradient-primary" : ""}>
              {plan === "pro" ? "Pro" : "Free"}
            </Badge>
            {plan === "pro" && <span className="text-xs text-muted-foreground">R$ 12,90/mês</span>}
          </div>
          {plan !== "pro" && (
            <Link to="/plans" className="text-xs text-primary mt-3 inline-flex items-center gap-1 hover:underline">
              Fazer upgrade <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </Card>
      </div>

      {limitReached && (
        <Card className="p-5 sm:p-6 border-primary/40 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="h-10 w-10 rounded-lg bg-gradient-primary flex items-center justify-center shrink-0">
                <Crown className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold">Você atingiu seu limite gratuito</div>
                <div className="text-sm text-muted-foreground">
                  Assine o RelataAI Pro por R$12,90/mês para uploads ilimitados e insights premium.
                </div>
              </div>
            </div>
            <Link to="/plans" className="shrink-0">
              <Button className="bg-gradient-primary shadow-elegant w-full md:w-auto">Assinar Pro</Button>
            </Link>
          </div>
        </Card>
      )}

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg sm:text-xl font-semibold">Relatórios recentes</h2>
        <Link to="/upload">
          <Button className="bg-gradient-primary shadow-elegant" size="sm">
            <Upload className="h-4 w-4 mr-2" /> Novo upload
          </Button>
        </Link>
      </div>

      {reports.length === 0 ? (
        <Card className="p-8 sm:p-12 text-center border-dashed">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <h3 className="font-semibold text-lg">Nenhum relatório ainda</h3>
          <p className="text-sm text-muted-foreground mt-1">Faça seu primeiro upload para gerar um relatório executivo.</p>
          <Link to="/upload" className="inline-block mt-6">
            <Button className="bg-gradient-primary shadow-elegant">Gerar meu primeiro relatório</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-2">
          {reports.map((r: any) => (
            <Card key={r.id} className="p-3 sm:p-4 flex items-center justify-between gap-2 hover:border-primary/40 transition-colors">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium truncate text-sm sm:text-base">{r.file_name}</div>
                  <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("pt-BR")}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={r.status === "ready" ? "default" : "secondary"} className="hidden sm:inline-flex">
                  {r.status === "ready" ? "Pronto" : r.status === "processing" ? "Processando" : r.status === "failed" ? "Falhou" : r.status}
                </Badge>
                {r.status === "ready" && (
                  <Button size="sm" variant="outline" onClick={() => setSelected(r)}>
                    <Eye className="h-3 w-3 sm:mr-1" /> <span className="hidden sm:inline">Ver relatório</span>
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="truncate">{selected?.file_name}</DialogTitle>
            <DialogDescription>
              Gerado em {selected && new Date(selected.created_at).toLocaleString("pt-BR")}
            </DialogDescription>
          </DialogHeader>
          {selected?.data ? (
            <ReportView data={selected.data} fileName={selected.file_name} plan={plan as "free" | "pro"} />
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {(selected as any)?.summary ?? "Sem resumo disponível."}
              </p>
              <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                Este relatório foi gerado antes do novo motor de análise. Reenvie o arquivo para ver KPIs, gráficos e insights.
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
