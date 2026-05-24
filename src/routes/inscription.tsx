import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Watermark } from "@/components/Watermark";
import { toast } from "sonner";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { finalizeRegistration } from "@/lib/inscription.functions";
import { Check, CreditCard, User, ArrowLeft, ArrowRight, Download, FileText, BadgeCheck } from "lucide-react";
import { generateFicheAdhesionPDF, generateAutorisationPrelevementPDF, downloadBlob, type DraftData } from "@/lib/pdf-documents";

export const Route = createFileRoute("/inscription")({ component: Page });
const DRAFT_KEY = "mugec_inscription_draft_v1";


const step1Schema = z.object({
  nom: z.string().trim().min(2, "Nom requis").max(100),
  prenoms: z.string().trim().min(2, "Prénoms requis").max(150),
  dateNaissance: z.string().min(1, "Date de naissance requise").refine((v) => {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return false;
    const eighteen = new Date(); eighteen.setFullYear(eighteen.getFullYear() - 18);
    return d <= eighteen;
  }, "Vous devez être majeur(e) (18 ans minimum)."),
  lieuNaissance: z.string().trim().min(2, "Lieu de naissance requis").max(100),
  sexe: z.enum(["M", "F"]),
  email: z.string().trim().email("Email invalide").max(255),
  telephone: z.string().trim().min(8, "Téléphone requis").max(20),
  cni: z.string().trim().min(4, "N° CNI / Passeport requis").max(30),
  adresse: z.string().trim().min(2, "Adresse postale requise").max(255),
  collectivite: z.string().trim().min(2, "Collectivité requise").max(150),
  region: z.string().trim().max(100).optional().or(z.literal("")),
  direction: z.string().trim().max(150).optional().or(z.literal("")),
  fonction: z.string().trim().max(150).optional().or(z.literal("")),
  matriculePro: z.string().trim().min(2, "Matricule Solde requis").max(50),
  dateEmbauche: z.string().optional().or(z.literal("")),
  ayantsDroit: z.string().max(2000).optional().or(z.literal("")),
  photoIdentite: z.string().optional().or(z.literal("")),
});

const step2Schema = z.object({
  ficheSignee: z.string().min(1, "La fiche d'adhésion signée est obligatoire."),
  autorisationSignee: z.string().min(1, "L'autorisation de prélèvement signée est obligatoire."),
  cniDocument: z.string().min(1, "La copie CNI ou passeport est obligatoire."),
  extraitNaissance: z.string().min(1, "L'extrait de naissance est obligatoire."),
});

const passwordSchema = z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/);

type FormData = {
  nom: string; prenoms: string; dateNaissance: string; lieuNaissance: string;
  sexe: "M" | "F"; email: string; telephone: string; cni: string; adresse: string;
  collectivite: string; region: string; direction?: string; fonction: string;
  matriculePro?: string; dateEmbauche?: string; ayantsDroit?: string; photoIdentite?: string;
  ficheSignee?: string; autorisationSignee?: string; cniDocument?: string; extraitNaissance?: string;
  password: string; paiement: "orange" | "mtn" | "wave" | "moov";
};

const steps = [
  { id: 1, label: "Formulaire", icon: User },
  { id: 2, label: "Documents signés", icon: FileText },
  { id: 3, label: "Paiement", icon: CreditCard },
  { id: 4, label: "Confirmation", icon: BadgeCheck },
];

