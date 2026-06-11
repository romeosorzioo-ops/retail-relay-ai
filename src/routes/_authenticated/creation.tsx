import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { toPng } from "html-to-image";
import {
  Bold, Italic, Underline, Strikethrough, Download, Loader2, Plus, Save,
  Sparkles, Tag as TagIcon, Trash2, Type, Upload, Image as ImageIcon,
  Shapes, Copy, RotateCw, Camera, Wand2, LayoutTemplate, Palette,
  Send, ChevronLeft, ChevronRight,
} from "lucide-react";
import { CropModal, type CropBox } from "@/components/crop-modal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  listVisualTemplatesFn, saveVisualFn, uploadVisualImageFn,
} from "@/lib/visuals.functions";
import { listPromotionsFn } from "@/lib/promotions.functions";
import { getCatalogPromotionFn, setPromotionCreationModeFn } from "@/lib/catalog.functions";
import {
  listCampaignItemsFn, getCampaignItemFn, updateCampaignItemFn,
} from "@/lib/campaigns.functions";
import { getMyBrandProfileFn } from "@/lib/brand-profiles.functions";
import { getMyBrandGuidelineFn } from "@/lib/brand-guidelines.functions";
import { listBrandFontsFn } from "@/lib/brand-fonts.functions";
import { FONT_LIBRARY, registerCustomFont } from "@/lib/fonts";
import {
  GRAPHIC_ELEMENTS, ELEMENT_CATEGORIES, getElementDef, renderElementSvg,
  type ElementCategory,
} from "@/lib/graphic-elements";
import { CampaignStepper, type CampaignStep } from "@/components/campaign-stepper";
import { ScheduleItemModal } from "@/components/schedule-item-modal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Layout, ListChecks, CalendarPlus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/creation")({
  validateSearch: (s: Record<string, unknown>) => ({
    cp: typeof s.cp === "string" ? s.cp : undefined,
    mode:
      s.mode === "catalog_visual" || s.mode === "field_photo"
        ? (s.mode as "catalog_visual" | "field_photo")
        : undefined,
    campaign: typeof s.campaign === "string" ? s.campaign : undefined,
    tab: s.tab === "queue" || s.tab === "editor" ? (s.tab as "queue" | "editor") : undefined,
    item: typeof s.item === "string" ? s.item : undefined,
  }),
  component: CreationPage,
});

import { POST_FORMATS, POST_FORMAT_LIST, DEFAULT_POST_FORMAT, type PostFormatKey } from "@/lib/post-formats";
type FormatKey = PostFormatKey;
const FORMATS = POST_FORMATS;

type BlockRole = "title" | "subtitle" | "price_main" | "price_old" | "badge" | "custom";
type Block = {
  id: string;
  role: BlockRole;
  text: string;
  x: number; y: number;          // % of canvas
  width: number;                  // % of canvas
  fontFamily: string;
  fontSize: number;               // in canvas px (relative to 1080 base)
  color: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  align: "left" | "center" | "right";
  strokeColor?: string;
  strokeWidth?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowX?: number;
  shadowY?: number;
  bgColor?: string;               // for badge
  rounded?: number;               // for badge bg
  padding?: number;               // for badge bg
};

type GraphicEl = {
  id: string;
  key: string;            // element library key
  category: ElementCategory;
  x: number; y: number;   // % of canvas (top-left)
  width: number;          // % of canvas width
  height: number;         // % of canvas width (square reference)
  rotation: number;       // degrees
  color: string;
  strokeWidth: number;    // for stroke-based elements
  opacity: number;        // 0..1
  secondary?: string;     // optional fill for outlined shapes
};

type Config = {
  bgImage?: string | null;
  bgColor?: string;
  logoUrl?: string | null;
  blocks: Block[];
  elements?: GraphicEl[];
  lastCrop?: {
    src: string;
    x: number; y: number; width: number; height: number;
    naturalW: number; naturalH: number;
    targetW: number; targetH: number;
    zoom: number;
    rotation: number;
    at: number;
  } | null;
};

const ROLE_LABEL: Record<BlockRole, string> = {
  title: "Titre",
  subtitle: "Sous-titre",
  price_main: "Prix principal",
  price_old: "Prix barré",
  badge: "Badge",
  custom: "Texte libre",
};

function uid() { return Math.random().toString(36).slice(2, 10); }

function defaultBlocks(brand: {
  font_primary?: string | null;
  font_secondary?: string | null;
  font_price?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  slogan?: string | null;
} | null): Block[] {
  const fTitle = brand?.font_primary ?? "Montserrat";
  const fText = brand?.font_secondary ?? "Inter";
  const fPrice = brand?.font_price ?? "Bebas Neue";
  const primary = brand?.primary_color ?? "#E11D48";
  return [
    { id: uid(), role: "title", text: "PRIX CHOC", x: 5, y: 5, width: 70, fontFamily: fTitle, fontSize: 110, color: "#ffffff", bold: true, italic: false, underline: false, strikethrough: false, align: "left", shadowColor: "rgba(0,0,0,.4)", shadowBlur: 8, shadowX: 0, shadowY: 2 },
    { id: uid(), role: "subtitle", text: brand?.slogan ?? "Le goût du local", x: 5, y: 18, width: 70, fontFamily: fText, fontSize: 36, color: "#ffffff", bold: false, italic: false, underline: false, strikethrough: false, align: "left" },
    { id: uid(), role: "custom", text: "Nom du produit", x: 5, y: 70, width: 90, fontFamily: fText, fontSize: 64, color: "#ffffff", bold: true, italic: false, underline: false, strikethrough: false, align: "left" },
    { id: uid(), role: "price_old", text: "4,29 €", x: 5, y: 82, width: 20, fontFamily: fText, fontSize: 48, color: "#cccccc", bold: false, italic: false, underline: false, strikethrough: true, align: "left" },
    { id: uid(), role: "price_main", text: "2,99 €", x: 5, y: 86, width: 50, fontFamily: fPrice, fontSize: 160, color: primary, bold: true, italic: false, underline: false, strikethrough: false, align: "left" },
    { id: uid(), role: "badge", text: "-30%", x: 75, y: 5, width: 20, fontFamily: fTitle, fontSize: 56, color: "#111111", bold: true, italic: false, underline: false, strikethrough: false, align: "center", bgColor: "#FACC15", rounded: 999, padding: 18 },
  ];
}

// ---------- Field-photo presets ----------
type FieldPresetKey =
  | "employee_price" | "shelf_arrow" | "arrival_badge"
  | "local_producer" | "weekend_offer";

const FIELD_PRESETS: { key: FieldPresetKey; label: string; emoji: string }[] = [
  { key: "employee_price", label: "Employé + prix promo", emoji: "👤" },
  { key: "shelf_arrow",    label: "Produit rayon + flèche", emoji: "➡️" },
  { key: "arrival_badge",  label: "Arrivage + badge",      emoji: "📦" },
  { key: "local_producer", label: "Producteur local",      emoji: "🌿" },
  { key: "weekend_offer",  label: "Offre week-end",        emoji: "🎉" },
];

