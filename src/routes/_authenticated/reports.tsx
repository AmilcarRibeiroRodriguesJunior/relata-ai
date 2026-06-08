import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, History, Upload, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ReportView } from "@/components/report-view";
import type { ReportData } from "@/lib/report-analyzer";

export const Route = createFileRoute("/_authenticated/reports")({
  component: Reports,
});

type Report = {
  id: string;
  file_name: string;
  file_type: string | null;
  status: string;
  summary: string | null;
  report_url: string | null;
  data: ReportData | null;
  created_at: string;
};

const statusLabel = (s: string) =>
  s === "ready" ? "Pronto" : s === "processing" ? "Processando" : s === "failed" ? "Falhou" : s;

function Reports() {
  const { user } = Route.useRouteContext();
  const [selected, setSelected] = useState<Report | null>(null);

  const { data: profile } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => (await supabase.from("profiles").select("plan").eq("id", user.id).maybeSingle()).data,
  });

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["reports", user.id, "all"],
    queryFn: async () => {
      const { data } = await supabase.from("reports").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      return (data ?? []) as Report[];
    },
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold">Histórico de relatórios</h1>
          <p className="text-muted-foreground mt-1">Todos os relatórios gerados pela sua conta.</p>
        </div>
        <Link to="/upload">
          <Button className="bg-gradient-primary shadow-elegant"><Upload className="h-4 w-4 mr-2" /> Novo</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Card key={i} className="p-4 h-16 animate-pulse bg-muted/50" />)}
        </div>
      ) : reports.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <History className="h-5 w-5 text-primary" />
          </div>
          <h3 className="font-semibold text-lg">Histórico vazio</h3>
          <p className="text-sm text-muted-foreground mt-1">Seus relatórios aparecerão aqui.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {reports.map((r) => (
            <Card key={r.id} className="p-4 flex items-center justify-between hover:border-primary/40 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium truncate">{r.file_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("pt-BR")} · {r.file_type ?? "arquivo"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={r.status === "ready" ? "default" : "secondary"}>{statusLabel(r.status)}</Badge>
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
            <ReportView data={selected.data} fileName={selected.file_name} plan={(profile?.plan ?? "free") as "free" | "pro"} />
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {selected?.summary ?? "Sem resumo disponível."}
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
