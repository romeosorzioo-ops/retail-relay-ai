import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { getPromotionFn } from "@/lib/promotions.functions";
import {
  CONTENT_TYPES,
  deleteContentFn,
  listContentsByPromotionFn,
  updateContentFn,
  type ContentType,
} from "@/lib/content.functions";
import { addCalendarPostFn } from "@/lib/calendar.functions";
import {
  ArrowLeft,
  CalendarPlus,
  Copy,
  Facebook,
  FileText,
  Film,
  Instagram,
  Loader2,
  Pencil,
  Save,
  Trash2,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/library/$promotionId")({
  component: PromotionDetail,
});

const TYPE_META: Record<
  ContentType,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  facebook_post: { label: "Facebook", icon: Facebook },
  instagram_post: { label: "Instagram", icon: Instagram },
  instagram_story: { label: "Story", icon: Instagram },
  reel_idea: { label: "Reel", icon: Film },
};

function PromotionDetail() {
  const { promotionId } = Route.useParams();
  const qc = useQueryClient();

  const { data: promo } = useQuery({
    queryKey: ["promotion", promotionId],
    queryFn: () => getPromotionFn({ data: { id: promotionId } }),
  });

  const { data: rows = [] } = useQuery({
    queryKey: ["promotion-contents", promotionId],
    queryFn: () =>
      listContentsByPromotionFn({ data: { promotion_id: promotionId } }),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["promotion-contents", promotionId] });
    qc.invalidateQueries({ queryKey: ["contents"] });
  };

  const byType: Record<ContentType, any[]> = {
    facebook_post: [],
    instagram_post: [],
    instagram_story: [],
    reel_idea: [],
  };
  for (const r of rows as any[]) {
    if (byType[r.content_type as ContentType]) byType[r.content_type as ContentType].push(r);
  }

  const isImage = promo?.file_type?.startsWith("image/");

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <Link to="/library" className="inline-flex items-center text-sm text-muted-foreground hover:underline">
          <ArrowLeft className="mr-1 h-4 w-4" /> Bibliothèque
        </Link>
      </div>

      {!promo ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Promotion introuvable.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="grid gap-4 p-6 md:grid-cols-[200px_1fr]">
              <div className="flex h-48 items-center justify-center overflow-hidden rounded-md bg-muted">
                {promo.file_url && isImage ? (
                  <img src={promo.file_url} alt={promo.product_name} className="h-full w-full object-cover" />
                ) : promo.file_url ? (
                  <a href={promo.file_url} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                    <FileText className="h-10 w-10" />
                    Ouvrir le PDF
                  </a>
                ) : (
                  <FileText className="h-10 w-10 text-muted-foreground" />
                )}
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold">{promo.product_name}</h1>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {promo.price && (
                    <span className="rounded-md bg-primary/10 px-2 py-0.5 font-medium text-primary">
                      {promo.price} €
                    </span>
                  )}
                  {promo.old_price && (
                    <span className="text-muted-foreground line-through">{promo.old_price} €</span>
                  )}
                  {promo.category && (
                    <span className="rounded-full bg-accent px-2 py-0.5 text-xs">{promo.category}</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Période : {promo.start_date ?? "—"} → {promo.end_date ?? "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Créée le {format(new Date(promo.created_at), "d MMM yyyy", { locale: fr })} ·{" "}
                  {rows.length} contenu{rows.length > 1 ? "s" : ""} généré{rows.length > 1 ? "s" : ""}
                </p>
                {promo.file_url && (
                  <a
                    href={promo.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    {promo.file_name ?? "Fichier associé"}
                  </a>
                )}
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="facebook_post" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              {CONTENT_TYPES.map((t) => {
                const Icon = TYPE_META[t].icon;
                return (
                  <TabsTrigger key={t} value={t} className="gap-1.5">
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{TYPE_META[t].label}</span>
                    <span className="rounded-full bg-muted px-1.5 text-xs text-muted-foreground">
                      {byType[t].length}
                    </span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
            {CONTENT_TYPES.map((t) => (
              <TabsContent key={t} value={t} className="mt-4 space-y-3">
                {byType[t].length === 0 ? (
                  <Card>
                    <CardContent className="py-10 text-center text-sm text-muted-foreground">
                      Aucun contenu {TYPE_META[t].label} pour cette promotion.
                    </CardContent>
                  </Card>
                ) : (
                  byType[t].map((it) => (
                    <ContentItemCard key={it.id} item={it} onChanged={refresh} />
                  ))
                )}
              </TabsContent>
            ))}
          </Tabs>
        </>
      )}
    </div>
  );
}

function ContentItemCard({
  item,
  onChanged,
}: {
  item: { id: string; content_type: ContentType; content_text: string; created_at: string };
  onChanged: () => void;
}) {
  const meta = TYPE_META[item.content_type] ?? TYPE_META.facebook_post;
  const Icon = meta.icon;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.content_text);
  const [planOpen, setPlanOpen] = useState(false);
  const [planDate, setPlanDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const save = useMutation({
    mutationFn: () => updateContentFn({ data: { id: item.id, content_text: draft } }),
    onSuccess: () => {
      toast.success("Sauvegardé.");
      setEditing(false);
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: () => deleteContentFn({ data: { id: item.id } }),
    onSuccess: () => {
      toast.success("Supprimé.");
      onChanged();
    },
  });

  const plan = useMutation({
    mutationFn: () =>
      addCalendarPostFn({
        data: {
          generated_content_id: item.id,
          channel: item.content_type,
          scheduled_date: planDate,
        },
      }),
    onSuccess: () => {
      toast.success("Planifié.");
      setPlanOpen(false);
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon className="h-4 w-4 text-primary" />
          {meta.label}
          <span className="text-xs font-normal text-muted-foreground">
            · {format(new Date(item.created_at), "d MMM yyyy HH:mm", { locale: fr })}
          </span>
        </CardTitle>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            title="Copier"
            onClick={() => {
              navigator.clipboard.writeText(editing ? draft : item.content_text);
              toast.success("Copié.");
            }}
          >
            <Copy className="h-4 w-4" />
          </Button>
          {editing ? (
            <Button variant="ghost" size="icon" title="Sauvegarder" disabled={save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            </Button>
          ) : (
            <Button variant="ghost" size="icon" title="Modifier" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" title="Planifier" onClick={() => setPlanOpen((o) => !o)}>
            <CalendarPlus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Supprimer"
            onClick={() => {
              if (confirm("Supprimer ce contenu ?")) del.mutate();
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {editing ? (
          <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={8} />
        ) : (
          <p className="whitespace-pre-wrap text-sm">{item.content_text}</p>
        )}
        {planOpen && (
          <div className="flex items-end gap-2 rounded-md border bg-muted/30 p-2">
            <div className="flex-1">
              <Label className="text-xs">Date</Label>
              <Input type="date" value={planDate} onChange={(e) => setPlanDate(e.target.value)} />
            </div>
            <Button size="sm" onClick={() => plan.mutate()} disabled={plan.isPending}>
              Planifier
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
