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
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { getMyStoreFn, upsertStoreFn } from "@/lib/stores.functions";
import {
  getMyBrandProfileFn,
  upsertBrandProfileFn,
} from "@/lib/brand-profiles.functions";
import { uploadVisualImageFn } from "@/lib/visuals.functions";

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
const FONTS = ["Inter", "Roboto", "Poppins", "Montserrat", "Playfair Display", "Lora"];
const COMM_STYLES = [
  "Familial",
  "Premium",
  "Festif",
  "Local & authentique",
  "Jeune & dynamique",
];

function StorePage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["my-store"],
    queryFn: () => getMyStoreFn(),
  });
  const { data: brand } = useQuery({
    queryKey: ["my-brand"],
    queryFn: () => getMyBrandProfileFn(),
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

  const [brandForm, setBrandForm] = useState({
    logo_url: "" as string,
    primary_color: "#e11d48",
    secondary_color: "#1f2937",
    font_family: "Inter",
    slogan: "",
    communication_style: "Familial",
    custom_font_url: "" as string,
    custom_font_name: "" as string,
  });
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFont, setUploadingFont] = useState(false);

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

  useEffect(() => {
    if (brand) {
      const b = brand as typeof brand & {
        custom_font_url?: string | null;
        custom_font_name?: string | null;
      };
      setBrandForm({
        logo_url: b.logo_url ?? "",
        primary_color: b.primary_color ?? "#e11d48",
        secondary_color: b.secondary_color ?? "#1f2937",
        font_family: b.font_family ?? "Inter",
        slogan: b.slogan ?? "",
        communication_style: b.communication_style ?? "Familial",
        custom_font_url: b.custom_font_url ?? "",
        custom_font_name: b.custom_font_name ?? "",
      });
    }
  }, [brand]);

  const save = useMutation({
    mutationFn: () => upsertStoreFn({ data: form }),
    onSuccess: () => {
      toast.success("Profil magasin enregistré.");
      qc.invalidateQueries({ queryKey: ["my-store"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveBrand = useMutation({
    mutationFn: () =>
      upsertBrandProfileFn({
        data: {
          logo_url: brandForm.logo_url || null,
          primary_color: brandForm.primary_color,
          secondary_color: brandForm.secondary_color,
          font_family: brandForm.font_family,
          slogan: brandForm.slogan || null,
          communication_style: brandForm.communication_style,
        },
      }),
    onSuccess: () => {
      toast.success("Identité visuelle enregistrée.");
      qc.invalidateQueries({ queryKey: ["my-brand"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function uploadLogo(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Image uniquement");
      return;
    }
    setUploadingLogo(true);
    try {
      const buf = await file.arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(buf);
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
      }
      const data_base64 = btoa(binary);
      const res = await uploadVisualImageFn({
        data: { file_name: file.name, file_type: file.type, data_base64 },
      });
      setBrandForm((b) => ({ ...b, logo_url: res.url }));
      toast.success("Logo chargé");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploadingLogo(false);
    }
  }

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

      <Card>
        <CardHeader>
          <CardTitle>Identité visuelle</CardTitle>
          <p className="text-sm text-muted-foreground">
            Ces éléments pré-remplissent automatiquement vos visuels dans le
            module Création.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-2 block">Logo</Label>
            <div className="flex items-center gap-3">
              {brandForm.logo_url ? (
                <img
                  src={brandForm.logo_url}
                  alt="Logo"
                  className="h-16 w-16 rounded-md border object-contain bg-white"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-md border bg-muted text-xs text-muted-foreground">
                  Aucun
                </div>
              )}
              <label className="flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm hover:bg-accent">
                {uploadingLogo ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Charger un logo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadLogo(f);
                  }}
                />
              </label>
              {brandForm.logo_url && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setBrandForm((b) => ({ ...b, logo_url: "" }))}
                >
                  Retirer
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Couleur principale</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={brandForm.primary_color}
                  onChange={(e) =>
                    setBrandForm({ ...brandForm, primary_color: e.target.value })
                  }
                  className="h-9 w-12 cursor-pointer rounded border"
                />
                <Input
                  value={brandForm.primary_color}
                  onChange={(e) =>
                    setBrandForm({ ...brandForm, primary_color: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Couleur secondaire</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={brandForm.secondary_color}
                  onChange={(e) =>
                    setBrandForm({
                      ...brandForm,
                      secondary_color: e.target.value,
                    })
                  }
                  className="h-9 w-12 cursor-pointer rounded border"
                />
                <Input
                  value={brandForm.secondary_color}
                  onChange={(e) =>
                    setBrandForm({
                      ...brandForm,
                      secondary_color: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Police principale</Label>
              <Select
                value={brandForm.font_family}
                onValueChange={(v) =>
                  setBrandForm({ ...brandForm, font_family: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONTS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Style de communication</Label>
              <Select
                value={brandForm.communication_style}
                onValueChange={(v) =>
                  setBrandForm({ ...brandForm, communication_style: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMM_STYLES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Slogan</Label>
              <Input
                value={brandForm.slogan}
                placeholder="Ex: Le goût du local depuis 1985"
                onChange={(e) =>
                  setBrandForm({ ...brandForm, slogan: e.target.value })
                }
              />
            </div>
          </div>

          <div className="pt-2">
            <Button
              onClick={() => saveBrand.mutate()}
              disabled={saveBrand.isPending}
            >
              Enregistrer l'identité visuelle
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
