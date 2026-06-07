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
  adminListFontAssetsFn,
  upsertFontAssetFn,
  deleteFontAssetFn,
} from "@/lib/admin-assets.functions";
import { AssetUploader } from "@/components/admin/asset-uploader";
import { STORE_BRANDS } from "@/lib/store-brands";

export const Route = createFileRoute("/_authenticated/admin/fonts")({
  component: FontsAdmin,
});

const STYLES = ["regular", "bold", "italic", "black"];
const USAGES = ["title", "price", "text", "badge"];
const BRAND_OPTS = ["", ...STORE_BRANDS];

type Row = {
  id: string;
  name: string;
  family: string;
  style: string;
  usage: string;
  brand: string | null;
  file_url: string;
  is_active: boolean;
};

function emptyForm(): Partial<Row> {
  return {
    name: "",
    family: "",
    style: "regular",
    usage: "text",
    brand: null,
    file_url: "",
    is_active: true,
  };
}

function FontsAdmin() {
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin", "fonts"],
    queryFn: () => adminListFontAssetsFn() as Promise<Row[]>,
  });
  const [form, setForm] = useState<Partial<Row>>(emptyForm());

  const save = useMutation({
    mutationFn: (v: Partial<Row>) =>
      upsertFontAssetFn({
        data: {
          id: v.id,
          name: v.name ?? "",
          family: v.family ?? "",
          style: v.style ?? "regular",
          usage: v.usage ?? "text",
          brand: v.brand || null,
          file_url: v.file_url ?? "",
          is_active: v.is_active ?? true,
        },
      }),
    onSuccess: () => {
      toast.success("Police enregistrée.");
      qc.invalidateQueries({ queryKey: ["admin", "fonts"] });
      setForm(emptyForm());
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFontAssetFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Supprimée.");
      qc.invalidateQueries({ queryKey: ["admin", "fonts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div>
        <h2 className="mb-3 text-lg font-semibold">Typographies</h2>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        <div className="space-y-2">
          {rows.map((r) => (
            <Card key={r.id} className={!r.is_active ? "opacity-60" : ""}>
              <CardContent className="flex items-center justify-between gap-3 p-3 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium">{r.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {r.family} · {r.style} · usage: {r.usage}
                    {r.brand ? ` · ${r.brand}` : ""}
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
            {form.id ? "Modifier" : "Nouvelle police"}
          </h3>
          <div>
            <Label>Nom</Label>
            <Input
              value={form.name ?? ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <Label>Famille</Label>
            <Input
              value={form.family ?? ""}
              onChange={(e) => setForm({ ...form, family: e.target.value })}
              placeholder="Ex : Inter, Bebas Neue"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Style</Label>
              <Select
                value={form.style ?? "regular"}
                onValueChange={(v) => setForm({ ...form, style: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STYLES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Usage</Label>
              <Select
                value={form.usage ?? "text"}
                onValueChange={(v) => setForm({ ...form, usage: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USAGES.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Enseigne (optionnel)</Label>
            <Select
              value={form.brand ?? ""}
              onValueChange={(v) => setForm({ ...form, brand: v || null })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Aucune" />
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
            <Label>Fichier police</Label>
            <AssetUploader
              folder="fonts"
              accept=".ttf,.otf,.woff,.woff2,font/*"
              onUploaded={(url) => setForm({ ...form, file_url: url })}
            />
            <Input
              className="mt-2"
              value={form.file_url ?? ""}
              onChange={(e) => setForm({ ...form, file_url: e.target.value })}
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
