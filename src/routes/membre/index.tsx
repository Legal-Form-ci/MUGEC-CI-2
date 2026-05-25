import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardHeader, MEMBRE_NAV } from "@/components/DashboardHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getCurrentSupabaseUser } from "@/lib/auth";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export const Route = createFileRoute("/membre/")({ component: Page });

type Member = {
  nom?: string; prenoms?: string; email?: string; collectivite?: string;
  region?: string; fonction?: string; statut?: string; matricule?: string;
  photo_url?: string | null; telephone?: string | null;
};

function Page() {
  const [member, setMember] = useState<Member | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!isSupabaseConfigured) return;
      const currentUser = await getCurrentSupabaseUser();
      if (!alive || !currentUser) return;
      const { data } = await supabase.from("members").select("*").eq("user_id", currentUser.id).maybeSingle();
      if (alive && data) setMember(data as Member);
    })();
    return () => { alive = false; };
  }, []);

  const m: Member = member ?? {};
  const initials = `${(m.prenoms?.[0] ?? "")}${(m.nom?.[0] ?? "")}`.toUpperCase() || "M";

  return (
    <div className="min-h-screen bg-muted/30">
      <DashboardHeader title="Membre MUGEC-CI" nav={MEMBRE_NAV} />
      <section className="container mx-auto max-w-6xl px-4 py-8">
        <Card className="overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-primary to-primary/60" />
          <CardContent className="p-6 -mt-12">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex items-end gap-4">
                <Avatar className="h-24 w-24 ring-4 ring-background">
                  {m.photo_url ? <AvatarImage src={m.photo_url} alt={`${m.prenoms} ${m.nom}`} /> : null}
                  <AvatarFallback className="text-xl">{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">{m.prenoms} {m.nom}</h1>
                  <p className="text-sm text-muted-foreground">{m.fonction ?? "—"} — {m.collectivite ?? "—"}</p>
                  <p className="text-xs font-mono text-muted-foreground mt-1">{m.matricule ?? "—"}</p>
                </div>
              </div>
              <Badge variant={m.statut === "actif" ? "default" : "secondary"} className="uppercase">
                {m.statut ?? "en attente"}
              </Badge>
            </div>
          </CardContent>
        </Card>


        <Card className="mt-6">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold">Mes informations</h2>
            <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
              <Row k="Nom complet" v={`${m.prenoms ?? ""} ${m.nom ?? ""}`.trim() || "—"} />
              <Row k="Matricule" v={m.matricule ?? "—"} />
              <Row k="Email" v={m.email ?? "—"} />
              <Row k="Téléphone" v={m.telephone ?? "—"} />
              <Row k="Région" v={m.region ?? "—"} />
              <Row k="Collectivité" v={m.collectivite ?? "—"} />
              <Row k="Fonction" v={m.fonction ?? "—"} />
              <Row k="Statut" v={m.statut ?? "—"} />
            </dl>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}


function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-b pb-2">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-medium text-right">{v}</dd>
    </div>
  );
}
