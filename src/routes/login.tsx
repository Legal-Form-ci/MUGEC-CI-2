import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { toast } from "sonner";
import logo from "@/assets/mugec-logo.png";

export const Route = createFileRoute("/login")({
  component: Page,
});

function Page() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function resolveEmail(input: string): Promise<string | null> {
    const v = input.trim();
    if (v.includes("@")) return v;
    // Résolution 100% côté serveur (n'expose plus aucun identifiant admin
    // ni domaine d'email interne dans le bundle client).
    const { data, error } = await supabase.rpc("resolve_login_email", { p_identifier: v });
    if (error) return null;
    return typeof data === "string" && data.length > 0 ? data : null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      toast.error("Lovable Cloud / Supabase n'est pas encore connecté.");
      return;
    }
    setLoading(true);
    try {
      const email = await resolveEmail(identifier);
      if (!email) {
        toast.error("Identifiant inconnu.");
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
        return;
      }
      // Redirection selon rôle via une fonction RPC sécurisée (évite les 403 RLS).
      let target = "/membre";
      try {
        const { data: path } = await supabase.rpc("current_user_dashboard_path");
        if (typeof path === "string" && path.length > 0) target = path;
      } catch {
        // garde /membre par défaut
      }
      toast.success("Bienvenue !");
      window.location.assign(target);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="container mx-auto max-w-md px-4 py-16">
        <Card>
          <CardContent className="p-8">
            <img src={logo} alt="MUGEC-CI" className="mx-auto h-16" />
            <h1 className="mt-4 text-center text-2xl font-bold">Espace membre</h1>
            <p className="mt-1 text-center text-sm text-muted-foreground">Connectez-vous à votre compte MUGEC-CI</p>
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div>
                <Label htmlFor="identifier">Identifiant (numéro de téléphone ou identifiant admin)</Label>
                <Input id="identifier" type="text" required value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="Ex: 0758894363 ou adminmugec" />
              </div>
              <div>
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Connexion…" : "Se connecter"}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Pas encore membre ? <Link to="/inscription" className="text-primary underline">S'inscrire</Link>
            </p>
          </CardContent>
        </Card>
      </section>
      <SiteFooter />
    </div>
  );
}
