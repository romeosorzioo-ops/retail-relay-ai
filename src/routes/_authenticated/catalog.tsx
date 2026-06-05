import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Upload, Loader2, FileText, Trash2, Sparkles, CalendarPlus,
  Wand2, Filter as FilterIcon, Pencil, Check, X, RefreshCw, Plus,
  AlertTriangle, ShieldCheck, HelpCircle, Image as ImageIcon, Crop, Replace,
  Camera, Layout,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  listCatalogImportsFn, uploadCatalogFn, deleteCatalogImportFn,
  analyzeCatalogFn, listCatalogPromotionsFn, updateCatalogPromotionFn,
  generateCampaignFn, listCampaignRecommendationsFn, addCampaignToCalendarFn,
  listCatalogPagesFn, reanalyzeCatalogPageFn, addCatalogPromotionFn,
  deleteCatalogPromotionFn, savePageImageFn, setPromotionImageFn,
  clearPromotionImageFn, setPromotionCreationModeFn,
} from "@/lib/catalog.functions";
import { CropModal, type CropBox } from "@/components/crop-modal";
import {
  renderPdfPageToCanvas, canvasToBase64, cropImageUrl,
} from "@/lib/pdf-browser";


export const Route = createFileRoute("/_authenticated/catalog")({
  component: CatalogPage,
});

const FILTERS = [
  { id: "all", label: "Toutes" },
  { id: "best", label: "Meilleures promos" },
  { id: "uncertain", label: "Incertaines" },
  { id: "social", label: "Fort potentiel social" },
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
    pending: { label: "En attente", cls: "bg-muted text-muted-foreground" },
  };
  const meta = m[status] ?? m.uploaded;
  return <Badge className={meta.cls}>{meta.label}</Badge>;
}

function confidenceBadge(c?: number | null) {
  if (c == null) return null;
  const color =
    c >= 80 ? "bg-green-100 text-green-700"
      : c >= 50 ? "bg-amber-100 text-amber-700"
        : "bg-red-100 text-red-700";
  const Icon = c >= 80 ? ShieldCheck : c >= 50 ? HelpCircle : AlertTriangle;
  return (
    <Badge className={cn(color, "gap-1")}>
      <Icon className="h-3 w-3" /> {c}%
    </Badge>
  );
}

