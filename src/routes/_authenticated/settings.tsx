import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/_authenticated/settings")({
  component: Settings,
});

function Settings() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()).data,
  });

  useEffect(() => { if (profile?.name) setName(profile.name); }, [profile?.name]);

  const save = async () => {
    const parsed = z.string().trim().min(1).max(100).safeParse(name);
    if (!parsed.success) { toast.error("Nome inválido"); return; }
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ name: parsed.data }).eq("id", user.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Perfil atualizado");
    qc.invalidateQueries({ queryKey: ["profile", user.id] });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground mt-1">Gerencie sua conta RelataAI.</p>
      </div>

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold">Perfil</h2>
        <div className="space-y-2">
          <Label>E-mail</Label>
          <Input value={user.email ?? ""} disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <Button onClick={save} disabled={saving} className="bg-gradient-primary shadow-elegant">
          {saving ? "Salvando..." : "Salvar alterações"}
        </Button>
      </Card>

      <Card className="p-6 space-y-2">
        <h2 className="font-semibold">Plano</h2>
        <p className="text-sm text-muted-foreground">Seu plano atual: <span className="text-foreground font-medium capitalize">{profile?.plan ?? "free"}</span></p>
      </Card>
    </div>
  );
}
