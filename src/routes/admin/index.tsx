import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardHeader, ADMIN_NAV } from "@/components/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { MoreHorizontal, Eye, Users, Wallet, FileCheck, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/admin/")({ component: AdminDashboard });

type Stats = {
  members_total: number; members_actifs: number; members_en_attente: number;
  cotisations_mois: number; cotisations_total: number;
  prestations_en_cours: number; prestations_validees_mois: number;
  transactions_miprojet_total: number;
};
type MemberRow = {
  id: string; matricule: string | null; nom: string; prenoms: string;
  telephone: string | null; email: string | null; statut: string;
  created_at: string; photo_url: string | null;
};

const PAGE = 50;
const STATUTS = ["actif", "en_attente", "suspendu", "decede", "marie", "licencie", "assiste", "retraite"];

function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MemberRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  async function loadStats() {
    const { data, error } = await supabase.rpc("admin_dashboard_stats");
    if (!error && data) setStats(data as Stats);
  }
  async function loadMembers() {
    setLoading(true);
    let q = supabase
      .from("members")
      .select("id, matricule, nom, prenoms, telephone, email, statut, created_at, photo_url")
      .order("created_at", { ascending: false })
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (search.trim()) {
      const s = `%${search.trim()}%`;
      q = q.or(`nom.ilike.${s},prenoms.ilike.${s},telephone.ilike.${s},matricule.ilike.${s},email.ilike.${s}`);
    }
    const { data, error } = await q;
    if (error) toast.error(error.message);
    else setMembers((data as MemberRow[]) || []);
    setLoading(false);
  }
  useEffect(() => { loadStats(); }, []);
  useEffect(() => { loadMembers(); /* eslint-disable-next-line */ }, [page]);

  async function setStatus(id: string, statut: string) {
    const { error } = await supabase.from("members").update({ statut }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(`Statut → ${statut}`); loadMembers(); loadStats(); }
  }

  async function openEdit(m: MemberRow) {
    const { data } = await supabase.from("members").select("*").eq("id", m.id).maybeSingle();
    setEditData(data);
    setEditOpen(true);
  }
  async function saveEdit() {
    if (!editData) return;
    const { id, created_at, updated_at, user_id, ...patch } = editData;
    const { error } = await supabase.from("members").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Membre mis à jour"); setEditOpen(false); loadMembers(); }
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <DashboardHeader title="Admin MUGEC-CI" nav={ADMIN_NAV} />
      <main className="container mx-auto px-4 py-8 space-y-6 max-w-7xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Tableau de bord Admin</h1>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPI icon={Users} label="Membres" value={stats?.members_total ?? 0} accent="text-primary" />
          <KPI icon={Users} label="Actifs" value={stats?.members_actifs ?? 0} accent="text-emerald-600" />
          <KPI icon={Users} label="En attente" value={stats?.members_en_attente ?? 0} accent="text-amber-600" />
          <KPI icon={Wallet} label="Cotis. mois (F)" value={(stats?.cotisations_mois ?? 0).toLocaleString("fr-FR")} accent="text-primary" />
          <KPI icon={Wallet} label="Cotis. cumul (F)" value={(stats?.cotisations_total ?? 0).toLocaleString("fr-FR")} accent="text-primary" />
          <KPI icon={FileCheck} label="Prestations en cours" value={stats?.prestations_en_cours ?? 0} accent="text-amber-600" />
          <KPI icon={FileCheck} label="Prest. validées (mois)" value={stats?.prestations_validees_mois ?? 0} accent="text-emerald-600" />
          <KPI icon={TrendingUp} label="MiProjet (F)" value={(stats?.transactions_miprojet_total ?? 0).toLocaleString("fr-FR")} accent="text-primary" />
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Membres</CardTitle>
            <div className="flex gap-2">
              <Input placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full sm:w-72" />
              <Button onClick={() => { setPage(0); loadMembers(); }}>Filtrer</Button>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead></TableHead>
                  <TableHead>Matricule</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Inscription</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7}>Chargement…</TableCell></TableRow>
                ) : members.length === 0 ? (
                  <TableRow><TableCell colSpan={7}>Aucun membre</TableCell></TableRow>
                ) : members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <Avatar className="h-8 w-8">
                        {m.photo_url ? <AvatarImage src={m.photo_url} /> : null}
                        <AvatarFallback className="text-xs">{(m.prenoms?.[0] ?? "") + (m.nom?.[0] ?? "")}</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{m.matricule || "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">{m.nom} {m.prenoms}</TableCell>
                    <TableCell>{m.telephone || "—"}</TableCell>
                    <TableCell><Badge variant={m.statut === "actif" ? "default" : "secondary"}>{m.statut}</Badge></TableCell>
                    <TableCell>{new Date(m.created_at).toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => setSelected(m)}>
                            <Eye className="mr-2 h-4 w-4" /> Voir le profil
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(m)}>Modifier les informations</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel className="text-xs text-muted-foreground">Statut</DropdownMenuLabel>
                          {STATUTS.map((s) => (
                            <DropdownMenuItem key={s} disabled={m.statut === s} onClick={() => setStatus(m.id, s)}>
                              {labelStatut(s)}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex justify-between items-center mt-4">
              <Button variant="outline" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>← Précédent</Button>
              <span className="text-sm text-muted-foreground">Page {page + 1}</span>
              <Button variant="outline" disabled={members.length < PAGE} onClick={() => setPage((p) => p + 1)}>Suivant →</Button>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* View profile */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Profil membre</DialogTitle></DialogHeader>
          {selected && (
            <div className="flex gap-4">
              <Avatar className="h-24 w-24">
                {selected.photo_url ? <AvatarImage src={selected.photo_url} /> : null}
                <AvatarFallback>{(selected.prenoms?.[0] ?? "") + (selected.nom?.[0] ?? "")}</AvatarFallback>
              </Avatar>
              <dl className="grid grid-cols-2 gap-2 text-sm flex-1">
                <D k="Matricule" v={selected.matricule || "—"} />
                <D k="Nom" v={`${selected.nom} ${selected.prenoms}`} />
                <D k="Email" v={selected.email || "—"} />
                <D k="Téléphone" v={selected.telephone || "—"} />
                <D k="Statut" v={selected.statut} />
                <D k="Inscription" v={new Date(selected.created_at).toLocaleDateString("fr-FR")} />
              </dl>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Modifier le membre</DialogTitle></DialogHeader>
          {editData && (
            <div className="grid gap-3 md:grid-cols-2">
              {[
                "nom","prenoms","email","telephone","cni","adresse","photo_url",
                "collectivite","region","direction","fonction","matricule_pro","matricule",
                "sexe","lieu_naissance","date_naissance","date_embauche","ayants_droit",
                "type_membre","validation_mode","payment_reference","suspended_reason",
              ].map((f) => (
                <div key={f}>
                  <Label className="text-xs">{f}</Label>
                  <Input
                    value={editData[f] ?? ""}
                    onChange={(e) => setEditData({ ...editData, [f]: e.target.value })}
                  />
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Annuler</Button>
            <Button onClick={saveEdit}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function labelStatut(s: string) {
  return ({
    actif: "Activer", en_attente: "Mettre en attente", suspendu: "Suspendre",
    decede: "Déclarer décédé", marie: "Déclarer marié", licencie: "Déclarer licencié",
    assiste: "Déclarer assisté", retraite: "Déclarer retraité",
  } as any)[s] ?? s;
}

function KPI({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string | number; accent?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="text-2xl font-bold mt-1">{value}</div>
          </div>
          <Icon className={`h-5 w-5 ${accent ?? "text-muted-foreground"}`} />
        </div>
      </CardContent>
    </Card>
  );
}

function D({ k, v }: { k: string; v: string }) {
  return (
    <div className="border-b pb-1">
      <div className="text-xs text-muted-foreground">{k}</div>
      <div className="font-medium">{v}</div>
    </div>
  );
}
