import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Upload, Loader2, FileText, Trash2, Sparkles, CalendarPlus,
  Wand2, Filter as FilterIcon, Pencil, Check, X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  listCatalogImportsFn, uploadCatalogFn, deleteCatalogImportFn,
  analyzeCatalogFn, listCatalogPromotionsFn, updateCatalogPromotionFn,
  generateCampaignFn, listCampaignRecommendationsFn, addCampaignToCalendarFn,
} from "@/lib/catalog.functions";

export const Route = createFileRoute("/_authenticated/catalog")({
  component: CatalogPage,
});

const FILTERS = [
  { id: "all", label: "Toutes" },
  { id: "best", label: "Meilleures promos" },
  { id: "social", label: "Fort potentiel social" },
  { id: "Fruits et légumes", label: "Fruits et légumes" },
  { id: "Boucherie", label: "Boucherie" },
  { id: "Épicerie", label: "Épicerie" },
  { id: "Local", label: "Local" },
  { id: "Saisonnier", label: "Saisonnier" },
] as const;

function formatSize(n?: number | null) {
  if (!n) return "—";
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} Ko`;
  return `${(n / 1024 / 1024).toFixed(1)} Mo`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result || "");
      res(s.slice(s.indexOf(",") + 1));
    };
    r.onerror = () => rej(new Error("Lecture impossible"));
    r.readAsDataURL(file);
  });
}

function statusBadge(status: string) {
  const m: Record<string, { label: string; cls: string }> = {
    uploaded: { label: "Uploadé", cls: "bg-muted text-muted-foreground" },
    analyzing: { label: "Analyse…", cls: "bg-blue-100 text-blue-700" },
    analyzed: { label: "Analysé", cls: "bg-green-100 text-green-700" },
    failed: { label: "Échec", cls: "bg-red-100 text-red-700" },
  };
  const meta = m[status] ?? m.uploaded;
  return <Badge className={meta.cls}>{meta.label}</Badge>;
}

function CatalogPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [editId, setEditId] = useState<string | null>(null);
  const [edit, setEdit] = useState<any>({});

  const { data: imports = [] } = useQuery({
    queryKey: ["catalog-imports"],
    queryFn: () => listCatalogImportsFn(),
    refetchInterval: (q) => {
      const data = (q.state.data ?? []) as any[];
      return data.some((i) => i.status === "analyzing") ? 3000 : false;
    },
  });

  const current = imports.find((i: any) => i.id === selectedId) ?? imports[0];
  const currentId = current?.id ?? null;

  const { data: promos = [] } = useQuery({
    queryKey: ["catalog-promos", currentId],
    queryFn: () => listCatalogPromotionsFn({ data: { catalog_import_id: currentId! } }),
    enabled: !!currentId,
  });

  const { data: recos = [] } = useQuery({
    queryKey: ["catalog-recos", currentId],
    queryFn: () => listCampaignRecommendationsFn({ data: { catalog_import_id: currentId! } }),
    enabled: !!currentId,
  });

  const uploadMut = useMutation({
    mutationFn: async (file: File) => {
      if (file.size > 30 * 1024 * 1024) throw new Error("Fichier > 30 Mo");
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf"))
        throw new Error("PDF uniquement");
      const data_base64 = await fileToBase64(file);
      return uploadCatalogFn({ data: { file_name: file.name, data_base64 } });
    },
    onSuccess: (row: any) => {
      qc.invalidateQueries({ queryKey: ["catalog-imports"] });
      setSelectedId(row.id);
      toast.success("Catalogue importé.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteCatalogImportFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalog-imports"] });
      toast.success("Supprimé.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const analyzeMut = useMutation({
    mutationFn: (id: string) => analyzeCatalogFn({ data: { catalog_import_id: id } }),
    onMutate: () => qc.invalidateQueries({ queryKey: ["catalog-imports"] }),
    onSuccess: (r: any) => {
      qc.invalidateQueries({ queryKey: ["catalog-imports"] });
      qc.invalidateQueries({ queryKey: ["catalog-promos", currentId] });
      toast.success(`${r.count} promotions détectées.`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updMut = useMutation({
    mutationFn: (vars: any) => updateCatalogPromotionFn({ data: vars }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalog-promos", currentId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const genMut = useMutation({
    mutationFn: (id: string) => generateCampaignFn({ data: { catalog_import_id: id } }),
    onSuccess: (r: any) => {
      qc.invalidateQueries({ queryKey: ["catalog-recos", currentId] });
      toast.success(`${r.count} recommandations générées.`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const calMut = useMutation({
    mutationFn: (id: string) => addCampaignToCalendarFn({ data: { catalog_import_id: id } }),
    onSuccess: (r: any) => {
      qc.invalidateQueries({ queryKey: ["catalog-recos", currentId] });
      qc.invalidateQueries({ queryKey: ["scheduled-posts"] });
      qc.invalidateQueries({ queryKey: ["calendar"] });
      toast.success(`${r.created} publications ajoutées en brouillon.`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    let list: any[] = [...promos];
    if (filter === "best")
      list = list.filter((p) => (p.discount_percent ?? 0) >= 30 || (p.social_score ?? 0) >= 70);
    else if (filter === "social")
      list = list.sort((a, b) => (b.social_score ?? 0) - (a.social_score ?? 0)).slice(0, 50);
    else if (filter !== "all") list = list.filter((p) => p.category === filter);
    return list;
  }, [promos, filter]);

  const selectedCount = promos.filter((p: any) => p.selected).length;

  function onPick(files: FileList | null) {
    if (!files || files.length === 0) return;
    uploadMut.mutate(files[0]);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Import catalogue</h1>
        <p className="text-sm text-muted-foreground">
          Importez votre catalogue mensuel en PDF, Komaag détecte les promos et
          recommande votre plan social.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Importer un catalogue PDF</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              onPick(e.dataTransfer.files);
            }}
            onClick={() => fileRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 transition",
              drag ? "border-primary bg-primary/5" : "border-muted-foreground/25",
            )}
          >
            {uploadMut.isPending ? (
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground" />
            )}
            <p className="text-sm font-medium">
              Glissez-déposez votre catalogue PDF ici
            </p>
            <p className="text-xs text-muted-foreground">PDF — 30 Mo max</p>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => onPick(e.target.files)}
            />
          </div>
        </CardContent>
      </Card>

      {imports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Catalogues importés</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {imports.map((it: any) => (
              <div
                key={it.id}
                onClick={() => setSelectedId(it.id)}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-md border p-3",
                  currentId === it.id ? "border-primary bg-primary/5" : "",
                )}
              >
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{it.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatSize(it.file_size)} • {new Date(it.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                {statusBadge(it.status)}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={it.status === "analyzing" || analyzeMut.isPending}
                  onClick={(e) => {
                    e.stopPropagation();
                    analyzeMut.mutate(it.id);
                  }}
                >
                  {it.status === "analyzing" || (analyzeMut.isPending && analyzeMut.variables === it.id) ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-1 h-4 w-4" />
                  )}
                  Analyser
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Supprimer ce catalogue ?")) delMut.mutate(it.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {currentId && promos.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">
              2. Promotions détectées ({promos.length})
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              {selectedCount} sélectionnée(s)
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <FilterIcon className="h-4 w-4 text-muted-foreground" />
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition",
                    filter === f.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-muted",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p: any) => {
                const isEdit = editId === p.id;
                return (
                  <div
                    key={p.id}
                    className={cn(
                      "rounded-lg border p-3 transition",
                      p.selected ? "border-primary bg-primary/5" : "",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <Checkbox
                          checked={!!p.selected}
                          onCheckedChange={(v) =>
                            updMut.mutate({ id: p.id, selected: !!v })
                          }
                        />
                        {isEdit ? (
                          <Input
                            className="h-8"
                            value={edit.product_name ?? p.product_name}
                            onChange={(e) =>
                              setEdit((s: any) => ({ ...s, product_name: e.target.value }))
                            }
                          />
                        ) : (
                          <p className="text-sm font-semibold leading-tight">
                            {p.product_name}
                          </p>
                        )}
                      </div>
                      {p.social_score != null && (
                        <Badge variant="secondary" className="shrink-0">
                          {p.social_score}/100
                        </Badge>
                      )}
                    </div>

                    <div className="mt-2 flex items-baseline gap-2">
                      {isEdit ? (
                        <>
                          <Input
                            type="number"
                            step="0.01"
                            className="h-8 w-20"
                            placeholder="Prix"
                            value={edit.promo_price ?? p.promo_price ?? ""}
                            onChange={(e) =>
                              setEdit((s: any) => ({
                                ...s,
                                promo_price: e.target.value === "" ? null : Number(e.target.value),
                              }))
                            }
                          />
                          <Input
                            type="number"
                            step="0.01"
                            className="h-8 w-20"
                            placeholder="Ancien"
                            value={edit.old_price ?? p.old_price ?? ""}
                            onChange={(e) =>
                              setEdit((s: any) => ({
                                ...s,
                                old_price: e.target.value === "" ? null : Number(e.target.value),
                              }))
                            }
                          />
                        </>
                      ) : (
                        <>
                          <span className="text-lg font-bold text-primary">
                            {p.promo_price != null ? `${p.promo_price} €` : "—"}
                          </span>
                          {p.old_price != null && (
                            <span className="text-xs text-muted-foreground line-through">
                              {p.old_price} €
                            </span>
                          )}
                          {p.discount_percent != null && (
                            <Badge className="bg-red-100 text-red-700">
                              -{p.discount_percent}%
                            </Badge>
                          )}
                        </>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1 text-xs text-muted-foreground">
                      {isEdit ? (
                        <Input
                          className="h-7"
                          placeholder="Catégorie"
                          value={edit.category ?? p.category ?? ""}
                          onChange={(e) =>
                            setEdit((s: any) => ({ ...s, category: e.target.value }))
                          }
                        />
                      ) : (
                        p.category && <Badge variant="outline">{p.category}</Badge>
                      )}
                      {p.page_number != null && <span>p.{p.page_number}</span>}
                    </div>

                    {isEdit ? (
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <Input
                          type="date"
                          className="h-8"
                          value={edit.start_date ?? p.start_date ?? ""}
                          onChange={(e) =>
                            setEdit((s: any) => ({ ...s, start_date: e.target.value || null }))
                          }
                        />
                        <Input
                          type="date"
                          className="h-8"
                          value={edit.end_date ?? p.end_date ?? ""}
                          onChange={(e) =>
                            setEdit((s: any) => ({ ...s, end_date: e.target.value || null }))
                          }
                        />
                      </div>
                    ) : (
                      (p.start_date || p.end_date) && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {p.start_date ?? "—"} → {p.end_date ?? "—"}
                        </p>
                      )
                    )}

                    {p.recommendation_reason && !isEdit && (
                      <p className="mt-2 text-xs italic text-muted-foreground">
                        {p.recommendation_reason}
                      </p>
                    )}

                    <div className="mt-3 flex justify-end gap-1">
                      {isEdit ? (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              updMut.mutate({ id: p.id, ...edit });
                              setEditId(null);
                              setEdit({});
                            }}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditId(null);
                              setEdit({});
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditId(p.id);
                            setEdit({});
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2 border-t pt-4">
              <Button
                disabled={selectedCount === 0 || genMut.isPending}
                onClick={() => genMut.mutate(currentId)}
              >
                {genMut.isPending ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="mr-1 h-4 w-4" />
                )}
                Générer ma campagne ({selectedCount})
              </Button>
              <Button
                variant="outline"
                disabled={recos.length === 0 || calMut.isPending}
                onClick={() => calMut.mutate(currentId)}
              >
                {calMut.isPending ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <CalendarPlus className="mr-1 h-4 w-4" />
                )}
                Ajouter au calendrier
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {recos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              3. Recommandations de campagne ({recos.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recos.map((r: any) => (
              <div key={r.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">
                    {r.promotion?.product_name ?? "—"}
                  </p>
                  <div className="flex gap-1">
                    <Badge variant="outline">{r.recommended_format}</Badge>
                    <Badge variant="outline">{r.recommended_platform}</Badge>
                    {r.status === "scheduled" && (
                      <Badge className="bg-green-100 text-green-700">Planifié</Badge>
                    )}
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {r.recommended_date ?? "—"} à {r.recommended_time ?? "—"}
                </p>
                <p className="mt-2 text-xs"><b>Angle :</b> {r.creative_angle}</p>
                <p className="text-xs"><b>Visuel :</b> {r.visual_brief}</p>
                <p className="mt-2 whitespace-pre-wrap rounded bg-muted/40 p-2 text-xs">
                  {r.caption}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
