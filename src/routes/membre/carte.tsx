import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Watermark } from "@/components/Watermark";
import logo from "@/assets/mugec-logo.png";
import watermarkUrl from "@/assets/mugec-watermark.png";
import { Download, Printer, Loader2 } from "lucide-react";
import QRCode from "qrcode";
import jsPDF from "jspdf";

export const Route = createFileRoute("/membre/carte")({
  component: Page,
});

type Member = {
  nom?: string;
  prenoms?: string;
  email?: string;
  telephone?: string;
  collectivite?: string;
  region?: string;
  fonction?: string;
  matricule?: string;
  cni?: string;
  date_naissance?: string;
  lieu_naissance?: string;
  date_inscription?: string;
  statut?: string;
  type_membre?: string;
  photo_url?: string;
  qr_code?: string;
};

let imageCache: Record<string, string> = {};
async function imageToDataUrl(src: string) {
  if (imageCache[src]) return imageCache[src];
  const res = await fetch(src);
  const blob = await res.blob();
  imageCache[src] = await new Promise<string>((resolve) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.readAsDataURL(blob);
  });
  return imageCache[src];
}

function addPdfWatermark(pdf: jsPDF, watermarkData: string) {
  const anyPdf = pdf as unknown as { GState: new (o: { opacity: number }) => unknown; setGState: (g: unknown) => void };
  anyPdf.setGState(new anyPdf.GState({ opacity: 0.07 }));
  pdf.addImage(watermarkData, "PNG", 20, 7, 45, 40, undefined, "FAST");
  anyPdf.setGState(new anyPdf.GState({ opacity: 1 }));
}

function writeLabelValue(pdf: jsPDF, label: string, value: string | undefined, x: number, y: number, maxWidth: number) {
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(5.4);
  pdf.setTextColor(30, 91, 168);
  pdf.text(label.toUpperCase(), x, y);
  pdf.setFont("courier", "normal");
  pdf.setFontSize((value?.length ?? 0) > 26 ? 6.2 : 7);
  pdf.setTextColor(26, 58, 143);
  pdf.text(value?.trim() || "—", x, y + 3.5, { maxWidth });
}

function drawCardFront(pdf: jsPDF, m: Member, qr: string, logoData: string, watermarkData: string) {
  addPdfWatermark(pdf, watermarkData);
  pdf.setDrawColor(30, 91, 168);
  pdf.setLineWidth(0.7);
  pdf.rect(1.5, 1.5, 82.6, 51, "S");
  pdf.addImage(logoData, "PNG", 4, 3.5, 15, 12, undefined, "FAST");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.5);
  pdf.setTextColor(30, 91, 168);
  pdf.text("CARTE DE MEMBRE MUGEC-CI", 42.8, 7.5, { align: "center" });
  pdf.setFontSize(4.8);
  pdf.setTextColor(40, 40, 40);
  pdf.text("Mutuelle Générale du Personnel des Collectivités Territoriales", 42.8, 11.2, { align: "center" });
  pdf.setDrawColor(210, 210, 210);
  pdf.roundedRect(5, 17, 17, 22, 1, 1, "S");
  pdf.setFontSize(5);
  pdf.setTextColor(120, 120, 120);
  pdf.text("PHOTO", 13.5, 28.5, { align: "center" });
  writeLabelValue(pdf, "Nom & prénoms", `${m.nom ?? ""} ${m.prenoms ?? ""}`.trim(), 25, 18, 38);
  writeLabelValue(pdf, "Matricule", m.matricule, 25, 26, 30);
  writeLabelValue(pdf, "Type", m.type_membre ?? "office", 58, 26, 18);
  writeLabelValue(pdf, "Collectivité", m.collectivite, 25, 34, 34);
  writeLabelValue(pdf, "Statut", m.statut ?? "actif", 58, 34, 18);
  writeLabelValue(pdf, "Date d'inscription", m.date_inscription ? new Date(m.date_inscription).toLocaleDateString("fr-FR") : "—", 25, 42, 30);
  if (qr) pdf.addImage(qr, "PNG", 64, 31, 17, 17, undefined, "FAST");
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(3.8);
  pdf.setTextColor(70, 70, 70);
  pdf.text("QR code vérifiable — marge haute correction pour impression", 64, 50);
}

