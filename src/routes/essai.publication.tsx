import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useTunnelStore, type TunnelPost } from "@/lib/tunnel-store";
import { TrialGateModal } from "@/components/trial-gate-modal";
import { FacebookMockup } from "@/components/post-mockups/FacebookMockup";
import { InstagramMockup } from "@/components/post-mockups/InstagramMockup";
import { SchedulePicker } from "@/components/schedule-picker";
import {
  Calendar,
  Clock,
  Facebook,
  Instagram,
  Pencil,
  Save,
  Send,
  CalendarClock,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";

export const Route = createFileRoute("/essai/publication")({
  component: PublicationPage,
});

function defaultDateTime(i: number) {
  const d = new Date();
  d.setDate(d.getDate() + 1 + i);
  d.setHours(10 + (i % 6), 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

function fmtDateLong(iso: string) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function PublicationPage() {
  const router = useRouter();
  const { generatedPosts, updatePost, setStep, creativeStateByPromoId } =
    useTunnelStore();
  const [open, setOpen] = useState(false);
  const [redirectTo, setRedirectTo] =
    useState<"/calendar" | "/dashboard">("/calendar");
  const [editingCaption, setEditingCaption] = useState<Record<string, string | null>>(
    {},
  );
  const [previewNetwork, setPreviewNetwork] = useState<
    Record<string, "facebook" | "instagram">
  >({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setStep("publication");
  }, [setStep]);

  // Seed defaults onto persisted posts the first time we see them.
  useEffect(() => {
    generatedPosts.forEach((p, i) => {
      const patch: Partial<TunnelPost> = {};
      if (!p.scheduledDate || !p.scheduledTime) {
        const { date, time } = defaultDateTime(i);
        if (!p.scheduledDate) patch.scheduledDate = date;
        if (!p.scheduledTime) patch.scheduledTime = time;
      }
      if (!p.platforms) patch.platforms = { facebook: true, instagram: true };
      if (!p.caption)
        patch.caption = `✨ Profitez vite de notre offre sur ${p.product_name} !`;
      if (Object.keys(patch).length) updatePost(p.id, patch);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generatedPosts.length]);

  const summary = useMemo(() => {
    const fb = generatedPosts.filter((p) => p.platforms?.facebook).length;
    const ig = generatedPosts.filter((p) => p.platforms?.instagram).length;
    const dates = generatedPosts
      .map((p) => p.scheduledDate)
      .filter(Boolean)
      .sort() as string[];
    return {
      total: generatedPosts.length,
      fb,
      ig,
      first: dates[0] ?? "",
      last: dates[dates.length - 1] ?? "",
    };
  }, [generatedPosts]);

  // Resolve the validated visual for a post, strictly keyed by promoId.
  // Order: post.finalVisualUrl → creativeStateByPromoId[promoId] (cutout > generated > bg)
  // → other post sources. Returns null if nothing is available.
  const resolveVisual = (p: TunnelPost): string | null => {
    const saved = p.promoId ? creativeStateByPromoId[p.promoId] : null;
    const v =
      p.finalVisualUrl ||
      saved?.cutoutImageUrl ||
      saved?.generatedImageUrl ||
      saved?.bgImage ||
      p.imageUrl ||
      p.productImageUrl ||
      p.sourceImageUrl ||
      p.cutoutImageUrl ||
      null;
    // eslint-disable-next-line no-console
    console.log("[publication] resolveVisual", {
      publicationId: p.id,
      promoId: p.promoId ?? null,
      finalVisualUrl: p.finalVisualUrl ? `${p.finalVisualUrl.slice(0, 40)}…` : null,
      visualSource: v ? (v === p.finalVisualUrl ? "finalVisualUrl" : "fallback") : "none",
    });
    return v;
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    generatedPosts.forEach((p) => {
      const visual = resolveVisual(p);
      if (!p.caption?.trim()) next[p.id] = "Ajoutez une description.";
      else if (!p.scheduledDate) next[p.id] = "Choisissez une date.";
      else if (!p.scheduledTime) next[p.id] = "Choisissez une heure.";
      else if (!p.platforms?.facebook && !p.platforms?.instagram)
        next[p.id] = "Sélectionnez au moins un réseau.";
      else if (!visual) next[p.id] = "Visuel non validé.";
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const openGate = (target: "/calendar" | "/dashboard") => {
    if (!validate()) {
      toast.error("Corrigez les erreurs avant de continuer.");
      return;
    }
    setRedirectTo(target);
    setOpen(true);
  };

  const editPost = (post: TunnelPost) => {
    router.navigate({
      to: "/essai/creation",
      search: { item: post.id } as never,
    });
  };

  const startEdit = (p: TunnelPost) =>
    setEditingCaption((s) => ({ ...s, [p.id]: p.caption ?? "" }));
  const cancelEdit = (id: string) =>
    setEditingCaption((s) => ({ ...s, [id]: null }));
  const saveEdit = (p: TunnelPost) => {
    const v = editingCaption[p.id];
    if (typeof v === "string") {
      updatePost(p.id, { caption: v });
      toast.success("Description enregistrée");
    }
    setEditingCaption((s) => ({ ...s, [p.id]: null }));
  };

  return (
    <div className="relative pb-28">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-1">
          <h1 className="font-display text-3xl font-bold">
            Programmer et publier
          </h1>
          <p className="text-sm text-muted-foreground">
            Vérifiez l'aperçu, ajustez la description, l'horaire et les réseaux
            avant de programmer votre campagne.
          </p>
        </div>

        {/* Summary card */}
        {generatedPosts.length > 0 && (
          <div className="mb-6 rounded-xl border border-border bg-gradient-to-br from-primary/5 to-background p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                {summary.total} publication
                {summary.total > 1 ? "s" : ""} prête
                {summary.total > 1 ? "s" : ""}
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Facebook className="h-4 w-4 text-[#1877F2]" /> Facebook :{" "}
                <span className="font-medium text-foreground">{summary.fb}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Instagram className="h-4 w-4 text-[#E1306C]" /> Instagram :{" "}
                <span className="font-medium text-foreground">{summary.ig}</span>
              </div>
              {summary.first && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <CalendarClock className="h-4 w-4" />
                  Programmées entre{" "}
                  <span className="font-medium text-foreground">
                    {fmtDateLong(summary.first)}
                  </span>{" "}
                  et{" "}
                  <span className="font-medium text-foreground">
                    {fmtDateLong(summary.last)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Posts */}
        <div
          className={`space-y-6 transition-opacity ${
            open ? "opacity-40 pointer-events-none" : ""
          }`}
        >
          {generatedPosts.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              Aucune publication à planifier.
            </div>
          )}

          {generatedPosts.map((post) => {
            const visual = resolveVisual(post);
            const platforms = post.platforms ?? { facebook: true, instagram: true };
            const captionDraft = editingCaption[post.id];
            const isEditing = typeof captionDraft === "string";
            const status: "draft" | "scheduled" =
              post.scheduled_at ? "scheduled" : "draft";
            const preview =
              previewNetwork[post.id] ??
              (platforms.facebook ? "facebook" : "instagram");
            const err = errors[post.id];

            return (
              <div
                key={post.id}
                className="grid gap-4 rounded-xl border border-border bg-card p-4 shadow-sm md:grid-cols-[1fr,minmax(0,420px)]"
              >
                {/* Left: card */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
                      {visual ? (
                        <img
                          src={visual}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="px-1 text-center text-[10px] leading-tight text-muted-foreground">
                          Visuel non validé
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="truncate font-semibold">
                          {post.product_name}
                        </h3>
                        <Badge
                          variant="outline"
                          className={
                            status === "scheduled"
                              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
                              : "bg-muted text-muted-foreground"
                          }
                        >
                          {status === "scheduled" ? "Programmé" : "Brouillon"}
                        </Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {fmtDateLong(post.scheduledDate ?? "")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />{" "}
                          {post.scheduledTime ?? "--:--"}
                        </span>
                        {platforms.facebook && (
                          <span className="flex items-center gap-1">
                            <Facebook className="h-3.5 w-3.5 text-[#1877F2]" />{" "}
                            Facebook
                          </span>
                        )}
                        {platforms.instagram && (
                          <span className="flex items-center gap-1">
                            <Instagram className="h-3.5 w-3.5 text-[#E1306C]" />{" "}
                            Instagram
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Caption editor */}
                  <div className="rounded-lg border border-border bg-muted/20 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <Label className="text-xs font-semibold">
                        Description
                      </Label>
                      {!isEditing ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(post)}
                        >
                          <Pencil className="h-3.5 w-3.5" /> Modifier
                        </Button>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => cancelEdit(post.id)}
                          >
                            <X className="h-3.5 w-3.5" /> Annuler
                          </Button>
                          <Button
                            variant="brand"
                            size="sm"
                            onClick={() => saveEdit(post)}
                          >
                            <Save className="h-3.5 w-3.5" /> Enregistrer
                          </Button>
                        </div>
                      )}
                    </div>
                    {isEditing ? (
                      <Textarea
                        autoFocus
                        rows={5}
                        value={captionDraft as string}
                        onChange={(e) =>
                          setEditingCaption((s) => ({
                            ...s,
                            [post.id]: e.target.value,
                          }))
                        }
                      />
                    ) : (
                      <p
                        className="cursor-text whitespace-pre-wrap text-sm text-foreground/90"
                        onClick={() => startEdit(post)}
                      >
                        {post.caption || (
                          <span className="text-muted-foreground italic">
                            Aucune description. Cliquez pour ajouter.
                          </span>
                        )}
                      </p>
                    )}
                  </div>

                  {/* Schedule picker — Metricool style */}
                  <div className="space-y-1">
                    <Label className="text-xs">Programmation</Label>
                    <SchedulePicker
                      date={post.scheduledDate}
                      time={post.scheduledTime}
                      onChange={({ date, time }) =>
                        updatePost(post.id, {
                          scheduledDate: date,
                          scheduledTime: time,
                        })
                      }
                    />
                  </div>


                  {/* Networks */}
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
                    <label className="flex items-center gap-2 text-sm">
                      <Facebook className="h-4 w-4 text-[#1877F2]" /> Facebook
                      <Switch
                        checked={platforms.facebook}
                        onCheckedChange={(v) =>
                          updatePost(post.id, {
                            platforms: { ...platforms, facebook: v },
                          })
                        }
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Instagram className="h-4 w-4 text-[#E1306C]" /> Instagram
                      <Switch
                        checked={platforms.instagram}
                        onCheckedChange={(v) =>
                          updatePost(post.id, {
                            platforms: { ...platforms, instagram: v },
                          })
                        }
                      />
                    </label>
                  </div>

                  {err && (
                    <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                      <AlertCircle className="h-4 w-4" /> {err}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => editPost(post)}
                    >
                      <Pencil className="h-3.5 w-3.5" /> Modifier le visuel
                    </Button>
                  </div>
                </div>

                {/* Right: preview */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1 self-end rounded-md border border-border bg-muted p-0.5 text-xs">
                    {platforms.facebook && (
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewNetwork((s) => ({
                            ...s,
                            [post.id]: "facebook",
                          }))
                        }
                        className={`rounded px-2 py-1 ${
                          preview === "facebook"
                            ? "bg-background shadow"
                            : "text-muted-foreground"
                        }`}
                      >
                        Facebook
                      </button>
                    )}
                    {platforms.instagram && (
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewNetwork((s) => ({
                            ...s,
                            [post.id]: "instagram",
                          }))
                        }
                        className={`rounded px-2 py-1 ${
                          preview === "instagram"
                            ? "bg-background shadow"
                            : "text-muted-foreground"
                        }`}
                      >
                        Instagram
                      </button>
                    )}
                  </div>
                  <div className="rounded-lg bg-muted/20 p-2">
                    {preview === "instagram" && platforms.instagram ? (
                      <InstagramMockup
                        storeName="Mon magasin"
                        postText={post.caption}
                        imageUrl={visual ?? undefined}
                        format={post.format ?? undefined}
                        onTextChange={(t) =>
                          updatePost(post.id, { caption: t })
                        }
                      />
                    ) : (
                      <FacebookMockup
                        storeName="Mon magasin"
                        postText={post.caption}
                        imageUrl={visual ?? undefined}
                        format={post.format ?? undefined}
                        onTextChange={(t) =>
                          updatePost(post.id, { caption: t })
                        }
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Button
            variant="outline"
            onClick={() => router.navigate({ to: "/essai/creation" })}
          >
            <ArrowLeft className="h-4 w-4" /> Précédent
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => openGate("/dashboard")}>
              <Save className="h-4 w-4" /> Brouillon
            </Button>
            <Button variant="outline" onClick={() => openGate("/calendar")}>
              <CalendarClock className="h-4 w-4" /> Programmer
            </Button>
            <Button variant="brand" onClick={() => openGate("/calendar")}>
              <Send className="h-4 w-4" /> Publier
            </Button>
          </div>
        </div>
      </div>

      <TrialGateModal
        open={open}
        onOpenChange={setOpen}
        redirectTo={redirectTo}
      />
    </div>
  );
}
