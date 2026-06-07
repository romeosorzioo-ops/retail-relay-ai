import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  Upload,
  Loader2,
  CheckCircle2,
  Plus,
  Trash2,
  Sparkles,
  FileText,
  Pencil,
} from "lucide-react";
import {
  analyzeAnonymousPdfFn,
  generateAnonymousContentsFn,
  migrateOnboardingDataFn,
  type DetectedPromo,
} from "@/lib/onboarding.functions";
import { supabase } from "@/integrations/supabase/client";
import { STORE_BRANDS } from "@/lib/store-brands";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Essayer Komaag — Importez votre catalogue" },
      {
        name: "description",
        content:
          "Découvrez Komaag en quelques minutes : importez votre catalogue PDF, sélectionnez vos promotions et générez vos premiers contenus sans créer de compte.",
      },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: OnboardingPage,
});

type EditablePromo = DetectedPromo & {
  _id: string;
  selected: boolean;
  caption?: string;
};

type Stage = "upload" | "select" | "create" | "ready";

const STORAGE_KEY = "komaag.onboarding.v1";

function loadState(): {
  stage: Stage;
  promotions: EditablePromo[];
  fileName?: string;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveState(state: {
  stage: Stage;
  promotions: EditablePromo[];
  fileName?: string;
}) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota — ignore */
  }
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function OnboardingPage() {
  const [stage, setStage] = useState<Stage>("upload");
  const [promotions, setPromotions] = useState<EditablePromo[]>([]);
  const [fileName, setFileName] = useState<string | undefined>();
  const [signupOpen, setSignupOpen] = useState(false);

  // Restore on mount
  useEffect(() => {
    const restored = loadState();
    if (restored) {
      setStage(restored.stage);
      setPromotions(restored.promotions);
      setFileName(restored.fileName);
    }
  }, []);

  // Persist
  useEffect(() => {
    saveState({ stage, promotions, fileName });
  }, [stage, promotions, fileName]);

  return (
    <main className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-gradient text-white font-bold shadow-brand">
              K
            </div>
            <span className="font-semibold">Komaag</span>
          </Link>
          <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">
            J'ai déjà un compte
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10">
        <Stepper stage={stage} />

        {stage === "upload" && (
          <UploadStep
            onDone={(promos, name) => {
              setPromotions(
                promos.map((p) => ({ ...p, _id: uid(), selected: true })),
              );
              setFileName(name);
              setStage("select");
            }}
          />
        )}

        {stage === "select" && (
          <SelectStep
            promotions={promotions}
            setPromotions={setPromotions}
            onContinue={() => setStage("create")}
            onBack={() => setStage("upload")}
          />
        )}

        {stage === "create" && (
          <CreateStep
            promotions={promotions}
            setPromotions={setPromotions}
            onContinue={() => setStage("ready")}
            onBack={() => setStage("select")}
          />
        )}

        {stage === "ready" && (
          <ReadyStep
            promotions={promotions}
            onUnlock={() => setSignupOpen(true)}
          />
        )}
      </div>

      <SignupModal
        open={signupOpen}
        onOpenChange={setSignupOpen}
        promotions={promotions.filter((p) => p.selected)}
        onSuccess={() => {
          // Clear onboarding state — promotions are now persisted server-side.
          try {
            sessionStorage.removeItem(STORAGE_KEY);
          } catch {
            /* ignore */
          }
        }}
      />

      <Toaster />
    </main>
  );
}

// -------- Stepper --------
const STEPS: { key: Stage; label: string }[] = [
  { key: "upload", label: "Importer" },
  { key: "select", label: "Sélectionner" },
  { key: "create", label: "Créer" },
  { key: "ready", label: "Débloquer" },
];

