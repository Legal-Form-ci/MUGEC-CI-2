import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { MessageSquare, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/forum")({
  component: Page,
});

function Page() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="container mx-auto max-w-4xl px-4 py-16">
        <h1 className="text-4xl font-bold tracking-tight">Forum & Discussions</h1>
        <p className="mt-3 text-muted-foreground">Espace réservé aux membres enregistrés, modéré par les administrateurs.</p>
        {!user ? (
          <Card className="mt-10">
            <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
              <Lock className="h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">Connectez-vous pour accéder au forum.</p>
              <Button asChild><Link to="/login">Se connecter</Link></Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="mt-10">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 text-muted-foreground">
                <MessageSquare className="h-5 w-5" />
                Aucune discussion pour le moment. Soyez le premier à lancer un sujet !
              </div>
            </CardContent>
          </Card>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}
