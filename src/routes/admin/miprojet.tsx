import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardHeader, ADMIN_NAV } from "@/components/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/miprojet")({ component: MiProjetDashboard });

type Stats = {
  transactions_total: number; transactions_paye: number; transactions_attente: number;
  parts_miprojet_mois: number; parts_mutuelle_mois: number; sessions_paiement: number;
};

const PAGE = 50;

function MiProjetDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [tx, setTx] = useState<Array<{ id: string; montant: number; statut: string; reference: string | null; created_at: string; date_virement: string | null }>>([]);
  const [page, setPage] = useState(0);

  useEffect(() => {
    supabase.rpc("miprojet_dashboard_stats").then(({ data }) => { if (data) setStats(data as Stats); });
  }, []);
  useEffect(() => {
    supabase.from("transactions_miprojet")
      .select("id, montant, statut, reference, created_at, date_virement")
      .order("created_at", { ascending: false })
      .range(page * PAGE, page * PAGE + PAGE - 1)
      .then(({ data }) => setTx(data || []));
  }, [page]);

  return (
    <div className="min-h-screen bg-muted/30">
      <DashboardHeader title="Admin MiProjet" nav={ADMIN_NAV} />
      <main className="container mx-auto px-4 py-8 space-y-6 max-w-7xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Tableau de bord MiProjet (Super Admin)</h1>
          <Link to="/admin"><Button variant="outline">Admin MUGEC-CI →</Button></Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <KPI label="Transactions total (F)" value={(stats?.transactions_total ?? 0).toLocaleString("fr-FR")} />
          <KPI label="Payées (F)" value={(stats?.transactions_paye ?? 0).toLocaleString("fr-FR")} />
          <KPI label="En attente (F)" value={(stats?.transactions_attente ?? 0).toLocaleString("fr-FR")} />
          <KPI label="Parts MiProjet ce mois" value={(stats?.parts_miprojet_mois ?? 0).toLocaleString("fr-FR")} />
          <KPI label="Parts Mutuelle ce mois" value={(stats?.parts_mutuelle_mois ?? 0).toLocaleString("fr-FR")} />
          <KPI label="Sessions paiement OK" value={stats?.sessions_paiement ?? "—"} />
        </div>

        <Card>
          <CardHeader><CardTitle>Transactions MiProjet ({PAGE}/page)</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Référence</TableHead><TableHead>Montant</TableHead><TableHead>Statut</TableHead>
                <TableHead>Créée</TableHead><TableHead>Virée</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {tx.length === 0 ? <TableRow><TableCell colSpan={5}>Aucune transaction</TableCell></TableRow>
                  : tx.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-xs">{t.reference || t.id.slice(0, 8)}</TableCell>
                      <TableCell>{t.montant.toLocaleString("fr-FR")} F</TableCell>
                      <TableCell><Badge variant={t.statut === "paye" ? "default" : "secondary"}>{t.statut}</Badge></TableCell>
                      <TableCell>{new Date(t.created_at).toLocaleDateString("fr-FR")}</TableCell>
                      <TableCell>{t.date_virement ? new Date(t.date_virement).toLocaleDateString("fr-FR") : "—"}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
            <div className="flex justify-between items-center mt-4">
              <Button variant="outline" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>← Précédent</Button>
              <span className="text-sm text-muted-foreground">Page {page + 1}</span>
              <Button variant="outline" disabled={tx.length < PAGE} onClick={() => setPage((p) => p + 1)}>Suivant →</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function KPI({ label, value }: { label: string; value: string | number }) {
  return <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="text-2xl font-bold">{value}</div></CardContent></Card>;
}
