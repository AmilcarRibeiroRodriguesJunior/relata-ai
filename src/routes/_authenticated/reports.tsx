import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, History, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/reports")({
  component: Reports,
});

function Reports() {
  const { user } = Route.useRouteContext();
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["reports", user.id, "all"],
    queryFn: async () => {
      const { data } = await supabase.from("reports").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      return data ?? [];
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
                <Badge variant={r.status === "ready" ? "default" : "secondary"}>{r.status}</Badge>
                {r.report_url && (
                  <Button size="sm" variant="outline"><Download className="h-3 w-3 mr-1" /> PDF</Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
