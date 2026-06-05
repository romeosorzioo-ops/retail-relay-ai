import {
  createFileRoute,
  Outlet,
  redirect,
  useRouter,
} from "@tanstack/react-router";
import {
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const { data: profile } = await supabase
      .from("profiles")
      .select("name, email")
      .eq("id", data.user.id)
      .maybeSingle();
    return {
      user: {
        id: data.user.id,
        email: data.user.email ?? profile?.email ?? "",
        name: profile?.name || data.user.user_metadata?.name || "",
      },
    };
  },
  component: AuthedLayout,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-destructive">{error.message}</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-3 text-sm underline"
        >
          Réessayer
        </button>
      </div>
    );
  },
  notFoundComponent: () => (
    <div className="p-8 text-center text-sm text-muted-foreground">
      Page introuvable.
    </div>
  ),
});

function AuthedLayout() {
  const { user } = Route.useRouteContext();
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar userName={user.name} />
        <div className="flex flex-1 flex-col">
          <header className="flex h-12 items-center gap-2 border-b bg-background px-4">
            <SidebarTrigger />
            <span className="text-sm text-muted-foreground">KomTonMag AI</span>
          </header>
          <main className="flex-1 bg-muted/20">
            <Outlet />
          </main>
        </div>
      </div>
      <Toaster />
    </SidebarProvider>
  );
}
