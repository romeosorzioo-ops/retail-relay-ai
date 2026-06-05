import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
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
import { generateContentFn, updateContentFn } from "@/lib/content.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Trash2,
  Plus,
  UploadCloud,
  FileText,
  X,
  Loader2,
  Sparkles,
  Copy,
  Pencil,
  Save,
  Facebook,
  Instagram,
  Film,
} from "lucide-react";

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

const ACCEPTED = ["image/png", "image/jpeg", "application/pdf"];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

type Uploaded = { url: string; type: string; name: string };

function FileDropzone({
  value,
  onChange,
}: {
  value: Uploaded | null;
  onChange: (v: Uploaded | null) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!ACCEPTED.includes(file.type)) {
      toast.error("Format non accepté. Utilisez PNG, JPG, JPEG ou PDF.");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("Fichier trop volumineux (10 Mo maximum).");
      return;
    }
    setUploading(true);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) throw new Error("Non authentifié");
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${userData.user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("promotion-files")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage
        .from("promotion-files")
        .getPublicUrl(path);
      onChange({ url: pub.publicUrl, type: file.type, name: file.name });
      toast.success("Fichier importé.");
    } catch (e: any) {
      const message = e?.message ?? "";
      if (message.toLowerCase().includes("bucket")) {
        toast.error("Le stockage promotion-files est indisponible. Réessayez dans un instant.");
      } else {
        toast.error(message || "Échec de l'import du fichier.");
      }
    } finally {
      setUploading(false);
    }
  };

  if (value) {
    const isImage = value.type.startsWith("image/");
    return (
      <div className="flex items-center gap-3 rounded-md border p-3">
        {isImage ? (
          <img
            src={value.url}
            alt={value.name}
            className="h-16 w-16 rounded object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded bg-muted">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{value.name}</p>
          <p className="text-xs text-muted-foreground">
            {isImage ? "Image" : "PDF"}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onChange(null)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) handleFile(f);
      }}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed p-6 text-center transition-colors ${
        dragOver ? "border-primary bg-accent" : "border-input hover:bg-accent"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      {uploading ? (
        <Loader2 className="mb-2 h-6 w-6 animate-spin text-muted-foreground" />
      ) : (
        <UploadCloud className="mb-2 h-6 w-6 text-muted-foreground" />
      )}
      <p className="text-sm font-medium">
        Glissez-déposez un fichier ou cliquez pour parcourir
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        PNG, JPG, JPEG ou PDF · 10 Mo max
      </p>
    </div>
  );
}

function PromotionsPage() {
  const qc = useQueryClient();
  const { data: promos = [] } = useQuery({
    queryKey: ["promotions"],
    queryFn: () => listPromotionsFn(),
  });
  const [open, setOpen] = useState(false);
  const emptyForm = {
    product_name: "",
    price: "",
    old_price: "",
    start_date: "",
    end_date: "",
    category: "Épicerie",
  };
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState<Uploaded | null>(null);

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
          file_url: file?.url ?? null,
          file_type: file?.type ?? null,
          file_name: file?.name ?? null,
        },
      }),
    onSuccess: () => {
      toast.success("Promotion ajoutée.");
      qc.invalidateQueries({ queryKey: ["promotions"] });
      setOpen(false);
      setForm(emptyForm);
      setFile(null);
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
            <div className="sm:col-span-2">
              <Label>Fichier produit ou catalogue</Label>
              <div className="mt-2">
                <FileDropzone value={file} onChange={setFile} />
              </div>
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
                <TableHead>Fichier</TableHead>
                <TableHead>Période</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promos.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    Aucune promotion. Ajoutez votre première offre.
                  </TableCell>
                </TableRow>
              )}
              {promos.map((p: any) => {
                const isImage = p.file_type?.startsWith("image/");
                return (
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
                    <TableCell>
                      {p.file_url ? (
                        <a
                          href={p.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 text-sm hover:underline"
                        >
                          {isImage ? (
                            <img
                              src={p.file_url}
                              alt={p.file_name ?? ""}
                              className="h-8 w-8 rounded object-cover"
                            />
                          ) : (
                            <FileText className="h-4 w-4" />
                          )}
                          <span className="max-w-[140px] truncate">
                            {p.file_name ?? "Voir"}
                          </span>
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
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
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
