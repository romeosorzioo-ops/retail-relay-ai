import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
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
import {
  deleteContentFn,
  generateContentFn,
  listContentsByPromotionFn,
  updateContentFn,
  type ContentType,
} from "@/lib/content.functions";
import { addCalendarPostFn } from "@/lib/calendar.functions";
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
  CalendarPlus,
  ListVideo,
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
const MAX_SIZE = 10 * 1024 * 1024;

const TYPE_META: Record<
  ContentType,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  facebook_post: { label: "Post Facebook", icon: Facebook },
  instagram_post: { label: "Post Instagram", icon: Instagram },
  instagram_story: { label: "Story Instagram", icon: Instagram },
};

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
        toast.error("Le stockage promotion-files est indisponible.");
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
          <img src={value.url} alt={value.name} className="h-16 w-16 rounded object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded bg-muted">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{value.name}</p>
          <p className="text-xs text-muted-foreground">{isImage ? "Image" : "PDF"}</p>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={() => onChange(null)}>
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
      <p className="text-sm font-medium">Glissez-déposez un fichier ou cliquez pour parcourir</p>
      <p className="mt-1 text-xs text-muted-foreground">PNG, JPG, JPEG ou PDF · 10 Mo max</p>
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

  const [viewPromo, setViewPromo] = useState<{ id: string; name: string } | null>(null);

  const gen = useMutation({
    mutationFn: (id: string) => generateContentFn({ data: { promotion_id: id } }),
    onSuccess: (_r, id) => {
      qc.invalidateQueries({ queryKey: ["contents"] });
      qc.invalidateQueries({ queryKey: ["promotion-contents", id] });
      toast.success("Contenus générés !");
      const promo = promos.find((p: any) => p.id === id);
      setViewPromo({ id, name: promo?.product_name ?? "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Promotions</h1>
          <p className="text-sm text-muted-foreground">Gérez vos offres en cours.</p>
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
                onChange={(e) => setForm({ ...form, product_name: e.target.value })}
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
                onChange={(e) => setForm({ ...form, old_price: e.target.value })}
              />
            </div>
            <div>
              <Label>Date début</Label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
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
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
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
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    Aucune promotion. Ajoutez votre première offre.
                  </TableCell>
                </TableRow>
              )}
              {promos.map((p: any) => {
                const isImage = p.file_type?.startsWith("image/");
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.product_name}</TableCell>
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
                          <span className="max-w-[140px] truncate">{p.file_name ?? "Voir"}</span>
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {p.start_date ?? "—"} → {p.end_date ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={gen.isPending}
                          onClick={() => gen.mutate(p.id)}
                        >
                          {gen.isPending && gen.variables === p.id ? (
                            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="mr-1 h-3.5 w-3.5" />
                          )}
                          Générer
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewPromo({ id: p.id, name: p.product_name })}
                        >
                          <ListVideo className="mr-1 h-3.5 w-3.5" />
                          Voir les contenus générés
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => del.mutate(p.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PromotionContentsDialog
        promotion={viewPromo}
        onClose={() => setViewPromo(null)}
      />
    </div>
  );
}

function PromotionContentsDialog({
  promotion,
  onClose,
}: {
  promotion: { id: string; name: string } | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const promoId = promotion?.id ?? "";
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["promotion-contents", promoId],
    queryFn: () => listContentsByPromotionFn({ data: { promotion_id: promoId } }),
    enabled: !!promotion,
  });

  // Group rows by generation (created_at second granularity)
  const groups = groupByGeneration(rows);

  return (
    <Dialog open={!!promotion} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Contenus générés — {promotion?.name}</DialogTitle>
        </DialogHeader>
        {isLoading && (
          <p className="py-6 text-center text-sm text-muted-foreground">Chargement…</p>
        )}
        {!isLoading && groups.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Aucun contenu généré pour cette promotion.
          </p>
        )}
        <div className="space-y-6">
          {groups.map((g) => (
            <div key={g.key} className="space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <p className="text-sm font-medium">
                  Génération du{" "}
                  {format(new Date(g.createdAt), "d MMM yyyy à HH:mm", { locale: fr })}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {g.items.map((it: any) => (
                  <ContentItemCard
                    key={it.id}
                    item={it}
                    onChanged={() => {
                      qc.invalidateQueries({ queryKey: ["promotion-contents", promoId] });
                      qc.invalidateQueries({ queryKey: ["contents"] });
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function groupByGeneration(rows: any[]) {
  // Group rows whose created_at falls within the same minute as one "generation"
  const map = new Map<string, { key: string; createdAt: string; items: any[] }>();
  for (const r of rows) {
    const key = r.created_at.slice(0, 16); // YYYY-MM-DDTHH:MM
    const existing = map.get(key);
    if (existing) existing.items.push(r);
    else map.set(key, { key, createdAt: r.created_at, items: [r] });
  }
  const order: ContentType[] = ["facebook_post", "instagram_post", "instagram_story"];
  return Array.from(map.values())
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .map((g) => ({
      ...g,
      items: g.items.sort(
        (a, b) => order.indexOf(a.content_type) - order.indexOf(b.content_type),
      ),
    }));
}

function ContentItemCard({
  item,
  onChanged,
}: {
  item: { id: string; content_type: ContentType; content_text: string };
  onChanged: () => void;
}) {
  const meta = TYPE_META[item.content_type] ?? TYPE_META.facebook_post;
  const Icon = meta.icon;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.content_text);
  const [saving, setSaving] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [planDate, setPlanDate] = useState(format(new Date(), "yyyy-MM-dd"));

  if (!editing && draft !== item.content_text) setDraft(item.content_text);

  async function save() {
    setSaving(true);
    try {
      await updateContentFn({ data: { id: item.id, content_text: draft } });
      toast.success("Sauvegardé.");
      setEditing(false);
      onChanged();
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur de sauvegarde.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm("Supprimer ce contenu ?")) return;
    try {
      await deleteContentFn({ data: { id: item.id } });
      toast.success("Supprimé.");
      onChanged();
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur.");
    }
  }

  async function addToCalendar() {
    try {
      await addCalendarPostFn({
        data: {
          generated_content_id: item.id,
          channel: item.content_type,
          scheduled_date: planDate,
        },
      });
      toast.success("Ajouté au calendrier.");
      setPlanOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur.");
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon className="h-4 w-4 text-primary" />
          {meta.label}
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
            <Button variant="ghost" size="icon" title="Sauvegarder" disabled={saving} onClick={save}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            </Button>
          ) : (
            <Button variant="ghost" size="icon" title="Modifier" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" title="Ajouter au calendrier" onClick={() => setPlanOpen((o) => !o)}>
            <CalendarPlus className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Supprimer" onClick={remove}>
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
            <Button size="sm" onClick={addToCalendar}>
              Planifier
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