function Stepper({ stage }: { stage: Stage }) {
  const currentIdx = STEPS.findIndex((s) => s.key === stage);
  return (
    <ol className="mb-8 flex items-center justify-between gap-2">
      {STEPS.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <li key={s.key} className="flex flex-1 items-center gap-2">
            <span
              className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                done || active
                  ? "bg-brand-gradient text-white shadow-brand"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </span>
            <span
              className={`text-xs sm:text-sm ${
                active ? "font-semibold" : "text-muted-foreground"
              }`}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <span className="hidden flex-1 border-t border-dashed sm:block" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

// -------- Step 1: Upload --------
function UploadStep({
  onDone,
}: {
  onDone: (promos: DetectedPromo[], fileName: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);

  const analyze = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Sélectionnez un PDF.");
      if (file.size > 6 * 1024 * 1024)
        throw new Error("Le PDF doit faire moins de 6 Mo pour la démo.");
      const buf = await file.arrayBuffer();
      // chunk-safe base64
      const bytes = new Uint8Array(buf);
      let binary = "";
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(
          ...bytes.subarray(i, i + chunk),
        );
      }
      const b64 = btoa(binary);
      const promos = await analyzeAnonymousPdfFn({
        data: { file_name: file.name, pdf_base64: b64 },
      });
      return promos;
    },
    onSuccess: (promos) => {
      if (!file) return;
      if (promos.length === 0) {
        toast.error("Aucune promotion détectée. Essayez un autre PDF.");
        return;
      }
      toast.success(`${promos.length} promotion(s) détectée(s)`);
      onDone(promos, file.name);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function pickFile(f: File | null) {
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Format invalide : seuls les PDF sont acceptés.");
      return;
    }
    setFile(f);
  }

  return (
    <div className="rounded-2xl border bg-card p-6 sm:p-10 shadow-sm">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
        Importez votre catalogue promotionnel
      </h1>
      <p className="mt-2 text-muted-foreground">
        Déposez votre PDF et Komaag détectera automatiquement vos promotions.
      </p>

      <div
        className={`mt-6 flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition ${
          drag
            ? "border-primary bg-brand-gradient-soft"
            : "border-muted-foreground/30 bg-muted/20"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          pickFile(e.dataTransfer.files?.[0] ?? null);
        }}
      >
        <span className="icon-brand inline-flex">
          <Upload className="h-6 w-6" />
        </span>
        {file ? (
          <div className="text-sm">
            <FileText className="mr-1 inline h-4 w-4" />
            <span className="font-medium">{file.name}</span>{" "}
            <span className="text-muted-foreground">
              ({(file.size / 1024 / 1024).toFixed(1)} Mo)
            </span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Glissez-déposez votre PDF ici, ou
          </p>
        )}
        <Button
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={analyze.isPending}
        >
          {file ? "Choisir un autre fichier" : "Parcourir mes fichiers"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />
        <p className="text-[11px] text-muted-foreground">
          PDF de moins de 6 Mo pour la démo.
        </p>
      </div>

      <div className="mt-6 flex justify-end">
        <Button
          variant="brand"
          size="lg"
          onClick={() => analyze.mutate()}
          disabled={!file || analyze.isPending}
        >
          {analyze.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyse en cours…
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Analyser mon catalogue
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// -------- Step 2: Select --------
function SelectStep({
  promotions,
  setPromotions,
  onContinue,
  onBack,
}: {
  promotions: EditablePromo[];
  setPromotions: (p: EditablePromo[]) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  const selectedCount = promotions.filter((p) => p.selected).length;

  function update(id: string, patch: Partial<EditablePromo>) {
    setPromotions(promotions.map((p) => (p._id === id ? { ...p, ...patch } : p)));
  }
  function remove(id: string) {
    setPromotions(promotions.filter((p) => p._id !== id));
  }
  function add() {
    setPromotions([
      ...promotions,
      {
        _id: uid(),
        product_name: "Nouvelle promotion",
        promo_price: null,
        old_price: null,
        discount_percent: null,
        category: null,
        selected: true,
      },
    ]);
  }

  return (
    <div className="rounded-2xl border bg-card p-6 sm:p-8 shadow-sm">
      <h1 className="text-2xl font-bold tracking-tight">
        Sélectionnez vos promotions
      </h1>
      <p className="mt-2 text-muted-foreground">
        {promotions.length} promotion(s) détectée(s). Cochez celles à mettre en
        avant, corrigez ou ajoutez-en.
      </p>

      <ul className="mt-6 space-y-3">
        {promotions.map((p) => (
          <li
            key={p._id}
            className={`rounded-xl border p-4 transition ${
              p.selected ? "border-primary/40 bg-brand-gradient-soft" : "bg-card"
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={p.selected}
                onChange={(e) => update(p._id, { selected: e.target.checked })}
                className="mt-1.5 h-4 w-4 accent-pink-500"
                aria-label="Sélectionner"
              />
              <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="col-span-2 sm:col-span-2">
                  <Label className="text-[11px] text-muted-foreground">
                    Produit
                  </Label>
                  <Input
                    value={p.product_name}
                    onChange={(e) =>
                      update(p._id, { product_name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">
                    Prix promo (€)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={p.promo_price ?? ""}
                    onChange={(e) =>
                      update(p._id, {
                        promo_price:
                          e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">
                    Ancien prix (€)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={p.old_price ?? ""}
                    onChange={(e) =>
                      update(p._id, {
                        old_price:
                          e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => remove(p._id)}
                aria-label="Supprimer"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <Button variant="outline" className="mt-4" onClick={add}>
        <Plus className="mr-1 h-4 w-4" />
        Ajouter une promotion
      </Button>

      <div className="mt-8 flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          ← Retour
        </Button>
        <Button
          variant="brand"
          size="lg"
          onClick={onContinue}
          disabled={selectedCount === 0}
        >
          Préparer mes contenus ({selectedCount})
        </Button>
      </div>
    </div>
  );
}

// -------- Step 3: Create --------
function CreateStep({
  promotions,
  setPromotions,
  onContinue,
  onBack,
}: {
  promotions: EditablePromo[];
  setPromotions: (p: EditablePromo[]) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  const selected = promotions.filter((p) => p.selected);
  const hasCaptions = selected.every((p) => p.caption);

  const generate = useMutation({
    mutationFn: async () => {
      const res = await generateAnonymousContentsFn({
        data: {
          promotions: selected.map((p) => ({
            product_name: p.product_name,
            promo_price: p.promo_price ?? null,
            old_price: p.old_price ?? null,
            discount_percent: p.discount_percent ?? null,
            category: p.category ?? null,
          })),
          banner: null,
        },
      });
      return res;
    },
    onSuccess: (res) => {
      // Match by product_name + index
      const updated = promotions.map((p) => {
        if (!p.selected) return p;
        const idx = selected.findIndex((s) => s._id === p._id);
        const match = res[idx];
        return match ? { ...p, caption: match.caption } : p;
      });
      setPromotions(updated);
      toast.success("Vos contenus sont prêts.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Auto-generate on mount if missing
  useEffect(() => {
    if (!hasCaptions && !generate.isPending && selected.length > 0) {
      generate.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateCaption(id: string, caption: string) {
    setPromotions(
      promotions.map((p) => (p._id === id ? { ...p, caption } : p)),
    );
  }

  return (
    <div className="rounded-2xl border bg-card p-6 sm:p-8 shadow-sm">
      <h1 className="text-2xl font-bold tracking-tight">
        Vos premiers contenus
      </h1>
      <p className="mt-2 text-muted-foreground">
        Komaag génère un post Facebook pour chacune des promotions
        sélectionnées. Vous pouvez les modifier.
      </p>

      {generate.isPending && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border bg-muted/30 p-4 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Création de vos contenus en cours…
        </div>
      )}

      <ul className="mt-6 space-y-4">
        {selected.map((p) => (
          <li key={p._id} className="rounded-xl border bg-card p-4">
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <h2 className="font-semibold">{p.product_name}</h2>
              {p.promo_price != null && (
                <span className="text-sm text-brand-gradient font-bold">
                  {p.promo_price}€
                </span>
              )}
            </div>
            {p.caption ? (
              <div className="relative">
                <Textarea
                  rows={4}
                  value={p.caption}
                  onChange={(e) => updateCaption(p._id, e.target.value)}
                />
                <Pencil className="pointer-events-none absolute right-2 top-2 h-3 w-3 text-muted-foreground" />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {generate.isPending ? "Génération…" : "En attente"}
              </p>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-8 flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          ← Retour
        </Button>
        <Button
          variant="brand"
          size="lg"
          onClick={onContinue}
          disabled={generate.isPending || !hasCaptions}
        >
          Continuer
        </Button>
      </div>
    </div>
  );
}

// -------- Step 4: Ready (unlock CTA) --------
function ReadyStep({
  promotions,
  onUnlock,
}: {
  promotions: EditablePromo[];
  onUnlock: () => void;
}) {
  const count = promotions.filter((p) => p.selected).length;
  return (
    <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
      <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-gradient text-white shadow-brand">
        <CheckCircle2 className="h-7 w-7" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
        🎉 Vos {count} premiers contenus sont prêts
      </h1>
      <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
        Pour les enregistrer, programmer vos publications et accéder au
        calendrier, créez votre compte gratuit Komaag.
      </p>
      <div className="mt-6 flex justify-center">
        <Button size="lg" variant="brand" onClick={onUnlock}>
          Créer mon compte pour continuer
        </Button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Vos contenus déjà créés sont conservés. 3 publications offertes incluses.
      </p>
    </div>
  );
}

// -------- Signup modal --------
function SignupModal({
  open,
  onOpenChange,
  promotions,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  promotions: EditablePromo[];
  onSuccess: () => void;
}) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string>(STORE_BRANDS[0] ?? "Super U");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email"));
    const password = String(fd.get("password"));
    const storeName = String(fd.get("store_name"));
    const city = String(fd.get("city") ?? "");

    setLoading(true);
    setError(null);
    try {
      const { data: signupData, error: signErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: { name: storeName },
        },
      });
      if (signErr) {
        const msg =
          signErr.message === "User already registered"
            ? "Un compte existe déjà avec cet email. Connectez-vous."
            : signErr.message;
        setError(msg);
        return;
      }

      // Ensure session for the migration call (signUp may not return one if email confirm required)
      if (!signupData.session) {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInErr) {
          setError(
            "Compte créé. Vérifiez vos emails pour confirmer puis connectez-vous.",
          );
          return;
        }
      }

      // Migrate promotions + contents
      try {
        await migrateOnboardingDataFn({
          data: {
            store: {
              name: storeName,
              banner,
              city: city || null,
            },
            promotions: promotions.map((p) => ({
              product_name: p.product_name,
              promo_price: p.promo_price ?? null,
              old_price: p.old_price ?? null,
              discount_percent: p.discount_percent ?? null,
              category: p.category ?? null,
              caption: p.caption ?? null,
            })),
          },
        });
      } catch (e) {
        // Non-blocking — account is created.
        console.error("Migration onboarding failed", e);
      }

      onSuccess();
      toast.success("Compte créé. Bienvenue sur Komaag !");
      navigate({ to: "/dashboard" });
    } catch {
      setError("Inscription impossible pour le moment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Créez votre compte pour continuer</DialogTitle>
          <DialogDescription>
            Votre catalogue a déjà été transformé en contenu. Créez votre compte
            gratuitement pour enregistrer vos créations et débloquer vos 3
            publications offertes.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="ob-email">Email</Label>
            <Input id="ob-email" name="email" type="email" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ob-password">Mot de passe</Label>
            <Input
              id="ob-password"
              name="password"
              type="password"
              minLength={6}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ob-store">Nom du magasin</Label>
            <Input id="ob-store" name="store_name" required maxLength={120} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Enseigne</Label>
              <Select value={banner} onValueChange={setBanner}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STORE_BRANDS.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="ob-city">Ville</Label>
              <Input id="ob-city" name="city" maxLength={120} />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button
              type="submit"
              variant="brand"
              className="w-full"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer mon compte gratuitement
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
