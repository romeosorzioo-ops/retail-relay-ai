import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  Copy,
  Facebook,
  Image as ImageIcon,
  Instagram,
  Loader2,
  Music2,
  Sparkles,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  createScheduledPostFn,
  deleteScheduledPostFn,
  updateScheduledPostFn,
  uploadPostMediaFn,
} from "@/lib/scheduled-posts.functions";
import { listContentsFn } from "@/lib/content.functions";
import { POST_FORMAT_LIST, getPostFormat } from "@/lib/post-formats";

type Platform = "facebook" | "instagram" | "tiktok";
type PostType = "post" | "story" | "reel";

export type EditingPost = {
  id?: string;
  platforms?: string[];
  post_type?: string;
  caption?: string;
  media_url?: string | null;
  media_type?: string | null;
  scheduled_at?: string;
  promotion_id?: string | null;
  generated_content_id?: string | null;
  format?: string | null;
} | null;

const ACCEPT = "image/jpeg,image/png,image/jpg,video/mp4,video/quicktime";

export function CreatePostModal({
  open,
  onOpenChange,
  initialDate,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialDate: Date | null;
  editing: EditingPost;
}) {
  const qc = useQueryClient();
  const [platforms, setPlatforms] = useState<Platform[]>(["facebook"]);
  const [postType, setPostType] = useState<PostType>("post");
  const [caption, setCaption] = useState("");
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [uploading, setUploading] = useState(false);
  const [previewPlatform, setPreviewPlatform] = useState<"facebook" | "instagram">(
    "facebook",
  );
  const [genContentId, setGenContentId] = useState<string | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const { data: generated = [] } = useQuery({
    queryKey: ["contents"],
    queryFn: () => listContentsFn(),
    enabled: open,
  });

  // Reset when opening
  useEffect(() => {
    if (!open) return;
    if (editing && editing.id) {
      setPlatforms((editing.platforms ?? ["facebook"]) as Platform[]);
      setPostType((editing.post_type ?? "post") as PostType);
      setCaption(editing.caption ?? "");
      setMediaUrl(editing.media_url ?? null);
      setMediaType(editing.media_type ?? null);
      setGenContentId(editing.generated_content_id ?? null);
      const d = editing.scheduled_at ? new Date(editing.scheduled_at) : new Date();
      setDate(format(d, "yyyy-MM-dd"));
      setTime(format(d, "HH:mm"));
    } else {
      const d = initialDate ?? new Date();
      setPlatforms(["facebook"]);
      setPostType("post");
      setCaption("");
      setMediaUrl(null);
      setMediaType(null);
      setGenContentId(null);
      setDate(format(d, "yyyy-MM-dd"));
      setTime("10:00");
    }
  }, [open, editing, initialDate]);

  useEffect(() => {
    if (platforms.includes("instagram") && !platforms.includes("facebook")) {
      setPreviewPlatform("instagram");
    } else {
      setPreviewPlatform("facebook");
    }
  }, [platforms]);

  const togglePlatform = (p: Platform) => {
    if (p === "tiktok") return;
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  };

  const isVideo = mediaType?.startsWith("video/");
  const isImage = mediaType?.startsWith("image/");

  async function handleFile(file: File) {
    if (!ACCEPT.split(",").includes(file.type)) {
      toast.error("Format non supporté (jpg, png, mp4, mov)");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("Fichier trop volumineux (max 50 Mo)");
      return;
    }
    setUploading(true);
    try {
      const buf = await file.arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(buf);
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
      }
      const data_base64 = btoa(binary);
      const res = await uploadPostMediaFn({
        data: { file_name: file.name, file_type: file.type, data_base64 },
      });
      setMediaUrl(res.url);
      setMediaType(res.type);
      toast.success("Média ajouté");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  const save = useMutation({
    mutationFn: async () => {
      const scheduled = new Date(`${date}T${time}:00`);
      const payload = {
        platforms,
        post_type: postType,
        caption,
        media_url: mediaUrl,
        media_type: mediaType,
        scheduled_at: scheduled.toISOString(),
        generated_content_id: genContentId,
      };
      if (editing?.id) {
        return updateScheduledPostFn({ data: { id: editing.id, ...payload } });
      }
      return createScheduledPostFn({ data: payload });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scheduled-posts"] });
      toast.success(editing?.id ? "Publication mise à jour" : "Publication programmée");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: () => deleteScheduledPostFn({ data: { id: editing!.id! } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scheduled-posts"] });
      toast.success("Publication supprimée");
      onOpenChange(false);
    },
  });

  function validate(): string | null {
    if (platforms.length === 0) return "Sélectionnez au moins un réseau";
    if (!caption.trim()) return "Ajoutez du texte à votre publication";
    if ((postType === "story" || postType === "reel") && !mediaUrl)
      return "Une Story ou un Reel nécessite un média";
    const scheduled = new Date(`${date}T${time}:00`);
    if (scheduled.getTime() < Date.now() - 60_000)
      return "La date doit être dans le futur";
    return null;
  }

  const errorMsg = useMemo(validate, [platforms, caption, postType, mediaUrl, date, time]);
  const charCount = caption.length;
  const maxChars = postType === "story" ? 250 : 2200;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="border-b p-5">
          <DialogTitle className="text-xl">
            {editing?.id ? "Modifier la publication" : "Créer une nouvelle publication"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px]">
          {/* LEFT COLUMN */}
          <div className="space-y-6 p-5">
            {/* Platforms */}
            <section>
              <Label className="mb-2 block text-sm font-medium">Réseaux</Label>
              <div className="flex flex-wrap gap-2">
                <PlatformChip
                  active={platforms.includes("facebook")}
                  onClick={() => togglePlatform("facebook")}
                  icon={<Facebook className="h-4 w-4" />}
                  label="Facebook"
                />
                <PlatformChip
                  active={platforms.includes("instagram")}
                  onClick={() => togglePlatform("instagram")}
                  icon={<Instagram className="h-4 w-4" />}
                  label="Instagram"
                />
                <PlatformChip
                  active={false}
                  disabled
                  onClick={() => {}}
                  icon={<Music2 className="h-4 w-4" />}
                  label="TikTok (bientôt)"
                />
              </div>

              <div className="mt-3 flex gap-2">
                {(["post", "story", "reel"] as PostType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setPostType(t)}
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-xs font-medium capitalize transition",
                      postType === t
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-background hover:bg-accent",
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </section>

            {/* Caption */}
            <section>
              <div className="mb-2 flex items-center justify-between">
                <Label className="text-sm font-medium">Texte de la publication</Label>
                <span
                  className={cn(
                    "text-xs",
                    charCount > maxChars
                      ? "text-destructive"
                      : "text-muted-foreground",
                  )}
                >
                  {charCount}/{maxChars}
                </span>
              </div>
              <Textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Rédigez votre publication…"
                rows={6}
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(caption);
                    toast.success("Texte copié");
                  }}
                  disabled={!caption}
                >
                  <Copy className="h-3.5 w-3.5" /> Copier
                </Button>

                {generated.length > 0 && (
                  <Select
                    onValueChange={(v) => {
                      const item = generated.find((g) => g.id === v);
                      if (item) {
                        setCaption(item.content_text);
                        setGenContentId(item.id);
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 w-auto gap-2 text-xs">
                      <Sparkles className="h-3.5 w-3.5" />
                      <SelectValue placeholder="Utiliser un contenu IA" />
                    </SelectTrigger>
                    <SelectContent>
                      {generated.slice(0, 30).map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {(g.promo_name ?? "Promo")} — {g.content_type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </section>

            {/* Media */}
            <section>
              <Label className="mb-2 block text-sm font-medium">Média</Label>
              <div
                ref={dropRef}
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                className="relative flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-input bg-muted/30 p-4 text-center"
              >
                {uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : mediaUrl ? (
                  <div className="flex w-full items-center gap-3">
                    {isImage ? (
                      <img
                        src={mediaUrl}
                        alt="aperçu"
                        className="h-20 w-20 rounded-md object-cover"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-md bg-muted">
                        <Video className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 text-left text-sm">
                      <p className="font-medium">Média ajouté</p>
                      <p className="text-xs text-muted-foreground">{mediaType}</p>
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setMediaUrl(null);
                        setMediaType(null);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Glissez-déposez ou
                    </p>
                    <label className="cursor-pointer text-sm font-medium text-primary hover:underline">
                      parcourir vos fichiers
                      <input
                        type="file"
                        accept={ACCEPT}
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleFile(f);
                        }}
                      />
                    </label>
                    <p className="text-xs text-muted-foreground">
                      jpg, png, mp4, mov · 50 Mo max
                    </p>
                  </>
                )}
              </div>
            </section>

            {/* Date / Time */}
            <section className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-2 block text-sm font-medium">Date</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div>
                <Label className="mb-2 block text-sm font-medium">Heure</Label>
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            </section>

            {/* Presets */}
            <Collapsible>
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border bg-card px-3 py-2 text-sm font-medium hover:bg-accent">
                <span className="flex items-center gap-2">
                  <Facebook className="h-4 w-4" /> Préréglages Facebook
                </span>
                <ChevronDown className="h-4 w-4" />
              </CollapsibleTrigger>
              <CollapsibleContent className="p-3 text-xs text-muted-foreground">
                Public cible, lieu, première interaction — disponibles bientôt.
              </CollapsibleContent>
            </Collapsible>
            <Collapsible>
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border bg-card px-3 py-2 text-sm font-medium hover:bg-accent">
                <span className="flex items-center gap-2">
                  <Instagram className="h-4 w-4" /> Préréglages Instagram
                </span>
                <ChevronDown className="h-4 w-4" />
              </CollapsibleTrigger>
              <CollapsibleContent className="p-3 text-xs text-muted-foreground">
                Collaborateurs, lieu, partage en story — disponibles bientôt.
              </CollapsibleContent>
            </Collapsible>

            {errorMsg && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {errorMsg}
              </div>
            )}

            <div className="flex items-center justify-between gap-2 border-t pt-4">
              {editing?.id ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => del.mutate()}
                  disabled={del.isPending}
                >
                  <Trash2 className="h-4 w-4" /> Supprimer
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Annuler
                </Button>
                <Button
                  onClick={() => save.mutate()}
                  disabled={!!errorMsg || save.isPending || uploading}
                >
                  {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editing?.id ? "Enregistrer" : "Programmer"}
                </Button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN — preview */}
          <div className="border-t bg-muted/30 p-5 lg:border-l lg:border-t-0">
            <div className="mb-3 flex gap-2">
              {platforms.includes("facebook") && (
                <button
                  onClick={() => setPreviewPlatform("facebook")}
                  className={cn(
                    "flex-1 rounded-md px-2 py-1 text-xs font-medium",
                    previewPlatform === "facebook"
                      ? "bg-background shadow-sm"
                      : "text-muted-foreground",
                  )}
                >
                  Facebook
                </button>
              )}
              {platforms.includes("instagram") && (
                <button
                  onClick={() => setPreviewPlatform("instagram")}
                  className={cn(
                    "flex-1 rounded-md px-2 py-1 text-xs font-medium",
                    previewPlatform === "instagram"
                      ? "bg-background shadow-sm"
                      : "text-muted-foreground",
                  )}
                >
                  Instagram
                </button>
              )}
            </div>
            <MobilePreview
              platform={previewPlatform}
              caption={caption}
              mediaUrl={mediaUrl}
              isVideo={!!isVideo}
              isImage={!!isImage}
            />
            <p className="mt-3 text-center text-xs text-muted-foreground">
              {date && time
                ? `Programmé pour le ${format(new Date(`${date}T${time}`), "PPP 'à' HH:mm", { locale: fr })}`
                : ""}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PlatformChip({
  active,
  onClick,
  icon,
  label,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition",
        disabled && "cursor-not-allowed opacity-50",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input bg-background hover:bg-accent",
      )}
    >
      {icon} {label}
    </button>
  );
}

function MobilePreview({
  platform,
  caption,
  mediaUrl,
  isImage,
  isVideo,
}: {
  platform: "facebook" | "instagram";
  caption: string;
  mediaUrl: string | null;
  isImage: boolean;
  isVideo: boolean;
}) {
  return (
    <div className="mx-auto w-full max-w-[280px] overflow-hidden rounded-[28px] border-8 border-foreground/90 bg-background shadow-lg">
      <div className="border-b px-3 py-2 text-xs font-medium">
        {platform === "facebook" ? "Votre Page" : "votre_compte"}
      </div>
      <div className="flex aspect-square items-center justify-center bg-muted">
        {mediaUrl && isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaUrl} alt="aperçu" className="h-full w-full object-cover" />
        ) : mediaUrl && isVideo ? (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <Video className="h-10 w-10" />
            <span className="text-xs">Vidéo</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <ImageIcon className="h-8 w-8" />
            <span className="text-xs">Aucun média ajouté</span>
          </div>
        )}
      </div>
      <div className="space-y-1 p-3">
        <Badge variant="secondary" className="text-[10px]">
          {platform === "facebook" ? "Facebook" : "Instagram"}
        </Badge>
        <p className="line-clamp-6 whitespace-pre-line text-xs text-foreground">
          {caption || "Votre texte apparaîtra ici…"}
        </p>
      </div>
    </div>
  );
}

export { X };
