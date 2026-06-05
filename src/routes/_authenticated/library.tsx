import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { listPromotionsFn } from "@/lib/promotions.functions";
import { listContentsFn } from "@/lib/content.functions";
import { FileText, FolderOpen, Search, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/library")({
  component: LibraryPage,
});

const CATEGORIES = [
  "Boucherie",
  "Fruits et légumes",
  "Épicerie",
  "Boulangerie",
  "Traiteur",
  "Poissonnerie",
];

function LibraryPage() {
  const { data: promos = [] } = useQuery({
    queryKey: ["promotions"],
    queryFn: () => listPromotionsFn(),
  });
  const { data: contents = [] } = useQuery({
    queryKey: ["contents"],
    queryFn: () => listContentsFn(),
  });

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [sort, setSort] = useState<"recent" | "oldest" | "name">("recent");

  const stats = useMemo(() => {
    const map = new Map<string, { count: number; last: string | null }>();
    for (const c of contents as any[]) {
      if (!c.promotion_id) continue;
      const e = map.get(c.promotion_id) ?? { count: 0, last: null };
      e.count += 1;
      if (!e.last || c.created_at > e.last) e.last = c.created_at;
      map.set(c.promotion_id, e);
    }
    return map;
  }, [contents]);

  const items = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = (promos as any[]).filter((p) => {
      if (q && !p.product_name.toLowerCase().includes(q)) return false;
      if (category !== "all" && p.category !== category) return false;
      return true;
    });
    filtered.sort((a, b) => {
      if (sort === "name") return a.product_name.localeCompare(b.product_name);
      const av = a.created_at;
      const bv = b.created_at;
      return sort === "recent" ? (av < bv ? 1 : -1) : av < bv ? -1 : 1;
    });
    return filtered;
  }, [promos, search, category, sort]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Bibliothèque</h1>
        <p className="text-sm text-muted-foreground">
          Vos promotions et leurs contenus IA, organisés en dossiers.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un produit…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="sm:w-52">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les catégories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as any)}>
          <SelectTrigger className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Plus récents</SelectItem>
            <SelectItem value="oldest">Plus anciens</SelectItem>
            <SelectItem value="name">Nom A→Z</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Aucune promotion ne correspond.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p: any) => {
            const s = stats.get(p.id) ?? { count: 0, last: null };
            const isImage = p.file_type?.startsWith("image/");
            return (
              <Link
                key={p.id}
                to="/library/$promotionId"
                params={{ promotionId: p.id }}
                className="group"
              >
                <Card className="overflow-hidden transition-shadow hover:shadow-md">
                  <div className="flex h-36 items-center justify-center overflow-hidden bg-muted">
                    {p.file_url && isImage ? (
                      <img
                        src={p.file_url}
                        alt={p.product_name}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : p.file_url ? (
                      <FileText className="h-10 w-10 text-muted-foreground" />
                    ) : (
                      <FolderOpen className="h-10 w-10 text-muted-foreground" />
                    )}
                  </div>
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-1 font-medium">{p.product_name}</p>
                      <span className="rounded-full bg-accent px-2 py-0.5 text-xs">
                        {p.category ?? "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        {s.count} contenu{s.count > 1 ? "s" : ""}
                      </span>
                      <span>
                        {format(new Date(p.created_at), "d MMM yyyy", { locale: fr })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
