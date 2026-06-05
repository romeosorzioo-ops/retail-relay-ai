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


export function AppSidebar({ userName }: { userName?: string }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
            K
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-none">
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
              {items.map((it) => (
                <SidebarMenuItem key={it.url}>
                  <SidebarMenuButton asChild isActive={path === it.url}>
                    <Link to={it.url} className="flex items-center gap-2">
                      <it.icon className="h-4 w-4" />
                      <span>{it.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
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
            title="Déconnexion"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
