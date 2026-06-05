import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { toPng } from "html-to-image";
import {
  Bold, Italic, Underline, Strikethrough, Download, Loader2, Plus, Save,
  Sparkles, Tag as TagIcon, Trash2, Type, Upload, Image as ImageIcon,
  Shapes, Copy, RotateCw,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  listVisualTemplatesFn, saveVisualFn, uploadVisualImageFn,
} from "@/lib/visuals.functions";
import { listPromotionsFn } from "@/lib/promotions.functions";
import { getMyBrandProfileFn } from "@/lib/brand-profiles.functions";
import { listBrandFontsFn } from "@/lib/brand-fonts.functions";
import { FONT_LIBRARY, registerCustomFont } from "@/lib/fonts";
import {
  GRAPHIC_ELEMENTS, ELEMENT_CATEGORIES, getElementDef, renderElementSvg,
  type ElementCategory,
} from "@/lib/graphic-elements";

export const Route = createFileRoute("/_authenticated/creation")({
  component: CreationPage,
});

type FormatKey = "ig_square" | "story" | "fb_post";
const FORMATS: Record<FormatKey, { label: string; w: number; h: number; previewW: number }> = {
  ig_square: { label: "Post Instagram 1:1", w: 1080, h: 1080, previewW: 420 },
  story:     { label: "Story / Reel 9:16",  w: 1080, h: 1920, previewW: 260 },
  fb_post:   { label: "Post Facebook",       w: 1200, h: 630,  previewW: 480 },
};

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

