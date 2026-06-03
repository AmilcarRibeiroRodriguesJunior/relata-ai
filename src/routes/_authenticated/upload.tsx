import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UploadCloud, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/upload")({
  component: UploadPage,
});

const FREE_LIMIT = 3;
const MAX_SIZE = 20 * 1024 * 1024;
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
  const canUpload = plan === "pro" || used < FREE_LIMIT;

  const pickFile = (f: File) => {
    const ext = "." + f.name.split(".").pop()?.toLowerCase();
    if (!ACCEPTED.includes(ext)) { toast.error("Formato não suportado"); return; }
    if (f.size > MAX_SIZE) { toast.error("Arquivo maior que 20MB"); return; }
    setFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    if (!canUpload) { setPaywall(true); return; }
    setUploading(true);
    try {
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("uploads").upload(path, file);
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from("reports").insert({
        user_id: user.id,
        file_name: file.name,
        file_type: file.type || file.name.split(".").pop(),
        status: "processing",
      });
      if (insErr) throw insErr;
      await supabase.from("profiles").update({ uploads_used: used + 1 }).eq("id", user.id);
      toast.success("Upload concluído! Seu relatório está sendo gerado.");
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
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Novo upload</h1>
        <p className="text-muted-foreground mt-1">Envie PDF, Excel ou CSV (máx. 20MB) para gerar um relatório executivo.</p>
      </div>

      <Card
        className={`p-12 border-2 border-dashed text-center transition-colors cursor-pointer ${dragOver ? "border-primary bg-primary/5" : "border-border"}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault(); setDragOver(false);
          const f = e.dataTransfer.files?.[0]; if (f) pickFile(f);
        }}
      >
        <input
          ref={inputRef} type="file" accept={ACCEPTED.join(",")} className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); }}
        />
        {file ? (
          <div className="flex flex-col items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-medium">{file.name}</div>
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
              <div className="text-xs text-muted-foreground mt-1">PDF, XLSX, XLS, CSV — até 20MB</div>
            </div>
          </div>
        )}
      </Card>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {plan === "pro" ? "Uploads ilimitados" : `${Math.max(0, FREE_LIMIT - used)} upload(s) gratuito(s) restantes`}
        </span>
        <Button disabled={!file || uploading} onClick={handleUpload} className="bg-gradient-primary shadow-elegant">
          {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</> : "Gerar relatório"}
        </Button>
      </div>

      <Dialog open={paywall} onOpenChange={setPaywall}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Você atingiu o limite gratuito</DialogTitle>
            <DialogDescription>
              O plano Free permite 3 uploads. Assine o plano Pro por R$12,90/mês para uploads ilimitados, relatórios avançados e insights premium.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPaywall(false)}>Agora não</Button>
            <Button className="bg-gradient-primary shadow-elegant" onClick={() => navigate({ to: "/plans" })}>
              Ver planos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
