import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tag, Sparkles, Calendar, ArrowRight, X } from "lucide-react";
import { dashboardStatsFn } from "@/lib/calendar.functions";
import { getPlanUsageFn } from "@/lib/scheduled-posts.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = Route.useRouteContext();
  const { data } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => dashboardStatsFn(),
  });
  const { data: usage } = useQuery({
    queryKey: ["plan-usage"],
    queryFn: () => getPlanUsageFn(),
  });
  const [dismissed, setDismissed] = useState(true);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setDismissed(localStorage.getItem("komaag-welcome-dismissed") === "1");
  }, []);
  const showWelcome =
    !dismissed && usage?.plan === "free" && (usage?.used ?? 0) === 0;
  function dismissWelcome() {
    localStorage.setItem("komaag-welcome-dismissed", "1");
    setDismissed(true);
  }


  const cards = [
    {
      label: "Promotions",
      value: data?.promotions ?? 0,
      icon: Tag,
      to: "/promotions",
    },
    {
      label: "Contenus générés",
      value: data?.contents ?? 0,
      icon: Sparkles,
      to: "/library",
    },
    {
      label: "Contenus planifiés",
      value: data?.planned ?? 0,
      icon: Calendar,
      to: "/calendar",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Bonjour, {user.name} 👋
        </h1>
        <p className="text-sm text-muted-foreground">
          Voici une vue d'ensemble de votre activité.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {c.label}
              </CardTitle>
              <c.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{c.value}</div>
              <Link
                to={c.to}
                className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Voir <ArrowRight className="h-3 w-3" />
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Commencer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>1. Complétez votre profil magasin.</p>
          <p>2. Ajoutez vos promotions de la semaine.</p>
          <p>3. Cliquez sur « Générer mes contenus ».</p>
          <div className="flex gap-2 pt-2">
            <Link to="/store">
              <Button variant="outline">Mon magasin</Button>
            </Link>
            <Link to="/generate">
              <Button>
                <Sparkles className="mr-1 h-4 w-4" /> Générer
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
