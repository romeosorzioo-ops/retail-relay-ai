import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Download,
  Image as ImageIcon,
  Loader2,
  Save,
  Sparkles,
  Tag as TagIcon,
  Upload,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  listVisualTemplatesFn,
  saveVisualFn,
  uploadVisualImageFn,
} from "@/lib/visuals.functions";
import { listPromotionsFn } from "@/lib/promotions.functions";
import { getMyBrandProfileFn } from "@/lib/brand-profiles.functions";

export const Route = createFileRoute("/_authenticated/creation")({
  component: CreationPage,
});

type FormatKey = "ig_square" | "story" | "fb_post";

const FORMATS: Record<
  FormatKey,
  { label: string; w: number; h: number; previewW: number }
> = {
  ig_square: { label: "Post Instagram 1:1", w: 1080, h: 1080, previewW: 420 },
  story: { label: "Story / Reel 9:16", w: 1080, h: 1920, previewW: 280 },
  fb_post: { label: "Post Facebook", w: 1200, h: 630, previewW: 480 },
};

const ICON_BADGES = ["-10%", "-20%", "-30%", "-50%", "PRIX CHOC", "NOUVEAU", "LOCAL", "WEEK-END"];

type Config = {
  layout?: "banner" | "split" | "centered" | string;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  slogan?: string;
  mainText?: string;
  productName?: string;
  price?: string;
  oldPrice?: string;
  badge?: { text?: string; color?: string };
  bgImage?: string | null;
  logoUrl?: string | null;
};

