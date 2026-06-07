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
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  adminListGraphicAssetsFn,
  upsertGraphicAssetFn,
  deleteGraphicAssetFn,
  GRAPHIC_TYPES,
} from "@/lib/admin-assets.functions";
import { AssetUploader } from "@/components/admin/asset-uploader";
import { STORE_BRANDS } from "@/lib/store-brands";

export const Route = createFileRoute("/_authenticated/admin/graphics")({
  component: GraphicsAdmin,
});

const BRAND_OPTS = ["", ...STORE_BRANDS];

type GType = (typeof GRAPHIC_TYPES)[number];
type Row = {
  id: string;
  name: string;
  type: GType;
  brand: string | null;
  file_url: string;
  is_active: boolean;
};

function emptyForm(): Partial<Row> {
  return {
    name: "",
    type: "badge",
    brand: null,
    file_url: "",
    is_active: true,
  };
}

function GraphicsAdmin() {
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin", "graphics"],
    queryFn: () => adminListGraphicAssetsFn() as Promise<Row[]>,
  });
  const [form, setForm] = useState<Partial<Row>>(emptyForm());

  const save = useMutation({
    mutationFn: (v: Partial<Row>) =>
      upsertGraphicAssetFn({
        data: {
          id: v.id,
          name: v.name ?? "",
          type: (v.type ?? "badge") as GType,
          brand: v.brand || null,
          file_url: v.file_url ?? "",
          is_active: v.is_active ?? true,
        },
      }),
    onSuccess: () => {
      toast.success("Élément enregistré.");
      qc.invalidateQueries({ queryKey: ["admin", "graphics"] });
      setForm(emptyForm());
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteGraphicAssetFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Supprimé.");
      qc.invalidateQueries({ queryKey: ["admin", "graphics"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div>
        <h2 className="mb-3 text-lg font-semibold">Éléments graphiques</h2>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {rows.map((r) => (
            <Card key={r.id} className={!r.is_active ? "opacity-60" : ""}>
              <CardContent className="space-y-2 p-2">
                <div className="flex aspect-square w-full items-center justify-center rounded bg-muted">
                  {r.file_url && (
                    <img
                      src={r.file_url}
                      alt={r.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  )}
                </div>
                <div className="truncate text-xs font-medium">{r.name}</div>
                <div className="truncate text-[10px] text-muted-foreground">
                  {r.type}
                  {r.brand ? ` · ${r.brand}` : ""}
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    onClick={() => setForm(r)}
                  >
                    Éditer
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-destructive"
                    onClick={() =>
                      confirm("Supprimer ?") && remove.mutate(r.id)
                    }
                  >
                    <Trash2 className="h-3 w-3" />
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
            {form.id ? "Modifier" : "Nouvel élément"}
          </h3>
          <div>
            <Label>Nom</Label>
            <Input
              value={form.name ?? ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <Label>Type</Label>
            <Select
              value={form.type ?? "badge"}
              onValueChange={(v) => setForm({ ...form, type: v as GType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GRAPHIC_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Enseigne (optionnel)</Label>
            <Select
              value={form.brand ?? ""}
              onValueChange={(v) =>
                setForm({ ...form, brand: v === "_any" ? null : v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Toutes" />
              </SelectTrigger>
              <SelectContent>
                {BRAND_OPTS.map((b) => (
                  <SelectItem key={b || "_any"} value={b || "_any"}>
                    {b || "Toutes"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Fichier (PNG ou SVG)</Label>
            <AssetUploader
              folder="graphics"
              accept="image/png,image/svg+xml,image/webp"
              onUploaded={(url) => setForm({ ...form, file_url: url })}
            />
            {form.file_url && (
              <img
                src={form.file_url}
                alt=""
                className="mt-2 h-16 w-16 rounded border bg-muted object-contain"
              />
            )}
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
              disabled={save.isPending || !form.name || !form.file_url}
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