function Page() {
  const nav = useNavigate();
  const finalize = useServerFn(finalizeRegistration);
  const [step, setStep] = useState(1);
  const [data, setData] = useState<Partial<FormData>>({ sexe: "M", paiement: "orange" });
  const [submitting, setSubmitting] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState<"fiche" | "autorisation" | null>(null);

  // Reprise du brouillon depuis localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setData((d) => ({ ...d, ...parsed }));
      }
    } catch { /* ignore */ }
  }, []);

  // Persistance automatique locale + serveur (avec device fingerprint requis par RLS)
  useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); } catch { /* ignore */ }
      if (isSupabaseConfigured && data.email && data.email.includes("@")) {
        let fp = "";
        try {
          fp = localStorage.getItem("mugec_device_fp") ?? "";
          if (!fp) {
            fp = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`) + "-" + (navigator.userAgent.length);
            localStorage.setItem("mugec_device_fp", fp);
          }
        } catch { /* ignore */ }
        if (fp.length >= 8) {
          supabase.from("registration_drafts").upsert(
            { email: data.email.toLowerCase(), telephone: data.telephone ?? null, nom: data.nom ?? null, prenoms: data.prenoms ?? null, step, data, device_fingerprint: fp },
            { onConflict: "email" },
          ).then(() => { /* noop */ });
        }
      }
    }, 800);
    return () => clearTimeout(t);
  }, [data, step]);


  const upd = (k: keyof FormData, v: string) => setData((d) => ({ ...d, [k]: v }));
  const val = (k: keyof FormData) => (data[k] ?? "") as string;

  async function downloadFiche() {
    setGeneratingPdf("fiche");
    try {
      const blob = await generateFicheAdhesionPDF(data as DraftData);
      downloadBlob(blob, `fiche-inscription-${data.nom ?? "mugec"}.pdf`);
    } finally { setGeneratingPdf(null); }
  }
  async function downloadAutorisation() {
    setGeneratingPdf("autorisation");
    try {
      const blob = await generateAutorisationPrelevementPDF(data as DraftData);
      downloadBlob(blob, `autorisation-prelevement-${data.nom ?? "mugec"}.pdf`);
    } finally { setGeneratingPdf(null); }
  }


  function validateStep(): boolean {
    try {
      if (step === 1) step1Schema.parse(data);
      if (step === 2) step2Schema.parse(data);
      if (step === 3) {
        if (!data.password || !passwordSchema.safeParse(data.password).success) {
          toast.error("Le mot de passe doit contenir 8 caractères, une majuscule, un chiffre et un caractère spécial.");
          return false;
        }
      }
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        err.errors.slice(0, 3).forEach((e) => toast.error(e.message));
      } else {
        toast.error("Veuillez vérifier le formulaire.");
      }
      return false;
    }
  }

  async function submit() {
    if (!validateStep()) return;
    if (!isSupabaseConfigured) {
      toast.error("Supabase non configuré. Contactez l’administrateur.");
      return;
    }
    setSubmitting(true);
    try {
      // 1) Création du compte Auth
      const { error: authErr } = await supabase.auth.signUp({
        email: data.email!,
        password: data.password!,
        options: { emailRedirectTo: `${window.location.origin}/membre` },
      });
      if (authErr && !/already/i.test(authErr.message)) throw authErr;

      // 2) Connexion immédiate
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: data.email!,
        password: data.password!,
      });
      if (signInErr) throw signInErr;

      // 3) Référence paiement simulée — à remplacer par webhook CinetPay/Fedapay
      const payRef = `${(data.paiement ?? "pay").toUpperCase()}-${Date.now()}`;

      // 4) Finalisation : crée le membre, la souscription split, déclenche notifications
      await finalize({
        data: {
          nom: data.nom!,
          prenoms: data.prenoms!,
          date_naissance: data.dateNaissance!,
          lieu_naissance: data.lieuNaissance!,
          sexe: data.sexe!,
          email: data.email!,
          telephone: data.telephone!,
          cni: data.cni!,
          adresse: data.adresse!,
          collectivite: data.collectivite!,
          region: data.region!,
          direction: data.direction || null,
          fonction: data.fonction!,
          matricule_pro: data.matriculePro || null,
          date_embauche: data.dateEmbauche || null,
          ayants_droit: data.ayantsDroit || null,
          paiement_methode: data.paiement!,
          payment_reference: payRef,
        },
      });

      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      toast.success("Inscription validée. Bienvenue !");
      nav({ to: "/membre" });

    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="container mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold tracking-tight">Formulaire d'inscription</h1>
        <p className="mt-2 text-muted-foreground">
          Étape {step} sur 4 — vos informations sont sauvegardées automatiquement. Frais d'inscription : <strong>5 000 FCFA</strong>.
        </p>

        <div className="mt-6">
          <Progress value={(step / 4) * 100} />
          <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
            {steps.map((s) => (
              <div key={s.id} className={`flex items-center gap-2 rounded-md border p-3 text-sm ${
                s.id === step ? "border-primary bg-primary/5 text-primary" : s.id < step ? "border-accent/40 bg-accent/5 text-accent" : "text-muted-foreground"
              }`}>
                {s.id < step ? <Check className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
                <span className="font-medium">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <Card className="relative mt-8 overflow-hidden">
          <Watermark opacity={0.07} />
          <CardContent className="relative p-8">
            {step === 1 && (
              <div className="grid gap-4 md:grid-cols-2">
                <F label="Nom" v={val("nom")} on={(v) => upd("nom", v)} />
                <F label="Prénoms" v={val("prenoms")} on={(v) => upd("prenoms", v)} />
                <F label="Date de naissance" type="date" v={val("dateNaissance")} on={(v) => upd("dateNaissance", v)} />
                <F label="Lieu de naissance" v={val("lieuNaissance")} on={(v) => upd("lieuNaissance", v)} />
                <div>
                  <Label>Sexe</Label>
                  <Select value={data.sexe} onValueChange={(v) => upd("sexe", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Masculin</SelectItem>
                      <SelectItem value="F">Féminin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <F label="N° CNI" v={val("cni")} on={(v) => upd("cni", v)} />
                <F label="Matricule Solde" v={val("matriculePro")} on={(v) => upd("matriculePro", v)} />
                <F label="E-mail" type="email" v={val("email")} on={(v) => upd("email", v)} />
                <F label="Téléphone (WhatsApp)" v={val("telephone")} on={(v) => upd("telephone", v)} />
                <FileF label="Photo d’identité (JPG/PNG, max 2 Mo)" v={val("photoIdentite")} on={(v) => upd("photoIdentite", v)} />
                <F label="Collectivité d'origine" v={val("collectivite")} on={(v) => upd("collectivite", v)} />
                <F label="Région" v={val("region")} on={(v) => upd("region", v)} />
                <F label="Direction / Service" v={val("direction")} on={(v) => upd("direction", v)} />
                <F label="Fonction" v={val("fonction")} on={(v) => upd("fonction", v)} />
                <F label="Date d'embauche" type="date" v={val("dateEmbauche")} on={(v) => upd("dateEmbauche", v)} />
                <div className="md:col-span-2">
                  <Label>Adresse</Label>
                  <Textarea value={val("adresse")} onChange={(e) => upd("adresse", e.target.value)} rows={2} />
                </div>
                <div className="md:col-span-2">
                  <Label>Ayants-droit (père, mère, conjoint, enfants — maximum 4 enfants)</Label>
                  <Textarea value={val("ayantsDroit")} onChange={(e) => upd("ayantsDroit", e.target.value)} rows={3}
                    placeholder="Ex : Père — Kouadio Koffi. Mère — Aya Koffi. Conjoint — ... Enfants : nom, prénoms, date de naissance." />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
                  <h3 className="flex items-center gap-2 font-semibold text-primary">
                    <FileText className="h-4 w-4" /> Documents pré-remplis
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Téléchargez les documents pré-remplis, imprimez-les, signez-les puis téléversez les scans exigés à l’étape suivante.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={downloadFiche} disabled={generatingPdf !== null}>
                      <Download className="mr-2 h-4 w-4" />
                      {generatingPdf === "fiche" ? "Génération…" : "Fiche d’inscription (pré-remplie)"}
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={downloadAutorisation} disabled={generatingPdf !== null}>
                      <Download className="mr-2 h-4 w-4" />
                      {generatingPdf === "autorisation" ? "Génération…" : "Autorisation de prélèvement (pré-remplie)"}
                    </Button>
                    <a href="/documents/reglement-interieur-mugec-ci.pdf" target="_blank" rel="noreferrer"
                       className="inline-flex h-9 items-center rounded-md border px-3 text-sm hover:bg-secondary">
                      <FileText className="mr-2 h-4 w-4" /> Règlement intérieur
                    </a>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <FileF label="Fiche d’inscription signée" v={val("ficheSignee")} on={(v) => upd("ficheSignee", v)} />
                  <FileF label="Autorisation de prélèvement signée" v={val("autorisationSignee")} on={(v) => upd("autorisationSignee", v)} />
                  <FileF label="Copie CNI ou passeport" v={val("cniDocument")} on={(v) => upd("cniDocument", v)} />
                  <FileF label="Extrait de naissance" v={val("extraitNaissance")} on={(v) => upd("extraitNaissance", v)} />
                </div>
              </div>
            )}


            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <Label>Choisissez votre moyen de paiement (5 000 FCFA)</Label>
                  <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
                    {[
                      { id: "orange", name: "Orange Money" },
                      { id: "mtn", name: "MTN MoMo" },
                      { id: "wave", name: "Wave" },
                      { id: "moov", name: "Moov Money" },
                    ].map((m) => (
                      <button key={m.id} type="button" onClick={() => upd("paiement", m.id)}
                        className={`rounded-md border p-4 text-sm font-medium transition ${
                          data.paiement === m.id ? "border-primary bg-primary/10 text-primary" : "hover:bg-secondary"
                        }`}>{m.name}</button>
                    ))}
                  </div>
                </div>
                <F label="Numéro de téléphone du paiement" v={val("telephone")} on={(v) => upd("telephone", v)} />
                <div>
                  <Label>Créez un mot de passe sécurisé</Label>
                  <Input type="password" value={val("password")} onChange={(e) => upd("password", e.target.value)} />
                </div>
                <div className="rounded-md bg-secondary/60 p-4 text-sm text-muted-foreground">
                  En cliquant sur <strong>Payer & confirmer</strong>, vous acceptez les statuts de la MUGEC-CI
                  et autorisez le débit de 5 000 FCFA sur le numéro renseigné.
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <div className="rounded-md border border-primary/30 bg-primary/5 p-5">
                  <h3 className="flex items-center gap-2 font-semibold text-primary"><BadgeCheck className="h-4 w-4" /> Confirmation du dossier</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Après confirmation du paiement, le compte membre, le matricule, la fiche finale avec QR code et la carte CR80 recto/verso sont générés automatiquement.
                  </p>
                </div>
                <dl className="grid gap-3 text-sm md:grid-cols-2">
                  <Summary k="Nom complet" v={`${data.prenoms ?? ""} ${data.nom ?? ""}`.trim()} />
                  <Summary k="Téléphone" v={data.telephone ?? "—"} />
                  <Summary k="Collectivité" v={data.collectivite ?? "—"} />
                  <Summary k="Paiement" v={`${data.paiement ?? "orange"} — 5 000 FCFA`} />
                </dl>
              </div>
            )}

            <div className="mt-8 flex items-center justify-between">
              <Button type="button" variant="ghost" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Précédent
              </Button>
              {step < 4 ? (
                <Button type="button" onClick={() => validateStep() && setStep((s) => s + 1)}>
                  Continuer <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button type="button" onClick={submit} disabled={submitting}>
                  {submitting ? "Traitement…" : "Payer & confirmer"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
      <SiteFooter />
    </div>
  );
}

function F({ label, v, on, type = "text" }: { label: string; v: string; on: (v: string) => void; type?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input type={type} value={v} onChange={(e) => on(e.target.value)} />
    </div>
  );
}

function FileF({ label, v, on }: { label: string; v: string; on: (v: string) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        type="file"
        accept=".pdf,image/png,image/jpeg"
        onChange={(e) => on(e.target.files?.[0]?.name ?? "")}
      />
      {v ? <p className="mt-1 text-xs text-muted-foreground">Fichier sélectionné : {v}</p> : null}
    </div>
  );
}

function Summary({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-md border bg-background/80 p-3">
      <dt className="text-xs text-muted-foreground">{k}</dt>
      <dd className="mt-1 font-medium text-foreground">{v || "—"}</dd>
    </div>
  );
}
