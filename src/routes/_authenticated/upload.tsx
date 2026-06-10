import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UploadCloud, FileText, Loader2, Sparkles, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/upload")({
  component: UploadPage,
});

const FREE_LIFETIME_LIMIT = 3;
const MAX_SIZE = 50 * 1024 * 1024;
const ACCEPTED = [".pdf", ".csv", ".xlsx", ".xls"];

function UploadPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [paywall, setPaywall] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      return data;
    },
  });

  const plan = profile?.plan ?? "free";
  const used = profile?.uploads_used ?? 0;
  const remaining = plan === "pro" ? Infinity : Math.max(0, FREE_LIFETIME_LIMIT - used);
  const canUpload = plan === "pro" || remaining > 0;

  const pickFile = (f: File) => {
    const ext = "." + f.name.split(".").pop()?.toLowerCase();
    if (!ACCEPTED.includes(ext)) { toast.error("Formato não suportado"); return; }
    if (f.size > MAX_SIZE) { toast.error("Arquivo maior que 50MB"); return; }
    setFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    if (!canUpload) { setPaywall(true); return; }
    setUploading(true);
    try {
      const { analyzeFile } = await import("@/lib/report-analyzer");
      const analysis = await analyzeFile(file);
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("uploads").upload(path, file);
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from("reports").insert({
        user_id: user.id,
        file_name: file.name,
        file_type: file.type || file.name.split(".").pop(),
        status: "ready",
        summary: analysis.summary,
        data: analysis as any,
      });
      if (insErr) throw insErr;
      await supabase.from("profiles").update({ uploads_used: used + 1 }).eq("id", user.id);
      toast.success("Upload concluído! Relatório disponível.");
      qc.invalidateQueries({ queryKey: ["reports", user.id] });
      qc.invalidateQueries({ queryKey: ["profile", user.id] });
      navigate({ to: "/reports" });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao enviar arquivo");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 px-1">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Novo upload</h1>
        <p className="text-sm text-muted-foreground mt-1">Envie PDF, Excel ou CSV (máx. 50MB) para gerar um relatório executivo.</p>
      </div>

      <Card
        className={`p-6 sm:p-12 border-2 border-dashed text-center transition-colors ${canUpload ? "cursor-pointer" : "opacity-60 cursor-not-allowed"} ${dragOver ? "border-primary bg-primary/5" : "border-border"}`}
        onClick={() => canUpload && inputRef.current?.click()}
        onDragOver={(e) => { if (canUpload) { e.preventDefault(); setDragOver(true); } }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          if (!canUpload) return;
          e.preventDefault(); setDragOver(false);
          const f = e.dataTransfer.files?.[0]; if (f) pickFile(f);
        }}
      >
        <input
          ref={inputRef} type="file" accept={ACCEPTED.join(",")} className="hidden"
          disabled={!canUpload}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); }}
        />
        {file ? (
          <div className="flex flex-col items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 w-full">
              <div className="font-medium truncate px-4">{file.name}</div>
              <div className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
            </div>
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setFile(null); }}>
              Escolher outro
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <UploadCloud className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="font-medium">Clique ou arraste um arquivo</div>
              <div className="text-xs text-muted-foreground mt-1">PDF, XLSX, XLS, CSV — até 50MB</div>
            </div>
          </div>
        )}
      </Card>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <span className="text-sm text-muted-foreground">
          {plan === "pro"
            ? "Uploads ilimitados"
            : `${remaining} de ${FREE_LIFETIME_LIMIT} upload(s) gratuitos restantes`}
        </span>
        <Button
          disabled={!file || uploading || !canUpload}
          onClick={handleUpload}
          className="bg-gradient-primary shadow-elegant w-full sm:w-auto"
        >
          {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</> : "Gerar relatório"}
        </Button>
      </div>

      <Dialog open={paywall || (plan === "free" && remaining === 0 && !!file)} onOpenChange={(o) => setPaywall(o && plan === "free")}>
        <DialogContent className="max-w-md">
          <div className="flex items-center gap-2 text-primary mb-1">
            <Crown className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">RelataAI Pro</span>
          </div>
          <DialogHeader>
            <DialogTitle className="text-2xl">Você atingiu seu limite gratuito</DialogTitle>
            <DialogDescription className="text-base">
              Você já utilizou seus 3 relatórios gratuitos. Assine o RelataAI Pro para continuar gerando relatórios inteligentes sem limites.
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-2 text-sm py-2">
            {["Uploads ilimitados","Insights premium por IA","Gráficos avançados","Exportação executiva"].map((f) => (
              <li key={f} className="flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-primary" />{f}</li>
            ))}
          </ul>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="ghost" onClick={() => setPaywall(false)} className="w-full sm:w-auto">Talvez depois</Button>
            <Button className="bg-gradient-primary shadow-elegant w-full sm:w-auto" onClick={() => navigate({ to: "/plans" })}>
              Assinar RelataAI Pro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
