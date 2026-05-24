import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Phone, MapPin } from "lucide-react";

export const Route = createFileRoute("/contact")({
  component: Page,
});

function Page() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="container mx-auto max-w-4xl px-4 py-16">
        <h1 className="text-4xl font-bold tracking-tight">Contact</h1>
        <p className="mt-3 text-muted-foreground">Joignez la MUGEC-CI ou l'une de nos représentations régionales.</p>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <Card><CardContent className="p-6 text-center"><MapPin className="mx-auto h-8 w-8 text-primary" /><p className="mt-3 text-sm">Siège — Abidjan, Côte d'Ivoire</p></CardContent></Card>
          <Card><CardContent className="p-6 text-center"><Phone className="mx-auto h-8 w-8 text-primary" /><p className="mt-3 text-sm">+225 00 00 00 00</p></CardContent></Card>
          <Card><CardContent className="p-6 text-center"><Mail className="mx-auto h-8 w-8 text-primary" /><p className="mt-3 text-sm">contact@mugec-ci.org</p></CardContent></Card>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
