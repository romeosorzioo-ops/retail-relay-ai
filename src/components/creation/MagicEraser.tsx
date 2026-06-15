import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Eraser, Brush, RotateCcw, Eye, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type MagicEraserProps = {
  open: boolean;
  onClose: () => void;
  /** Image to edit (PNG). Should already be cutout. */
  imageUrl: string;
  /** Optional pristine reference for "Restore" mode (defaults to imageUrl). */
  originalImageUrl?: string | null;
  onSave: (dataUrl: string) => void;
};

type Mode = "erase" | "restore";

export function MagicEraser({ open, onClose, imageUrl, originalImageUrl, onSave }: MagicEraserProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastPtRef = useRef<{ x: number; y: number } | null>(null);
  const originalImgRef = useRef<HTMLImageElement | null>(null);

  const [mode, setMode] = useState<Mode>("erase");
  const [brushSize, setBrushSize] = useState(40);
  const [hardness, setHardness] = useState(80);
  const [opacity, setOpacity] = useState(100);
  const [showOriginal, setShowOriginal] = useState(false);
  const [ready, setReady] = useState(false);

  // Initialise canvas from imageUrl
  useEffect(() => {
    if (!open) return;
    const c = canvasRef.current;
    if (!c) return;
    setReady(false);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0);
      // load original (for restore)
      const orig = new Image();
      orig.crossOrigin = "anonymous";
      orig.onload = () => { originalImgRef.current = orig; setReady(true); };
      orig.onerror = () => { originalImgRef.current = img; setReady(true); };
      orig.src = originalImageUrl ?? imageUrl;
    };
    img.src = imageUrl;
  }, [open, imageUrl, originalImageUrl]);

  function pointerPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    const sx = c.width / rect.width;
    const sy = c.height / rect.height;
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
  }

  function paintAt(x: number, y: number) {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const r = brushSize;
    const alpha = (opacity / 100) * 0.5 + 0.5; // 0.5..1
    if (mode === "erase") {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      const grad = ctx.createRadialGradient(x, y, r * (hardness / 100) * 0.5, x, y, r);
      grad.addColorStop(0, `rgba(0,0,0,${alpha})`);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      // restore — sample from original image
      const orig = originalImgRef.current;
      if (!orig) return;
      ctx.save();
      // draw clipped circle from original
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.globalAlpha = alpha;
      ctx.drawImage(orig, 0, 0, c.width, c.height);
      ctx.restore();
    }
  }

  function paintLine(from: { x: number; y: number }, to: { x: number; y: number }) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.hypot(dx, dy);
    const step = Math.max(1, brushSize / 6);
    const steps = Math.max(1, Math.floor(dist / step));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      paintAt(from.x + dx * t, from.y + dy * t);
    }
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!ready) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const p = pointerPos(e);
    lastPtRef.current = p;
    paintAt(p.x, p.y);
  }
  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const p = pointerPos(e);
    if (lastPtRef.current) paintLine(lastPtRef.current, p);
    lastPtRef.current = p;
  }
  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    drawingRef.current = false;
    lastPtRef.current = null;
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* noop */ }
  }

  function reset() {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => ctx.drawImage(img, 0, 0);
    img.src = imageUrl;
  }

  function save() {
    const c = canvasRef.current;
    if (!c) return;
    const dataUrl = c.toDataURL("image/png");
    onSave(dataUrl);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eraser className="h-5 w-5 text-primary" /> Gomme magique
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-[1fr_240px] gap-4">
          <div className="relative flex items-center justify-center rounded-lg border border-zinc-800 bg-[linear-gradient(45deg,#1f1f1f_25%,transparent_25%),linear-gradient(-45deg,#1f1f1f_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#1f1f1f_75%),linear-gradient(-45deg,transparent_75%,#1f1f1f_75%)] [background-size:16px_16px] [background-position:0_0,0_8px,8px_-8px,-8px_0] p-4">
            <div className="relative max-h-[60vh]">
              {showOriginal && originalImgRef.current && (
                <img
                  src={originalImgRef.current.src}
                  alt=""
                  draggable={false}
                  className="pointer-events-none absolute inset-0 h-full w-full object-contain opacity-50"
                />
              )}
              <canvas
                ref={canvasRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                className={cn(
                  "block max-h-[60vh] max-w-full touch-none",
                  mode === "erase" ? "cursor-crosshair" : "cursor-pointer",
                )}
                style={{ imageRendering: "auto" }}
              />
              <canvas ref={overlayRef} className="pointer-events-none absolute inset-0" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex gap-1 rounded-md border border-zinc-800 p-1">
              <Button
                size="sm"
                variant={mode === "erase" ? "default" : "ghost"}
                className="flex-1 h-8 gap-1.5 text-xs"
                onClick={() => setMode("erase")}
              >
                <Eraser className="h-3.5 w-3.5" /> Effacer
              </Button>
              <Button
                size="sm"
                variant={mode === "restore" ? "default" : "ghost"}
                className="flex-1 h-8 gap-1.5 text-xs"
                onClick={() => setMode("restore")}
              >
                <Brush className="h-3.5 w-3.5" /> Restaurer
              </Button>
            </div>

            <div>
              <Label className="mb-1 flex items-center justify-between text-[11px]">
                Taille du pinceau <span className="text-muted-foreground">{brushSize}px</span>
              </Label>
              <Slider value={[brushSize]} min={4} max={200} step={1}
                onValueChange={(v) => setBrushSize(v[0])} />
            </div>
            <div>
              <Label className="mb-1 flex items-center justify-between text-[11px]">
                Dureté <span className="text-muted-foreground">{hardness}%</span>
              </Label>
              <Slider value={[hardness]} min={0} max={100} step={1}
                onValueChange={(v) => setHardness(v[0])} />
            </div>
            <div>
              <Label className="mb-1 flex items-center justify-between text-[11px]">
                Opacité <span className="text-muted-foreground">{opacity}%</span>
              </Label>
              <Slider value={[opacity]} min={10} max={100} step={1}
                onValueChange={(v) => setOpacity(v[0])} />
            </div>

            <Button
              size="sm"
              variant="outline"
              className="w-full gap-1.5 text-xs"
              onClick={() => setShowOriginal((v) => !v)}
            >
              <Eye className="h-3.5 w-3.5" />
              {showOriginal ? "Masquer l'original" : "Afficher l'original"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="w-full gap-1.5 text-xs text-muted-foreground"
              onClick={reset}
            >
              <RotateCcw className="h-3.5 w-3.5" /> Réinitialiser
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button variant="brand" onClick={save} className="gap-1.5">
            <Check className="h-4 w-4" /> Appliquer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
