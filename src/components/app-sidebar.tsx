import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Store,
  Tag,
  Sparkles,
  Calendar,
  Library,
  LogOut,
  Plug,
  Palette,
  FileUp,
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

const items = [
  { title: "Tableau de bord", url: "/dashboard", icon: LayoutDashboard },
  { title: "Mon magasin", url: "/store", icon: Store },
  { title: "Promotions", url: "/promotions", icon: Tag },
  { title: "Import catalogue", url: "/catalog", icon: FileUp },
  { title: "Génération IA", url: "/generate", icon: Sparkles },
  { title: "Création", url: "/creation", icon: Palette },
  { title: "Calendrier", url: "/calendar", icon: Calendar },
  { title: "Bibliothèque", url: "/library", icon: Library },
  { title: "Connexions", url: "/connections", icon: Plug },
];

const adminItems = [
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
                return (
                  <SidebarMenuItem key={it.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      className="data-[active=true]:bg-brand-gradient-soft data-[active=true]:text-foreground data-[active=true]:font-semibold"
                    >
                      <Link to={it.url} className="flex items-center gap-2">
                        <span className={active ? "icon-brand inline-flex" : "inline-flex"}>
                          <it.icon className="h-4 w-4" />
                        </span>
                        <span>{it.title}</span>
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
