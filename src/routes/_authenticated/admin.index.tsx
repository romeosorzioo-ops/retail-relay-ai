import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  adminListTemplatesFn,
  adminListFontAssetsFn,
  adminListGraphicAssetsFn,
  adminListPresetsFn,
} from "@/lib/admin-assets.functions";
import { FileImage, Type, Shapes, Layers } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const templates = useQuery({
    queryKey: ["admin", "templates"],
    queryFn: () => adminListTemplatesFn(),
  });
  const fonts = useQuery({
    queryKey: ["admin", "fonts"],
    queryFn: () => adminListFontAssetsFn(),
  });
  const graphics = useQuery({
    queryKey: ["admin", "graphics"],
    queryFn: () => adminListGraphicAssetsFn(),
  });
  const presets = useQuery({
    queryKey: ["admin", "presets"],
    queryFn: () => adminListPresetsFn(),
  });

  const stats = [
    {
      label: "Templates",
      icon: FileImage,
      total: templates.data?.length ?? 0,
      active: templates.data?.filter((t) => t.is_active).length ?? 0,
    },
    {
      label: "Typographies",
      icon: Type,
      total: fonts.data?.length ?? 0,
      active: fonts.data?.filter((t) => t.is_active).length ?? 0,
    },
    {
      label: "Éléments graphiques",
      icon: Shapes,
      total: graphics.data?.length ?? 0,
      active: graphics.data?.filter((t) => t.is_active).length ?? 0,
    },
    {
      label: "Presets",
      icon: Layers,
      total: presets.data?.length ?? 0,
      active: presets.data?.filter((t) => t.is_active).length ?? 0,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {s.label}
            </CardTitle>
            <s.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{s.total}</div>
            <p className="text-xs text-muted-foreground">
              {s.active} actif{s.active > 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
