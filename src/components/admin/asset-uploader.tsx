import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { uploadAdminAssetFn } from "@/lib/admin-assets.functions";

type Folder = "templates" | "fonts" | "graphics";

export function AssetUploader({
  folder,
  accept,
  onUploaded,
  label = "Téléverser un fichier",
}: {
  folder: Folder;
  accept: string;
  onUploaded: (url: string, filename: string, contentType: string) => void;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      let bin = "";
      const bytes = new Uint8Array(buf);
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        bin += String.fromCharCode.apply(
          null,
          Array.from(bytes.subarray(i, i + chunk)),
        );
      }
      const base64 = btoa(bin);
      const res = await uploadAdminAssetFn({
        data: {
          folder,
          filename: file.name,
          content_type: file.type || "application/octet-stream",
          base64,
        },
      });
      onUploaded(res.url, file.name, file.type || "application/octet-stream");
      toast.success("Fichier téléversé.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <label className="inline-flex">
      <input
        type="file"
        accept={accept}
        className="hidden"
        disabled={busy}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      <Button asChild variant="outline" disabled={busy}>
        <span className="cursor-pointer">
          {busy ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          {label}
        </span>
      </Button>
    </label>
  );
}
