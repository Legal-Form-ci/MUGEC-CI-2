import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Download, FileText, Loader2 } from "lucide-react";

export const Route = createFileRoute("/membre/documents")({ component: Page });

function Page() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [docs, setDocs] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !user && isSupabaseConfigured) nav({ to: "/login" });
  }, [loading, user, nav]);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data: member } = await supabase.from("members").select("id").eq("user_id", user.id).maybeSingle();
      if (!member) return;
      const { data } = await supabase.from("documents").select("*").eq("member_id", member.id).order("created_at", { ascending: false });
      setDocs(data ?? []);
    })();
  }, [user]);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="container mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold">Mes documents</h1>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Card><CardContent className="p-6">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><FileText className="h-5 w-5" /></div>
            <h2 className="font-semibold">Fiche officielle</h2>
            <p className="mt-1 text-sm text-muted-foreground">Téléchargez votre fiche d’inscription avec QR Code et filigrane.</p>
            <Button asChild className="mt-4 w-full" variant="outline"><Link to="/membre/carte"><Download className="mr-2 h-4 w-4" /> Ouvrir</Link></Button>
          </CardContent></Card>
          <Card><CardContent className="p-6">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><FileText className="h-5 w-5" /></div>
            <h2 className="font-semibold">Carte de membre</h2>
            <p className="mt-1 text-sm text-muted-foreground">Format CR80, imprimable recto/verso.</p>
            <Button asChild className="mt-4 w-full" variant="outline"><Link to="/membre/carte"><Download className="mr-2 h-4 w-4" /> Ouvrir</Link></Button>
          </CardContent></Card>
        </div>

        <h2 className="mt-10 text-lg font-semibold">Autres documents</h2>
        <Card className="mt-4">
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-left">
                <tr><th className="p-3">Type</th><th className="p-3">Titre</th><th className="p-3">Date</th><th className="p-3"></th></tr>
              </thead>
              <tbody>
                {docs.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Aucun document</td></tr>}
                {docs.map((d) => (
                  <tr key={d.id} className="border-t">
                    <td className="p-3">{d.type}</td>
                    <td className="p-3">{d.title ?? d.file_name ?? "—"}</td>
                    <td className="p-3">{new Date(d.created_at).toLocaleDateString("fr-FR")}</td>
                    <td className="p-3 text-right"><a href={d.url} target="_blank" rel="noreferrer" className="text-primary underline">Ouvrir</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>
      <SiteFooter />
    </div>
  );
}
