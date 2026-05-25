import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardHeader, MEMBRE_NAV } from "@/components/DashboardHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { toast } from "sonner";
import { Loader2, Pencil, Upload } from "lucide-react";

export const Route = createFileRoute("/membre/profil")({ component: Page });

function Page() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [m, setM] = useState<any>(null);
  const [fetched, setFetched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!loading && !user && isSupabaseConfigured) nav({ to: "/login" });
  }, [loading, user, nav]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!active) return;
      if (error) toast.error(error.message);
      setM(data ?? { user_id: user.id, email: user.email });
      setFetched(true);
    })();
    return () => { active = false; };
  }, [user?.id]);

  if (loading || !user || !fetched) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  async function save() {
    if (!m) return;
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
    setEdit(false);
  }

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !user) return;
    setUploading(true);
    const path = `${user.id}/photo-${Date.now()}-${f.name}`;
    const up = await supabase.storage.from("avatars").upload(path, f, { upsert: true });
    if (up.error) { setUploading(false); return toast.error(up.error.message); }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = pub.publicUrl;
    const { error } = await supabase.from("members").update({ photo_url: url }).eq("user_id", user.id);
    setUploading(false);
    if (error) return toast.error(error.message);
    setM({ ...m, photo_url: url });
    toast.success("Photo mise à jour");
  }

  const ro = !edit;

  return (
    <div className="min-h-screen bg-muted/30">
      <DashboardHeader title="Membre MUGEC-CI" nav={MEMBRE_NAV} />
      <section className="container mx-auto max-w-3xl px-4 py-10">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 border">
              {m.photo_url ? <AvatarImage src={m.photo_url} /> : null}
              <AvatarFallback>{(m.prenoms?.[0] ?? "") + (m.nom?.[0] ?? "")}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">Mon profil</h1>
              <p className="mt-1 text-sm text-muted-foreground">Matricule : {m.matricule ?? "—"}</p>
              <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-xs text-primary hover:underline">
                <Upload className="h-3 w-3" /> {uploading ? "Envoi…" : "Changer la photo"}
                <input type="file" accept="image/*" className="hidden" onChange={onPhoto} />
              </label>
            </div>
          </div>
          {ro ? (
            <Button onClick={() => setEdit(true)} variant="outline"><Pencil className="mr-2 h-4 w-4" /> Modifier</Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEdit(false)}>Annuler</Button>
              <Button onClick={save} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
            </div>
          )}
        </div>
        <Card className="mt-6">
          <CardContent className="grid gap-4 p-6 md:grid-cols-2">
            <F label="Nom" v={m.nom} disabled />
            <F label="Prénoms" v={m.prenoms} disabled />
            <F label="Email" v={m.email} disabled />
            <F label="Téléphone" v={m.telephone} disabled={ro} on={(v) => setM({ ...m, telephone: v })} />
            <F label="Collectivité" v={m.collectivite} disabled={ro} on={(v) => setM({ ...m, collectivite: v })} />
            <F label="Région" v={m.region} disabled={ro} on={(v) => setM({ ...m, region: v })} />
            <F label="Direction / Service" v={m.direction} disabled={ro} on={(v) => setM({ ...m, direction: v })} />
            <F label="Fonction" v={m.fonction} disabled={ro} on={(v) => setM({ ...m, fonction: v })} />
            <div className="md:col-span-2">
              <Label>Adresse</Label>
              <Input value={m.adresse ?? ""} disabled={ro} onChange={(e) => setM({ ...m, adresse: e.target.value })} />
            </div>
          </CardContent>
        </Card>
      </section>
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
