import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Download, FileText, Wallet, Bell, Loader2 } from "lucide-react";

export const Route = createFileRoute("/membre/")({
  component: Page,
});

type Member = {
  nom?: string;
  prenoms?: string;
  email?: string;
  collectivite?: string;
  region?: string;
  fonction?: string;
  statut?: string;
  matricule?: string;
};

function Page() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [member, setMember] = useState<Member | null>(null);

  useEffect(() => {
    if (!loading && !user && isSupabaseConfigured) nav({ to: "/login" });
  }, [loading, user, nav]);

  useEffect(() => {
    (async () => {
      if (!user || !isSupabaseConfigured) return;
      const { data } = await supabase.from("members").select("*").eq("user_id", user.id).maybeSingle();
      if (data) setMember(data as Member);
    })();
  }, [user]);

  const m: Member =
    member ??
    (!isSupabaseConfigured
      ? {
          nom: "DEMO",
          prenoms: "Utilisateur",
          email: "demo@mugec-ci.org",
          collectivite: "Mairie de Cocody",
          region: "Abidjan",
          fonction: "Agent administratif",
          statut: "actif",
          matricule: "DEMO-001",
        }
      : {});

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="container mx-auto max-w-6xl px-4 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Bienvenue</p>
            <h1 className="text-3xl font-bold tracking-tight">
              {m.prenoms} {m.nom}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {m.fonction} — {m.collectivite}
            </p>
          </div>
          <Badge variant={m.statut === "actif" ? "default" : "secondary"} className="text-xs uppercase">
            {m.statut === "actif" ? "Membre actif" : m.statut ?? "en attente"}
          </Badge>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-4">
          <ActionCard icon={FileText} title="Profil" desc="Mettre à jour mes informations.">
            <Button asChild variant="outline" className="w-full"><Link to="/membre/profil">Ouvrir</Link></Button>
          </ActionCard>
          <ActionCard icon={FileText} title="Documents" desc="Fiche & carte téléchargeables.">
            <Button asChild variant="outline" className="w-full"><Link to="/membre/documents"><Download className="mr-2 h-4 w-4" /> Ouvrir</Link></Button>
          </ActionCard>
          <ActionCard icon={Wallet} title="Cotisations" desc="Historique et statut.">
            <Button asChild variant="outline" className="w-full"><Link to="/membre/cotisations">Voir</Link></Button>
          </ActionCard>
          <ActionCard icon={Bell} title="Carte de membre" desc="QR Code et filigrane.">
            <Button asChild variant="outline" className="w-full"><Link to="/membre/carte">Ouvrir</Link></Button>
          </ActionCard>
        </div>

        <Card className="mt-10">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold">Mes informations</h2>
            <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
              <Row k="Nom complet" v={`${m.prenoms ?? ""} ${m.nom ?? ""}`} />
              <Row k="Matricule" v={m.matricule ?? "—"} />
              <Row k="Email" v={m.email ?? "—"} />
              <Row k="Région" v={m.region ?? "—"} />
              <Row k="Collectivité" v={m.collectivite ?? "—"} />
              <Row k="Fonction" v={m.fonction ?? "—"} />
            </dl>
          </CardContent>
        </Card>
      </section>
      <SiteFooter />
    </div>
  );
}

function ActionCard({ icon: Icon, title, desc, children }: any) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">{desc}</p>
        {children}
      </CardContent>
    </Card>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between border-b pb-2">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  );
}
