import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Upload, FileText, Eye, Crown, Sparkles, BarChart3, Clock,
  Zap, CalendarDays,
} from "lucide-react";
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
// Minutos economizados estimados por relatório gerado
const MINUTES_SAVED_PER_REPORT = 45;

function StatCard({
  icon: Icon, label, value, hint, accent = "primary",
}: { icon: any; label: string; value: React.ReactNode; hint?: string; accent?: "primary" | "success" | "warning" }) {
  const ring =
    accent === "success" ? "bg-emerald-500/10 text-emerald-600" :
    accent === "warning" ? "bg-amber-500/10 text-amber-600" :
    "bg-primary/10 text-primary";
  return (
    <Card className="p-4 sm:p-5 hover:shadow-elegant transition-all animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
          <div className="mt-2 text-2xl font-bold truncate">{value}</div>
          {hint && <div className="text-xs text-muted-foreground mt-1 truncate">{hint}</div>}
        </div>
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${ring}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

function Dashboard() {
  const { user } = Route.useRouteContext();
  const [selected, setSelected] = useState<any>(null);

  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()).data,
  });

  const { data: reports = [], isLoading: loadingReports } = useQuery({
    queryKey: ["reports", user.id],
    queryFn: async () => (await supabase.from("reports").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5)).data ?? [],
  });

  const { data: totalReports = 0 } = useQuery({
    queryKey: ["reports-count", user.id],
    queryFn: async () => {
      const { count } = await supabase.from("reports").select("*", { count: "exact", head: true }).eq("user_id", user.id);
      return count ?? 0;
    },
  });

  const plan = (profile?.plan ?? "free") as "free" | "pro";
  const used = profile?.uploads_used ?? 0;
  const remaining = plan === "pro" ? Infinity : Math.max(0, FREE_LIFETIME_LIMIT - used);
  const limitReached = plan === "free" && remaining === 0;

  const minutesSaved = totalReports * MINUTES_SAVED_PER_REPORT;
  const hoursSaved = Math.floor(minutesSaved / 60);
  const savedLabel = hoursSaved >= 1 ? `${hoursSaved}h ${minutesSaved % 60}min` : `${minutesSaved} min`;
  const lastReport = reports[0];

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-1 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold truncate">Olá, {profile?.name ?? "bem-vindo"} 👋</h1>
          <p className="text-sm text-muted-foreground">O que vamos analisar hoje?</p>
        </div>
        <Badge variant={plan === "pro" ? "default" : "secondary"} className={plan === "pro" ? "bg-gradient-primary shrink-0" : "shrink-0"}>
          {plan === "pro" ? (<><Crown className="h-3 w-3 mr-1" /> Pro</>) : "Gratuito"}
        </Badge>
      </div>

      {/* Stat cards */}
      {loadingProfile || loadingReports ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0,1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={BarChart3}
            label="Relatórios gerados"
            value={totalReports}
            hint={totalReports === 0 ? "Envie seu primeiro arquivo" : "Total na sua conta"}
          />
          <StatCard
            icon={Upload}
            label={plan === "pro" ? "Uploads" : "Uploads restantes"}
            value={plan === "pro" ? "∞" : `${remaining}/${FREE_LIFETIME_LIMIT}`}
            hint={plan === "pro" ? "Ilimitado no Pro" : limitReached ? "Limite atingido" : "Plano gratuito"}
            accent={limitReached ? "warning" : "primary"}
          />
          <StatCard
            icon={Clock}
            label="Tempo economizado"
            value={totalReports === 0 ? "—" : savedLabel}
            hint={totalReports === 0 ? "Estimativa por relatório" : "Estimativa acumulada"}
            accent="success"
          />
          <StatCard
            icon={CalendarDays}
            label="Último relatório"
            value={lastReport ? new Date(lastReport.created_at).toLocaleDateString("pt-BR") : "—"}
            hint={lastReport ? lastReport.file_name : "Nada ainda"}
          />
        </div>
      )}

      {/* Main upload card */}
      <Card className="p-6 sm:p-8 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-semibold">
              {limitReached ? "Você atingiu o limite gratuito" : "Gere um novo relatório"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {plan === "pro"
                ? "Uploads ilimitados. Envie planilhas, CSVs ou PDFs de até 50MB."
                : limitReached
                  ? "Assine o Pro por R$12,90/mês para uploads ilimitados."
                  : `Você tem ${remaining} de ${FREE_LIFETIME_LIMIT} uploads gratuitos restantes.`}
            </p>
            {plan === "free" && (
              <Progress value={(used / FREE_LIFETIME_LIMIT) * 100} className="mt-4 h-1.5 max-w-xs" />
            )}
          </div>
          <Link to={limitReached ? "/plans" : "/upload"} className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto bg-gradient-primary shadow-elegant hover-scale">
              {limitReached ? (<><Crown className="h-4 w-4 mr-2" /> Assinar Pro</>) : (<><Upload className="h-4 w-4 mr-2" /> Novo upload</>)}
            </Button>
          </Link>
        </div>
      </Card>

      {/* Recent reports */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base sm:text-lg font-semibold">Relatórios recentes</h2>
          {reports.length > 0 && (
            <Link to="/reports" className="text-sm text-primary hover:underline">Ver todos</Link>
          )}
        </div>

        {loadingReports ? (
          <div className="space-y-2">
            {[0,1,2].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
          </div>
        ) : reports.length === 0 ? (
          <Card className="p-10 sm:p-14 text-center border-dashed animate-fade-in">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Comece sua primeira análise</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Envie uma planilha, CSV ou PDF e a IA vai gerar um relatório executivo em segundos.
            </p>
            <Link to="/upload" className="inline-block mt-6">
              <Button className="bg-gradient-primary shadow-elegant hover-scale">
                <Zap className="h-4 w-4 mr-2" /> Gerar relatório agora
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-2">
            {reports.map((r: any) => (
              <Card key={r.id} className="p-3 sm:p-4 flex items-center justify-between gap-2 hover:border-primary/40 hover:shadow-elegant transition-all animate-fade-in">
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
