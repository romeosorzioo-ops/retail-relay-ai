import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  deleteContentFn,
  listContentsFn,
  updateContentFn,
} from "@/lib/content.functions";
import { addCalendarPostFn } from "@/lib/calendar.functions";
import { Copy, Trash2, Pencil, CalendarPlus, Facebook, Instagram, Film } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/library")({
  component: LibraryPage,
});

const TYPE_META: Record<string, { label: string; icon: any }> = {
  facebook_post: { label: "Post Facebook", icon: Facebook },
  instagram_post: { label: "Post Instagram", icon: Instagram },
  instagram_story: { label: "Story Instagram", icon: Instagram },
  reel_idea: { label: "Idée de Reel", icon: Film },
};

function LibraryPage() {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery({
    queryKey: ["contents"],
    queryFn: () => listContentsFn(),
  });

  const [editing, setEditing] = useState<any>(null);
  const [editDraft, setEditDraft] = useState("");
  const [planning, setPlanning] = useState<any>(null);
  const [planDate, setPlanDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const del = useMutation({
    mutationFn: (id: string) => deleteContentFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contents"] }),
  });

  const update = useMutation({
    mutationFn: () =>
      updateContentFn({ data: { id: editing.id, content_text: editDraft } }),
    onSuccess: () => {
      toast.success("Mis à jour.");
      qc.invalidateQueries({ queryKey: ["contents"] });
      setEditing(null);
    },
  });

  const addCal = useMutation({
    mutationFn: () =>
      addCalendarPostFn({
        data: {
          generated_content_id: planning.id,
          channel: planning.content_type,
          scheduled_date: planDate,
        },
      }),
    onSuccess: () => {
      toast.success("Planifié.");
      qc.invalidateQueries({ queryKey: ["calendar"] });
      setPlanning(null);
    },
  });

  function copy(s: string) {
    navigator.clipboard.writeText(s);
    toast.success("Copié.");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Bibliothèque de contenus</h1>
        <p className="text-sm text-muted-foreground">Retrouvez tous vos contenus générés.</p>
      </div>

      {items.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Aucun contenu encore. Générez-en depuis une promotion.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((c: any) => {
          const meta = TYPE_META[c.content_type] ?? TYPE_META.facebook_post;
          const Icon = meta.icon;
          return (
            <Card key={c.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className="h-4 w-4 text-primary" />
                  {meta.label}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {c.promo_name ?? "Promo supprimée"} ·{" "}
                  {format(new Date(c.created_at), "d MMM yyyy", { locale: fr })}
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="line-clamp-4 whitespace-pre-wrap text-sm text-muted-foreground">
                  {c.content_text}
                </p>
                <div className="flex flex-wrap gap-1 pt-2">
                  <Button size="sm" variant="outline" onClick={() => copy(c.content_text ?? "")}>
                    <Copy className="mr-1 h-3 w-3" /> Copier
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditing(c);
                      setEditDraft(c.content_text ?? "");
                    }}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setPlanning(c)}>
                    <CalendarPlus className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => del.mutate(c.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifier le contenu</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <Textarea rows={10} value={editDraft} onChange={(e) => setEditDraft(e.target.value)} />
              <div className="flex justify-end">
                <Button onClick={() => update.mutate()} disabled={update.isPending}>
                  Enregistrer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!planning} onOpenChange={(o) => !o && setPlanning(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Planifier dans le calendrier</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Date</Label>
              <Input type="date" value={planDate} onChange={(e) => setPlanDate(e.target.value)} />
            </div>
            <div className="flex justify-end">
              <Button onClick={() => addCal.mutate()} disabled={addCal.isPending}>
                Planifier
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
