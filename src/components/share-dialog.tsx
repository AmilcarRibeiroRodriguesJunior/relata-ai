import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, Mail, MessageCircle, Linkedin, Twitter, Globe, Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function randomId() {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
}

export function ShareDialog({
  open, onOpenChange, reportId, fileName,
}: { open: boolean; onOpenChange: (o: boolean) => void; reportId: string; fileName: string }) {
  const [loading, setLoading] = useState(true);
  const [shareId, setShareId] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [copied, setCopied] = useState(false);

  const url = shareId ? `${typeof window !== "undefined" ? window.location.origin : ""}/r/${shareId}` : "";
  const shareText = `Veja este relatório executivo gerado no RelataAI: ${fileName}`;

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("reports").select("share_id,is_public").eq("id", reportId).maybeSingle();
      setShareId(data?.share_id ?? null);
      setIsPublic(!!data?.is_public);
      setLoading(false);
    })();
  }, [open, reportId]);

  const enable = async () => {
    setLoading(true);
    const sid = shareId ?? randomId();
    const { error } = await supabase.from("reports").update({ share_id: sid, is_public: true }).eq("id", reportId);
    if (error) { toast.error(error.message); setLoading(false); return; }
    setShareId(sid); setIsPublic(true); setLoading(false);
    toast.success("Link público criado");
  };

  const disable = async () => {
    setLoading(true);
    const { error } = await supabase.from("reports").update({ is_public: false }).eq("id", reportId);
    if (error) { toast.error(error.message); setLoading(false); return; }
    setIsPublic(false); setLoading(false);
    toast.success("Link tornado privado");
  };

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
    toast.success("Link copiado");
  };

  const shareOn = (kind: "whatsapp" | "email" | "linkedin" | "twitter") => {
    const encU = encodeURIComponent(url), encT = encodeURIComponent(shareText);
    const map: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${encT}%20${encU}`,
      email: `mailto:?subject=${encodeURIComponent("Relatório RelataAI — " + fileName)}&body=${encT}%20${encU}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encU}`,
      twitter: `https://twitter.com/intent/tweet?text=${encT}&url=${encU}`,
    };
    window.open(map[kind], "_blank", "noopener");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Compartilhar relatório</DialogTitle>
          <DialogDescription>Gere um link público elegante para compartilhar o resumo executivo.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : !isPublic ? (
          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground flex items-start gap-3">
              <Lock className="h-4 w-4 mt-0.5 text-primary" />
              <span>Este relatório é <b>privado</b>. Ao criar um link público, qualquer pessoa com o link poderá visualizar um resumo executivo (KPIs, score e insights principais).</span>
            </div>
            <Button className="w-full bg-gradient-primary shadow-elegant" onClick={enable}>
              <Globe className="h-4 w-4 mr-2" /> Criar link público
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground">Link público</label>
              <div className="flex gap-2 mt-1">
                <Input readOnly value={url} className="font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={copy}>
                  {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[
                { key: "whatsapp", icon: MessageCircle, label: "WhatsApp", cls: "text-emerald-600" },
                { key: "email", icon: Mail, label: "E-mail", cls: "text-primary" },
                { key: "linkedin", icon: Linkedin, label: "LinkedIn", cls: "text-blue-600" },
                { key: "twitter", icon: Twitter, label: "X / Twitter", cls: "text-foreground" },
              ].map(({ key, icon: Icon, label, cls }) => (
                <button
                  key={key}
                  onClick={() => shareOn(key as any)}
                  className="flex flex-col items-center gap-1 p-3 rounded-lg border hover:bg-muted transition-colors"
                >
                  <Icon className={`h-5 w-5 ${cls}`} />
                  <span className="text-[11px] text-muted-foreground">{label}</span>
                </button>
              ))}
            </div>

            <Button variant="ghost" size="sm" onClick={disable} className="w-full text-muted-foreground">
              <Lock className="h-3 w-3 mr-2" /> Tornar privado novamente
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
