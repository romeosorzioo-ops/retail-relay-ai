import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  adminListTemplatesFn,
  adminListFontAssetsFn,
  adminListGraphicAssetsFn,
  adminListPresetsFn,
} from "@/lib/admin-assets.functions";
import { getCatalogPipelineDebugFn } from "@/lib/catalog.functions";
import { AlertTriangle, CheckCircle2, FileImage, Layers, Shapes, Timer, Type } from "lucide-react";

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
  const catalogDebug = useQuery({
    queryKey: ["admin", "catalog-pipeline-debug"],
    queryFn: () => getCatalogPipelineDebugFn(),
    refetchInterval: 15000,
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

  const debug = catalogDebug.data;
  const latest = debug?.imports?.[0];
  const paymentErrors =
    latest?.pages?.filter((p: any) => /payment required/i.test(p.error_message ?? "")) ?? [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Timer className="h-4 w-4 text-primary" /> Debug pipeline catalogue
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <Metric
              label="Pages analysées"
              value={
                latest ? `${latest.analyzedPages}/${latest.page_count ?? latest.pages.length}` : "—"
              }
            />
            <Metric label="Promotions détectées" value={latest?.promotionsDetected ?? "—"} />
            <Metric
              label="Modèle analyse"
              value={debug?.architecture.catalogAnalysis.model ?? "—"}
            />
            <Metric label="Coût estimé" value={latest ? `${latest.estimatedCostEur} €` : "—"} />
          </div>

          {debug && (
            <div className="grid gap-3 md:grid-cols-2">
              <StatusLine
                ok={debug.variables.LOVABLE_API_KEY.configured}
                label="Analyse catalogue"
                value={`${debug.architecture.catalogAnalysis.provider} · ${debug.architecture.catalogAnalysis.endpoint}`}
              />
              <StatusLine
                ok={debug.variables.OPENAI_API_KEY.ok}
                label="Génération visuels"
                value={`OpenAI · statut ${debug.variables.OPENAI_API_KEY.status ?? "non testé"}`}
              />
            </div>
          )}

          {paymentErrors.length > 0 && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <div className="mb-2 flex items-center gap-2 font-semibold text-destructive">
                <AlertTriangle className="h-4 w-4" /> {paymentErrors.length} page(s) en Payment
                Required
              </div>
              <div className="max-h-64 space-y-2 overflow-auto text-xs">
                {paymentErrors.slice(0, 8).map((p: any) => (
                  <pre
                    key={`${p.catalog_import_id}-${p.page_number}`}
                    className="whitespace-pre-wrap rounded bg-background p-2"
                  >
                    {JSON.stringify(
                      {
                        page: p.page_number,
                        status: p.status,
                        error: p.error_message,
                        details: p.notes ? safeJson(p.notes) : null,
                      },
                      null,
                      2,
                    )}
                  </pre>
                ))}
              </div>
            </div>
          )}

          {latest && (
            <div className="rounded-lg border p-3 text-xs text-muted-foreground">
              Dernier catalogue : <b className="text-foreground">{latest.file_name}</b> · statut{" "}
              {latest.status} · temps debug {debug?.durationMs ?? "—"} ms
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function StatusLine({ ok, label, value }: { ok: boolean; label: string; value: string }) {
  const Icon = ok ? CheckCircle2 : AlertTriangle;
  return (
    <div className="flex items-start gap-2 rounded-lg border p-3 text-sm">
      <Icon
        className={ok ? "mt-0.5 h-4 w-4 text-emerald-600" : "mt-0.5 h-4 w-4 text-destructive"}
      />
      <div className="min-w-0">
        <p className="font-medium">{label}</p>
        <p className="truncate text-xs text-muted-foreground">{value}</p>
      </div>
    </div>
  );
}

function safeJson(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
