import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { getMyStoreFn, upsertStoreFn } from "@/lib/stores.functions";

export const Route = createFileRoute("/_authenticated/store")({
  component: StorePage,
});

const BANNERS = [
  "Super U",
  "Hyper U",
  "U Express",
  "Intermarché",
  "Carrefour Market",
  "Spar",
  "Autre",
];
const TONES = ["Familial", "Professionnel", "Dynamique", "Local"];
const FREQS = ["2 fois/semaine", "3 fois/semaine", "Quotidien"];
const DEPARTMENTS = [
  "Fruits et légumes",
  "Boucherie",
  "Boulangerie",
  "Poissonnerie",
  "Épicerie",
  "Traiteur",
  "Produits locaux",
];

function StorePage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["my-store"],
    queryFn: () => getMyStoreFn(),
  });

  const [form, setForm] = useState({
    name: "",
    banner: "Super U",
    city: "",
    description: "",
    tone: "Professionnel",
    frequency: "3 fois/semaine",
    strong_departments: [] as string[],
  });

  useEffect(() => {
    if (data) {
      setForm({
        name: data.name ?? "",
        banner: data.banner ?? "Super U",
        city: data.city ?? "",
        description: data.description ?? "",
        tone: data.tone ?? "Professionnel",
        frequency: data.frequency ?? "3 fois/semaine",
        strong_departments: data.strong_departments ?? [],
      });
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () => upsertStoreFn({ data: form }),
    onSuccess: () => {
      toast.success("Profil magasin enregistré.");
      qc.invalidateQueries({ queryKey: ["my-store"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function toggleDept(d: string) {
    setForm((f) => ({
      ...f,
      strong_departments: f.strong_departments.includes(d)
        ? f.strong_departments.filter((x) => x !== d)
        : [...f.strong_departments, d],
    }));
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mon magasin</h1>
        <p className="text-sm text-muted-foreground">
          Ces informations guident l'IA pour générer vos contenus.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Nom du magasin</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Enseigne</Label>
              <Select
                value={form.banner}
                onValueChange={(v) => setForm({ ...form, banner: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BANNERS.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ville</Label>
              <Input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
            <div>
              <Label>Fréquence de publication</Label>
              <Select
                value={form.frequency}
                onValueChange={(v) => setForm({ ...form, frequency: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQS.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Ton de communication</Label>
              <Select
                value={form.tone}
                onValueChange={(v) => setForm({ ...form, tone: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONES.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Quelques mots sur votre magasin, votre ADN…"
              />
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Rayons forts</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {DEPARTMENTS.map((d) => (
                <label
                  key={d}
                  className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <Checkbox
                    checked={form.strong_departments.includes(d)}
                    onCheckedChange={() => toggleDept(d)}
                  />
                  {d}
                </label>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              Enregistrer
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
