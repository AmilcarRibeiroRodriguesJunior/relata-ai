import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, TrendingUp, Sparkles, ArrowRight, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ReportView } from "@/components/report-view";
import type { ReportData } from "@/lib/report-analyzer";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

const FREE_DAILY_LIMIT = 3;

const startOfTodayISO = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

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

  const { data: todayCount = 0 } = useQuery({
    queryKey: ["reports", user.id, "today-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", startOfTodayISO());
      return count ?? 0;
    },
  });

  const plan = profile?.plan ?? "free";
  const totalReports = profile?.uploads_used ?? 0;
  const remainingToday = plan === "pro" ? Infinity : Math.max(0, FREE_DAILY_LIMIT - todayCount);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Olá, {profile?.name ?? "bem-vindo"} 👋</h1>
        <p className="text-muted-foreground mt-1">Aqui está um resumo da sua conta RelataAI.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Uploads hoje</span>
            <Upload className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-3 text-3xl font-bold">
            {plan === "pro" ? "∞" : `${remainingToday}/${FREE_DAILY_LIMIT}`}
          </div>
          {plan === "free" && (
            <>
              <Progress value={(todayCount / FREE_DAILY_LIMIT) * 100} className="mt-3 h-1.5" />
              <span className="text-xs text-muted-foreground mt-2 inline-block">Renova automaticamente amanhã</span>
            </>
          )}
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Relatórios gerados</span>
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-3 text-3xl font-bold">{totalReports}</div>
          <span className="text-xs text-muted-foreground">no total</span>
        </Card>
        <Card className="p-6 bg-gradient-to-br from-primary/10 to-transparent border-primary/30">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Plano atual</span>
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Badge variant={plan === "pro" ? "default" : "secondary"} className={plan === "pro" ? "bg-gradient-primary" : ""}>
              {plan === "pro" ? "Pro" : "Free"}
            </Badge>
          </div>
          {plan !== "pro" && (
            <Link to="/plans" className="text-xs text-primary mt-3 inline-flex items-center gap-1 hover:underline">
              Fazer upgrade <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Relatórios recentes</h2>
        <Link to="/upload">
          <Button className="bg-gradient-primary shadow-elegant"><Upload className="h-4 w-4 mr-2" /> Novo upload</Button>
        </Link>
      </div>

      {reports.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
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
            <Card key={r.id} className="p-4 flex items-center justify-between hover:border-primary/40 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium truncate">{r.file_name}</div>
                  <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("pt-BR")}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={r.status === "ready" ? "default" : "secondary"}>{r.status}</Badge>
                {r.status === "ready" && (
                  <Button size="sm" variant="outline" onClick={() => setSelected(r)}>
                    <Eye className="h-3 w-3 mr-1" /> Ver relatório
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
            <DialogTitle>{selected?.file_name}</DialogTitle>
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
