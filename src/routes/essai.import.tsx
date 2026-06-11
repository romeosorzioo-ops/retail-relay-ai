import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Lock, Upload, FileText, X } from "lucide-react";
import { useTunnelStore } from "@/lib/tunnel-store";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/essai/import")({
  component: ImportPage,
});

const MAX_BYTES = 50 * 1024 * 1024;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result || "");
      resolve(s.slice(s.indexOf(",") + 1));
    };
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

function ImportPage() {
  const navigate = useNavigate();
  const { pdfFile, pdfName, setPdf, setStep } = useTunnelStore();
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setStep("import");
  }, [setStep]);

  const handleFile = useCallback(
    async (file: File) => {
      if (file.type !== "application/pdf") {
        toast.error("Seuls les fichiers PDF sont acceptés.");
        return;
      }
      if (file.size > MAX_BYTES) {
        toast.error("Le fichier dépasse 50 Mo.");
        return;
      }
      setBusy(true);
      try {
        const base64 = await fileToBase64(file);
        setPdf(file, base64);
      } finally {
        setBusy(false);
      }
    },
    [setPdf],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  const hasFile = Boolean(pdfFile || pdfName);

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-8">
      <Toaster />
      <h1 className="mb-2 text-center text-3xl font-bold sm:text-4xl">
        Déposez votre catalogue promotionnel
      </h1>
      <p className="mb-8 text-center text-muted-foreground">
        Komaag détecte vos promotions et génère vos publications en quelques
        secondes.
      </p>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex w-full min-h-[55vh] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition ${
          dragging
            ? "border-[hsl(var(--ring))] bg-accent/40"
            : "border-border hover:bg-accent/20"
        }`}
      >
        <input
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
        {hasFile ? (
          <div className="flex flex-col items-center gap-3">
            <FileText className="h-12 w-12 text-foreground" />
            <div className="text-lg font-medium">{pdfName}</div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setPdf(null, "");
              }}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" /> Choisir un autre fichier
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload className="h-12 w-12 text-muted-foreground" />
            <div className="text-lg font-medium">
              Glissez votre PDF ici ou cliquez pour parcourir
            </div>
            <div className="text-sm text-muted-foreground">
              Format PDF · 50 Mo maximum
            </div>
          </div>
        )}
      </label>

      <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Lock className="h-4 w-4" />
        Fichier traité en toute sécurité.
      </div>

      <Button
        size="lg"
        variant="brand"
        className="mt-8"
        disabled={!hasFile || busy}
        onClick={() => {
          setStep("analyse");
          navigate({ to: "/essai/analyse" });
        }}
      >
        {busy ? "Préparation…" : "Analyser avec l'IA →"}
      </Button>
    </div>
  );
}