function CreationPage() {
  const qc = useQueryClient();
  const [format, setFormat] = useState<FormatKey>("ig_square");
  const [config, setConfig] = useState<Config>({
    layout: "banner",
    primaryColor: "#E11D48",
    mainText: "PRIX CHOC",
    productName: "Nom du produit",
    price: "2,99",
    oldPrice: "4,29",
    badge: { text: "-30%", color: "#FACC15" },
    bgImage: null,
    logoUrl: null,
  });
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [promotionId, setPromotionId] = useState<string | null>(null);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { data: templates = [] } = useQuery({
    queryKey: ["visual-templates"],
    queryFn: () => listVisualTemplatesFn(),
  });
  const { data: promotions = [] } = useQuery({
    queryKey: ["promotions"],
    queryFn: () => listPromotionsFn(),
  });
  const { data: brand } = useQuery({
    queryKey: ["my-brand"],
    queryFn: () => getMyBrandProfileFn(),
  });

  // Pre-fill brand identity into the visual when brand profile loads
  useEffect(() => {
    if (!brand) return;
    setConfig((c) => ({
      ...c,
      primaryColor: c.primaryColor === "#E11D48" && brand.primary_color
        ? brand.primary_color
        : c.primaryColor,
      secondaryColor: c.secondaryColor ?? brand.secondary_color ?? undefined,
      fontFamily: c.fontFamily ?? brand.font_family ?? undefined,
      slogan: c.slogan ?? brand.slogan ?? undefined,
      logoUrl: c.logoUrl ?? brand.logo_url ?? null,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand]);


  const dims = FORMATS[format];

  // Render to canvas whenever config or format changes
  useEffect(() => {
    void renderCanvas(canvasRef.current, dims.w, dims.h, config);
  }, [config, dims.w, dims.h]);

  function applyTemplate(t: (typeof templates)[number]) {
    setTemplateId(t.id);
    const cfg = (t.config_json ?? {}) as Config;
    setConfig((prev) => ({ ...prev, ...cfg }));
    if (t.format === "ig_square" || t.format === "story" || t.format === "fb_post") {
      setFormat(t.format);
    }
  }

  function applyPromotion(id: string) {
    setPromotionId(id);
    const p = promotions.find((x) => x.id === id);
    if (!p) return;
    setConfig((c) => ({
      ...c,
      productName: p.product_name ?? c.productName,
      price: p.price != null ? String(p.price).replace(".", ",") : c.price,
      oldPrice:
        p.old_price != null ? String(p.old_price).replace(".", ",") : c.oldPrice,
      bgImage:
        p.file_type?.startsWith("image/") && p.file_url ? p.file_url : c.bgImage,
    }));
  }

  async function uploadImage(file: File, target: "bg" | "logo") {
    if (!file.type.startsWith("image/")) {
      toast.error("Image uniquement (jpg, png)");
      return;
    }
    const setter = target === "bg" ? setUploadingBg : setUploadingLogo;
    setter(true);
    try {
      const buf = await file.arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(buf);
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
      }
      const data_base64 = btoa(binary);
      const res = await uploadVisualImageFn({
        data: { file_name: file.name, file_type: file.type, data_base64 },
      });
      setConfig((c) =>
        target === "bg" ? { ...c, bgImage: res.url } : { ...c, logoUrl: res.url },
      );
      toast.success("Image ajoutée");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setter(false);
    }
  }

  function downloadPng() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `komaag-${format}-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  const save = useMutation({
    mutationFn: async () => {
      // Upload PNG first
      const blob = await new Promise<Blob | null>((r) =>
        canvasRef.current?.toBlob((b) => r(b), "image/png"),
      );
      let image_url: string | null = null;
      if (blob) {
        const buf = await blob.arrayBuffer();
        let binary = "";
        const bytes = new Uint8Array(buf);
        const chunk = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) {
          binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
        }
        const data_base64 = btoa(binary);
        const res = await uploadVisualImageFn({
          data: {
            file_name: `visual-${Date.now()}.png`,
            file_type: "image/png",
            data_base64,
          },
        });
        image_url = res.url;
      }
      return saveVisualFn({
        data: {
          template_id: templateId,
          promotion_id: promotionId,
          format,
          image_url,
          config_json: config,
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["created-visuals"] });
      toast.success("Visuel enregistré dans la bibliothèque");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const previewWidth = dims.previewW;
  const previewHeight = Math.round((dims.h / dims.w) * previewWidth);

  const templatesByFormat = useMemo(
    () => templates.filter((t) => t.format === format || true),
    [templates, format],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Création</h1>
          <p className="text-sm text-muted-foreground">
            Composez un visuel social-media en quelques clics.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadPng}>
            <Download className="h-4 w-4" /> PNG
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Enregistrer
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr_280px]">
        {/* LEFT — settings */}
        <Card>
          <CardContent className="space-y-4 p-4">
            <div>
              <Label className="mb-1 block text-xs">Format</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as FormatKey)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FORMATS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-1 block text-xs">Texte principal</Label>
              <Input
                value={config.mainText ?? ""}
                onChange={(e) => setConfig({ ...config, mainText: e.target.value })}
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs">Nom du produit</Label>
              <Input
                value={config.productName ?? ""}
                onChange={(e) =>
                  setConfig({ ...config, productName: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="mb-1 block text-xs">Prix</Label>
                <Input
                  value={config.price ?? ""}
                  onChange={(e) => setConfig({ ...config, price: e.target.value })}
                />
              </div>
              <div>
                <Label className="mb-1 block text-xs">Ancien prix</Label>
                <Input
                  value={config.oldPrice ?? ""}
                  onChange={(e) =>
                    setConfig({ ...config, oldPrice: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <Label className="mb-1 block text-xs">Couleur principale</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.primaryColor ?? "#E11D48"}
                  onChange={(e) =>
                    setConfig({ ...config, primaryColor: e.target.value })
                  }
                  className="h-9 w-12 cursor-pointer rounded border"
                />
                <Input
                  value={config.primaryColor ?? ""}
                  onChange={(e) =>
                    setConfig({ ...config, primaryColor: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <Label className="mb-1 block text-xs">Badge promo</Label>
              <div className="flex flex-wrap gap-1">
                {ICON_BADGES.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() =>
                      setConfig({
                        ...config,
                        badge: { ...(config.badge ?? {}), text: b },
                      })
                    }
                    className={cn(
                      "rounded border px-2 py-0.5 text-[11px] transition",
                      config.badge?.text === b
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:bg-accent",
                    )}
                  >
                    {b}
                  </button>
                ))}
              </div>
              <Input
                className="mt-2"
                placeholder="Texte du badge"
                value={config.badge?.text ?? ""}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    badge: { ...(config.badge ?? {}), text: e.target.value },
                  })
                }
              />
            </div>

            <UploadField
              label="Image de fond"
              uploading={uploadingBg}
              currentUrl={config.bgImage ?? null}
              onClear={() => setConfig({ ...config, bgImage: null })}
              onFile={(f) => uploadImage(f, "bg")}
            />
            <UploadField
              label="Logo magasin"
              uploading={uploadingLogo}
              currentUrl={config.logoUrl ?? null}
              onClear={() => setConfig({ ...config, logoUrl: null })}
              onFile={(f) => uploadImage(f, "logo")}
            />
          </CardContent>
        </Card>

        {/* CENTER — preview */}
        <Card>
          <CardContent className="flex items-center justify-center p-4">
            <div
              className="overflow-hidden rounded-md border shadow-sm"
              style={{ width: previewWidth, height: previewHeight }}
            >
              <canvas
                ref={canvasRef}
                width={dims.w}
                height={dims.h}
                style={{ width: previewWidth, height: previewHeight }}
              />
            </div>
          </CardContent>
        </Card>

        {/* RIGHT — templates / promo / library */}
        <Card>
          <CardContent className="p-3">
            <Tabs defaultValue="templates">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="templates">
                  <Sparkles className="h-3.5 w-3.5" /> Modèles
                </TabsTrigger>
                <TabsTrigger value="link">
                  <TagIcon className="h-3.5 w-3.5" /> Promo
                </TabsTrigger>
              </TabsList>
              <TabsContent value="templates">
                <ScrollArea className="h-[520px] pr-2">
                  <div className="grid grid-cols-2 gap-2">
                    {templatesByFormat.map((t) => {
                      const cfg = t.config_json as unknown as Config;
                      return (
                        <button
                          key={t.id}
                          onClick={() => applyTemplate(t)}
                          className={cn(
                            "group flex flex-col gap-1 rounded-md border p-2 text-left transition hover:border-primary",
                            templateId === t.id && "border-primary",
                          )}
                        >
                          <div
                            className="flex aspect-square w-full items-center justify-center rounded text-center text-[10px] font-bold text-white"
                            style={{ background: cfg.primaryColor ?? "#444" }}
                          >
                            {cfg.mainText ?? t.name}
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
                  <Label className="mb-1 block text-xs">
                    Pré-remplir depuis une promotion
                  </Label>
                  <Select
                    value={promotionId ?? ""}
                    onValueChange={(v) => applyPromotion(v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir une promo" />
                    </SelectTrigger>
                    <SelectContent>
                      {promotions.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.product_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">
                  Lier ce visuel à une promotion permet de le retrouver dans la
                  bibliothèque et de le programmer depuis le calendrier.
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function UploadField({
  label,
  uploading,
  currentUrl,
  onClear,
  onFile,
}: {
  label: string;
  uploading: boolean;
  currentUrl: string | null;
  onClear: () => void;
  onFile: (f: File) => void;
}) {
  return (
    <div>
      <Label className="mb-1 block text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        {currentUrl ? (
          <>
            <img src={currentUrl} alt="" className="h-10 w-10 rounded object-cover" />
            <Button size="sm" variant="outline" onClick={onClear}>
              Retirer
            </Button>
          </>
        ) : (
          <label className="flex cursor-pointer items-center gap-1 rounded-md border bg-background px-3 py-1.5 text-xs hover:bg-accent">
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            Charger une image
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
              }}
            />
          </label>
        )}
      </div>
    </div>
  );
}

// ---------- Canvas renderer ----------

const imageCache = new Map<string, HTMLImageElement>();

function loadImage(url: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(url);
  if (cached?.complete && cached.naturalWidth > 0) return Promise.resolve(cached);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageCache.set(url, img);
      resolve(img);
    };
    img.onerror = () => reject(new Error("Image error"));
    img.src = url;
  });
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const ir = img.naturalWidth / img.naturalHeight;
  const tr = w / h;
  let sx = 0,
    sy = 0,
    sw = img.naturalWidth,
    sh = img.naturalHeight;
  if (ir > tr) {
    sw = sh * tr;
    sx = (img.naturalWidth - sw) / 2;
  } else {
    sh = sw / tr;
    sy = (img.naturalHeight - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

async function renderCanvas(
  canvas: HTMLCanvasElement | null,
  w: number,
  h: number,
  cfg: Config,
) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, w, h);

  // Background
  if (cfg.bgImage) {
    try {
      const img = await loadImage(cfg.bgImage);
      drawCover(ctx, img, 0, 0, w, h);
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(0, 0, w, h);
    } catch {
      ctx.fillStyle = cfg.primaryColor ?? "#444";
      ctx.fillRect(0, 0, w, h);
    }
  } else {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, cfg.primaryColor ?? "#444");
    grad.addColorStop(1, shade(cfg.primaryColor ?? "#444", -30));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  const scale = Math.min(w, h) / 1080;
  const pad = 60 * scale;

  // Bottom banner band
  const bandH = h * 0.32;
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, h - bandH, w, bandH);

  // Main text (top-left)
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "top";
  ctx.font = `900 ${110 * scale}px "Inter", system-ui, sans-serif`;
  wrapText(ctx, (cfg.mainText ?? "").toUpperCase(), pad, pad, w - pad * 2, 110 * scale);

  // Badge (top-right circle)
  if (cfg.badge?.text) {
    const r = 130 * scale;
    const cx = w - pad - r;
    const cy = pad + r;
    ctx.fillStyle = cfg.badge.color ?? "#FACC15";
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#111";
    ctx.font = `900 ${52 * scale}px "Inter", system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(cfg.badge.text, cx, cy);
    ctx.textAlign = "start";
    ctx.textBaseline = "top";
  }

  // Product name (band)
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 ${64 * scale}px "Inter", system-ui, sans-serif`;
  wrapText(
    ctx,
    cfg.productName ?? "",
    pad,
    h - bandH + pad * 0.4,
    w - pad * 2,
    72 * scale,
  );

  // Price
  if (cfg.price) {
    ctx.fillStyle = cfg.primaryColor ?? "#E11D48";
    ctx.font = `900 ${160 * scale}px "Inter", system-ui, sans-serif`;
    const priceText = `${cfg.price} €`;
    ctx.fillText(priceText, pad, h - bandH + bandH * 0.45);

    if (cfg.oldPrice) {
      ctx.fillStyle = "#ddd";
      ctx.font = `600 ${56 * scale}px "Inter", system-ui, sans-serif`;
      const priceWidth = ctx.measureText(priceText).width;
      const oldX = pad + priceWidth + 24 * scale;
      const oldY = h - bandH + bandH * 0.55;
      const oldText = `${cfg.oldPrice} €`;
      ctx.fillText(oldText, oldX, oldY);
      const tw = ctx.measureText(oldText).width;
      ctx.strokeStyle = "#ddd";
      ctx.lineWidth = 4 * scale;
      ctx.beginPath();
      ctx.moveTo(oldX, oldY + 32 * scale);
      ctx.lineTo(oldX + tw, oldY + 32 * scale);
      ctx.stroke();
    }
  }

  // Logo bottom right
  if (cfg.logoUrl) {
    try {
      const logo = await loadImage(cfg.logoUrl);
      const lw = 160 * scale;
      const lh = (logo.naturalHeight / logo.naturalWidth) * lw;
      ctx.drawImage(logo, w - pad - lw, h - pad - lh, lw, lh);
    } catch {
      // ignore
    }
  }
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(/\s+/);
  let line = "";
  let yy = y;
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy);
      line = w;
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, yy);
}

function shade(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  let r = (num >> 16) + percent;
  let g = ((num >> 8) & 0x00ff) + percent;
  let b = (num & 0x0000ff) + percent;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
