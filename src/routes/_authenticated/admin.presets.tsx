import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  adminListPresetsFn,
  adminListTemplatesFn,
  adminListFontAssetsFn,
  adminListGraphicAssetsFn,
  upsertPresetFn,
  deletePresetFn,
} from "@/lib/admin-assets.functions";
import { STORE_BRANDS } from "@/lib/store-brands";

export const Route = createFileRoute("/_authenticated/admin/presets")({
  component: PresetsAdmin,
});

const FORMATS = ["square", "portrait", "story"];
const BRAND_OPTS = ["Générique", ...STORE_BRANDS];

type Preset = {
  id: string;
  name: string;
  brand: string;
  format: string;
  template_id: string | null;
  title_font_id: string | null;
  price_font_id: string | null;
  graphic_asset_ids: string[];
  is_active: boolean;
};

function emptyForm(): Partial<Preset> {
  return {
    name: "",
    brand: "Générique",
    format: "square",
    template_id: null,
    title_font_id: null,
    price_font_id: null,
    graphic_asset_ids: [],
    is_active: true,
  };
}

function PresetsAdmin() {
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin", "presets"],
    queryFn: () => adminListPresetsFn() as Promise<Preset[]>,
  });
  const { data: templates = [] } = useQuery({
    queryKey: ["admin", "templates"],
    queryFn: () =>
      adminListTemplatesFn() as Promise<
        Array<{ id: string; name: string; brand: string | null; format: string }>
      >,
  });
  const { data: fonts = [] } = useQuery({
    queryKey: ["admin", "fonts"],
    queryFn: () =>
      adminListFontAssetsFn() as Promise<
        Array<{ id: string; name: string; usage: string }>
      >,
  });
  const { data: graphics = [] } = useQuery({
    queryKey: ["admin", "graphics"],
    queryFn: () =>
      adminListGraphicAssetsFn() as Promise<
        Array<{ id: string; name: string; type: string }>
      >,
  });

  const [form, setForm] = useState<Partial<Preset>>(emptyForm());

  const save = useMutation({
    mutationFn: (v: Partial<Preset>) =>
      upsertPresetFn({
        data: {
          id: v.id,
          name: v.name ?? "",
          brand: v.brand ?? "Générique",
          format: v.format ?? "square",
          template_id: v.template_id ?? null,
          title_font_id: v.title_font_id ?? null,
          price_font_id: v.price_font_id ?? null,
          graphic_asset_ids: v.graphic_asset_ids ?? [],
          config_json: {},
          is_active: v.is_active ?? true,
        },
      }),
    onSuccess: () => {
      toast.success("Preset enregistré.");
      qc.invalidateQueries({ queryKey: ["admin", "presets"] });
      setForm(emptyForm());
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deletePresetFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Supprimé.");
      qc.invalidateQueries({ queryKey: ["admin", "presets"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleGraphic = (id: string) => {
    const current = form.graphic_asset_ids ?? [];
    setForm({
      ...form,
      graphic_asset_ids: current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id],
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
      <div>
        <h2 className="mb-3 text-lg font-semibold">Presets de création</h2>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        <div className="space-y-2">
          {rows.map((r) => (
            <Card key={r.id} className={!r.is_active ? "opacity-60" : ""}>
              <CardContent className="flex items-center justify-between gap-3 p-3 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium">{r.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.brand} · {r.format}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setForm(r)}
                  >
                    Éditer
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() =>
                      confirm("Supprimer ?") && remove.mutate(r.id)
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <Card>
        <CardContent className="space-y-3 p-4">
          <h3 className="font-semibold">
            {form.id ? "Modifier" : "Nouveau preset"}
          </h3>
          <div>
            <Label>Nom</Label>
            <Input
              value={form.name ?? ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Enseigne</Label>
              <Select
                value={form.brand ?? "Générique"}
                onValueChange={(v) => setForm({ ...form, brand: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BRAND_OPTS.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Format</Label>
              <Select
                value={form.format ?? "square"}
                onValueChange={(v) => setForm({ ...form, format: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMATS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Template</Label>
            <Select
              value={form.template_id ?? "_none"}
              onValueChange={(v) =>
                setForm({ ...form, template_id: v === "_none" ? null : v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Aucun" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">— Aucun —</SelectItem>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({t.format})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Police titre</Label>
              <Select
                value={form.title_font_id ?? "_none"}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    title_font_id: v === "_none" ? null : v,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">—</SelectItem>
                  {fonts.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Police prix</Label>
              <Select
                value={form.price_font_id ?? "_none"}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    price_font_id: v === "_none" ? null : v,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">—</SelectItem>
                  {fonts.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Éléments graphiques</Label>
            <div className="max-h-48 space-y-1 overflow-auto rounded border p-2">
              {graphics.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Aucun élément disponible.
                </p>
              )}
              {graphics.map((g) => (
                <label
                  key={g.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <Checkbox
                    checked={(form.graphic_asset_ids ?? []).includes(g.id)}
                    onCheckedChange={() => toggleGraphic(g.id)}
                  />
                  <span className="truncate">
                    {g.name}{" "}
                    <span className="text-xs text-muted-foreground">
                      ({g.type})
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label>Actif</Label>
            <Switch
              checked={form.is_active ?? true}
              onCheckedChange={(c) => setForm({ ...form, is_active: c })}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => save.mutate(form)}
              disabled={save.isPending || !form.name}
            >
              {save.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {form.id ? "Enregistrer" : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Créer
                </>
              )}
            </Button>
            {form.id && (
              <Button variant="ghost" onClick={() => setForm(emptyForm())}>
                Annuler
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
