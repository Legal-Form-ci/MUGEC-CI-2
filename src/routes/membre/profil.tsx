import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/membre/profil")({ component: Page });

function Page() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [m, setM] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user && isSupabaseConfigured) nav({ to: "/login" });
  }, [loading, user, nav]);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data } = await supabase.from("members").select("*").eq("user_id", user.id).maybeSingle();
      setM(data);
    })();
  }, [user]);

  if (loading || !m) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("members")
      .update({
        telephone: m.telephone,
        adresse: m.adresse,
        direction: m.direction,
        fonction: m.fonction,
        collectivite: m.collectivite,
        region: m.region,
      })
      .eq("user_id", user!.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profil mis à jour");
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="container mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-bold">Mon profil</h1>
        <p className="mt-1 text-sm text-muted-foreground">Matricule : {m.matricule}</p>
        <Card className="mt-6">
          <CardContent className="grid gap-4 p-6 md:grid-cols-2">
            <F label="Nom" v={m.nom} disabled />
            <F label="Prénoms" v={m.prenoms} disabled />
            <F label="Email" v={m.email} disabled />
            <F label="Téléphone" v={m.telephone} on={(v) => setM({ ...m, telephone: v })} />
            <F label="Collectivité" v={m.collectivite} on={(v) => setM({ ...m, collectivite: v })} />
            <F label="Région" v={m.region} on={(v) => setM({ ...m, region: v })} />
            <F label="Direction / Service" v={m.direction} on={(v) => setM({ ...m, direction: v })} />
            <F label="Fonction" v={m.fonction} on={(v) => setM({ ...m, fonction: v })} />
            <div className="md:col-span-2">
              <Label>Adresse</Label>
              <Input value={m.adresse ?? ""} onChange={(e) => setM({ ...m, adresse: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Button onClick={save} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
            </div>
          </CardContent>
        </Card>
      </section>
      <SiteFooter />
    </div>
  );
}

function F({ label, v, on, disabled }: { label: string; v?: string; on?: (v: string) => void; disabled?: boolean }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input value={v ?? ""} disabled={disabled} onChange={(e) => on?.(e.target.value)} />
    </div>
  );
}