function buildFieldPreset(
  key: FieldPresetKey,
  brand: Parameters<typeof defaultBlocks>[0],
): { blocks: Block[]; elements: GraphicEl[] } {
  const fTitle = brand?.font_primary ?? "Montserrat";
  const fText = brand?.font_secondary ?? "Inter";
  const fPrice = brand?.font_price ?? "Bebas Neue";
  const primary = brand?.primary_color ?? "#E11D48";
  const accent = brand?.secondary_color ?? "#FACC15";

  switch (key) {
    case "employee_price":
      return {
        blocks: [
          { id: uid(), role: "badge", text: "PRIX CHOC", x: 5, y: 5, width: 35, fontFamily: fTitle, fontSize: 52, color: "#111", bold: true, italic: false, underline: false, strikethrough: false, align: "center", bgColor: accent, rounded: 999, padding: 14 },
          { id: uid(), role: "custom", text: "Nom du produit", x: 5, y: 68, width: 90, fontFamily: fText, fontSize: 64, color: "#fff", bold: true, italic: false, underline: false, strikethrough: false, align: "left", shadowColor: "rgba(0,0,0,.5)", shadowBlur: 8 },
          { id: uid(), role: "price_old", text: "4,29 €", x: 5, y: 80, width: 20, fontFamily: fText, fontSize: 44, color: "#eee", bold: false, italic: false, underline: false, strikethrough: true, align: "left" },
          { id: uid(), role: "price_main", text: "2,99 €", x: 5, y: 84, width: 50, fontFamily: fPrice, fontSize: 160, color: primary, bold: true, italic: false, underline: false, strikethrough: false, align: "left", shadowColor: "rgba(0,0,0,.4)", shadowBlur: 8 },
        ],
        elements: [],
      };
    case "shelf_arrow":
      return {
        blocks: [
          { id: uid(), role: "title", text: "À NE PAS RATER", x: 5, y: 5, width: 70, fontFamily: fTitle, fontSize: 80, color: "#fff", bold: true, italic: false, underline: false, strikethrough: false, align: "left", shadowColor: "rgba(0,0,0,.5)", shadowBlur: 8 },
          { id: uid(), role: "custom", text: "Produit en rayon", x: 5, y: 80, width: 70, fontFamily: fText, fontSize: 48, color: "#fff", bold: true, italic: false, underline: false, strikethrough: false, align: "left", shadowColor: "rgba(0,0,0,.5)", shadowBlur: 6 },
        ],
        elements: [
          { id: uid(), key: "arrow_curved_modern", category: "arrow", x: 45, y: 30, width: 30, height: 30, rotation: 25, color: accent, strokeWidth: 8, opacity: 1 },
        ],
      };
    case "arrival_badge":
      return {
        blocks: [
          { id: uid(), role: "badge", text: "ARRIVAGE", x: 60, y: 5, width: 35, fontFamily: fTitle, fontSize: 56, color: "#fff", bold: true, italic: false, underline: false, strikethrough: false, align: "center", bgColor: primary, rounded: 999, padding: 16 },
          { id: uid(), role: "title", text: "FRAÎCHEUR DU JOUR", x: 5, y: 72, width: 90, fontFamily: fTitle, fontSize: 72, color: "#fff", bold: true, italic: false, underline: false, strikethrough: false, align: "left", shadowColor: "rgba(0,0,0,.5)", shadowBlur: 8 },
          { id: uid(), role: "subtitle", text: "Disponible dès maintenant", x: 5, y: 86, width: 90, fontFamily: fText, fontSize: 36, color: "#fff", bold: false, italic: false, underline: false, strikethrough: false, align: "left" },
        ],
        elements: [],
      };
    case "local_producer":
      return {
        blocks: [
          { id: uid(), role: "badge", text: "PRODUIT LOCAL", x: 5, y: 5, width: 45, fontFamily: fTitle, fontSize: 44, color: "#fff", bold: true, italic: false, underline: false, strikethrough: false, align: "center", bgColor: "#16a34a", rounded: 999, padding: 14 },
          { id: uid(), role: "title", text: "NOM DU PRODUCTEUR", x: 5, y: 72, width: 90, fontFamily: fTitle, fontSize: 64, color: "#fff", bold: true, italic: false, underline: false, strikethrough: false, align: "left", shadowColor: "rgba(0,0,0,.5)", shadowBlur: 8 },
          { id: uid(), role: "subtitle", text: "Producteur partenaire", x: 5, y: 86, width: 90, fontFamily: fText, fontSize: 32, color: "#fff", bold: false, italic: true, underline: false, strikethrough: false, align: "left" },
        ],
        elements: [],
      };
    case "weekend_offer":
      return {
        blocks: [
          { id: uid(), role: "badge", text: "OFFRE WEEK-END", x: 5, y: 5, width: 55, fontFamily: fTitle, fontSize: 48, color: "#111", bold: true, italic: false, underline: false, strikethrough: false, align: "center", bgColor: accent, rounded: 999, padding: 14 },
          { id: uid(), role: "custom", text: "Nom du produit", x: 5, y: 68, width: 90, fontFamily: fText, fontSize: 60, color: "#fff", bold: true, italic: false, underline: false, strikethrough: false, align: "left", shadowColor: "rgba(0,0,0,.5)", shadowBlur: 8 },
          { id: uid(), role: "price_main", text: "9,99 €", x: 5, y: 80, width: 50, fontFamily: fPrice, fontSize: 150, color: primary, bold: true, italic: false, underline: false, strikethrough: false, align: "left", shadowColor: "rgba(0,0,0,.4)", shadowBlur: 8 },
        ],
        elements: [],
      };
  }
}

// Crop an image via canvas to a target aspect-ratio. Returns the resulting Blob
// AND the natural dimensions of the source so callers can persist the exact
// crop coordinates that produced the output.
async function cropImageToBlob(
  srcUrl: string,
  box: CropBox,
  targetW: number,
  targetH: number,
): Promise<{ blob: Blob; naturalW: number; naturalH: number }> {
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const sx = box.x * img.naturalWidth;
      const sy = box.y * img.naturalHeight;
      const sw = box.width * img.naturalWidth;
      const sh = box.height * img.naturalHeight;
      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas indisponible"));
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
      canvas.toBlob(
        (b) => (b ? resolve({ blob: b, naturalW: img.naturalWidth, naturalH: img.naturalHeight }) : reject(new Error("Export image échoué"))),
        "image/jpeg",
        0.92,
      );
    };
    img.onerror = () => reject(new Error("Chargement image impossible"));
    img.src = srcUrl;
  });
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  let bin = "";
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(bin);
}

