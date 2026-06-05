import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listPromotionsFn } from "@/lib/promotions.functions";
import { generateContentFn, type ContentType } from "@/lib/content.functions";
import { Sparkles, Copy, Facebook, Instagram, Film } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/generate")({
  component: GeneratePage,
});

const TYPE_META: Record<ContentType, { label: string; icon: any }> = {
  facebook_post: { label: "Post Facebook", icon: Facebook },
  instagram_post: { label: "Post Instagram", icon: Instagram },
  instagram_story: { label: "Story Instagram", icon: Instagram },
};

function GeneratePage() {
  const qc = useQueryClient();
  const { data: promos = [] } = useQuery({
    queryKey: ["promotions"],
    queryFn: () => listPromotionsFn(),
  });
  const [selected, setSelected] = useState<string>("");
  const [result, setResult] = useState<any[]>([]);

  const gen = useMutation({
    mutationFn: () => generateContentFn({ data: { promotion_id: selected } }),
    onSuccess: (r) => {
      setResult(r as any[]);
      qc.invalidateQueries({ queryKey: ["contents"] });
      qc.invalidateQueries({ queryKey: ["promotion-contents", selected] });
      toast.success("Contenus générés !");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function copy(s: string) {
    navigator.clipboard.writeText(s);
    toast.success("Copié.");
  }

  const order: ContentType[] = ["facebook_post", "instagram_post", "instagram_story"];
  const sorted = [...result].sort(
    (a, b) => order.indexOf(a.content_type) - order.indexOf(b.content_type),
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Génération IA</h1>
        <p className="text-sm text-muted-foreground">
          Sélectionnez une promo, l'IA s'occupe du reste.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Choisir une promotion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionnez une promotion" />
            </SelectTrigger>
            <SelectContent>
              {promos.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.product_name} {p.price ? `— ${p.price} €` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button disabled={!selected || gen.isPending} onClick={() => gen.mutate()}>
            <Sparkles className="mr-1 h-4 w-4" />
            {gen.isPending ? "Génération…" : "Générer mes contenus"}
          </Button>
        </CardContent>
      </Card>

      {sorted.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {sorted.map((b: any) => {
            const meta = TYPE_META[b.content_type as ContentType] ?? TYPE_META.facebook_post;
            const Icon = meta.icon;
            return (
              <Card key={b.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="h-4 w-4 text-primary" />
                    {meta.label}
                  </CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => copy(b.content_text)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm">{b.content_text}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
