import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Store,
  Calendar,
  Library,
  LogOut,
  Plug,
  Upload,
  Shield,
  Sparkle,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/use-is-admin";

interface SidebarItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  featured?: boolean;
  badge?: string;
}

const items: SidebarItem[] = [
  { title: "Tableau de bord", url: "/dashboard", icon: LayoutDashboard },
  {
    title: "Import catalogue",
    url: "/catalog",
    icon: Upload,
    featured: true,
    badge: "IA",
  },
  { title: "Mon magasin", url: "/store", icon: Store },
  { title: "Calendrier", url: "/calendar", icon: Calendar },
  { title: "Bibliothèque", url: "/library", icon: Library },
  { title: "Connexions", url: "/connections", icon: Plug },
  { title: "Tarifs", url: "/pricing", icon: Sparkle },
];

const adminItems: SidebarItem[] = [
  { title: "Admin", url: "/admin", icon: Shield },
];

export function AppSidebar({ userName }: { userName?: string }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { isAdmin } = useIsAdmin();
  const allItems = isAdmin ? [...items, ...adminItems] : items;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-gradient text-white font-bold shadow-brand">
            K
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-none text-brand-gradient">
              Komaag
            </span>
            <span className="text-[10px] text-muted-foreground">
              Contenus social-media
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {allItems.map((it) => {
                const active = path === it.url;
                const isFeatured = it.featured;

                const featuredClasses =
                  "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary font-semibold " +
                  "data-[active=true]:bg-primary/20 data-[active=true]:text-primary";

                const defaultClasses =
                  "data-[active=true]:bg-brand-gradient-soft data-[active=true]:text-foreground data-[active=true]:font-semibold";

                return (
                  <SidebarMenuItem key={it.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      className={isFeatured ? featuredClasses : defaultClasses}
                    >
                      <Link to={it.url} className="flex items-center gap-2">
                        <span
                          className={
                            active || isFeatured
                              ? "text-primary inline-flex"
                              : "inline-flex"
                          }
                        >
                          <it.icon
                            className={isFeatured ? "h-5 w-5" : "h-4 w-4"}
                          />
                        </span>
                        <span className="flex items-center gap-2">
                          {it.title}
                          {it.badge && (
                            <span className="inline-flex items-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                              {it.badge}
                            </span>
                          )}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t">
        <div className="flex items-center justify-between gap-2 px-2 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{userName ?? "—"}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth" });
            }}
            aria-label="Se déconnecter"
            title="Se déconnecter"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Se déconnecter</span>
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