function drawCardBack(pdf: jsPDF, m: Member, watermarkData: string) {
  addPdfWatermark(pdf, watermarkData);
  pdf.setDrawColor(30, 91, 168);
  pdf.setLineWidth(0.7);
  pdf.rect(1.5, 1.5, 82.6, 51, "S");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(30, 91, 168);
  pdf.text("MUGEC-CI", 42.8, 10, { align: "center" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(5.8);
  pdf.setTextColor(40, 40, 40);
  pdf.text("Cette carte est strictement personnelle et demeure la propriété de la MUGEC-CI.", 42.8, 19, { align: "center", maxWidth: 70 });
  pdf.text("En cas de perte, prévenir immédiatement la mutuelle.", 42.8, 27, { align: "center", maxWidth: 70 });
  pdf.setFont("helvetica", "bold");
  pdf.text("À retourner à la MUGEC-CI en cas de cessation de qualité de membre.", 42.8, 35, { align: "center", maxWidth: 70 });
  pdf.setFont("courier", "normal");
  pdf.setTextColor(26, 58, 143);
  pdf.text(`Matricule : ${m.matricule ?? "—"}`, 42.8, 43, { align: "center" });
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(30, 91, 168);
  pdf.text("Tél : 07 58 89 43 63 / 07 08 27 67 51", 42.8, 49, { align: "center" });
}

function Page() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const [m, setM] = useState<Member>({});
  const [qr, setQr] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user && isSupabaseConfigured) nav({ to: "/login" });
  }, [loading, user, nav]);

  useEffect(() => {
    (async () => {
      if (user && isSupabaseConfigured) {
        const { data } = await supabase.from("members").select("*").eq("user_id", user.id).maybeSingle();
        if (data) setM(data as Member);
      } else {
        setM({
          nom: "DEMO",
          prenoms: "Utilisateur",
          email: "demo@mugec-ci.org",
          telephone: "+225 00 00 00 00",
          collectivite: "Mairie de Cocody",
          region: "Abidjan",
          fonction: "Agent administratif",
          matricule: "MUGEC-2026-0001",
          cni: "CI00000000",
          date_naissance: "1985-04-12",
          lieu_naissance: "Abidjan",
        });
      }
    })();
  }, [user]);

  useEffect(() => {
    const id = m.matricule ?? user?.id ?? "demo";
    const verifyUrl = m.qr_code ?? `https://mugec-ci.ivoireprojet.com/verifier/${encodeURIComponent(id)}`;
    QRCode.toDataURL(verifyUrl, {
      width: 420,
      margin: 4,
      errorCorrectionLevel: "H",
      color: { dark: "#000000", light: "#ffffff" },
    }).then(setQr);
  }, [m, user]);

  async function downloadPDF() {
    setBusy(true);
    try {
      const logoData = await imageToDataUrl(logo);
      const watermarkData = await imageToDataUrl(watermarkUrl);
      const pdf = new jsPDF({ unit: "mm", format: [85.6, 54], orientation: "landscape" });
      drawCardFront(pdf, m, qr, logoData, watermarkData);
      pdf.addPage([85.6, 54], "landscape");
      drawCardBack(pdf, m, watermarkData);
      pdf.save(`carte-membre-recto-verso-${m.matricule ?? "mugec"}.pdf`);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="container mx-auto max-w-4xl px-4 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Carte et fiche membre</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Imprimer
            </Button>
            <Button onClick={downloadPDF} disabled={busy}>
              <Download className="mr-2 h-4 w-4" /> {busy ? "Génération…" : "Télécharger en PDF"}
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {/* Fiche imprimable avec FILIGRANE */}
            <div ref={ref} className="relative bg-white p-10 text-slate-800" style={{ minHeight: 1000 }}>
              <Watermark opacity={0.08} />

              <div className="relative">
                {/* Header */}
                <div className="flex items-start justify-between border-b-4 border-primary pb-4">
                  <img src={logo} alt="MUGEC-CI" className="h-20 w-auto" />
                  <div className="text-right text-xs">
                    <div className="font-semibold">RÉPUBLIQUE DE CÔTE D'IVOIRE</div>
                    <div>Union – Discipline – Travail</div>
                    <div className="mt-2 font-bold text-primary">FICHE MEMBRE N° {m.matricule ?? "—"}</div>
                  </div>
                </div>

                <h2 className="mt-6 text-center text-xl font-bold uppercase tracking-wide text-primary">
                  Mutuelle Générale du Personnel des Collectivités Territoriales
                </h2>

                <div className="mt-8 grid grid-cols-3 gap-6">
                  {/* Photo */}
                  <div className="col-span-1">
                    <div className="flex h-44 w-36 items-center justify-center rounded border-2 border-dashed text-xs text-muted-foreground">
                      Photo
                    </div>
                    {qr && <img src={qr} alt="QR" className="mt-4 h-28 w-28" />}
                  </div>

                  {/* Infos */}
                  <div className="col-span-2 space-y-2 text-sm">
                    <Info label="Nom" v={m.nom} />
                    <Info label="Prénoms" v={m.prenoms} />
                    <Info label="Date & lieu de naissance" v={`${m.date_naissance ?? "—"} à ${m.lieu_naissance ?? "—"}`} />
                    <Info label="N° CNI" v={m.cni} />
                    <Info label="Téléphone" v={m.telephone} />
                    <Info label="E-mail" v={m.email} />
                    <Info label="Collectivité" v={m.collectivite} />
                    <Info label="Région" v={m.region} />
                    <Info label="Fonction" v={m.fonction} />
                    <Info label="Matricule mutuelle" v={m.matricule} />
                  </div>
                </div>

                {/* Signatures */}
                <div className="mt-12 grid grid-cols-2 gap-12 text-xs">
                  <div className="border-t pt-2 text-center">Signature du membre</div>
                  <div className="border-t pt-2 text-center">Cachet & signature MUGEC-CI</div>
                </div>

                <div className="mt-10 text-center text-[10px] text-muted-foreground">
                  Document généré électroniquement par la plateforme MUGEC-CI — Valable avec QR Code vérifiable.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
      <SiteFooter />
    </div>
  );
}

function Info({ label, v }: { label: string; v?: string }) {
  return (
    <div className="flex gap-2 border-b border-dotted pb-1">
      <span className="w-56 font-semibold text-primary">{label} :</span>
      <span>{v ?? "—"}</span>
    </div>
  );
}