function CreationPage() {
  const qc = useQueryClient();
  const [format, setFormat] = useState<FormatKey>("ig_square");
  const [config, setConfig] = useState<Config>({ bgImage: null, bgColor: "#1f2937", logoUrl: null, blocks: [] });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [promotionId, setPromotionId] = useState<string | null>(null);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; startX: number; startY: number; bx: number; by: number; rect: DOMRect } | null>(null);
  const elDragRef = useRef<{ id: string; mode: "move" | "resize" | "rotate"; startX: number; startY: number; bx: number; by: number; bw: number; bh: number; brot: number; rect: DOMRect; cx: number; cy: number } | null>(null);

  const { data: templates = [] } = useQuery({ queryKey: ["visual-templates"], queryFn: () => listVisualTemplatesFn() });
  const { data: promotions = [] } = useQuery({ queryKey: ["promotions"], queryFn: () => listPromotionsFn() });
  const { data: brand } = useQuery({ queryKey: ["my-brand"], queryFn: () => getMyBrandProfileFn() });
  const { data: brandFonts = [] } = useQuery({ queryKey: ["my-brand-fonts"], queryFn: () => listBrandFontsFn() });

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
    if (t.format === "ig_square" || t.format === "story" || t.format === "fb_post") setFormat(t.format);
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

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Création</h1>
          <p className="text-sm text-muted-foreground">Composez un visuel social-media en quelques clics.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadPng}><Download className="h-4 w-4" /> PNG</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr_300px]">
        {/* LEFT — canvas / format / background / add blocks */}
        <Card>
          <CardContent className="space-y-4 p-4">
            <div>
              <Label className="mb-1 block text-xs">Format</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as FormatKey)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(FORMATS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-1 block text-xs">Couleur de fond</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={config.bgColor ?? "#1f2937"}
                  onChange={(e) => setConfig((c) => ({ ...c, bgColor: e.target.value }))}
                  className="h-9 w-12 cursor-pointer rounded border" />
                <Input value={config.bgColor ?? ""}
                  onChange={(e) => setConfig((c) => ({ ...c, bgColor: e.target.value }))} />
              </div>
            </div>

            <UploadField label="Image de fond" uploading={uploadingBg} currentUrl={config.bgImage ?? null}
              onClear={() => setConfig((c) => ({ ...c, bgImage: null }))} onFile={(f) => uploadImage(f, "bg")} />
            <UploadField label="Logo" uploading={uploadingLogo} currentUrl={config.logoUrl ?? null}
              onClear={() => setConfig((c) => ({ ...c, logoUrl: null }))} onFile={(f) => uploadImage(f, "logo")} />

            <div>
              <Label className="mb-1 block text-xs">Ajouter un bloc</Label>
              <div className="grid grid-cols-2 gap-1">
                {(Object.keys(ROLE_LABEL) as BlockRole[]).map((r) => (
                  <Button key={r} variant="outline" size="sm" onClick={() => addBlock(r)}>
                    <Plus className="h-3 w-3" /> {ROLE_LABEL[r]}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label className="mb-1 block text-xs">Blocs</Label>
              <ul className="space-y-1">
                {config.blocks.map((b) => (
                  <li key={b.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(b.id)}
                      className={cn(
                        "flex w-full items-center justify-between rounded border px-2 py-1 text-left text-xs",
                        selectedId === b.id ? "border-primary bg-accent" : "hover:bg-accent",
                      )}
                    >
                      <span className="truncate">
                        <Type className="mr-1 inline h-3 w-3" />
                        {ROLE_LABEL[b.role]} — {b.text || "(vide)"}
                      </span>
                      <Trash2
                        className="h-3 w-3 text-muted-foreground hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); deleteBlock(b.id); }}
                      />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* CENTER — preview */}
        <Card>
          <CardContent className="flex items-center justify-center p-4">
            <div
              ref={canvasWrapRef}
              onPointerMove={onPointerMoveCanvas}
              onPointerUp={onPointerUpCanvas}
              onClick={() => { setSelectedId(null); setSelectedElementId(null); }}
              className="relative overflow-hidden rounded-md border shadow-sm"
              style={{
                width: previewWidth,
                height: previewHeight,
                background: config.bgColor ?? "#1f2937",
                backgroundImage: config.bgImage ? `linear-gradient(rgba(0,0,0,.3), rgba(0,0,0,.3)), url(${config.bgImage})` : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              {config.blocks.map((b) => {
                const textShadow = b.shadowColor && (b.shadowBlur || b.shadowX || b.shadowY)
                  ? `${(b.shadowX ?? 0) * scale}px ${(b.shadowY ?? 0) * scale}px ${(b.shadowBlur ?? 0) * scale}px ${b.shadowColor}`
                  : undefined;
                const stroke = b.strokeColor && b.strokeWidth
                  ? `${b.strokeWidth * scale}px ${b.strokeColor}`
                  : undefined;
                const decorations = [
                  b.underline ? "underline" : "",
                  b.strikethrough ? "line-through" : "",
                ].filter(Boolean).join(" ");
                return (
                  <div
                    key={b.id}
                    onPointerDown={(e) => onPointerDownBlock(e, b)}
                    onClick={(e) => { e.stopPropagation(); setSelectedId(b.id); }}
                    className={cn("absolute cursor-move select-none", selectedId === b.id && "outline outline-2 outline-primary/80")}
                    style={{
                      left: `${b.x}%`,
                      top: `${b.y}%`,
                      width: `${b.width}%`,
                      fontFamily: `"${b.fontFamily}", system-ui, sans-serif`,
                      fontSize: `${b.fontSize * scale}px`,
                      color: b.color,
                      fontWeight: b.bold ? 900 : 400,
                      fontStyle: b.italic ? "italic" : "normal",
                      textDecoration: decorations || undefined,
                      textAlign: b.align,
                      lineHeight: 1.1,
                      textShadow,
                      WebkitTextStroke: stroke,
                      background: b.bgColor,
                      borderRadius: b.rounded != null ? `${b.rounded}px` : undefined,
                      padding: b.padding != null ? `${b.padding * scale}px ${(b.padding ?? 0) * 1.5 * scale}px` : undefined,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
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
                  <div
                    key={el.id}
                    onPointerDown={(e) => onPointerDownElement(e, el, "move")}
                    onClick={(e) => { e.stopPropagation(); setSelectedId(null); setSelectedElementId(el.id); }}
                    className={cn("absolute cursor-move select-none", isSel && "outline outline-2 outline-primary/80")}
                    style={{
                      left: `${el.x}%`,
                      top: `${el.y}%`,
                      width: wPx,
                      height: hPx,
                      transform: `rotate(${el.rotation}deg)`,
                      transformOrigin: "center",
                      opacity: el.opacity,
                    }}
                    dangerouslySetInnerHTML={{ __html: svg }}
                  />
                );
              })}
              {selectedElement && (() => {
                const el = selectedElement;
                const wPx = (el.width / 100) * previewWidth;
                const hPx = (el.height / 100) * previewWidth;
                return (
                  <div
                    className="pointer-events-none absolute"
                    style={{
                      left: `${el.x}%`,
                      top: `${el.y}%`,
                      width: wPx,
                      height: hPx,
                      transform: `rotate(${el.rotation}deg)`,
                      transformOrigin: "center",
                    }}
                  >
                    {/* resize handle (bottom-right) */}
                    <div
                      onPointerDown={(e) => onPointerDownElement(e, el, "resize")}
                      className="pointer-events-auto absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-nwse-resize rounded-sm border bg-primary"
                    />
                    {/* rotate handle (top) */}
                    <div
                      onPointerDown={(e) => onPointerDownElement(e, el, "rotate")}
                      className="pointer-events-auto absolute left-1/2 -top-5 -translate-x-1/2 h-3 w-3 cursor-grab rounded-full border bg-primary"
                    />
                  </div>
                );
              })()}
              {config.logoUrl && (
                <img
                  src={config.logoUrl}
                  alt="Logo"
                  className="absolute"
                  style={{
                    right: `${20 * scale}px`,
                    bottom: `${20 * scale}px`,
                    width: `${160 * scale}px`,
                    objectFit: "contain",
                  }}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* RIGHT — block properties + templates */}
        <Card>
          <CardContent className="p-3">
            <Tabs defaultValue="props">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="props"><Type className="h-3.5 w-3.5" /> Bloc</TabsTrigger>
                <TabsTrigger value="templates"><Sparkles className="h-3.5 w-3.5" /> Modèles</TabsTrigger>
                <TabsTrigger value="link"><TagIcon className="h-3.5 w-3.5" /> Promo</TabsTrigger>
              </TabsList>

              <TabsContent value="props">
                <ScrollArea className="h-[560px] pr-2">
                  {!selected ? (
                    <p className="px-1 py-4 text-xs text-muted-foreground">
                      Sélectionnez un bloc dans le canvas ou la liste pour modifier ses propriétés.
                    </p>
                  ) : (
                    <div className="space-y-3 py-2">
                      <div>
                        <Label className="mb-1 block text-xs">Rôle</Label>
                        <Select value={selected.role} onValueChange={(v) => updateBlock(selected.id, { role: v as BlockRole })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(Object.keys(ROLE_LABEL) as BlockRole[]).map((r) => (
                              <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="mb-1 block text-xs">Texte</Label>
                        <Input value={selected.text} onChange={(e) => updateBlock(selected.id, { text: e.target.value })} />
                      </div>
                      <div>
                        <Label className="mb-1 block text-xs">Police</Label>
                        <Select value={allFontNames.includes(selected.fontFamily) ? selected.fontFamily : "Inter"}
                          onValueChange={(v) => updateBlock(selected.id, { fontFamily: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent className="max-h-72">
                            {FONT_LIBRARY.map((f) => (
                              <SelectItem key={f.name} value={f.name}>
                                <span style={{ fontFamily: `"${f.name}", system-ui, sans-serif` }}>{f.name}</span>
                              </SelectItem>
                            ))}
                            {brandFonts.map((f) => (
                              <SelectItem key={f.id} value={f.name}>
                                <span style={{ fontFamily: `"${f.name}", system-ui, sans-serif` }}>
                                  {f.name} (importée)
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="mb-1 block text-xs">Taille</Label>
                          <Input type="number" value={selected.fontSize}
                            onChange={(e) => updateBlock(selected.id, { fontSize: Number(e.target.value) || 12 })} />
                        </div>
                        <div>
                          <Label className="mb-1 block text-xs">Largeur (%)</Label>
                          <Input type="number" value={selected.width}
                            onChange={(e) => updateBlock(selected.id, { width: Math.max(5, Math.min(100, Number(e.target.value) || 60)) })} />
                        </div>
                      </div>
                      <div>
                        <Label className="mb-1 block text-xs">Couleur</Label>
                        <div className="flex items-center gap-2">
                          <input type="color" value={selected.color}
                            onChange={(e) => updateBlock(selected.id, { color: e.target.value })}
                            className="h-9 w-12 cursor-pointer rounded border" />
                          <Input value={selected.color}
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
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="left">Gauche</SelectItem>
                            <SelectItem value="center">Centre</SelectItem>
                            <SelectItem value="right">Droite</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="mb-1 block text-xs">Contour</Label>
                          <input type="color" value={selected.strokeColor ?? "#000000"}
                            onChange={(e) => updateBlock(selected.id, { strokeColor: e.target.value })}
                            className="h-9 w-full cursor-pointer rounded border" />
                        </div>
                        <div>
                          <Label className="mb-1 block text-xs">Épaisseur</Label>
                          <Input type="number" value={selected.strokeWidth ?? 0}
                            onChange={(e) => updateBlock(selected.id, { strokeWidth: Number(e.target.value) || 0 })} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="mb-1 block text-xs">Ombre</Label>
                          <input type="color" value={selected.shadowColor?.startsWith("#") ? selected.shadowColor : "#000000"}
                            onChange={(e) => updateBlock(selected.id, { shadowColor: e.target.value })}
                            className="h-9 w-full cursor-pointer rounded border" />
                        </div>
                        <div>
                          <Label className="mb-1 block text-xs">Flou ombre</Label>
                          <Input type="number" value={selected.shadowBlur ?? 0}
                            onChange={(e) => updateBlock(selected.id, { shadowBlur: Number(e.target.value) || 0 })} />
                        </div>
                      </div>
                      {(selected.role === "badge") && (
                        <div className="rounded-md border p-2">
                          <Label className="mb-1 block text-xs">Fond du badge</Label>
                          <input type="color" value={selected.bgColor ?? "#FACC15"}
                            onChange={(e) => updateBlock(selected.id, { bgColor: e.target.value })}
                            className="h-9 w-full cursor-pointer rounded border" />
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <div>
                              <Label className="mb-1 block text-xs">Rayon</Label>
                              <Input type="number" value={selected.rounded ?? 0}
                                onChange={(e) => updateBlock(selected.id, { rounded: Number(e.target.value) || 0 })} />
                            </div>
                            <div>
                              <Label className="mb-1 block text-xs">Padding</Label>
                              <Input type="number" value={selected.padding ?? 0}
                                onChange={(e) => updateBlock(selected.id, { padding: Number(e.target.value) || 0 })} />
                            </div>
                          </div>
                        </div>
                      )}
                      <Button variant="destructive" size="sm" onClick={() => deleteBlock(selected.id)}>
                        <Trash2 className="h-3.5 w-3.5" /> Supprimer le bloc
                      </Button>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="templates">
                <ScrollArea className="h-[560px] pr-2">
                  <div className="grid grid-cols-2 gap-2">
                    {templates.map((t) => {
                      const cfg = (t.config_json ?? {}) as { bgColor?: string; primaryColor?: string };
                      return (
                        <button key={t.id} onClick={() => applyTemplate(t)}
                          className={cn(
                            "group flex flex-col gap-1 rounded-md border p-2 text-left transition hover:border-primary",
                            templateId === t.id && "border-primary",
                          )}>
                          <div className="flex aspect-square w-full items-center justify-center rounded text-center text-[10px] font-bold text-white"
                            style={{ background: cfg.bgColor ?? cfg.primaryColor ?? "#444" }}>
                            {t.name}
                          </div>
                          <span className="truncate text-[11px]">{t.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="link" className="space-y-3">
                <div>
                  <Label className="mb-1 block text-xs">Pré-remplir depuis une promotion</Label>
                  <Select value={promotionId ?? ""} onValueChange={(v) => applyPromotion(v)}>
                    <SelectTrigger><SelectValue placeholder="Choisir une promo" /></SelectTrigger>
                    <SelectContent>
                      {promotions.map((p) => <SelectItem key={p.id} value={p.id}>{p.product_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">
                  Lier ce visuel à une promotion permet de le retrouver dans la bibliothèque et de le programmer depuis le calendrier.
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
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