function PromoCard({
  p, isEdit, edit, setEdit, onSave, onCancel, onEdit, onDelete, onToggle,
  onRecrop, onReplace, onClearImage, onCreateCatalog, onCreateField,
}: any) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div
      className={cn(
        "rounded-lg border p-3 transition",
        p.selected ? "border-primary bg-primary/5" : "",
        (p.confidence ?? 100) < 50 ? "border-amber-300" : "",
      )}
    >
      <div className="flex gap-3">
        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded border bg-muted">
          {p.product_image_url ? (
            <img src={p.product_image_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <ImageIcon className="h-6 w-6" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <Checkbox checked={!!p.selected} onCheckedChange={(v) => onToggle(!!v)} />
              {isEdit ? (
                <Input
                  className="h-8"
                  value={edit.product_name ?? p.product_name}
                  onChange={(e) => setEdit((s: any) => ({ ...s, product_name: e.target.value }))}
                />
              ) : (
                <p className="text-sm font-semibold leading-tight">{p.product_name}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              {confidenceBadge(p.confidence)}
              {p.detection_source === "manual" && (
                <Badge variant="outline" className="text-[10px]">Manuel</Badge>
              )}
            </div>
          </div>

          <div className="mt-2 flex items-baseline gap-2 flex-wrap">
            {isEdit ? (
              <>
                <Input type="number" step="0.01" className="h-8 w-20" placeholder="Prix"
                  value={edit.promo_price ?? p.promo_price ?? ""}
                  onChange={(e) => setEdit((s: any) => ({
                    ...s, promo_price: e.target.value === "" ? null : Number(e.target.value),
                  }))}
                />
                <Input type="number" step="0.01" className="h-8 w-20" placeholder="Ancien"
                  value={edit.old_price ?? p.old_price ?? ""}
                  onChange={(e) => setEdit((s: any) => ({
                    ...s, old_price: e.target.value === "" ? null : Number(e.target.value),
                  }))}
                />
              </>
            ) : (
              <>
                <span className="text-lg font-bold text-primary">
                  {p.promo_price != null ? `${p.promo_price} €` : "—"}
                </span>
                {p.old_price != null && (
                  <span className="text-xs text-muted-foreground line-through">{p.old_price} €</span>
                )}
                {p.discount_percent != null && (
                  <Badge className="bg-red-100 text-red-700">-{p.discount_percent}%</Badge>
                )}
              </>
            )}
          </div>

          <div className="mt-2 flex flex-wrap gap-1 text-xs text-muted-foreground items-center">
            {isEdit ? (
              <Input className="h-7" placeholder="Catégorie"
                value={edit.category ?? p.category ?? ""}
                onChange={(e) => setEdit((s: any) => ({ ...s, category: e.target.value }))}
              />
            ) : (
              p.category && <Badge variant="outline">{p.category}</Badge>
            )}
          </div>

          {p.missing_fields && Array.isArray(p.missing_fields) && p.missing_fields.length > 0 && !isEdit && (
            <p className="mt-2 text-xs text-amber-700">
              Données manquantes : {p.missing_fields.join(", ")}
            </p>
          )}
          {p.recommendation_reason && !isEdit && (
            <p className="mt-2 text-xs italic text-muted-foreground">{p.recommendation_reason}</p>
          )}
        </div>
      </div>
      {!isEdit && (
        <div className="mt-3 grid grid-cols-2 gap-1">
          <Button
            size="sm"
            variant={p.creation_mode === "catalog_visual" ? "default" : "outline"}
            className="h-8 text-[11px] gap-1"
            onClick={onCreateCatalog}
            title="Créer avec le visuel catalogue"
          >
            <Layout className="h-3 w-3" /> Visuel catalogue
          </Button>
          <Button
            size="sm"
            variant={p.creation_mode === "field_photo" ? "default" : "outline"}
            className="h-8 text-[11px] gap-1"
            onClick={onCreateField}
            title="Créer avec une photo terrain"
          >
            <Camera className="h-3 w-3" /> Photo terrain
          </Button>
        </div>
      )}

      <div className="mt-2 flex flex-wrap justify-end gap-1">

        {!isEdit && (
          <>
            <Button size="sm" variant="ghost" onClick={onRecrop} title="Recadrer depuis la page">
              <Crop className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => fileRef.current?.click()} title="Remplacer l'image">
              <Replace className="h-4 w-4" />
            </Button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onReplace(f); e.currentTarget.value = ""; }}
            />
            {p.product_image_url && (
              <Button size="sm" variant="ghost" onClick={onClearImage} title="Supprimer l'image">
                <X className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
        {isEdit ? (
          <>
            <Button size="icon" variant="ghost" onClick={onSave}><Check className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" onClick={onCancel}><X className="h-4 w-4" /></Button>
          </>
        ) : (
          <>
            <Button size="icon" variant="ghost" onClick={onEdit}><Pencil className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
          </>
        )}
      </div>
    </div>
  );
}


function CatalogPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [editId, setEditId] = useState<string | null>(null);
  const [edit, setEdit] = useState<any>({});
  const [addingOnPage, setAddingOnPage] = useState<number | null>(null);
  const [newPromo, setNewPromo] = useState<any>({});
  const [cropPromo, setCropPromo] = useState<any | null>(null);
  const [cropPageImage, setCropPageImage] = useState<string | null>(null);
  const autoExtractedRef = useRef<Set<string>>(new Set());
  const renderedPagesRef = useRef<Set<string>>(new Set());


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
    refetchInterval: current?.status === "analyzing" ? 3000 : false,
  });

  const { data: pages = [] } = useQuery({
    queryKey: ["catalog-pages", currentId],
    queryFn: () => listCatalogPagesFn({ data: { catalog_import_id: currentId! } }),
    enabled: !!currentId,
    refetchInterval: (q) => {
      const data = (q.state.data ?? []) as any[];
      return data.some((p) => p.status === "analyzing" || p.status === "pending") ? 2500 : false;
    },
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
      qc.invalidateQueries({ queryKey: ["catalog-pages", currentId] });
      toast.success(`${r.count} promotions détectées sur ${r.pages} page(s).`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reanalyzePageMut = useMutation({
    mutationFn: (vars: { page_number: number }) =>
      reanalyzeCatalogPageFn({ data: { catalog_import_id: currentId!, page_number: vars.page_number } }),
    onSuccess: (r: any) => {
      qc.invalidateQueries({ queryKey: ["catalog-promos", currentId] });
      qc.invalidateQueries({ queryKey: ["catalog-pages", currentId] });
      toast.success(`Page réanalysée : ${r.count} promo(s).`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updMut = useMutation({
    mutationFn: (vars: any) => updateCatalogPromotionFn({ data: vars }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalog-promos", currentId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const addMut = useMutation({
    mutationFn: (vars: any) =>
      addCatalogPromotionFn({ data: { ...vars, catalog_import_id: currentId! } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalog-promos", currentId] });
      setAddingOnPage(null);
      setNewPromo({});
      toast.success("Promo ajoutée.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delPromoMut = useMutation({
    mutationFn: (id: string) => deleteCatalogPromotionFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalog-promos", currentId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const setImgMut = useMutation({
    mutationFn: (vars: { promotion_id: string; data_base64: string; content_type: string; crop_coordinates?: CropBox | null }) =>
      setPromotionImageFn({ data: vars }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalog-promos", currentId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const clearImgMut = useMutation({
    mutationFn: (id: string) => clearPromotionImageFn({ data: { promotion_id: id } }),
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

  const filteredAll = useMemo(() => {
    let list: any[] = [...promos];
    if (filter === "best")
      list = list.filter((p) => (p.discount_percent ?? 0) >= 30 || (p.social_score ?? 0) >= 70);
    else if (filter === "social")
      list = list.sort((a, b) => (b.social_score ?? 0) - (a.social_score ?? 0));
    else if (filter === "uncertain")
      list = list.filter((p) => (p.confidence ?? 100) < 60 || (p.missing_fields?.length ?? 0) > 0);
    return list;
  }, [promos, filter]);

  const promosByPage = useMemo(() => {
    const map = new Map<number, any[]>();
    for (const p of filteredAll) {
      const k = p.page_number ?? 0;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(p);
    }
    return map;
  }, [filteredAll]);

  const pageList = useMemo(() => {
    const fromPages = pages.map((p: any) => p.page_number);
    const fromPromos = Array.from(promosByPage.keys()).filter((k) => k > 0);
    const set = new Set<number>([...fromPages, ...fromPromos]);
    return Array.from(set).sort((a, b) => a - b);
  }, [pages, promosByPage]);

  const pageMeta = (n: number) => pages.find((p: any) => p.page_number === n);
  const selectedCount = promos.filter((p: any) => p.selected).length;
  const uncertainCount = promos.filter((p: any) =>
    (p.confidence ?? 100) < 60 || (p.missing_fields?.length ?? 0) > 0).length;

  function onPick(files: FileList | null) {
    if (!files || files.length === 0) return;
    uploadMut.mutate(files[0]);
  }

  function startEdit(p: any) { setEditId(p.id); setEdit({}); }
  function saveEdit(p: any) {
    updMut.mutate({ id: p.id, ...edit });
    setEditId(null); setEdit({});
  }

  // Auto-rasterize PDF pages once analyzed, then store the page image url.
  useEffect(() => {
    if (!current || current.status !== "analyzed" || !current.file_url) return;
    const pdfUrl = current.file_url as string;
    const importId = current.id as string;
    pages.forEach((meta: any) => {
      if (meta.page_image_url) return;
      const key = `${importId}:${meta.page_number}`;
      if (renderedPagesRef.current.has(key)) return;
      renderedPagesRef.current.add(key);
      (async () => {
        try {
          const canvas = await renderPdfPageToCanvas(pdfUrl, meta.page_number, 1400);
          const base64 = canvasToBase64(canvas, "image/png");
          await savePageImageFn({
            data: {
              catalog_import_id: importId,
              page_number: meta.page_number,
              data_base64: base64,
              content_type: "image/png",
            },
          });
          qc.invalidateQueries({ queryKey: ["catalog-pages", importId] });
          qc.invalidateQueries({ queryKey: ["catalog-promos", importId] });
        } catch {
          renderedPagesRef.current.delete(key);
        }
      })();
    });
  }, [pages, current, qc]);

  // Auto-extract product images for promos that have a bbox + page_image_url and no image yet.
  useEffect(() => {
    if (!currentId) return;
    promos.forEach((p: any) => {
      if (p.product_image_url) return;
      if (!p.page_image_url || !p.crop_coordinates) return;
      const c = p.crop_coordinates;
      if (typeof c.x !== "number" || typeof c.width !== "number") return;
      if (autoExtractedRef.current.has(p.id)) return;
      autoExtractedRef.current.add(p.id);
      (async () => {
        try {
          const { base64, contentType } = await cropImageUrl(p.page_image_url, c);
          await setPromotionImageFn({
            data: {
              promotion_id: p.id,
              data_base64: base64,
              content_type: contentType,
              crop_coordinates: c,
            },
          });
          qc.invalidateQueries({ queryKey: ["catalog-promos", currentId] });
        } catch {
          autoExtractedRef.current.delete(p.id);
        }
      })();
    });
  }, [promos, currentId, qc]);

  async function handleRecrop(p: any) {
    // Ensure page image is available — rasterize on demand if missing.
    let pageImg = p.page_image_url as string | null;
    if (!pageImg && current?.file_url) {
      try {
        const canvas = await renderPdfPageToCanvas(current.file_url, p.page_number ?? 1, 1400);
        const base64 = canvasToBase64(canvas, "image/png");
        const res = await savePageImageFn({
          data: {
            catalog_import_id: current.id,
            page_number: p.page_number ?? 1,
            data_base64: base64,
            content_type: "image/png",
          },
        });
        pageImg = res.url;
      } catch (e) {
        toast.error("Impossible de préparer l'image de la page.");
        return;
      }
    }
    if (!pageImg) return;
    setCropPageImage(pageImg);
    setCropPromo(p);
  }

  async function handleReplace(p: any, file: File) {
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result || ""));
        r.onerror = () => reject(new Error("Lecture impossible"));
        r.readAsDataURL(file);
      });
      const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
      await setImgMut.mutateAsync({
        promotion_id: p.id,
        data_base64: base64,
        content_type: file.type || "image/png",
        crop_coordinates: null,
      });
      toast.success("Image remplacée.");
    } catch (e: any) {
      toast.error(e?.message ?? "Échec");
    }
  }


  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Import catalogue</h1>
        <p className="text-sm text-muted-foreground">
          Importez votre catalogue mensuel en PDF, Komaag détecte les promos page par page
          et recommande votre plan social.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Importer un catalogue PDF</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); onPick(e.dataTransfer.files); }}
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
            <p className="text-sm font-medium">Glissez-déposez votre catalogue PDF ici</p>
            <p className="text-xs text-muted-foreground">PDF — 30 Mo max</p>
            <input ref={fileRef} type="file" accept="application/pdf,.pdf"
              className="hidden" onChange={(e) => onPick(e.target.files)} />
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
              <div key={it.id} onClick={() => setSelectedId(it.id)}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-md border p-3",
                  currentId === it.id ? "border-primary bg-primary/5" : "",
                )}
              >
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{it.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatSize(it.file_size)}
                    {it.page_count ? ` • ${it.page_count} page(s)` : ""}
                    {" • "}{new Date(it.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                {statusBadge(it.status)}
                <Button size="sm" variant="outline"
                  disabled={it.status === "analyzing" || analyzeMut.isPending}
                  onClick={(e) => { e.stopPropagation(); analyzeMut.mutate(it.id); }}
                >
                  {it.status === "analyzing" || (analyzeMut.isPending && analyzeMut.variables === it.id) ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-1 h-4 w-4" />
                  )}
                  Analyser
                </Button>
                <Button size="icon" variant="ghost"
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

      {currentId && (promos.length > 0 || pages.length > 0) && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">
                2. Promotions détectées ({promos.length})
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedCount} sélectionnée(s) • {uncertainCount} incertaine(s)
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <FilterIcon className="h-4 w-4 text-muted-foreground" />
              {FILTERS.map((f) => (
                <button key={f.id} onClick={() => setFilter(f.id)}
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

            <div className="space-y-6">
              {pageList.map((pn) => {
                const meta = pageMeta(pn);
                const list = promosByPage.get(pn) ?? [];
                const isAnalyzing = meta?.status === "analyzing" || meta?.status === "pending";
                return (
                  <div key={pn} className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2 border-b pb-2">
                      <h3 className="text-sm font-semibold">Page {pn}</h3>
                      {meta && statusBadge(meta.status)}
                      <span className="text-xs text-muted-foreground">
                        {list.length} promo(s)
                      </span>
                      {meta?.notes && (
                        <span className="text-xs text-amber-700 italic">
                          Zones non analysées : {meta.notes}
                        </span>
                      )}
                      {meta?.error_message && (
                        <span className="text-xs text-red-700">{meta.error_message}</span>
                      )}
                      <div className="ml-auto flex gap-1">
                        <Button size="sm" variant="outline"
                          disabled={isAnalyzing || reanalyzePageMut.isPending}
                          onClick={() => reanalyzePageMut.mutate({ page_number: pn })}
                        >
                          {isAnalyzing ||
                            (reanalyzePageMut.isPending && reanalyzePageMut.variables?.page_number === pn) ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="mr-1 h-3 w-3" />
                          )}
                          Ré-analyser
                        </Button>
                        <Button size="sm" variant="outline"
                          onClick={() => {
                            setAddingOnPage(pn);
                            setNewPromo({ page_number: pn });
                          }}
                        >
                          <Plus className="mr-1 h-3 w-3" /> Ajouter
                        </Button>
                      </div>
                    </div>

                    {addingOnPage === pn && (
                      <div className="rounded-lg border-2 border-dashed border-primary/50 bg-primary/5 p-3 space-y-2">
                        <Input placeholder="Nom du produit"
                          value={newPromo.product_name ?? ""}
                          onChange={(e) => setNewPromo((s: any) => ({ ...s, product_name: e.target.value }))}
                        />
                        <div className="grid grid-cols-3 gap-2">
                          <Input type="number" step="0.01" placeholder="Prix promo"
                            value={newPromo.promo_price ?? ""}
                            onChange={(e) => setNewPromo((s: any) => ({
                              ...s, promo_price: e.target.value === "" ? null : Number(e.target.value),
                            }))}
                          />
                          <Input type="number" step="0.01" placeholder="Ancien prix"
                            value={newPromo.old_price ?? ""}
                            onChange={(e) => setNewPromo((s: any) => ({
                              ...s, old_price: e.target.value === "" ? null : Number(e.target.value),
                            }))}
                          />
                          <Input placeholder="Catégorie"
                            value={newPromo.category ?? ""}
                            onChange={(e) => setNewPromo((s: any) => ({ ...s, category: e.target.value }))}
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost"
                            onClick={() => { setAddingOnPage(null); setNewPromo({}); }}
                          >Annuler</Button>
                          <Button size="sm" disabled={!newPromo.product_name || addMut.isPending}
                            onClick={() => addMut.mutate(newPromo)}
                          >
                            {addMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Enregistrer"}
                          </Button>
                        </div>
                      </div>
                    )}

                    {list.length === 0 && !isAnalyzing && (
                      <p className="text-xs text-muted-foreground italic">
                        Aucune promo détectée sur cette page.
                      </p>
                    )}

                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {list.map((p: any) => (
                        <PromoCard key={p.id} p={p}
                          isEdit={editId === p.id} edit={edit} setEdit={setEdit}
                          onEdit={() => startEdit(p)}
                          onSave={() => saveEdit(p)}
                          onCancel={() => { setEditId(null); setEdit({}); }}
                          onDelete={() => {
                            if (confirm("Supprimer cette promo ?")) delPromoMut.mutate(p.id);
                          }}
                          onToggle={(v: boolean) => updMut.mutate({ id: p.id, selected: v })}
                          onRecrop={() => handleRecrop(p)}
                          onReplace={(f: File) => handleReplace(p, f)}
                          onClearImage={() => clearImgMut.mutate(p.id)}
                        />

                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2 border-t pt-4">
              <Button disabled={selectedCount === 0 || genMut.isPending}
                onClick={() => genMut.mutate(currentId)}
              >
                {genMut.isPending ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="mr-1 h-4 w-4" />
                )}
                Générer ma campagne ({selectedCount})
              </Button>
              <Button variant="outline" disabled={recos.length === 0 || calMut.isPending}
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
                  <p className="text-sm font-semibold">{r.promotion?.product_name ?? "—"}</p>
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

      <CropModal
        open={!!cropPromo}
        onOpenChange={(v) => { if (!v) { setCropPromo(null); setCropPageImage(null); } }}
        imageUrl={cropPageImage}
        initial={cropPromo?.crop_coordinates ?? null}
        title={cropPromo ? `Recadrer : ${cropPromo.product_name}` : ""}
        onConfirm={async (crop) => {
          if (!cropPromo || !cropPageImage) return;
          try {
            const { base64, contentType } = await cropImageUrl(cropPageImage, crop);
            await setImgMut.mutateAsync({
              promotion_id: cropPromo.id,
              data_base64: base64,
              content_type: contentType,
              crop_coordinates: crop,
            });
            toast.success("Image recadrée.");
          } catch (e: any) {
            toast.error(e?.message ?? "Échec du recadrage");
          }
        }}
      />
    </div>
  );
}

