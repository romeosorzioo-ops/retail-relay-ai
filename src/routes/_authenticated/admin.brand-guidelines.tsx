import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Copy, Plus, Trash2, Loader2 } from "lucide-react";
import {
  listBrandGuidelinesFn,
  upsertBrandGuidelineFn,
  duplicateBrandGuidelineFn,
  deleteBrandGuidelineFn,
} from "@/lib/brand-guidelines.functions";
import { STORE_BRANDS } from "@/lib/store-brands";

export const Route = createFileRoute("/_authenticated/admin/brand-guidelines")({
  component: BrandGuidelinesAdmin,
});

type Guideline = {
  id: string;
  brand: string;
  name: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  logo_url: string | null;
  badge_style: string | null;
  arrow_style: string | null;
};

function BrandGuidelinesAdmin() {
  const qc = useQueryClient();
  const { data: guidelines = [], isLoading } = useQuery({
    queryKey: ["brand-guidelines"],
    queryFn: () => listBrandGuidelinesFn(),
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newBrand, setNewBrand] = useState<string>(STORE_BRANDS[0]);

  const selected = useMemo(
    () => guidelines.find((g) => g.id === selectedId) ?? null,
    [guidelines, selectedId],
  ) as Guideline | null;

  const upsert = useMutation({
    mutationFn: (g: Partial<Guideline> & { brand: string }) =>
      upsertBrandGuidelineFn({ data: g }),
    onSuccess: () => {
      toast.success("Charte enregistrée.");
      qc.invalidateQueries({ queryKey: ["brand-guidelines"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const duplicate = useMutation({
    mutationFn: (p: { source_id: string; new_brand: string }) =>
      duplicateBrandGuidelineFn({ data: p }),
    onSuccess: (row: { id: string }) => {
      toast.success("Charte dupliquée.");
      qc.invalidateQueries({ queryKey: ["brand-guidelines"] });
      setSelectedId(row.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteBrandGuidelineFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Charte supprimée.");
      qc.invalidateQueries({ queryKey: ["brand-guidelines"] });
      setSelectedId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Chartes graphiques
        </h1>
        <p className="text-sm text-muted-foreground">
          Gérez les chartes par enseigne (couleurs, logo, polices). Chaque
          magasin utilise automatiquement la charte de son enseigne.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-[280px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Enseignes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {guidelines.map((g) => (
              <button
                key={g.id}
                onClick={() => setSelectedId(g.id)}
                className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm hover:bg-accent ${
                  selectedId === g.id ? "border-primary bg-accent" : ""
                }`}
              >
                <span>
                  <span className="font-medium">{g.brand}</span>
                  {g.name && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      — {g.name}
                    </span>
                  )}
                </span>
                <span
                  className="h-4 w-4 rounded-full border"
                  style={{ background: g.primary_color ?? "transparent" }}
                />
              </button>
            ))}
            <div className="flex gap-2 pt-2">
              <Select value={newBrand} onValueChange={setNewBrand}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STORE_BRANDS.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="icon"
                variant="outline"
                title="Créer une nouvelle charte"
                onClick={() => upsert.mutate({ brand: newBrand })}
                disabled={upsert.isPending}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {selected
                ? `Charte ${selected.brand}`
                : "Sélectionnez une charte"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selected && (
              <p className="text-sm text-muted-foreground">
                Choisissez une enseigne à gauche ou créez une nouvelle charte.
              </p>
            )}
            {selected && (
              <GuidelineEditor
                key={selected.id}
                value={selected}
                onSave={(v) => upsert.mutate({ ...v, id: selected.id })}
                onDuplicate={(toBrand) =>
                  duplicate.mutate({
                    source_id: selected.id,
                    new_brand: toBrand,
                  })
                }
                onDelete={() => remove.mutate(selected.id)}
                isSaving={upsert.isPending}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function GuidelineEditor({
  value,
  onSave,
  onDuplicate,
  onDelete,
  isSaving,
}: {
  value: Guideline;
  onSave: (v: Partial<Guideline> & { brand: string }) => void;
  onDuplicate: (toBrand: string) => void;
  onDelete: () => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<Guideline>(value);
  const [dupBrand, setDupBrand] = useState<string>(STORE_BRANDS[0]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Nom interne</Label>
          <Input
            value={form.name ?? ""}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ex : Charte Super U 2025"
          />
        </div>
        <div>
          <Label>Enseigne</Label>
          <Select
            value={form.brand}
            onValueChange={(v) => setForm({ ...form, brand: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STORE_BRANDS.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(["primary_color", "secondary_color", "accent_color"] as const).map(
          (k) => (
            <div key={k}>
              <Label>
                {k === "primary_color"
                  ? "Couleur principale"
                  : k === "secondary_color"
                    ? "Couleur secondaire"
                    : "Couleur d'accent"}
              </Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form[k] ?? "#000000"}
                  onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                  className="h-9 w-12 cursor-pointer rounded border"
                />
                <Input
                  value={form[k] ?? ""}
                  onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                  placeholder="#000000"
                />
              </div>
            </div>
          ),
        )}
        <div className="sm:col-span-2">
          <Label>URL du logo</Label>
          <Input
            value={form.logo_url ?? ""}
            onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
            placeholder="https://…"
          />
          {form.logo_url && (
            <img
              src={form.logo_url}
              alt="Logo"
              className="mt-2 h-14 w-14 rounded-md border bg-white object-contain"
            />
          )}
        </div>
        <div>
          <Label>Style de badge</Label>
          <Input
            value={form.badge_style ?? ""}
            onChange={(e) => setForm({ ...form, badge_style: e.target.value })}
            placeholder="Ex : badge_prix_choc"
          />
        </div>
        <div>
          <Label>Style de flèche</Label>
          <Input
            value={form.arrow_style ?? ""}
            onChange={(e) => setForm({ ...form, arrow_style: e.target.value })}
            placeholder="Ex : arrow_curved_modern"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-2">
        <Button onClick={() => onSave(form)} disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Enregistrer
        </Button>
        <div className="flex items-center gap-2">
          <Select value={dupBrand} onValueChange={setDupBrand}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STORE_BRANDS.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => onDuplicate(dupBrand)}>
            <Copy className="mr-2 h-4 w-4" />
            Dupliquer la charte
          </Button>
        </div>
        <Button
          variant="ghost"
          className="text-destructive ml-auto"
          onClick={() => {
            if (confirm("Supprimer cette charte ?")) onDelete();
          }}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Supprimer
        </Button>
      </div>
    </div>
  );
}