function CreationPage() {
  const qc = useQueryClient();
  const [format, setFormat] = useState<FormatKey>(DEFAULT_POST_FORMAT);
  const [config, setConfig] = useState<Config>({ bgImage: null, bgColor: "#1f2937", logoUrl: null, blocks: [] });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [promotionId, setPromotionId] = useState<string | null>(null);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingField, setUploadingField] = useState(false);
  const [sourceType, setSourceType] = useState<"template" | "catalog" | "field_photo">("template");
  const [sourceImageUrl, setSourceImageUrl] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [showCropDebug, setShowCropDebug] = useState(false);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; startX: number; startY: number; bx: number; by: number; rect: DOMRect } | null>(null);
  const elDragRef = useRef<{ id: string; mode: "move" | "resize" | "rotate"; startX: number; startY: number; bx: number; by: number; bw: number; bh: number; brot: number; rect: DOMRect; cx: number; cy: number } | null>(null);

  const search = Route.useSearch();
  const navigate = useNavigate();
  const [catalogPromoId, setCatalogPromoId] = useState<string | null>(null);
  const [catalogMode, setCatalogMode] = useState<"catalog_visual" | "field_photo" | null>(null);

  const { data: templates = [] } = useQuery({ queryKey: ["visual-templates"], queryFn: () => listVisualTemplatesFn() });
  const { data: promotions = [] } = useQuery({ queryKey: ["promotions"], queryFn: () => listPromotionsFn() });
  const { data: brandProfile } = useQuery({ queryKey: ["my-brand"], queryFn: () => getMyBrandProfileFn() });
  const { data: brandGuideline } = useQuery({ queryKey: ["my-brand-guideline"], queryFn: () => getMyBrandGuidelineFn() });
  // Fusion : la charte d'enseigne sert de fallback pour les champs non
  // personnalisés par l'utilisateur dans son profil de marque.
  const brand = useMemo(() => ({
    ...(brandGuideline ?? {}),
    ...Object.fromEntries(
      Object.entries(brandProfile ?? {}).filter(([, v]) => v != null && v !== ""),
    ),
  }), [brandProfile, brandGuideline]) as typeof brandProfile;
  const { data: brandFonts = [] } = useQuery({ queryKey: ["my-brand-fonts"], queryFn: () => listBrandFontsFn() });
  const { data: catalogPromo } = useQuery({
    queryKey: ["catalog-promo", search.cp],
    queryFn: () => getCatalogPromotionFn({ data: { id: search.cp as string } }),
    enabled: !!search.cp,
  });

  const [activeTab, setActiveTab] = useState<"editor" | "queue">(search.tab ?? (search.campaign ? "queue" : "editor"));
  const [currentItemId, setCurrentItemId] = useState<string | null>(search.item ?? null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [postValidateOpen, setPostValidateOpen] = useState(false);
  const [leftNav, setLeftNav] = useState<"templates" | "text" | "elements" | "import" | "brand" | "ai">("templates");
  const [visualName, setVisualName] = useState<string>("Visuel sans titre");

  const { data: queueData } = useQuery({
    queryKey: ["campaign-items", search.campaign ?? null],
    queryFn: () => listCampaignItemsFn({ data: { campaign_id: search.campaign ?? null } }),
    enabled: !!search.campaign || activeTab === "queue",
  });
  const { data: currentItem } = useQuery({
    queryKey: ["campaign-item", currentItemId],
    queryFn: () => getCampaignItemFn({ data: { id: currentItemId as string } }),
    enabled: !!currentItemId,
  });

  // Apply campaign item to editor when opened
  const itemAppliedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!currentItem || itemAppliedRef.current === currentItem.id) return;
    itemAppliedRef.current = currentItem.id;
    setConfig((c) => {
      const blocks = c.blocks.map((b) => {
        if (b.role === "custom" && currentItem.product_name) return { ...b, text: currentItem.product_name };
        if (b.role === "price_main" && currentItem.promo_price != null)
          return { ...b, text: `${String(currentItem.promo_price).replace(".", ",")} €` };
        if (b.role === "price_old" && currentItem.old_price != null)
          return { ...b, text: `${String(currentItem.old_price).replace(".", ",")} €` };
        if (b.role === "badge" && currentItem.discount_percent != null)
          return { ...b, text: `-${currentItem.discount_percent}%` };
        return b;
      });
      return {
        ...c,
        bgImage: currentItem.creation_mode === "catalog_visual" && currentItem.source_image_url
          ? currentItem.source_image_url : c.bgImage,
        blocks,
      };
    });
    if (currentItem.creation_mode === "catalog_visual" && currentItem.source_image_url) {
      setSourceType("catalog");
      setSourceImageUrl(currentItem.source_image_url);
    } else if (currentItem.creation_mode === "field_photo") {
      setSourceType("field_photo");
    }
    if (currentItem.recommended_format && currentItem.recommended_format in FORMATS) {
      setFormat(currentItem.recommended_format as FormatKey);
    }
    updateCampaignItemFn({ data: { id: currentItem.id, status: "in_progress" } }).catch(() => {});
  }, [currentItem]);

  function openQueueItem(itemId: string, mode?: "catalog_visual" | "field_photo") {
    setCurrentItemId(itemId);
    setActiveTab("editor");
    itemAppliedRef.current = null;
    const updates: { id: string; creation_mode?: "catalog_visual" | "field_photo" } = { id: itemId };
    if (mode) updates.creation_mode = mode;
    updateCampaignItemFn({ data: updates }).then(() =>
      qc.invalidateQueries({ queryKey: ["campaign-items"] }),
    ).catch(() => {});
    navigate({
      to: "/creation",
      search: { campaign: search.campaign, tab: "editor", item: itemId } as never,
      replace: true,
    });
  }

  const validateItemMut = useMutation({
    mutationFn: async () => {
      if (!currentItemId) throw new Error("Aucun élément en cours");
      const r = await exportPng();
      let final_visual_url: string | null = null;
      if (r) {
        const data_base64 = await blobToBase64(r.blob);
        const up = await uploadVisualImageFn({
          data: { file_name: `visual-${Date.now()}.png`, file_type: "image/png", data_base64 },
        });
        final_visual_url = up.url;
      }
      return updateCampaignItemFn({
        data: { id: currentItemId, status: "validated", final_visual_url, recommended_format: format },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaign-items"] });
      qc.invalidateQueries({ queryKey: ["campaign-item", currentItemId] });
      toast.success("Visuel validé");
      setPostValidateOpen(true);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function statusBadge(s: string) {
    const m: Record<string, { label: string; cls: string }> = {
      to_create:   { label: "À créer",     cls: "bg-muted text-muted-foreground" },
      in_progress: { label: "En cours",    cls: "bg-brand-gradient-soft text-foreground" },
      to_validate: { label: "À valider",   cls: "bg-amber-100 text-amber-700" },
      validated:   { label: "Validé",      cls: "bg-emerald-100 text-emerald-700" },
      scheduled:   { label: "Programmé",   cls: "bg-primary/15 text-primary" },
    };
    const meta = m[s] ?? m.to_create;
    return <Badge className={meta.cls}>{meta.label}</Badge>;
  }

  // Register every uploaded font in this page
  useEffect(() => { brandFonts.forEach((f) => registerCustomFont(f.name, f.url)); }, [brandFonts]);

  // Initialise blocks from brand profile when first available
  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    if (!brand) return;
    initRef.current = true;
    const b = brand as Parameters<typeof defaultBlocks>[0];
    setConfig((c) => ({
      ...c,
      bgColor: b?.primary_color ?? c.bgColor,
      logoUrl: c.logoUrl ?? (brand?.logo_url ?? null),
      blocks: c.blocks.length ? c.blocks : defaultBlocks(b),
    }));
  }, [brand]);

  // Default blocks immediately so canvas isn't blank if brand never loads
  useEffect(() => {
    setConfig((c) => (c.blocks.length === 0 ? { ...c, blocks: defaultBlocks(null) } : c));
  }, []);

  // ---------- Catalog promotion bridge ----------
  function applyCatalogPromoBlocks(p: any) {
    setConfig((c) => {
      const blocks = c.blocks.map((b) => {
        if (b.role === "custom" && p.product_name) return { ...b, text: p.product_name };
        if (b.role === "price_main" && p.promo_price != null)
          return { ...b, text: `${String(p.promo_price).replace(".", ",")} €` };
        if (b.role === "price_old" && p.old_price != null)
          return { ...b, text: `${String(p.old_price).replace(".", ",")} €` };
        if (b.role === "badge" && p.discount_percent != null)
          return { ...b, text: `-${p.discount_percent}%` };
        return b;
      });
      return { ...c, blocks };
    });
  }

  function switchCatalogMode(mode: "catalog_visual" | "field_photo") {
    if (!catalogPromo) return;
    setCatalogMode(mode);
    if (mode === "catalog_visual") {
      setSourceType("catalog");
      setSourceImageUrl(catalogPromo.product_image_url ?? null);
      setConfig((c) => ({ ...c, bgImage: catalogPromo.product_image_url ?? c.bgImage }));
    } else {
      setSourceType("field_photo");
      setSourceImageUrl(null);
      setConfig((c) => ({ ...c, bgImage: null }));
      toast.info("Importez une photo terrain pour ce visuel.");
    }
    setPromotionCreationModeFn({
      data: { promotion_id: catalogPromo.id, creation_mode: mode },
    }).catch(() => {});
    navigate({ to: "/creation", search: { cp: catalogPromo.id, mode } as never, replace: true });
  }

  // Apply catalog promo when loaded
  const catalogAppliedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!catalogPromo) return;
    const key = `${catalogPromo.id}:${search.mode ?? catalogPromo.creation_mode ?? "catalog_visual"}`;
    if (catalogAppliedRef.current === key) return;
    catalogAppliedRef.current = key;
    setCatalogPromoId(catalogPromo.id);
    const mode =
      (search.mode as "catalog_visual" | "field_photo" | undefined) ??
      (catalogPromo.creation_mode as "catalog_visual" | "field_photo" | null) ??
      "catalog_visual";
    setCatalogMode(mode);
    applyCatalogPromoBlocks(catalogPromo);
    if (mode === "catalog_visual" && catalogPromo.product_image_url) {
      setSourceType("catalog");
      setSourceImageUrl(catalogPromo.product_image_url);
      setConfig((c) => ({ ...c, bgImage: catalogPromo.product_image_url }));
    } else if (mode === "field_photo") {
      setSourceType("field_photo");
    }
  }, [catalogPromo, search.mode]);



  const dims = FORMATS[format];
  const previewWidth = dims.previewW;
  const previewHeight = Math.round((dims.h / dims.w) * previewWidth);
  const scale = previewWidth / dims.w;

  const allFontNames = useMemo(
    () => [...FONT_LIBRARY.map((f) => f.name), ...brandFonts.map((f) => f.name)],
    [brandFonts],
  );

  const selected = config.blocks.find((b) => b.id === selectedId) ?? null;
  const elements = config.elements ?? [];
  const selectedElement = elements.find((e) => e.id === selectedElementId) ?? null;

  function updateBlock(id: string, patch: Partial<Block>) {
    setConfig((c) => ({ ...c, blocks: c.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)) }));
  }
  function deleteBlock(id: string) {
    setConfig((c) => ({ ...c, blocks: c.blocks.filter((b) => b.id !== id) }));
    if (selectedId === id) setSelectedId(null);
  }

  // ---------- Graphic elements ----------
  function updateElement(id: string, patch: Partial<GraphicEl>) {
    setConfig((c) => ({ ...c, elements: (c.elements ?? []).map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
  }
  function deleteElement(id: string) {
    setConfig((c) => ({ ...c, elements: (c.elements ?? []).filter((e) => e.id !== id) }));
    if (selectedElementId === id) setSelectedElementId(null);
  }
  function duplicateElement(id: string) {
    setConfig((c) => {
      const src = (c.elements ?? []).find((e) => e.id === id);
      if (!src) return c;
      const copy = { ...src, id: uid(), x: Math.min(95, src.x + 5), y: Math.min(95, src.y + 5) };
      return { ...c, elements: [...(c.elements ?? []), copy] };
    });
  }
  function addElement(key: string) {
    const def = getElementDef(key);
    if (!def) return;
    const ratio = def.defaultRatio ?? 1;
    const w = 25;
    const el: GraphicEl = {
      id: uid(),
      key,
      category: def.category,
      x: 35, y: 35,
      width: w,
      height: w / ratio,
      rotation: 0,
      color: def.defaultColor,
      strokeWidth: def.defaultStroke,
      opacity: 1,
      secondary: def.defaultSecondary,
    };
    setConfig((c) => ({ ...c, elements: [...(c.elements ?? []), el] }));
    setSelectedId(null);
    setSelectedElementId(el.id);
  }
  function addBlock(role: BlockRole) {
    const fTitle = brand?.font_primary ?? "Montserrat";
    const fText = brand?.font_secondary ?? "Inter";
    const fPrice = brand?.font_price ?? "Bebas Neue";
    const primary = brand?.primary_color ?? "#E11D48";
    const presets: Record<BlockRole, Partial<Block>> = {
      title:      { text: "TITRE", fontFamily: fTitle, fontSize: 110, color: "#ffffff", bold: true },
      subtitle:   { text: "Sous-titre", fontFamily: fText, fontSize: 40, color: "#ffffff" },
      price_main: { text: "9,99 €", fontFamily: fPrice, fontSize: 160, color: primary, bold: true },
      price_old:  { text: "12,99 €", fontFamily: fText, fontSize: 48, color: "#999999", strikethrough: true },
      badge:      { text: "-30%", fontFamily: fTitle, fontSize: 56, color: "#111111", bold: true, bgColor: "#FACC15", rounded: 999, padding: 18, align: "center", width: 20 },
      custom:     { text: "Texte", fontFamily: fText, fontSize: 48, color: "#ffffff" },
    };
    const base: Block = {
      id: uid(), role, text: "", x: 10, y: 40, width: 60, fontFamily: fText, fontSize: 48,
      color: "#ffffff", bold: false, italic: false, underline: false, strikethrough: false, align: "left",
      ...presets[role],
    } as Block;
    setConfig((c) => ({ ...c, blocks: [...c.blocks, base] }));
    setSelectedId(base.id);
  }

  // Drag a block on the canvas (% coords)
  function onPointerDownBlock(e: React.PointerEvent, b: Block) {
    e.stopPropagation();
    setSelectedId(b.id);
    setSelectedElementId(null);
    const wrap = canvasWrapRef.current;
    if (!wrap) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { id: b.id, startX: e.clientX, startY: e.clientY, bx: b.x, by: b.y, rect: wrap.getBoundingClientRect() };
  }
  function onPointerMoveBlock(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    const dx = ((e.clientX - d.startX) / d.rect.width) * 100;
    const dy = ((e.clientY - d.startY) / d.rect.height) * 100;
    updateBlock(d.id, { x: Math.max(0, Math.min(100, d.bx + dx)), y: Math.max(0, Math.min(100, d.by + dy)) });
  }
  function onPointerUpBlock(e: React.PointerEvent) {
    if (dragRef.current) {
      try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* noop */ }
    }
    dragRef.current = null;
  }

  // ---------- Element pointer (move / resize / rotate) ----------
  function onPointerDownElement(e: React.PointerEvent, el: GraphicEl, mode: "move" | "resize" | "rotate") {
    e.stopPropagation();
    setSelectedId(null);
    setSelectedElementId(el.id);
    const wrap = canvasWrapRef.current;
    if (!wrap) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const rect = wrap.getBoundingClientRect();
    const cx = rect.left + (el.x + el.width / 2) * rect.width / 100;
    const cy = rect.top + (el.y + (el.height * rect.width / rect.height) / 2) * rect.height / 100;
    elDragRef.current = {
      id: el.id, mode, startX: e.clientX, startY: e.clientY,
      bx: el.x, by: el.y, bw: el.width, bh: el.height, brot: el.rotation, rect, cx, cy,
    };
  }
  function onPointerMoveCanvas(e: React.PointerEvent) {
    // block drag
    const d = dragRef.current;
    if (d) {
      const dx = ((e.clientX - d.startX) / d.rect.width) * 100;
      const dy = ((e.clientY - d.startY) / d.rect.height) * 100;
      updateBlock(d.id, { x: Math.max(0, Math.min(100, d.bx + dx)), y: Math.max(0, Math.min(100, d.by + dy)) });
      return;
    }
    // element drag
    const ed = elDragRef.current;
    if (!ed) return;
    if (ed.mode === "move") {
      const dx = ((e.clientX - ed.startX) / ed.rect.width) * 100;
      const dy = ((e.clientY - ed.startY) / ed.rect.height) * 100;
      updateElement(ed.id, {
        x: Math.max(-10, Math.min(100, ed.bx + dx)),
        y: Math.max(-10, Math.min(100, ed.by + dy)),
      });
    } else if (ed.mode === "resize") {
      const dx = ((e.clientX - ed.startX) / ed.rect.width) * 100;
      const newW = Math.max(3, Math.min(120, ed.bw + dx));
      const ratio = ed.bw > 0 ? ed.bh / ed.bw : 1;
      updateElement(ed.id, { width: newW, height: newW * ratio });
    } else if (ed.mode === "rotate") {
      const angle = (Math.atan2(e.clientY - ed.cy, e.clientX - ed.cx) * 180) / Math.PI + 90;
      updateElement(ed.id, { rotation: Math.round(angle) });
    }
  }
  function onPointerUpCanvas(e: React.PointerEvent) {
    if (dragRef.current) {
      try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* noop */ }
      dragRef.current = null;
    }
    if (elDragRef.current) {
      try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* noop */ }
      elDragRef.current = null;
    }
  }

  function applyTemplate(t: (typeof templates)[number]) {
    setTemplateId(t.id);
    const cfg = (t.config_json ?? {}) as Partial<Config> & {
      // legacy fields (for old templates)
      primaryColor?: string; mainText?: string; productName?: string;
      price?: string; oldPrice?: string; badge?: { text?: string; color?: string };
      slogan?: string; fontFamily?: string;
    };
    if (typeof t.format === "string" && t.format in FORMATS) setFormat(t.format as FormatKey);
    if (Array.isArray(cfg.blocks) && cfg.blocks.length) {
      // New-style template
      const fTitle = brand?.font_primary;
      const fText = brand?.font_secondary;
      const fPrice = brand?.font_price;
      const primary = brand?.primary_color;
      const enriched = cfg.blocks.map((b) => {
        const out = { ...b };
        // Brand identity overrides template font choices when role matches
        if (fTitle && (b.role === "title" || b.role === "subtitle")) out.fontFamily = fTitle;
        else if (fPrice && b.role === "price_main") out.fontFamily = fPrice;
        else if (fText && b.role === "price_old") out.fontFamily = fText;
        if (primary && b.role === "price_main") out.color = primary;
        return out;
      });
      setConfig((c) => ({
        ...c,
        bgColor: cfg.bgColor ?? c.bgColor,
        bgImage: cfg.bgImage ?? c.bgImage,
        logoUrl: brand?.logo_url ?? c.logoUrl ?? cfg.logoUrl ?? null,
        blocks: enriched,
        elements: cfg.elements ?? [],
      }));
    } else {
      // Legacy template -> rebuild blocks from old-shape config
      const legacy = defaultBlocks(brand as Parameters<typeof defaultBlocks>[0]);
      const setRole = (role: BlockRole, text?: string) => {
        const idx = legacy.findIndex((b) => b.role === role);
        if (idx >= 0 && text != null) legacy[idx] = { ...legacy[idx], text };
      };
      setRole("title", cfg.mainText);
      setRole("custom", cfg.productName);
      setRole("price_main", cfg.price ? `${cfg.price} €` : undefined);
      setRole("price_old", cfg.oldPrice ? `${cfg.oldPrice} €` : undefined);
      setRole("badge", cfg.badge?.text);
      setRole("subtitle", cfg.slogan ?? brand?.slogan ?? undefined);
      setConfig((c) => ({
        ...c,
        bgColor: cfg.primaryColor ?? c.bgColor,
        logoUrl: brand?.logo_url ?? c.logoUrl ?? null,
        blocks: legacy,
      }));
    }
  }

  function applyPromotion(id: string) {
    setPromotionId(id);
    const p = promotions.find((x) => x.id === id);
    if (!p) return;
    setConfig((c) => {
      const blocks = c.blocks.map((b) => {
        if (b.role === "custom" && p.product_name) return { ...b, text: p.product_name };
        if (b.role === "price_main" && p.price != null) return { ...b, text: `${String(p.price).replace(".", ",")} €` };
        if (b.role === "price_old" && p.old_price != null) return { ...b, text: `${String(p.old_price).replace(".", ",")} €` };
        return b;
      });
      return {
        ...c,
        bgImage: p.file_type?.startsWith("image/") && p.file_url ? p.file_url : c.bgImage,
        blocks,
      };
    });
  }

  async function uploadImage(file: File, target: "bg" | "logo") {
    if (!file.type.startsWith("image/")) { toast.error("Image uniquement (jpg, png)"); return; }
    const setter = target === "bg" ? setUploadingBg : setUploadingLogo;
    setter(true);
    try {
      const buf = await file.arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(buf);
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
      const data_base64 = btoa(binary);
      const res = await uploadVisualImageFn({ data: { file_name: file.name, file_type: file.type, data_base64 } });
      setConfig((c) => target === "bg" ? { ...c, bgImage: res.url } : { ...c, logoUrl: res.url });
      toast.success("Image ajoutée");
    } catch (e) { toast.error((e as Error).message); }
    finally { setter(false); }
  }

  async function uploadFieldPhoto(file: File) {
    if (!file.type.startsWith("image/")) { toast.error("Image uniquement (jpg, png)"); return; }
    setUploadingField(true);
    try {
      const data_base64 = await blobToBase64(file);
      const res = await uploadVisualImageFn({ data: { file_name: file.name, file_type: file.type, data_base64 } });
      setSourceImageUrl(res.url);
      setSourceType("field_photo");
      setCropSrc(res.url);
      setCropOpen(true);
    } catch (e) { toast.error((e as Error).message); }
    finally { setUploadingField(false); }
  }

  async function handleCropConfirm(box: CropBox) {
    if (!cropSrc) return;
    try {
      const { blob, naturalW, naturalH } = await cropImageToBlob(cropSrc, box, dims.w, dims.h);
      const data_base64 = await blobToBase64(blob);
      const res = await uploadVisualImageFn({
        data: { file_name: `field-${Date.now()}.jpg`, file_type: "image/jpeg", data_base64 },
      });
      const zoom = box.width > 0 ? 1 / box.width : 1;
      setConfig((c) => ({
        ...c,
        bgImage: res.url,
        lastCrop: {
          src: cropSrc,
          x: box.x, y: box.y, width: box.width, height: box.height,
          naturalW, naturalH,
          targetW: dims.w, targetH: dims.h,
          zoom, rotation: 0,
          at: Date.now(),
        },
      }));
      toast.success("Photo recadrée");
    } catch (e) { toast.error((e as Error).message); }
  }

  function applyFieldPreset(key: FieldPresetKey) {
    const { blocks, elements } = buildFieldPreset(key, brand as Parameters<typeof defaultBlocks>[0]);
    setConfig((c) => ({ ...c, blocks, elements }));
    setSelectedId(null);
    setSelectedElementId(null);
    toast.success("Preset appliqué");
  }

  async function exportPng(): Promise<{ blob: Blob; dataUrl: string } | null> {
    const node = canvasWrapRef.current;
    if (!node) return null;
    const dataUrl = await toPng(node, {
      cacheBust: true,
      pixelRatio: dims.w / previewWidth,
      width: previewWidth,
      height: previewHeight,
      backgroundColor: "#ffffff",
    });
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return { blob, dataUrl };
  }

  async function downloadPng() {
    try {
      const r = await exportPng();
      if (!r) return;
      const a = document.createElement("a");
      a.href = r.dataUrl;
      a.download = `komaag-${format}-${Date.now()}.png`;
      a.click();
    } catch (e) { toast.error((e as Error).message); }
  }

  const save = useMutation({
    mutationFn: async () => {
      const r = await exportPng();
      let image_url: string | null = null;
      if (r) {
        const buf = await r.blob.arrayBuffer();
        let binary = "";
        const bytes = new Uint8Array(buf);
        const chunk = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
        const data_base64 = btoa(binary);
        const res = await uploadVisualImageFn({
          data: { file_name: `visual-${Date.now()}.png`, file_type: "image/png", data_base64 },
        });
        image_url = res.url;
      }
      return saveVisualFn({
        data: {
          template_id: templateId,
          promotion_id: promotionId,
          format,
          image_url,
          source_type: sourceType,
          source_image_url: sourceImageUrl,
          config_json: config as unknown as Record<string, unknown>,
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["created-visuals"] });
      toast.success("Visuel enregistré dans la bibliothèque");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const stepperActive: CampaignStep = currentItem?.status === "scheduled"
    ? "schedule"
    : currentItem?.status === "validated" ? "validate"
    : activeTab === "queue" ? "create" : "create";

  const NAV_ITEMS = [
    { key: "templates" as const, icon: LayoutTemplate, label: "Modèles" },
    { key: "text" as const,      icon: Type,           label: "Texte" },
    { key: "elements" as const,  icon: Shapes,         label: "Éléments" },
    { key: "import" as const,    icon: Upload,         label: "Importer" },
    { key: "brand" as const,     icon: Palette,        label: "Marque" },
    { key: "ai" as const,        icon: Sparkles,       label: "Outils IA" },
  ];

  const brandColors = [
    brand?.primary_color,
    brand?.secondary_color,
    (brand as { accent_color?: string } | null | undefined)?.accent_color,
    (brand as { tertiary_color?: string } | null | undefined)?.tertiary_color,
  ].filter(Boolean) as string[];

  const showRightPanel = !!selected || !!selectedElement;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden bg-zinc-950 text-foreground">
      {/* ============== TOP BAR ============== */}
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-zinc-800 bg-zinc-900 px-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="rounded-md bg-brand-gradient px-2 py-1 text-xs font-bold text-black">K</span>
          <Input
            value={visualName}
            onChange={(e) => setVisualName(e.target.value)}
            className="h-8 max-w-[260px] border-transparent bg-transparent text-sm font-medium hover:border-zinc-700 focus-visible:border-zinc-600"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={format}
            onValueChange={(v) => {
              const next = v as FormatKey;
              if (next === format) return;
              const hasContent = (config.blocks?.length ?? 0) > 0 || !!config.bgImage || !!sourceImageUrl;
              setFormat(next);
              if (hasContent) {
                toast.message("Le changement de format peut nécessiter un ajustement.", {
                  description: "Vos éléments sont conservés. Repositionnez-les si besoin.",
                });
              }
            }}
          >
            <SelectTrigger className="h-8 w-[180px] border-zinc-700 bg-zinc-800 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POST_FORMAT_LIST.map((v) => (
                <SelectItem key={v.key} value={v.key}>
                  {v.short} — {v.w}×{v.h}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          {search.campaign && (
            <div className="hidden md:inline-flex rounded-md border border-zinc-700 bg-zinc-800 p-0.5">
              <Button size="sm" variant={activeTab === "editor" ? "default" : "ghost"} className="h-7 text-xs gap-1"
                onClick={() => setActiveTab("editor")}>
                <Layout className="h-3.5 w-3.5" /> Éditeur
              </Button>
              <Button size="sm" variant={activeTab === "queue" ? "default" : "ghost"} className="h-7 text-xs gap-1"
                onClick={() => setActiveTab("queue")}>
                <ListChecks className="h-3.5 w-3.5" /> File
                {queueData?.items?.length ? (
                  <Badge variant="outline" className="ml-1 h-4 px-1 text-[10px]">{queueData.items.length}</Badge>
                ) : null}
              </Button>
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={downloadPng} className="h-8 gap-1 text-xs">
            <Download className="h-3.5 w-3.5" /> Télécharger
          </Button>
          <Button variant="ghost" size="sm"
            onClick={() => { if (currentItemId) setScheduleOpen(true); else toast.info("Validez d'abord le visuel pour le programmer."); }}
            className="h-8 gap-1 text-xs">
            <CalendarPlus className="h-3.5 w-3.5" /> Planifier
          </Button>
          {currentItemId && (
            <Button size="sm" className="h-8 gap-1 text-xs"
              onClick={() => validateItemMut.mutate()} disabled={validateItemMut.isPending}>
              {validateItemMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Valider
            </Button>
          )}
          <Button size="sm"
            onClick={() => save.mutate()} disabled={save.isPending}
            className="h-8 gap-1 bg-brand-gradient text-xs font-semibold text-black shadow-md hover:opacity-90">
            {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Publier
          </Button>
        </div>
      </div>

      {(search.campaign || currentItemId) && (
        <div className="shrink-0 border-b border-zinc-800 bg-zinc-900 px-3 py-2">
          <CampaignStepper active={stepperActive} />
        </div>
      )}

      {activeTab === "queue" ? (
        <div className="flex-1 overflow-auto p-6">
          <Card>
            <CardContent className="p-4 space-y-3">
              <h2 className="text-base font-semibold">File d'attente ({queueData?.items?.length ?? 0})</h2>
              {(!queueData?.items || queueData.items.length === 0) && (
                <p className="text-sm text-muted-foreground italic">Aucune promo en file. Importez un catalogue et générez une campagne.</p>
              )}
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {(queueData?.items ?? []).map((it: any) => (
                  <div key={it.id} className="rounded-lg border p-3 space-y-2">
                    <div className="flex gap-2">
                      <div className="h-16 w-16 flex-shrink-0 rounded border overflow-hidden bg-muted">
                        {(it.thumbnail_url ?? it.source_image_url) ? (
                          <img src={it.thumbnail_url ?? it.source_image_url} alt={it.product_name ?? ""} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            <ImageIcon className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{it.product_name}</p>
                        <div className="flex items-baseline gap-1 flex-wrap">
                          {it.promo_price != null && <span className="text-sm font-bold text-primary">{String(it.promo_price).replace(".", ",")} €</span>}
                          {it.old_price != null && <span className="text-[10px] line-through text-muted-foreground">{String(it.old_price).replace(".", ",")} €</span>}
                          {it.discount_percent != null && <Badge className="bg-red-100 text-red-700 text-[10px]">-{it.discount_percent}%</Badge>}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {statusBadge(it.status)}
                          {it.category && <Badge variant="outline" className="text-[10px]">{it.category}</Badge>}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <Button size="sm" variant={it.creation_mode === "catalog_visual" ? "default" : "outline"}
                        className="h-8 text-[11px] gap-1" onClick={() => openQueueItem(it.id, "catalog_visual")}
                        disabled={!it.source_image_url}>
                        <Layout className="h-3 w-3" /> Visuel
                      </Button>
                      <Button size="sm" variant={it.creation_mode === "field_photo" ? "default" : "outline"}
                        className="h-8 text-[11px] gap-1" onClick={() => openQueueItem(it.id, "field_photo")}>
                        <Camera className="h-3 w-3" /> Terrain
                      </Button>
                    </div>
                    <Button size="sm" variant="ghost" className="w-full h-8 text-xs"
                      onClick={() => openQueueItem(it.id)}>Ouvrir</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* ============== LEFT NAV (icons + labels) ============== */}
          <nav className="flex w-[88px] shrink-0 flex-col items-stretch gap-1 border-r border-zinc-800 bg-zinc-900 p-2">
            {NAV_ITEMS.map((it) => {
              const Icon = it.icon;
              const active = leftNav === it.key;
              return (
                <button
                  key={it.key}
                  type="button"
                  onClick={() => setLeftNav(it.key)}
                  className={cn(
                    "group flex flex-col items-center justify-center gap-1 rounded-lg px-1 py-3 text-[10px] font-medium transition-all",
                    active
                      ? "bg-brand-gradient text-black shadow-md"
                      : "text-zinc-400 hover:bg-zinc-800 hover:text-white",
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="truncate">{it.label}</span>
                </button>
              );
            })}
          </nav>

          {/* ============== CONTEXTUAL PANEL ============== */}
          <aside className="w-[300px] shrink-0 overflow-y-auto border-r border-zinc-800 bg-zinc-900/60 p-3">
            {leftNav === "templates" && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Modèles de l'enseigne</h3>
                <p className="text-[11px] text-muted-foreground">Choisissez un modèle prêt à personnaliser.</p>
                <div className="grid grid-cols-2 gap-2">
                  {templates.map((t) => {
                    const cfg = (t.config_json ?? {}) as { bgColor?: string; primaryColor?: string };
                    return (
                      <button key={t.id} onClick={() => applyTemplate(t)}
                        className={cn(
                          "group flex flex-col gap-1 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-800/40 p-1.5 text-left transition hover:border-primary hover:scale-[1.02]",
                          templateId === t.id && "border-primary ring-1 ring-primary",
                        )}>
                        <div className="flex aspect-square w-full items-center justify-center rounded text-center text-[10px] font-bold text-white"
                          style={{ background: cfg.bgColor ?? cfg.primaryColor ?? "#444" }}>
                          {t.name}
                        </div>
                        <span className="truncate text-[10px]">{t.name}</span>
                      </button>
                    );
                  })}
                  {templates.length === 0 && (
                    <p className="col-span-2 text-[11px] italic text-muted-foreground">Aucun modèle disponible.</p>
                  )}
                </div>
                {catalogPromo && (
                  <div className="mt-3 rounded-md border border-primary/30 bg-primary/5 p-2 text-[11px]">
                    <p className="text-muted-foreground">Promo catalogue</p>
                    <p className="font-semibold">{catalogPromo.product_name}</p>
                    <div className="mt-1 inline-flex rounded-md border border-zinc-700 bg-background p-0.5">
                      <Button size="sm" variant={catalogMode === "catalog_visual" ? "default" : "ghost"}
                        className="h-6 text-[10px] gap-1" onClick={() => switchCatalogMode("catalog_visual")}
                        disabled={!catalogPromo.product_image_url}>
                        <ImageIcon className="h-3 w-3" /> Visuel
                      </Button>
                      <Button size="sm" variant={catalogMode === "field_photo" ? "default" : "ghost"}
                        className="h-6 text-[10px] gap-1" onClick={() => switchCatalogMode("field_photo")}>
                        <Camera className="h-3 w-3" /> Terrain
                      </Button>
                    </div>
                  </div>
                )}
                <div className="mt-3 space-y-2">
                  <Label className="text-[11px] font-semibold">Lier à une promotion</Label>
                  <Select value={promotionId ?? ""} onValueChange={(v) => applyPromotion(v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Choisir une promo" /></SelectTrigger>
                    <SelectContent>
                      {promotions.map((p) => <SelectItem key={p.id} value={p.id}>{p.product_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {leftNav === "text" && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Texte</h3>
                <Button onClick={() => addBlock("custom")} className="w-full gap-1" size="sm">
                  <Plus className="h-3.5 w-3.5" /> Ajouter un paragraphe
                </Button>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Presets</Label>
                  {(Object.keys(ROLE_LABEL) as BlockRole[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => addBlock(r)}
                      className="flex w-full items-center justify-between rounded-md border border-zinc-800 bg-zinc-800/40 px-2 py-2 text-left text-xs transition hover:border-primary hover:bg-zinc-800"
                    >
                      <span className="font-medium">{ROLE_LABEL[r]}</span>
                      <Plus className="h-3 w-3 text-muted-foreground" />
                    </button>
                  ))}
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Blocs sur le canvas</Label>
                  <ul className="space-y-1">
                    {config.blocks.map((b) => (
                      <li key={b.id}>
                        <button
                          type="button"
                          onClick={() => { setSelectedId(b.id); setSelectedElementId(null); }}
                          className={cn(
                            "flex w-full items-center justify-between rounded border px-2 py-1 text-left text-xs",
                            selectedId === b.id ? "border-primary bg-primary/10" : "border-zinc-800 hover:bg-zinc-800",
                          )}
                        >
                          <span className="truncate">{ROLE_LABEL[b.role]} — {b.text || "(vide)"}</span>
                          <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive shrink-0"
                            onClick={(e) => { e.stopPropagation(); deleteBlock(b.id); }} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {leftNav === "elements" && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Éléments graphiques</h3>
                {ELEMENT_CATEGORIES.map((cat) => (
                  <div key={cat.key}>
                    <p className="mb-2 text-[11px] font-semibold text-muted-foreground">{cat.label}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {GRAPHIC_ELEMENTS.filter((e) => e.category === cat.key).map((el) => {
                        const svg = renderElementSvg(el.key, {
                          color: el.defaultColor, stroke: el.defaultStroke,
                          secondary: el.defaultSecondary, width: 56, height: 56, opacity: 1, rotation: 0,
                        });
                        return (
                          <button key={el.key} type="button" title={el.name}
                            onClick={() => addElement(el.key)}
                            className="flex aspect-square items-center justify-center rounded-md border border-zinc-800 bg-zinc-800/40 p-1 transition hover:border-primary hover:bg-zinc-800"
                            dangerouslySetInnerHTML={{ __html: svg }} />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {leftNav === "import" && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Importer</h3>
                <UploadField label="Image de fond" uploading={uploadingBg} currentUrl={config.bgImage ?? null}
                  onClear={() => setConfig((c) => ({ ...c, bgImage: null }))} onFile={(f) => uploadImage(f, "bg")} />
                <UploadField label="Logo" uploading={uploadingLogo} currentUrl={config.logoUrl ?? null}
                  onClear={() => setConfig((c) => ({ ...c, logoUrl: null }))} onFile={(f) => uploadImage(f, "logo")} />
                <div>
                  <Label className="mb-1 block text-xs flex items-center gap-1">
                    <Camera className="h-3 w-3" /> Photo terrain
                  </Label>
                  <label
                    className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-zinc-700 bg-zinc-800/40 px-3 py-4 text-center text-[11px] hover:bg-zinc-800"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) uploadFieldPhoto(f); }}
                  >
                    {uploadingField ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 text-primary" />}
                    <span>{uploadingField ? "Envoi…" : "Glissez une image / PNG / SVG"}</span>
                    <input type="file" accept="image/*" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFieldPhoto(f); }} />
                  </label>
                </div>
                <div>
                  <Label className="mb-1 block text-[11px] font-semibold flex items-center gap-1">
                    <Wand2 className="h-3 w-3" /> Presets photo terrain
                  </Label>
                  <div className="grid grid-cols-1 gap-1">
                    {FIELD_PRESETS.map((p) => (
                      <button key={p.key} type="button" onClick={() => applyFieldPreset(p.key)}
                        className="flex items-center gap-2 rounded border border-zinc-800 bg-zinc-800/40 px-2 py-1.5 text-left text-[11px] hover:border-primary hover:bg-zinc-800">
                        <span>{p.emoji}</span><span className="truncate">{p.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {leftNav === "brand" && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Identité de marque</h3>
                {brand?.logo_url && (
                  <div>
                    <Label className="mb-1 block text-[11px] font-semibold">Logo</Label>
                    <div className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-800/40 p-2">
                      <img src={brand.logo_url} alt="Logo" className="h-12 w-12 rounded object-contain bg-white" />
                      <Button size="sm" variant="outline" className="h-7 text-xs"
                        onClick={() => setConfig((c) => ({ ...c, logoUrl: brand?.logo_url ?? null }))}>
                        Utiliser
                      </Button>
                    </div>
                  </div>
                )}
                {brandColors.length > 0 && (
                  <div>
                    <Label className="mb-1 block text-[11px] font-semibold">Couleurs de l'enseigne</Label>
                    <div className="flex flex-wrap gap-2">
                      {brandColors.map((c, i) => (
                        <button key={i} title={c}
                          onClick={() => {
                            if (selected) updateBlock(selected.id, { color: c });
                            else if (selectedElement) updateElement(selectedElement.id, { color: c });
                            else setConfig((cc) => ({ ...cc, bgColor: c }));
                          }}
                          className="h-9 w-9 rounded-md border-2 border-zinc-700 shadow-sm hover:scale-110 transition"
                          style={{ background: c }} />
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <Label className="mb-1 block text-[11px] font-semibold">Couleur de fond</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={config.bgColor ?? "#1f2937"}
                      onChange={(e) => setConfig((c) => ({ ...c, bgColor: e.target.value }))}
                      className="h-9 w-12 cursor-pointer rounded border" />
                    <Input value={config.bgColor ?? ""} className="h-8 text-xs"
                      onChange={(e) => setConfig((c) => ({ ...c, bgColor: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label className="mb-1 block text-[11px] font-semibold">Polices</Label>
                  <ul className="space-y-1 text-xs">
                    {brand?.font_primary && <li className="rounded border border-zinc-800 bg-zinc-800/40 px-2 py-1.5" style={{ fontFamily: `"${brand.font_primary}"` }}>Titre — {brand.font_primary}</li>}
                    {brand?.font_secondary && <li className="rounded border border-zinc-800 bg-zinc-800/40 px-2 py-1.5" style={{ fontFamily: `"${brand.font_secondary}"` }}>Texte — {brand.font_secondary}</li>}
                    {brand?.font_price && <li className="rounded border border-zinc-800 bg-zinc-800/40 px-2 py-1.5" style={{ fontFamily: `"${brand.font_price}"` }}>Prix — {brand.font_price}</li>}
                    {!brand?.font_primary && !brand?.font_secondary && !brand?.font_price && (
                      <li className="text-[11px] italic text-muted-foreground">Aucune police configurée.</li>
                    )}
                  </ul>
                </div>
              </div>
            )}

            {leftNav === "ai" && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-1">
                  <Sparkles className="h-4 w-4 text-primary" /> Outils IA
                </h3>
                <p className="text-[11px] text-muted-foreground">Boostez votre visuel avec l'intelligence artificielle.</p>
                {[
                  { label: "Générer une image produit", icon: ImageIcon },
                  { label: "Supprimer le fond", icon: Wand2 },
                  { label: "Améliorer une photo", icon: Sparkles },
                  { label: "Recentrer automatiquement", icon: RotateCw },
                  { label: "Générer un texte", icon: Type },
                  { label: "Générer plusieurs variantes", icon: Copy },
                ].map((t) => {
                  const Icon = t.icon;
                  return (
                    <button key={t.label}
                      onClick={() => toast.info(`${t.label} — bientôt disponible`)}
                      className="flex w-full items-center gap-2 rounded-md border border-zinc-800 bg-zinc-800/40 px-3 py-2.5 text-left text-xs transition hover:border-primary hover:bg-zinc-800">
                      <Icon className="h-4 w-4 text-primary shrink-0" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          {/* ============== CANVAS ============== */}
          <main className="relative flex flex-1 items-center justify-center overflow-auto bg-zinc-800/50 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.05)_1px,transparent_0)] [background-size:24px_24px] p-8">
            <div className="flex flex-col items-center gap-3">
              <div
                ref={canvasWrapRef}
                onPointerMove={onPointerMoveCanvas}
                onPointerUp={onPointerUpCanvas}
                onClick={() => { setSelectedId(null); setSelectedElementId(null); }}
                className="relative overflow-hidden rounded-lg border border-zinc-700 shadow-2xl"
                style={{ width: previewWidth, height: previewHeight, background: config.bgColor ?? "#1f2937" }}
              >
                {config.bgImage && (
                  <img src={config.bgImage} alt="" draggable={false} crossOrigin="anonymous"
                    className="pointer-events-none absolute inset-0 h-full w-full select-none"
                    style={{ objectFit: "fill", objectPosition: "top left" }} />
                )}
                {showCropDebug && config.lastCrop && (
                  <div className="pointer-events-none absolute right-1 top-1 z-50 rounded bg-black/80 px-2 py-1 font-mono text-[10px] leading-tight text-white shadow">
                    <div>crop: {config.lastCrop.x.toFixed(3)}, {config.lastCrop.y.toFixed(3)} — {config.lastCrop.width.toFixed(3)}×{config.lastCrop.height.toFixed(3)}</div>
                  </div>
                )}
                {config.blocks.map((b) => {
                  const textShadow = b.shadowColor && (b.shadowBlur || b.shadowX || b.shadowY)
                    ? `${(b.shadowX ?? 0) * scale}px ${(b.shadowY ?? 0) * scale}px ${(b.shadowBlur ?? 0) * scale}px ${b.shadowColor}`
                    : undefined;
                  const stroke = b.strokeColor && b.strokeWidth
                    ? `${b.strokeWidth * scale}px ${b.strokeColor}` : undefined;
                  const decorations = [b.underline ? "underline" : "", b.strikethrough ? "line-through" : ""].filter(Boolean).join(" ");
                  return (
                    <div key={b.id}
                      onPointerDown={(e) => onPointerDownBlock(e, b)}
                      onClick={(e) => { e.stopPropagation(); setSelectedId(b.id); setSelectedElementId(null); }}
                      className={cn("absolute cursor-move select-none", selectedId === b.id && "outline outline-2 outline-primary/80")}
                      style={{
                        left: `${b.x}%`, top: `${b.y}%`, width: `${b.width}%`,
                        fontFamily: `"${b.fontFamily}", system-ui, sans-serif`,
                        fontSize: `${b.fontSize * scale}px`, color: b.color,
                        fontWeight: b.bold ? 900 : 400, fontStyle: b.italic ? "italic" : "normal",
                        textDecoration: decorations || undefined, textAlign: b.align,
                        lineHeight: 1.1, textShadow, WebkitTextStroke: stroke,
                        background: b.bgColor,
                        borderRadius: b.rounded != null ? `${b.rounded}px` : undefined,
                        padding: b.padding != null ? `${b.padding * scale}px ${(b.padding ?? 0) * 1.5 * scale}px` : undefined,
                        whiteSpace: "pre-wrap", wordBreak: "break-word",
                      }}>
                      {b.text || " "}
                    </div>
                  );
                })}
                {elements.map((el) => {
                  const wPx = (el.width / 100) * previewWidth;
                  const hPx = (el.height / 100) * previewWidth;
                  const svg = renderElementSvg(el.key, {
                    color: el.color, stroke: el.strokeWidth, secondary: el.secondary,
                    width: wPx, height: hPx, opacity: el.opacity, rotation: 0,
                  });
                  const isSel = selectedElementId === el.id;
                  return (
                    <div key={el.id}
                      onPointerDown={(e) => onPointerDownElement(e, el, "move")}
                      onClick={(e) => { e.stopPropagation(); setSelectedId(null); setSelectedElementId(el.id); }}
                      className={cn("absolute cursor-move select-none", isSel && "outline outline-2 outline-primary/80")}
                      style={{
                        left: `${el.x}%`, top: `${el.y}%`, width: wPx, height: hPx,
                        transform: `rotate(${el.rotation}deg)`, transformOrigin: "center", opacity: el.opacity,
                      }}
                      dangerouslySetInnerHTML={{ __html: svg }} />
                  );
                })}
                {selectedElement && (() => {
                  const el = selectedElement;
                  const wPx = (el.width / 100) * previewWidth;
                  const hPx = (el.height / 100) * previewWidth;
                  return (
                    <div className="pointer-events-none absolute"
                      style={{ left: `${el.x}%`, top: `${el.y}%`, width: wPx, height: hPx,
                        transform: `rotate(${el.rotation}deg)`, transformOrigin: "center" }}>
                      <div onPointerDown={(e) => onPointerDownElement(e, el, "resize")}
                        className="pointer-events-auto absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-nwse-resize rounded-sm border bg-primary" />
                      <div onPointerDown={(e) => onPointerDownElement(e, el, "rotate")}
                        className="pointer-events-auto absolute left-1/2 -top-5 -translate-x-1/2 h-3 w-3 cursor-grab rounded-full border bg-primary" />
                    </div>
                  );
                })()}
                {config.logoUrl && (
                  <img src={config.logoUrl} alt="Logo" className="absolute"
                    style={{ right: `${20 * scale}px`, bottom: `${20 * scale}px`,
                      width: `${160 * scale}px`, objectFit: "contain" }} />
                )}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span>{dims.w} × {dims.h} px</span>
                <span>·</span>
                <span>{Math.round(scale * 100)}%</span>
                {sourceImageUrl && (
                  <>
                    <span>·</span>
                    <button type="button" onClick={() => { setCropSrc(sourceImageUrl); setCropOpen(true); }}
                      className="text-primary hover:underline">Recadrer pour ce format</button>
                  </>
                )}
                <span>·</span>
                <button type="button" onClick={() => setShowCropDebug((v) => !v)} className="hover:underline">
                  {showCropDebug ? "Masquer debug" : "Debug crop"}
                </button>
              </div>
            </div>
          </main>

          {/* ============== RIGHT PROPERTIES PANEL ============== */}
          {showRightPanel && (
            <aside className="w-[300px] shrink-0 overflow-y-auto border-l border-zinc-800 bg-zinc-900/60 p-3">
              <ScrollArea className="h-full pr-1">
                {selected && (
                  <div className="space-y-3 py-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">Propriétés du bloc</h3>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setSelectedId(null)}>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div>
                      <Label className="mb-1 block text-xs">Rôle</Label>
                      <Select value={selected.role} onValueChange={(v) => updateBlock(selected.id, { role: v as BlockRole })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.keys(ROLE_LABEL) as BlockRole[]).map((r) => (
                            <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="mb-1 block text-xs">Texte</Label>
                      <Input value={selected.text} onChange={(e) => updateBlock(selected.id, { text: e.target.value })} className="h-8 text-xs" />
                    </div>
                    <div>
                      <Label className="mb-1 block text-xs">Police</Label>
                      <Select value={allFontNames.includes(selected.fontFamily) ? selected.fontFamily : "Inter"}
                        onValueChange={(v) => updateBlock(selected.id, { fontFamily: v })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent className="max-h-72">
                          {FONT_LIBRARY.map((f) => (
                            <SelectItem key={f.name} value={f.name}>
                              <span style={{ fontFamily: `"${f.name}", system-ui, sans-serif` }}>{f.name}</span>
                            </SelectItem>
                          ))}
                          {brandFonts.map((f) => (
                            <SelectItem key={f.id} value={f.name}>
                              <span style={{ fontFamily: `"${f.name}", system-ui, sans-serif` }}>{f.name} (importée)</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="mb-1 block text-xs">Taille</Label>
                        <Input type="number" className="h-8 text-xs" value={selected.fontSize}
                          onChange={(e) => updateBlock(selected.id, { fontSize: Number(e.target.value) || 12 })} />
                      </div>
                      <div>
                        <Label className="mb-1 block text-xs">Largeur %</Label>
                        <Input type="number" className="h-8 text-xs" value={selected.width}
                          onChange={(e) => updateBlock(selected.id, { width: Math.max(5, Math.min(100, Number(e.target.value) || 60)) })} />
                      </div>
                    </div>
                    <div>
                      <Label className="mb-1 block text-xs">Couleur</Label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={selected.color}
                          onChange={(e) => updateBlock(selected.id, { color: e.target.value })}
                          className="h-8 w-10 cursor-pointer rounded border" />
                        <Input value={selected.color} className="h-8 text-xs"
                          onChange={(e) => updateBlock(selected.id, { color: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <Label className="mb-1 block text-xs">Style</Label>
                      <div className="flex flex-wrap gap-1">
                        <Toggle on={selected.bold} onClick={() => updateBlock(selected.id, { bold: !selected.bold })}><Bold className="h-3.5 w-3.5" /></Toggle>
                        <Toggle on={selected.italic} onClick={() => updateBlock(selected.id, { italic: !selected.italic })}><Italic className="h-3.5 w-3.5" /></Toggle>
                        <Toggle on={selected.underline} onClick={() => updateBlock(selected.id, { underline: !selected.underline })}><Underline className="h-3.5 w-3.5" /></Toggle>
                        <Toggle on={selected.strikethrough} onClick={() => updateBlock(selected.id, { strikethrough: !selected.strikethrough })}><Strikethrough className="h-3.5 w-3.5" /></Toggle>
                      </div>
                    </div>
                    <div>
                      <Label className="mb-1 block text-xs">Alignement</Label>
                      <Select value={selected.align} onValueChange={(v) => updateBlock(selected.id, { align: v as Block["align"] })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Gauche</SelectItem>
                          <SelectItem value="center">Centre</SelectItem>
                          <SelectItem value="right">Droite</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {selected.role === "badge" && (
                      <div className="rounded-md border border-zinc-800 bg-zinc-800/40 p-2 space-y-2">
                        <Label className="block text-xs">Fond du badge</Label>
                        <input type="color" value={selected.bgColor ?? "#FACC15"}
                          onChange={(e) => updateBlock(selected.id, { bgColor: e.target.value })}
                          className="h-8 w-full cursor-pointer rounded border" />
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="mb-1 block text-xs">Rayon</Label>
                            <Input type="number" className="h-8 text-xs" value={selected.rounded ?? 0}
                              onChange={(e) => updateBlock(selected.id, { rounded: Number(e.target.value) || 0 })} />
                          </div>
                          <div>
                            <Label className="mb-1 block text-xs">Padding</Label>
                            <Input type="number" className="h-8 text-xs" value={selected.padding ?? 0}
                              onChange={(e) => updateBlock(selected.id, { padding: Number(e.target.value) || 0 })} />
                          </div>
                        </div>
                      </div>
                    )}
                    <Button variant="destructive" size="sm" className="w-full" onClick={() => deleteBlock(selected.id)}>
                      <Trash2 className="h-3.5 w-3.5" /> Supprimer le bloc
                    </Button>
                  </div>
                )}
                {selectedElement && !selected && (
                  <div className="space-y-3 py-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">{getElementDef(selectedElement.key)?.name ?? "Élément"}</h3>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => duplicateElement(selectedElement.id)}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="destructive" size="sm" className="h-7 w-7 p-0" onClick={() => deleteElement(selectedElement.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label className="mb-1 block text-xs">Couleur</Label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={selectedElement.color}
                          onChange={(e) => updateElement(selectedElement.id, { color: e.target.value })}
                          className="h-8 w-10 cursor-pointer rounded border" />
                        <Input value={selectedElement.color} className="h-8 text-xs"
                          onChange={(e) => updateElement(selectedElement.id, { color: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <Label className="mb-1 block text-xs">Épaisseur ({selectedElement.strokeWidth})</Label>
                      <Slider value={[selectedElement.strokeWidth]} min={0} max={20} step={0.5}
                        onValueChange={(v) => updateElement(selectedElement.id, { strokeWidth: v[0] })} />
                    </div>
                    <div>
                      <Label className="mb-1 block text-xs">Opacité ({Math.round(selectedElement.opacity * 100)}%)</Label>
                      <Slider value={[selectedElement.opacity * 100]} min={10} max={100} step={1}
                        onValueChange={(v) => updateElement(selectedElement.id, { opacity: v[0] / 100 })} />
                    </div>
                    <div>
                      <Label className="mb-1 block text-xs flex items-center gap-1"><RotateCw className="h-3 w-3" /> Rotation ({selectedElement.rotation}°)</Label>
                      <Slider value={[selectedElement.rotation]} min={-180} max={180} step={1}
                        onValueChange={(v) => updateElement(selectedElement.id, { rotation: v[0] })} />
                    </div>
                  </div>
                )}
              </ScrollArea>
            </aside>
          )}
        </div>
      )}

      <CropModal
        open={cropOpen}
        onOpenChange={setCropOpen}
        imageUrl={cropSrc}
        title="Recadrer la photo"
        aspectRatio={`${dims.w}/${dims.h}`}
        initial={{ x: 0.05, y: 0.05, width: 0.9, height: 0.9 }}
        onConfirm={handleCropConfirm}
      />


      <ScheduleItemModal
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        item={currentItem ? {
          id: currentItem.id,
          recommended_platform: currentItem.recommended_platform,
          recommended_date: currentItem.recommended_date,
          recommended_time: currentItem.recommended_time,
          generated_caption: currentItem.generated_caption,
          final_visual_url: currentItem.final_visual_url,
          promo_price: currentItem.promo_price,
          recommended_format: currentItem.recommended_format ?? format,
        } : null}
        onScheduled={() => { setActiveTab("queue"); }}
      />

      <Dialog open={postValidateOpen} onOpenChange={setPostValidateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Visuel validé
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Que voulez-vous faire ensuite ?</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setPostValidateOpen(false); setActiveTab("queue"); }}>
              Retour à la file
            </Button>
            <Button variant="brand" onClick={() => { setPostValidateOpen(false); setScheduleOpen(true); }}>
              <CalendarPlus className="h-4 w-4" /> Programmer maintenant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded border transition",
        on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent",
      )}>
      {children}
    </button>
  );
}

function UploadField({
  label, uploading, currentUrl, onClear, onFile,
}: {
  label: string; uploading: boolean; currentUrl: string | null;
  onClear: () => void; onFile: (f: File) => void;
}) {
  return (
    <div>
      <Label className="mb-1 block text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        {currentUrl ? (
          <>
            <img src={currentUrl} alt="" className="h-10 w-10 rounded object-cover" />
            <Button size="sm" variant="outline" onClick={onClear}>Retirer</Button>
          </>
        ) : (
          <label className="flex cursor-pointer items-center gap-1 rounded-md border bg-background px-3 py-1.5 text-xs hover:bg-accent">
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            <ImageIcon className="h-3.5 w-3.5" /> Charger
            <input type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
          </label>
        )}
      </div>
    </div>
  );
}
