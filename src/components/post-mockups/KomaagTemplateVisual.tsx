import { Eye, RefreshCw, AlertCircle } from "lucide-react";
import type { VisualFormat } from "@/lib/tunnel-store";
import { TEMPLATES, type TemplateKey } from "@/lib/promo-templates";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function aspectStyle(format: VisualFormat): React.CSSProperties {
  if (format === "1:1") return { aspectRatio: "1 / 1" };
  if (format === "1.91:1") return { aspectRatio: "1.91 / 1" };
  return { aspectRatio: "16 / 9" };
}

export type KomaagTemplateVisualProps = {
  productName: string;
  promoPrice?: number | null;
  oldPrice?: number | null;
  discount?: number | null;
  category?: string | null;
  storeName?: string;
  template: TemplateKey;
  format: VisualFormat;
  variant?: number;
  cutoutImageUrl?: string | null;
  sourceImageUrl?: string | null;
  fallback?: boolean;
  onShowSource?: () => void;
  onRegenerateTemplate?: () => void;
};

export function KomaagTemplateVisual(props: KomaagTemplateVisualProps) {
  const {
    productName,
    promoPrice,
    oldPrice,
    discount,
    storeName,
    template,
    format,
    variant = 0,
    cutoutImageUrl,
    sourceImageUrl,
    fallback,
    onShowSource,
    onRegenerateTemplate,
  } = props;

  const cfg = TEMPLATES[template] ?? TEMPLATES.default;
  const layout = variant % 3;
  const compact = format === "1.91:1";
  const productImg = cutoutImageUrl ?? sourceImageUrl ?? null;

  return (
    <div
      className="relative h-full w-full overflow-hidden text-white"
      style={{ background: cfg.background, ...aspectStyle(format) }}
    >
      {/* Subtle grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-15"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 pt-3 text-[11px] font-medium uppercase tracking-wider opacity-95">
        <span className="flex items-center gap-1.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white/15 text-[10px] font-bold ring-1 ring-white/30">
            {initials(storeName || "Komaag") || "KM"}
          </span>
          {storeName || "Mon magasin"}
        </span>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] ring-1 ring-white/20">
          Offre catalogue
        </span>
      </div>

      {/* Discount badge */}
      {discount ? (
        <div
          className={`absolute z-20 px-3 py-1.5 text-sm font-extrabold shadow-lg rounded-full ${cfg.badgeClass} ${
            layout === 0
              ? "right-4 top-12"
              : layout === 1
                ? "left-4 top-12"
                : "right-4 bottom-12"
          }`}
        >
          -{discount}%
        </div>
      ) : null}

      {/* Main split layout */}
      <div className="relative z-[1] grid h-full w-full grid-cols-2 items-center gap-2 px-5 pb-10 pt-12">
        {/* Product cutout card */}
        <div className={`${layout === 1 ? "order-2" : "order-1"} flex h-full items-center justify-center`}>
          <div
            className="relative flex aspect-square w-[90%] max-w-[260px] items-center justify-center overflow-hidden rounded-2xl bg-white/95 p-2 shadow-2xl ring-1 ring-white/40"
            style={{ boxShadow: "0 18px 40px -10px rgba(0,0,0,0.45)" }}
          >
            {productImg ? (
              <img
                src={productImg}
                alt={productName}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="text-3xl font-bold text-[#0A0A0F]">
                {initials(productName) || "?"}
              </div>
            )}
          </div>
        </div>

        {/* Copy */}
        <div className={`${layout === 1 ? "order-1 text-left" : "order-2 text-left"} flex h-full flex-col justify-center`}>
          <div className="mb-1 inline-block w-fit rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/85 ring-1 ring-white/20">
            {cfg.tagline}
          </div>
          <div
            className={`font-display font-bold leading-tight drop-shadow ${
              compact ? "text-lg" : "text-xl sm:text-2xl"
            }`}
          >
            {productName}
          </div>

          <div className="mt-2 flex items-end gap-2">
            {promoPrice != null && (
              <div
                className={`font-display font-extrabold leading-none tracking-tight drop-shadow ${
                  compact ? "text-2xl" : "text-3xl sm:text-4xl"
                }`}
                style={{ color: cfg.accent }}
              >
                {promoPrice.toFixed(2)}€
              </div>
            )}
            {oldPrice != null && (
              <div className="pb-1 text-sm font-medium text-white/70 line-through">
                {oldPrice.toFixed(2)}€
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Komaag mark */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between px-4 pb-2 text-[10px] uppercase tracking-[0.2em] text-white/70">
        <span>komaag</span>
        <span>{cfg.label}</span>
      </div>

      {/* Fallback note */}
      {fallback && (
        <div className="absolute left-3 bottom-7 z-20 flex items-center gap-1 rounded-md bg-black/55 px-2 py-1 text-[10px] text-white/90 backdrop-blur">
          <AlertCircle className="h-3 w-3" />
          Visuel catalogue utilisé — détourage non disponible
        </div>
      )}

      {/* Action buttons */}
      <div className="absolute right-2 bottom-7 z-20 flex items-center gap-1.5">
        {onShowSource && sourceImageUrl && (
          <button
            onClick={onShowSource}
            className="inline-flex items-center gap-1.5 rounded-md bg-black/55 px-2 py-1 text-[10px] font-medium text-white backdrop-blur hover:bg-black/75"
          >
            <Eye className="h-3 w-3" /> Voir image source
          </button>
        )}
        {onRegenerateTemplate && (
          <button
            onClick={onRegenerateTemplate}
            className="inline-flex items-center gap-1.5 rounded-md bg-black/55 px-2 py-1 text-[10px] font-medium text-white backdrop-blur hover:bg-black/75"
          >
            <RefreshCw className="h-3 w-3" /> Régénérer le template
          </button>
        )}
      </div>
    </div>
  );
}
