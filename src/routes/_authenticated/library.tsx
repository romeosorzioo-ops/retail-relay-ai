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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  deleteContentFn,
  listContentsFn,
  updateContentFn,
} from "@/lib/content.functions";
import { addCalendarPostFn } from "@/lib/calendar.functions";
import { Copy, Trash2, Pencil, CalendarPlus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/library")({
  component: LibraryPage,
});

const CHANNELS = [
  { v: "facebook_post", l: "Post Facebook" },
  { v: "instagram_post", l: "Post Instagram" },
  { v: "instagram_story", l: "Story Instagram" },
  { v: "reel_idea", l: "Reel" },
];

function LibraryPage() {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery({
    queryKey: ["contents"],
    queryFn: () => listContentsFn(),
  });

  const [editing, setEditing] = useState<any>(null);
  const [planning, setPlanning] = useState<any>(null);
  const [planDate, setPlanDate] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [planChannel, setPlanChannel] = useState("facebook_post");

  const del = useMutation({
    mutationFn: (id: string) => deleteContentFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contents"] }),
  });

  const update = useMutation({
    mutationFn: () =>
      updateContentFn({
        data: {
          id: editing.id,
          facebook_post: editing.facebook_post ?? "",
          instagram_post: editing.instagram_post ?? "",
          instagram_story: editing.instagram_story ?? "",
          reel_idea: editing.reel_idea ?? "",
        },
      }),
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
          channel: planChannel,
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
        <h1 className="text-2xl font-semibold tracking-tight">
          Bibliothèque de contenus
        </h1>
        <p className="text-sm text-muted-foreground">
          Retrouvez tous vos contenus générés.
        </p>
      </div>

      {items.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Aucun contenu encore. Générez-en depuis la page « Génération IA ».
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((c: any) => (
          <Card key={c.id}>
            <CardHeader>
              <CardTitle className="text-base">
                {c.promo_name ?? "Promo supprimée"}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {format(new Date(c.created_at), "d MMM yyyy", { locale: fr })}
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="line-clamp-4 text-sm text-muted-foreground">
                {c.facebook_post}
              </p>
              <div className="flex flex-wrap gap-1 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copy(c.facebook_post ?? "")}
                >
                  <Copy className="mr-1 h-3 w-3" /> FB
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copy(c.instagram_post ?? "")}
                >
                  <Copy className="mr-1 h-3 w-3" /> IG
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditing({ ...c })}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setPlanning(c)}
                >
                  <CalendarPlus className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => del.mutate(c.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifier les contenus</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              {(
                [
                  ["facebook_post", "Post Facebook"],
                  ["instagram_post", "Post Instagram"],
                  ["instagram_story", "Story Instagram"],
                  ["reel_idea", "Reel"],
                ] as const
              ).map(([k, l]) => (
                <div key={k}>
                  <Label>{l}</Label>
                  <Textarea
                    rows={3}
                    value={editing[k] ?? ""}
                    onChange={(e) =>
                      setEditing({ ...editing, [k]: e.target.value })
                    }
                  />
                </div>
              ))}
              <div className="flex justify-end">
                <Button
                  onClick={() => update.mutate()}
                  disabled={update.isPending}
                >
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
              <Label>Canal</Label>
              <Select value={planChannel} onValueChange={setPlanChannel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANNELS.map((c) => (
                    <SelectItem key={c.v} value={c.v}>
                      {c.l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={planDate}
                onChange={(e) => setPlanDate(e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => addCal.mutate()}
                disabled={addCal.isPending}
              >
                Planifier
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
