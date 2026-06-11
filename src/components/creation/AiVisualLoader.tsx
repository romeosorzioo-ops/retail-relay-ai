import { useEffect, useState } from "react";
import { Sparkles, Check, Loader2, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  "Analyse du produit",
  "Extraction de l'image catalogue",
  "Génération du visuel",
  "Application du template",
  "Préparation du rendu final",
];

/**
 * Loader premium affiché par-dessus le canvas pendant que l'IA prépare
 * le visuel. Évite que l'utilisateur voie un rendu intermédiaire dégradé.
 */
export function AiVisualLoader({
  phase,
  width,
  height,
}: {
  phase: "generate" | "cutout";
  width: number;
  height: number;
}) {
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(8);

  useEffect(() => {
    const startStep = phase === "cutout" ? 2 : 0;
    setStep(startStep);
    const id = setInterval(() => {
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    }, 1400);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    const id = setInterval(() => {
      setProgress((p) => (p < 92 ? p + Math.max(1, Math.round((95 - p) / 18)) : p));
    }, 250);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 overflow-hidden bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-6"
      style={{ width, height }}
    >
      {/* Skeleton fantôme du futur visuel */}
      <div className="pointer-events-none absolute inset-6 rounded-xl border border-zinc-800/80 bg-zinc-900/40">
        <div className="absolute left-6 top-6 h-6 w-28 animate-pulse rounded-md bg-zinc-800/80" />
        <div className="absolute left-6 top-16 h-10 w-2/3 animate-pulse rounded-md bg-zinc-800/70" />
        <div className="absolute bottom-8 left-6 h-16 w-32 animate-pulse rounded-md bg-zinc-800/80" />
        <div className="absolute right-6 top-6 h-12 w-12 animate-pulse rounded-full bg-zinc-800/80" />
      </div>

      {/* Halo IA */}
      <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-brand-gradient shadow-[0_0_40px_rgba(225,29,72,0.45)]">
        <div className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
        <Sparkles className="relative h-7 w-7 text-white" />
      </div>

      <div className="relative z-10 text-center">
        <div className="text-sm font-semibold text-white">Komaag prépare votre visuel…</div>
        <div className="mt-1 text-[11px] text-zinc-400">
          {phase === "cutout" ? "Détourage haute qualité en cours" : "Génération IA premium"}
        </div>
      </div>

      {/* Barre de progression */}
      <div className="relative z-10 h-1.5 w-64 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-brand-gradient transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Étapes */}
      <ul className="relative z-10 mt-1 space-y-1.5 text-[11px]">
        {STEPS.map((label, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <li
              key={label}
              className={cn(
                "flex items-center gap-2 transition-colors",
                done && "text-emerald-400",
                active && "text-white",
                !done && !active && "text-zinc-500",
              )}
            >
              <span className="flex h-4 w-4 items-center justify-center">
                {done ? (
                  <Check className="h-3.5 w-3.5" />
                ) : active ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-50" />
                )}
              </span>
              <span>{label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * État vide : aucun visuel disponible après traitement.
 * Propose à l'utilisateur de relancer une génération IA.
 */
export function AiVisualEmpty({
  width,
  height,
  onGenerate,
  disabled,
}: {
  width: number;
  height: number;
  onGenerate: () => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-zinc-900/95 p-6 text-center"
      style={{ width, height }}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
        <ImageIcon className="h-6 w-6 text-zinc-500" />
      </div>
      <div className="text-sm font-medium text-white">Aucun visuel disponible</div>
      <p className="max-w-[260px] text-[11px] text-zinc-400">
        Lancez une génération IA pour créer un visuel premium adapté à votre promotion.
      </p>
      <button
        type="button"
        disabled={disabled}
        onClick={onGenerate}
        className="mt-1 inline-flex items-center gap-2 rounded-md bg-brand-gradient px-3 py-2 text-xs font-semibold text-white shadow disabled:opacity-60"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Générer un visuel IA
      </button>
    </div>
  );
}
