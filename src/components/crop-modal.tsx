import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export type CropBox = { x: number; y: number; width: number; height: number };

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
  const wrapRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<CropBox>(
    initial ?? { x: 0.1, y: 0.1, width: 0.3, height: 0.3 },
  );
  const [drag, setDrag] = useState<{ mode: "move" | "resize"; x: number; y: number; box: CropBox } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setBox(initial ?? { x: 0.1, y: 0.1, width: 0.3, height: 0.3 });
  }, [open, initial]);

  function pointerToNorm(e: React.PointerEvent) {
    const r = wrapRef.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  }

  function onMove(e: React.PointerEvent) {
    if (!drag) return;
    const p = pointerToNorm(e);
    if (drag.mode === "move") {
      const nx = Math.min(1 - drag.box.width, Math.max(0, drag.box.x + (p.x - drag.x)));
      const ny = Math.min(1 - drag.box.height, Math.max(0, drag.box.y + (p.y - drag.y)));
      setBox({ ...drag.box, x: nx, y: ny });
    } else {
      const nw = Math.min(1 - drag.box.x, Math.max(0.05, p.x - drag.box.x));
      const nh = Math.min(1 - drag.box.y, Math.max(0.05, p.y - drag.box.y));
      setBox({ ...drag.box, width: nw, height: nh });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title ?? "Recadrer l'image produit"}</DialogTitle>
        </DialogHeader>
        {imageUrl ? (
          <div
            ref={wrapRef}
            className="relative w-full overflow-hidden rounded border bg-muted"
            style={{ aspectRatio: aspectRatio ?? "1/1.4", touchAction: "none" }}
            onPointerMove={onMove}
            onPointerUp={() => setDrag(null)}
          >
            <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-contain pointer-events-none select-none" />
            <div
              className="absolute border-2 border-primary bg-primary/10 cursor-move"
              style={{
                left: `${box.x * 100}%`,
                top: `${box.y * 100}%`,
                width: `${box.width * 100}%`,
                height: `${box.height * 100}%`,
              }}
              onPointerDown={(e) => {
                e.preventDefault();
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
                setDrag({ mode: "move", ...pointerToNorm(e), box });
              }}
            >
              <div
                className="absolute -right-2 -bottom-2 h-4 w-4 rounded-sm border-2 border-primary bg-background cursor-nwse-resize"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  (e.target as HTMLElement).setPointerCapture(e.pointerId);
                  setDrag({ mode: "resize", ...pointerToNorm(e), box });
                }}
              />
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
            disabled={saving || !imageUrl}
            onClick={async () => {
              setSaving(true);
              try {
                await onConfirm(box);
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
