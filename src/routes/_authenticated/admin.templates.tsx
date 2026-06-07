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
  adminListTemplatesFn,
  upsertTemplateFn,
  deleteTemplateFn,
} from "@/lib/admin-assets.functions";
import { AssetUploader } from "@/components/admin/asset-uploader";
import { STORE_BRANDS } from "@/lib/store-brands";

export const Route = createFileRoute("/_authenticated/admin/templates")({
  component: TemplatesAdmin,
});

const CATEGORIES = [
  "Prix choc",
  "Produit local",
  "Recrutement",
  "Arrivage",
  "Noël",
  "Barbecue",
  "Rentrée",
];
const FORMATS = ["square", "portrait", "story"];
const BRAND_OPTS = ["Générique", ...STORE_BRANDS];

type Row = {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  format: string;
  image_url: string | null;
  preview_url: string | null;
  is_active: boolean;
  allowed_brands?: string[] | null;
};

function emptyForm(): Partial<Row> {
  return {
    name: "",
    brand: "Générique",
    category: CATEGORIES[0],
    format: "square",
    image_url: "",
    is_active: true,
    allowed_brands: [],
  };
}

function TemplatesAdmin() {
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin", "templates"],
    queryFn: () => adminListTemplatesFn() as Promise<Row[]>,
  });
  const [form, setForm] = useState<Partial<Row>>(emptyForm());

  const save = useMutation({
    mutationFn: (v: Partial<Row>) =>
      upsertTemplateFn({
        data: {
          id: v.id,
          name: v.name ?? "",
          brand: v.brand ?? null,
          category: v.category ?? null,
          format: v.format ?? "square",
          image_url: v.image_url ?? null,
          preview_url: v.image_url ?? null,
          is_active: v.is_active ?? true,
          allowed_brands: v.allowed_brands ?? [],
        },
      }),
    onSuccess: () => {
      toast.success("Template enregistré.");
      qc.invalidateQueries({ queryKey: ["admin", "templates"] });
      setForm(emptyForm());
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteTemplateFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Supprimé.");
      qc.invalidateQueries({ queryKey: ["admin", "templates"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div>
        <h2 className="mb-3 text-lg font-semibold">Templates visuels</h2>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => (
            <Card key={r.id} className={!r.is_active ? "opacity-60" : ""}>
              <CardContent className="space-y-2 p-3">
                <div className="aspect-square w-full overflow-hidden rounded bg-muted">
                  {r.image_url && (
                    <img
                      src={r.image_url}
                      alt={r.name}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="text-sm font-medium leading-tight">
                  {r.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {r.brand ?? "Générique"} · {r.category ?? "—"} · {r.format}
                </div>
                <div className="flex gap-1">
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
            {form.id ? "Modifier" : "Nouveau template"}
          </h3>
          <div>
            <Label>Nom</Label>
            <Input
              value={form.name ?? ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
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
            <Label>Catégorie</Label>
            <Select
              value={form.category ?? ""}
              onValueChange={(v) => setForm({ ...form, category: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
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
          <div>
            <Label>Image PNG</Label>
            <div className="flex items-center gap-2">
              <AssetUploader
                folder="templates"
                accept="image/png,image/jpeg,image/webp"
                onUploaded={(url) => setForm({ ...form, image_url: url })}
              />
              {form.image_url && (
                <img
                  src={form.image_url}
                  alt=""
                  className="h-12 w-12 rounded border object-cover"
                />
              )}
            </div>
            <Input
              className="mt-2"
              value={form.image_url ?? ""}
              onChange={(e) =>
                setForm({ ...form, image_url: e.target.value })
              }
              placeholder="ou URL directe…"
            />
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
