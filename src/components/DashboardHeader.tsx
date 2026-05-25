import { Link, useLocation } from "@tanstack/react-router";
import logo from "@/assets/mugec-logo.png";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Home, Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type NavItem = { to: string; label: string };

export function DashboardHeader({
  title,
  nav,
}: {
  title: string;
  nav: NavItem[];
}) {
  const { user, signOut } = useAuth();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<{ photo_url: string | null; nom: string | null; prenoms: string | null } | null>(null);

  useEffect(() => {
    let active = true;
    if (!user) { setMe(null); return; }
    supabase
      .from("members")
      .select("photo_url, nom, prenoms")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => { if (active) setMe(data as any); });
    return () => { active = false; };
  }, [user?.id]);

  const initials = ((me?.prenoms?.[0] ?? user?.email?.[0] ?? "?") + (me?.nom?.[0] ?? "")).toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="container mx-auto flex h-20 max-w-7xl items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-3 min-w-0">
          <img src={logo} alt="MUGEC-CI" className="h-14 w-auto" />
          <div className="hidden sm:block min-w-0">
            <div className="text-xs text-muted-foreground">Espace</div>
            <div className="text-sm font-semibold truncate">{title}</div>
          </div>
        </div>
        <nav className="hidden md:flex items-center gap-1">
          {nav.map((n) => {
            const active = loc.pathname === n.to;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground/80 hover:bg-secondary hover:text-primary"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
            <Link to="/"><Home className="mr-2 h-4 w-4" /> Retour au site public</Link>
          </Button>
          <Avatar className="h-9 w-9 border">
            {me?.photo_url ? <AvatarImage src={me.photo_url} alt="Photo" /> : null}
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <Button variant="ghost" size="sm" onClick={() => signOut()} title="Déconnexion">
            <LogOut className="mr-1 h-4 w-4" /> <span className="hidden sm:inline">Déconnexion</span>
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen((v) => !v)}>
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t bg-background">
          <div className="container mx-auto max-w-7xl px-4 py-2 flex flex-col">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm hover:bg-secondary"
              >
                {n.label}
              </Link>
            ))}
            <Link to="/" className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary">
              ← Retour au site public
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

export const MEMBRE_NAV: NavItem[] = [
  { to: "/membre", label: "Tableau de bord" },
  { to: "/membre/profil", label: "Profil" },
  { to: "/membre/carte", label: "Carte" },
  { to: "/membre/documents", label: "Documents" },
  { to: "/membre/cotisations", label: "Cotisations" },
];

export const ADMIN_NAV: NavItem[] = [
  { to: "/admin", label: "Tableau de bord" },
];
