import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  UploadCloud, FileText, Loader2, Sparkles, Crown, CheckCircle2,
  FileSpreadsheet, FileType2, X,
} from "lucide-react";
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

const STAGES = [
  { label: "Lendo arquivo", emoji: "📄" },
  { label: "Organizando dados", emoji: "📊" },
  { label: "Analisando informações", emoji: "🧠" },
  { label: "Criando gráficos", emoji: "📈" },
  { label: "Gerando insights", emoji: "💡" },
  { label: "Montando relatório executivo", emoji: "📑" },
  { label: "Finalizando relatório", emoji: "✅" },
];

function UploadPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [stage, setStage] = useState(0);
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

  // Advance stages while uploading (visual only — pipeline is fast)
  useEffect(() => {
    if (!uploading) { setStage(0); return; }
    const id = setInterval(() => {
      setStage((s) => (s < STAGES.length - 1 ? s + 1 : s));
    }, 700);
    return () => clearInterval(id);
  }, [uploading]);

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
    setStage(0);
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
        niche: analysis.niche,
        data: analysis as any,
      });
      if (insErr) throw insErr;
      await supabase.from("profiles").update({ uploads_used: used + 1 }).eq("id", user.id);
      setStage(STAGES.length - 1);
      toast.success("Relatório pronto!");
      qc.invalidateQueries({ queryKey: ["reports", user.id] });
      qc.invalidateQueries({ queryKey: ["reports-count", user.id] });
      qc.invalidateQueries({ queryKey: ["profile", user.id] });
      // Brief pause so user sees the ✅
      setTimeout(() => navigate({ to: "/reports" }), 500);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao enviar arquivo");
      setUploading(false);
    }
  };

  const ext = file?.name.split(".").pop()?.toLowerCase();
  const FileIcon =
    ext === "pdf" ? FileType2 :
    ext === "xlsx" || ext === "xls" || ext === "csv" ? FileSpreadsheet : FileText;

  return (
    <div className="max-w-3xl mx-auto space-y-6 px-1 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Novo upload</h1>
        <p className="text-sm text-muted-foreground mt-1">Envie PDF, Excel ou CSV para gerar um relatório executivo.</p>
      </div>

      {/* Supported formats banner */}
      <Card className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between bg-muted/40 border-dashed">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="text-muted-foreground">Suportados:</span>
          {[
            { ext: "Excel (.xlsx)", icon: FileSpreadsheet },
            { ext: "CSV (.csv)", icon: FileSpreadsheet },
            { ext: "PDF (.pdf)", icon: FileType2 },
          ].map(({ ext, icon: Icon }) => (
            <span key={ext} className="inline-flex items-center gap-1.5 text-foreground/80">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <Icon className="h-3.5 w-3.5" /> {ext}
            </span>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">Tamanho máximo: 50 MB</span>
      </Card>

      {/* Dropzone */}
      <Card
        className={`p-6 sm:p-12 border-2 border-dashed text-center transition-all ${canUpload ? "cursor-pointer" : "opacity-60 cursor-not-allowed"} ${dragOver ? "border-primary bg-primary/5 scale-[1.01]" : "border-border hover:border-primary/40"}`}
        onClick={() => canUpload && !uploading && inputRef.current?.click()}
        onDragOver={(e) => { if (canUpload && !uploading) { e.preventDefault(); setDragOver(true); } }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          if (!canUpload || uploading) return;
          e.preventDefault(); setDragOver(false);
          const f = e.dataTransfer.files?.[0]; if (f) pickFile(f);
        }}
      >
        <input
          ref={inputRef} type="file" accept={ACCEPTED.join(",")} className="hidden"
          disabled={!canUpload || uploading}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); }}
        />
        {file ? (
          <div className="flex flex-col items-center gap-3 animate-fade-in">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <FileIcon className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0 w-full">
              <div className="font-medium truncate px-4">{file.name}</div>
              <div className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB · pronto para análise</div>
            </div>
            {!uploading && (
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setFile(null); }}>
                <X className="h-3 w-3 mr-1" /> Escolher outro
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center animate-fade-in">
              <UploadCloud className="h-7 w-7 text-primary" />
            </div>
            <div>
              <div className="font-medium">Clique ou arraste um arquivo</div>
              <div className="text-xs text-muted-foreground mt-1">PDF, XLSX, XLS, CSV — até 50MB</div>
            </div>
          </div>
        )}
      </Card>

      {/* Intelligent loading */}
      {uploading && (
        <Card className="p-6 animate-fade-in border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            <h3 className="font-semibold">A IA está trabalhando no seu relatório…</h3>
          </div>
          <Progress value={((stage + 1) / STAGES.length) * 100} className="h-2 mb-5" />
          <ul className="space-y-2">
            {STAGES.map((s, i) => {
              const done = i < stage;
              const active = i === stage;
              return (
                <li key={s.label} className={`flex items-center gap-3 text-sm transition-all ${active ? "text-foreground" : done ? "text-muted-foreground" : "text-muted-foreground/50"}`}>
                  <span className="text-base w-5">{done ? "✅" : active ? s.emoji : "○"}</span>
                  <span className={active ? "font-medium" : ""}>{s.label}</span>
                  {active && <Loader2 className="h-3 w-3 animate-spin ml-auto text-primary" />}
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {!uploading && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <span className="text-sm text-muted-foreground">
            {plan === "pro"
              ? "Uploads ilimitados"
              : `${remaining} de ${FREE_LIFETIME_LIMIT} upload(s) gratuitos restantes`}
          </span>
          <Button
            disabled={!file || !canUpload}
            onClick={handleUpload}
            className="bg-gradient-primary shadow-elegant w-full sm:w-auto hover-scale"
          >
            <Sparkles className="h-4 w-4 mr-2" /> Gerar relatório
          </Button>
        </div>
      )}

      <Dialog open={paywall || (plan === "free" && remaining === 0 && !!file && !uploading)} onOpenChange={(o) => setPaywall(o && plan === "free")}>
        <DialogContent className="max-w-lg">
          <div className="flex items-center gap-2 text-primary mb-1">
            <Crown className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">RelataAI Pro</span>
          </div>
          <DialogHeader>
            <DialogTitle className="text-2xl">Você atingiu o limite do Plano Gratuito</DialogTitle>
            <DialogDescription className="text-base">
              Continue transformando seus dados em relatórios executivos inteligentes.
            </DialogDescription>
          </DialogHeader>

          <div className="grid sm:grid-cols-2 gap-3 py-3">
            <div className="rounded-lg border p-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Gratuito</div>
              <div className="text-2xl font-bold">R$ 0</div>
              <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                <li>• 3 uploads gratuitos</li>
                <li>• Recursos básicos</li>
              </ul>
            </div>
            <div className="rounded-lg border-2 border-primary p-4 bg-gradient-to-br from-primary/10 to-transparent relative">
              <div className="absolute -top-2 right-3 text-[10px] font-semibold bg-gradient-primary text-primary-foreground px-2 py-0.5 rounded-full">RECOMENDADO</div>
              <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Pro</div>
              <div className="text-2xl font-bold">R$ 12,90<span className="text-sm font-normal text-muted-foreground">/mês</span></div>
              <ul className="mt-3 space-y-1.5 text-sm">
                {["Uploads ilimitados","Histórico completo","Relatórios avançados","Gráficos detalhados","Insights Premium","Exportação avançada"].map((f) => (
                  <li key={f} className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-primary" />{f}</li>
                ))}
              </ul>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="ghost" onClick={() => setPaywall(false)} className="w-full sm:w-auto">Talvez depois</Button>
            <Button className="bg-gradient-primary shadow-elegant w-full sm:w-auto hover-scale" onClick={() => navigate({ to: "/plans" })}>
              <Crown className="h-4 w-4 mr-2" /> Assinar RelataAI Pro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
