import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/membre/cotisations")({ component: Page });

function Page() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !user && isSupabaseConfigured) nav({ to: "/login" });
  }, [loading, user, nav]);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data: member } = await supabase.from("members").select("id").eq("user_id", user.id).maybeSingle();
      if (!member) return;
      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("member_id", member.id)
        .order("created_at", { ascending: false });
      setRows(data ?? []);
    })();
  }, [user]);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="container mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold">Mes cotisations</h1>
        <Card className="mt-6">
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-left">
                <tr>
                  <th className="p-3">Type</th>
                  <th className="p-3">Période</th>
                  <th className="p-3">Montant</th>
                  <th className="p-3">Opérateur</th>
                  <th className="p-3">Référence</th>
                  <th className="p-3">Statut</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Aucune cotisation</td></tr>
                )}
                {rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-3 capitalize">{r.type}</td>
                    <td className="p-3">{r.periode ?? "—"}</td>
                    <td className="p-3">{r.montant_total.toLocaleString("fr-FR")} F</td>
                    <td className="p-3">{r.operateur ?? "—"}</td>
                    <td className="p-3 font-mono text-xs">{r.reference_transaction}</td>
                    <td className="p-3">
                      <Badge variant={r.statut_paiement === "paye" ? "default" : "secondary"}>{r.statut_paiement}</Badge>
                    </td>
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
