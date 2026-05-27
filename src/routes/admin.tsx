import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      throw redirect({ to: "/login" });
    }
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);
    const allowed = new Set([
      "super_admin", "admin_national", "admin_regional", "admin_local", "agent_saisie",
      "president", "secretaire_general", "tresorier_national", "commissaire_comptes",
      "directeur_executif", "comite_controle", "conseil_sages", "secretaire_regional",
      "tresorier_regional", "delegue_section",
    ]);
    const isAdmin = (roles ?? []).some((r) => allowed.has(String(r.role)));
    if (!isAdmin) {
      throw redirect({ to: "/membre" });
    }
  },
  component: () => <Outlet />,
});
