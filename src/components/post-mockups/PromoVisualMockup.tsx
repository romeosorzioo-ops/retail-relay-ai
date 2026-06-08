import type { VisualMock, VisualFormat } from "@/lib/tunnel-store";

export const PROMO_GRADIENTS = [
  "linear-gradient(135deg, #1A0B2E 0%, #6B5CF6 100%)",
  "linear-gradient(160deg, #0A0A0F 0%, #2D1B69 50%, #6B5CF6 100%)",
  "linear-gradient(135deg, #6B5CF6 0%, #C026D3 100%)",
  "linear-gradient(135deg, #0F172A 0%, #312E81 60%, #7C6FFA 100%)",
  "radial-gradient(circle at 30% 20%, #7C6FFA 0%, #1A0B2E 70%)",
  "linear-gradient(135deg, #4C1D95 0%, #0A0A0F 100%)",
];

export const BADGE_STYLES = [
  "rounded-full bg-white text-[#6B5CF6]",
  "rounded-md bg-[#FACC15] text-[#0A0A0F]",
  "rounded-full bg-[#6B5CF6] text-white ring-2 ring-white/40",
  "rounded-md bg-white/10 text-white ring-1 ring-white/40 backdrop-blur",
];

export function aspectStyle(format: VisualFormat): React.CSSProperties {
  if (format === "1:1") return { aspectRatio: "1 / 1" };
  if (format === "1.91:1") return { aspectRatio: "1.91 / 1" };
  return { aspectRatio: "16 / 9" };
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

type Props = {
  visual: VisualMock;
  storeName?: string;
  layoutVariant?: number;
};

export function PromoVisualMockup({ visual, storeName, layoutVariant = 0 }: Props) {
  const layout = (visual.variant ?? layoutVariant) % 3;
  const compact = visual.format === "1.91:1";

  return (
    <div
      className="relative h-full w-full overflow-hidden text-white"
      style={{ background: visual.backgroundGradient, ...aspectStyle(visual.format) }}
    >
      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-3 text-[11px] font-medium uppercase tracking-wider opacity-90">
        <span className="flex items-center gap-1.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white/15 text-[10px] font-bold ring-1 ring-white/30">
            {initials(storeName || "Komaag") || "KM"}
          </span>
          {storeName || "Mon magasin"}
        </span>
        <span className="opacity-80">Offre catalogue</span>
      </div>

      {/* Discount badge */}
      {visual.discount ? (
        <div
          className={`absolute ${
            layout === 0 ? "right-4 top-12" : layout === 1 ? "left-4 top-12" : "right-4 bottom-12"
          } z-10 px-3 py-1.5 text-sm font-extrabold shadow-lg ${BADGE_STYLES[(visual.variant ?? 0) % BADGE_STYLES.length]}`}
        >
          -{visual.discount}%
        </div>
      ) : null}

      {/* Main content */}
      <div
        className={`relative z-[1] flex h-full w-full flex-col justify-center px-6 ${
          layout === 0 ? "items-start text-left" : layout === 1 ? "items-end text-right" : "items-center text-center"
        }`}
      >
        {visual.category && (
          <div className="mb-1 inline-block rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/80 ring-1 ring-white/20">
            {visual.category}
          </div>
        )}
        <div
          className={`font-display font-bold leading-tight drop-shadow ${
            compact ? "text-xl" : "text-2xl sm:text-3xl"
          }`}
          style={{ maxWidth: "85%" }}
        >
          {visual.productName}
        </div>

        <div className="mt-2 flex items-end gap-3">
          {visual.promoPrice != null && (
            <div
              className={`font-display font-extrabold leading-none tracking-tight drop-shadow ${
                compact ? "text-3xl" : "text-4xl sm:text-5xl"
              }`}
            >
              {visual.promoPrice.toFixed(2)}€
            </div>
          )}
          {visual.oldPrice != null && (
            <div className="pb-1 text-base font-medium text-white/70 line-through">
              {visual.oldPrice.toFixed(2)}€
            </div>
          )}
        </div>

        <div className="mt-3 inline-block rounded-md bg-white/15 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider ring-1 ring-white/20 backdrop-blur">
          {visual.badgeText}
        </div>
      </div>

      {/* Bottom Komaag mark */}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-4 pb-3 text-[10px] uppercase tracking-[0.2em] text-white/70">
        <span>komaag</span>
        <span>•</span>
        <span>Promo de la semaine</span>
      </div>
    </div>
  );
}
