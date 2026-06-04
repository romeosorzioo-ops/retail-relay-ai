import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  createPromotionFn,
  deletePromotionFn,
  listPromotionsFn,
} from "@/lib/promotions.functions";
import { Trash2, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/promotions")({
  component: PromotionsPage,
});

const CATEGORIES = [
  "Boucherie",
  "Fruits et légumes",
  "Épicerie",
  "Boulangerie",
  "Traiteur",
  "Poissonnerie",
];

function PromotionsPage() {
  const qc = useQueryClient();
  const { data: promos = [] } = useQuery({
    queryKey: ["promotions"],
    queryFn: () => listPromotionsFn(),
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    product_name: "",
    price: "",
    old_price: "",
    start_date: "",
    end_date: "",
    category: "Épicerie",
    photo_url: "",
  });

  const create = useMutation({
    mutationFn: () =>
      createPromotionFn({
        data: {
          product_name: form.product_name,
          price: form.price ? Number(form.price) : null,
          old_price: form.old_price ? Number(form.old_price) : null,
          start_date: form.start_date || null,
          end_date: form.end_date || null,
          category: form.category,
          photo_url: form.photo_url || null,
        },
      }),
    onSuccess: () => {
      toast.success("Promotion ajoutée.");
      qc.invalidateQueries({ queryKey: ["promotions"] });
      setOpen(false);
      setForm({
        product_name: "",
        price: "",
        old_price: "",
        start_date: "",
        end_date: "",
        category: "Épicerie",
        photo_url: "",
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => deletePromotionFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["promotions"] }),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Promotions</h1>
          <p className="text-sm text-muted-foreground">
            Gérez vos offres en cours.
          </p>
        </div>
        <Button onClick={() => setOpen((o) => !o)}>
          <Plus className="mr-1 h-4 w-4" /> Ajouter
        </Button>
      </div>

      {open && (
        <Card>
          <CardHeader>
            <CardTitle>Nouvelle promotion</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Nom du produit</Label>
              <Input
                value={form.product_name}
                onChange={(e) =>
                  setForm({ ...form, product_name: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Prix (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>
            <div>
              <Label>Ancien prix (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.old_price}
                onChange={(e) =>
                  setForm({ ...form, old_price: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Date début</Label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) =>
                  setForm({ ...form, start_date: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Date fin</Label>
              <Input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Catégorie</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Photo (URL)</Label>
              <Input
                value={form.photo_url}
                onChange={(e) =>
                  setForm({ ...form, photo_url: e.target.value })
                }
                placeholder="https://…"
              />
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button
                onClick={() => create.mutate()}
                disabled={create.isPending || !form.product_name}
              >
                Enregistrer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produit</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Période</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promos.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    Aucune promotion. Ajoutez votre première offre.
                  </TableCell>
                </TableRow>
              )}
              {promos.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {p.product_name}
                  </TableCell>
                  <TableCell>
                    {p.price ? `${p.price} €` : "—"}
                    {p.old_price && (
                      <span className="ml-2 text-xs text-muted-foreground line-through">
                        {p.old_price} €
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{p.category ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {p.start_date ?? "—"} → {p.end_date ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => del.mutate(p.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
