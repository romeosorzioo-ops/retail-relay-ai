import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Loader2, Maximize2, AlignCenter, Move, Eye, EyeOff, ZoomIn, ZoomOut } from "lucide-react";

export type CropBox = { x: number; y: number; width: number; height: number };

type Natural = { w: number; h: number };

function parseAspect(aspectRatio?: string): { w: number; h: number } {
  if (!aspectRatio) return { w: 1, h: 1 };
  const parts = aspectRatio.split("/").map((p) => parseFloat(p.trim()));
  if (parts.length !== 2 || !isFinite(parts[0]) || !isFinite(parts[1]) || parts[1] === 0) {
    return { w: 1, h: 1 };
  }
  return { w: parts[0], h: parts[1] };
}

export function CropModal({
  open, onOpenChange, imageUrl, initial, onConfirm, title, aspectRatio,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  imageUrl: string | null;
  initial?: CropBox | null;
  onConfirm: (crop: CropBox) => Promise<void> | void;
  title?: string;
  aspectRatio?: string;
}) {
  const ratio = useMemo(() => parseAspect(aspectRatio), [aspectRatio]);
  const frameRef = useRef<HTMLDivElement>(null);
  const [natural, setNatural] = useState<Natural | null>(null);
  const [frameSize, setFrameSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [drag, setDrag] = useState<{ startX: number; startY: number; ox: number; oy: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [showSafe, setShowSafe] = useState(true);

  // Measure the frame whenever it appears.
  useEffect(() => {
    if (!open) return;
    const el = frameRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setFrameSize({ w: r.width, h: r.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [open, natural]);

  // Load natural dimensions when the source URL changes.
  useEffect(() => {
    if (!open || !imageUrl) {
      setNatural(null);
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (!cancelled) setNatural({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.src = imageUrl;
    return () => {
      cancelled = true;
    };
  }, [open, imageUrl]);

  // Cover scale: smallest scale such that the image fully covers the frame.
  const coverScale = useMemo(() => {
    if (!natural || frameSize.w === 0 || frameSize.h === 0) return 1;
    return Math.max(frameSize.w / natural.w, frameSize.h / natural.h);
  }, [natural, frameSize]);

  const maxScale = coverScale * 8;

  // Reset the transform whenever the image, frame, or aspect changes.
  useEffect(() => {
    if (!natural || frameSize.w === 0) return;
    // Try to restore the previous crop if it matches the current image.
    if (initial && initial.width > 0 && initial.height > 0) {
      const s = Math.max(
        frameSize.w / (initial.width * natural.w),
        frameSize.h / (initial.height * natural.h),
      );
      const tx = -initial.x * natural.w * s;
      const ty = -initial.y * natural.h * s;
      setScale(s);
      setOffset(clampOffset(tx, ty, s, natural, frameSize));
      return;
    }
    centerCover(coverScale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [natural, frameSize.w, frameSize.h, ratio.w, ratio.h]);

  function clampOffset(tx: number, ty: number, s: number, nat: Natural, frame: { w: number; h: number }) {
    const imgW = nat.w * s;
    const imgH = nat.h * s;
    const minX = frame.w - imgW; // tx must be >= minX (image right edge >= frame right)
    const minY = frame.h - imgH;
    const x = Math.min(0, Math.max(minX, tx));
    const y = Math.min(0, Math.max(minY, ty));
    return { x, y };
  }

  function centerCover(s = coverScale) {
    if (!natural) return;
    const tx = (frameSize.w - natural.w * s) / 2;
    const ty = (frameSize.h - natural.h * s) / 2;
    setScale(s);
    setOffset({ x: tx, y: ty });
  }

  function centerImage() {
    if (!natural) return;
    const tx = (frameSize.w - natural.w * scale) / 2;
    const ty = (frameSize.h - natural.h * scale) / 2;
    setOffset(clampOffset(tx, ty, scale, natural, frameSize));
  }

  function setScaleClamped(next: number) {
    if (!natural) return;
    const s = Math.min(maxScale, Math.max(coverScale, next));
    // Keep center stable when zooming.
    const cx = frameSize.w / 2;
    const cy = frameSize.h / 2;
    const k = s / scale;
    const tx = cx - (cx - offset.x) * k;
    const ty = cy - (cy - offset.y) * k;
    setScale(s);
    setOffset(clampOffset(tx, ty, s, natural, frameSize));
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!natural) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ startX: e.clientX, startY: e.clientY, ox: offset.x, oy: offset.y });
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag || !natural) return;
    const tx = drag.ox + (e.clientX - drag.startX);
    const ty = drag.oy + (e.clientY - drag.startY);
    setOffset(clampOffset(tx, ty, scale, natural, frameSize));
  }
  function onPointerUp() {
    setDrag(null);
  }
  function onWheel(e: React.WheelEvent) {
    if (!natural) return;
    e.preventDefault();
    const delta = -e.deltaY * 0.0015;
    setScaleClamped(scale * (1 + delta));
  }

  // Compute the export crop box in normalized image coordinates.
  const exportBox: CropBox | null = useMemo(() => {
    if (!natural || frameSize.w === 0) return null;
    const imgX = -offset.x / scale;
    const imgY = -offset.y / scale;
    const imgW = frameSize.w / scale;
    const imgH = frameSize.h / scale;
    return {
      x: Math.max(0, imgX / natural.w),
      y: Math.max(0, imgY / natural.h),
      width: Math.min(1, imgW / natural.w),
      height: Math.min(1, imgH / natural.h),
    };
  }, [natural, offset, scale, frameSize]);

  const publishedPx = natural && exportBox
    ? {
        w: Math.round(exportBox.width * natural.w),
        h: Math.round(exportBox.height * natural.h),
      }
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title ?? "Recadrer l'image"}</DialogTitle>
        </DialogHeader>

        {imageUrl ? (
          <div className="space-y-3">
            {/* Working area: centered, sized to format ratio, capped by viewport. */}
            <div className="flex w-full items-center justify-center">
              <div
                className="relative w-full"
                style={{
                  maxWidth: "min(100%, calc(60vh * " + ratio.w + " / " + ratio.h + "))",
                }}
              >
                <div
                  ref={frameRef}
                  className="relative w-full overflow-hidden rounded-md border-2 border-primary bg-muted shadow-inner"
                  style={{ aspectRatio: `${ratio.w} / ${ratio.h}`, touchAction: "none" }}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                  onWheel={onWheel}
                >
                  {natural ? (
                    <img
                      src={imageUrl}
                      alt=""
                      draggable={false}
                      className="absolute left-0 top-0 max-w-none select-none"
                      style={{
                        width: natural.w * scale,
                        height: natural.h * scale,
                        transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
                        cursor: drag ? "grabbing" : "grab",
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  )}

                  {/* "Published zone" overlay: a labelled, dashed inner border. The whole
                       frame IS the published zone — this just makes it explicit. */}
                  {showSafe && natural && (
                    <>
                      <div className="pointer-events-none absolute inset-0 border-2 border-dashed border-primary/80" />
                      <div className="pointer-events-none absolute left-2 top-2 rounded bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground shadow">
                        Zone publiée{publishedPx ? ` · ${publishedPx.w}×${publishedPx.h}` : ""}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => centerCover(coverScale)} className="gap-1">
                  <Maximize2 className="h-3.5 w-3.5" /> Ajuster automatiquement
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={centerImage} className="gap-1">
                  <AlignCenter className="h-3.5 w-3.5" /> Centrer l'image
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => centerCover(coverScale * 1.4)} className="gap-1">
                  <Move className="h-3.5 w-3.5" /> Remplir le cadre
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={showSafe ? "default" : "outline"}
                  onClick={() => setShowSafe((v) => !v)}
                  className="gap-1"
                >
                  {showSafe ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  Afficher la zone publiée
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button type="button" size="icon" variant="ghost" onClick={() => setScaleClamped(scale / 1.15)} disabled={!natural}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Slider
                  className="flex-1"
                  min={0}
                  max={100}
                  step={1}
                  value={[
                    natural
                      ? Math.round(((scale - coverScale) / Math.max(0.0001, maxScale - coverScale)) * 100)
                      : 0,
                  ]}
                  onValueChange={(v) => {
                    const pct = (v[0] ?? 0) / 100;
                    setScaleClamped(coverScale + pct * (maxScale - coverScale));
                  }}
                />
                <Button type="button" size="icon" variant="ghost" onClick={() => setScaleClamped(scale * 1.15)} disabled={!natural}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>

              <p className="text-[11px] text-muted-foreground">
                Faites glisser l'image ou utilisez la molette pour zoomer. Le cadre représente exactement la zone qui sera publiée.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuler
          </Button>
          <Button
            disabled={saving || !imageUrl || !exportBox}
            onClick={async () => {
              if (!exportBox) return;
              setSaving(true);
              try {
                await onConfirm(exportBox);
                onOpenChange(false);
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Recadrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
