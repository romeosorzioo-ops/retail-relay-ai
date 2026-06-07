import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useRouterState,
} from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Shield } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/auth" });
    const { data: rows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", u.user.id)
      .eq("role", "admin")
      .limit(1);
    if (!rows || rows.length === 0) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: AdminLayout,
});

const tabs: Array<{ to: string; label: string; exact?: boolean }> = [
  { to: "/admin", label: "Tableau de bord", exact: true },
  { to: "/admin/templates", label: "Templates" },
  { to: "/admin/fonts", label: "Typographies" },
  { to: "/admin/graphics", label: "Éléments graphiques" },
  { to: "/admin/presets", label: "Presets" },
  { to: "/admin/brand-guidelines", label: "Chartes" },
];

function AdminLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-4 flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold">Administration Komaag</h1>
      </div>
      <div className="mb-6 flex flex-wrap gap-1 border-b">
        {tabs.map((t) => {
          const active = t.exact ? path === t.to : path.startsWith(t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              className={`rounded-t-md border-b-2 px-3 py-2 text-sm transition ${
                active
                  ? "border-primary text-primary font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
      <Outlet />
    </div>
  );
}
