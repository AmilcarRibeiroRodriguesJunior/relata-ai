import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, Eye, Crown, Sparkles } from "lucide-react";
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
  const [selected, setSelected] = useState<any>(null);

  const { data: profile } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()).data,
  });

  const { data: reports = [] } = useQuery({
    queryKey: ["reports", user.id],
    queryFn: async () => (await supabase.from("reports").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5)).data ?? [],
  });

  const plan = (profile?.plan ?? "free") as "free" | "pro";
  const used = profile?.uploads_used ?? 0;
  const remaining = plan === "pro" ? Infinity : Math.max(0, FREE_LIFETIME_LIMIT - used);
  const limitReached = plan === "free" && remaining === 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-1">
      {/* Header simples */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold truncate">Olá, {profile?.name ?? "bem-vindo"} 👋</h1>
          <p className="text-sm text-muted-foreground">O que vamos analisar hoje?</p>
        </div>
        <Badge variant={plan === "pro" ? "default" : "secondary"} className={plan === "pro" ? "bg-gradient-primary shrink-0" : "shrink-0"}>
          {plan === "pro" ? (<><Crown className="h-3 w-3 mr-1" /> Pro</>) : "Gratuito"}
        </Badge>
      </div>

      {/* Card principal: upload + status */}
      <Card className="p-6 sm:p-8 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-semibold">
              {limitReached ? "Você atingiu o limite gratuito" : "Gere um novo relatório"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {plan === "pro"
                ? "Uploads ilimitados. Envie planilhas, CSVs ou PDFs."
                : limitReached
                  ? "Assine o Pro por R$12,90/mês para uploads ilimitados."
                  : `Você tem ${remaining} de ${FREE_LIFETIME_LIMIT} uploads gratuitos restantes.`}
            </p>
            {plan === "free" && (
              <Progress value={(used / FREE_LIFETIME_LIMIT) * 100} className="mt-4 h-1.5 max-w-xs" />
            )}
          </div>
          <Link to={limitReached ? "/plans" : "/upload"} className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto bg-gradient-primary shadow-elegant">
              {limitReached ? (<><Crown className="h-4 w-4 mr-2" /> Assinar Pro</>) : (<><Upload className="h-4 w-4 mr-2" /> Novo upload</>)}
            </Button>
          </Link>
        </div>
      </Card>

      {/* Relatórios recentes */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base sm:text-lg font-semibold">Relatórios recentes</h2>
          {reports.length > 0 && (
            <Link to="/reports" className="text-sm text-primary hover:underline">Ver todos</Link>
          )}
        </div>

        {reports.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">Nenhum relatório ainda. Envie seu primeiro arquivo acima.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {reports.map((r: any) => (
              <Card key={r.id} className="p-3 sm:p-4 flex items-center justify-between gap-2 hover:border-primary/40 transition-colors">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate text-sm">{r.file_name}</div>
                    <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("pt-BR")}</div>
                  </div>
                </div>
                {r.status === "ready" && (
                  <Button size="sm" variant="outline" onClick={() => setSelected(r)} className="shrink-0">
                    <Eye className="h-3 w-3 sm:mr-1" /> <span className="hidden sm:inline">Ver</span>
                  </Button>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="truncate">{selected?.file_name}</DialogTitle>
            <DialogDescription>
              Gerado em {selected && new Date(selected.created_at).toLocaleString("pt-BR")}
            </DialogDescription>
          </DialogHeader>
          {selected?.data ? (
            <ReportView data={selected.data as ReportData} fileName={selected.file_name} plan={plan} />
          ) : (
            <p className="text-sm text-muted-foreground">Reenvie o arquivo para ver o relatório completo.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
