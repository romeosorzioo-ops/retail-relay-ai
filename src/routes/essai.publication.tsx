import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useTunnelStore, type TunnelPost } from "@/lib/tunnel-store";
import { TrialGateModal } from "@/components/trial-gate-modal";
import { FacebookMockup } from "@/components/post-mockups/FacebookMockup";
import { InstagramMockup } from "@/components/post-mockups/InstagramMockup";
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
} from "lucide-react";

export const Route = createFileRoute("/essai/publication")({
  component: PublicationPage,
});

type PostMeta = {
  date: string; // yyyy-mm-dd
  time: string; // HH:mm
  facebook: boolean;
  instagram: boolean;
  status: "draft" | "scheduled";
  caption: string;
  preview: "facebook" | "instagram";
};

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
  const { generatedPosts, setStep } = useTunnelStore();
  const [open, setOpen] = useState(false);
  const [redirectTo, setRedirectTo] =
    useState<"/calendar" | "/dashboard">("/calendar");
  const [metas, setMetas] = useState<Record<string, PostMeta>>({});

  useEffect(() => {
    setStep("publication");
  }, [setStep]);

  // Initialize default metadata for each post.
  useEffect(() => {
    setMetas((prev) => {
      const next = { ...prev };
      generatedPosts.forEach((p, i) => {
        if (!next[p.id]) {
          const { date, time } = defaultDateTime(i);
          next[p.id] = {
            date,
            time,
            facebook: true,
            instagram: true,
            status: "draft",
            caption:
              p.caption ||
              `✨ Profitez vite de notre offre sur ${p.product_name} !`,
            preview: "facebook",
          };
        }
      });
      return next;
    });
  }, [generatedPosts]);

  const updateMeta = (id: string, patch: Partial<PostMeta>) =>
    setMetas((m) => ({ ...m, [id]: { ...m[id], ...patch } }));

  const openGate = (target: "/calendar" | "/dashboard") => {
    setRedirectTo(target);
    setOpen(true);
  };

  const summary = useMemo(() => {
    const fb = generatedPosts.filter((p) => metas[p.id]?.facebook).length;
    const ig = generatedPosts.filter((p) => metas[p.id]?.instagram).length;
    const dates = generatedPosts
      .map((p) => metas[p.id]?.date)
      .filter(Boolean)
      .sort();
    return {
      total: generatedPosts.length,
      fb,
      ig,
      first: dates[0] ?? "",
      last: dates[dates.length - 1] ?? "",
    };
  }, [generatedPosts, metas]);

  const editPost = (post: TunnelPost) => {
    router.navigate({
      to: "/essai/creation",
      search: { item: post.id } as never,
    });
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
            Vérifiez l'aperçu, ajustez la date et les réseaux puis programmez
            votre campagne.
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
            const meta = metas[post.id];
            if (!meta) return null;
            const visual =
              post.finalVisualUrl ?? post.imageUrl ?? post.productImageUrl ?? null;

            return (
              <div
                key={post.id}
                className="grid gap-4 rounded-xl border border-border bg-card p-4 shadow-sm md:grid-cols-[1fr,minmax(0,420px)]"
              >
                {/* Left: card */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                      {visual ? (
                        <img
                          src={visual}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="truncate font-semibold">
                          {post.product_name}
                        </h3>
                        <Badge
                          variant="outline"
                          className={
                            meta.status === "scheduled"
                              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
                              : "bg-muted text-muted-foreground"
                          }
                        >
                          {meta.status === "scheduled"
                            ? "Programmé"
                            : "Brouillon"}
                        </Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {fmtDateLong(meta.date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" /> {meta.time}
                        </span>
                        {meta.facebook && (
                          <span className="flex items-center gap-1">
                            <Facebook className="h-3.5 w-3.5 text-[#1877F2]" />{" "}
                            Facebook
                          </span>
                        )}
                        {meta.instagram && (
                          <span className="flex items-center gap-1">
                            <Instagram className="h-3.5 w-3.5 text-[#E1306C]" />{" "}
                            Instagram
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <p className="line-clamp-3 whitespace-pre-wrap text-sm text-foreground/90">
                    {meta.caption}
                  </p>

                  {/* Controls */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Date</Label>
                      <Input
                        type="date"
                        value={meta.date}
                        onChange={(e) =>
                          updateMeta(post.id, { date: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Heure</Label>
                      <Input
                        type="time"
                        value={meta.time}
                        onChange={(e) =>
                          updateMeta(post.id, { time: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
                    <label className="flex items-center gap-2 text-sm">
                      <Facebook className="h-4 w-4 text-[#1877F2]" /> Facebook
                      <Switch
                        checked={meta.facebook}
                        onCheckedChange={(v) =>
                          updateMeta(post.id, { facebook: v })
                        }
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Instagram className="h-4 w-4 text-[#E1306C]" /> Instagram
                      <Switch
                        checked={meta.instagram}
                        onCheckedChange={(v) =>
                          updateMeta(post.id, { instagram: v })
                        }
                      />
                    </label>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => editPost(post)}
                    >
                      <Pencil className="h-3.5 w-3.5" /> Modifier
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        updateMeta(post.id, { status: "scheduled" })
                      }
                    >
                      <CalendarClock className="h-3.5 w-3.5" /> Marquer programmé
                    </Button>
                  </div>
                </div>

                {/* Right: preview */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1 self-end rounded-md border border-border bg-muted p-0.5 text-xs">
                    {(meta.facebook || !meta.instagram) && (
                      <button
                        type="button"
                        onClick={() =>
                          updateMeta(post.id, { preview: "facebook" })
                        }
                        className={`rounded px-2 py-1 ${
                          meta.preview === "facebook"
                            ? "bg-background shadow"
                            : "text-muted-foreground"
                        }`}
                      >
                        Facebook
                      </button>
                    )}
                    {meta.instagram && (
                      <button
                        type="button"
                        onClick={() =>
                          updateMeta(post.id, { preview: "instagram" })
                        }
                        className={`rounded px-2 py-1 ${
                          meta.preview === "instagram"
                            ? "bg-background shadow"
                            : "text-muted-foreground"
                        }`}
                      >
                        Instagram
                      </button>
                    )}
                  </div>
                  <div className="rounded-lg bg-muted/20 p-2">
                    {meta.preview === "instagram" && meta.instagram ? (
                      <InstagramMockup
                        storeName="Mon magasin"
                        postText={meta.caption}
                        imageUrl={visual ?? undefined}
                        onTextChange={(t) =>
                          updateMeta(post.id, { caption: t })
                        }
                      />
                    ) : (
                      <FacebookMockup
                        storeName="Mon magasin"
                        postText={meta.caption}
                        imageUrl={visual ?? undefined}
                        onTextChange={(t) =>
                          updateMeta(post.id, { caption: t })
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
