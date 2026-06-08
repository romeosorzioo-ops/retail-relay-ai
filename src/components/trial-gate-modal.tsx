import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function TrialGateModal({
  open,
  onOpenChange,
  redirectTo = "/dashboard",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  redirectTo?: "/dashboard" | "/calendar";
}) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [storeName, setStoreName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const pending = localStorage.getItem("komaag-pending-email");
    if (pending) setEmail(pending);
  }, []);

  useEffect(() => {
    if (email) localStorage.setItem("komaag-pending-email", email);
  }, [email]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      // Simulated account creation (Supabase non branché dans le tunnel)
      await new Promise((r) => setTimeout(r, 800));
      localStorage.setItem(
        "komaag-trial-account",
        JSON.stringify({ email, storeName, createdAt: Date.now() }),
      );
      localStorage.removeItem("komaag-pending-email");
      toast.success("Compte créé, vos publications sont sauvegardées.");
      onOpenChange(false);
      navigate({ to: redirectTo });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border bg-card">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            Vos publications sont prêtes.
          </DialogTitle>
          <DialogDescription>
            Créez votre compte gratuitement pour sauvegarder vos contenus et
            programmer vos publications.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="trial-email">Email</Label>
            <Input
              id="trial-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="trial-pwd">Mot de passe</Label>
            <Input
              id="trial-pwd"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="trial-store">Nom du magasin</Label>
            <Input
              id="trial-store"
              required
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={busy}
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Créer mon compte gratuitement
          </Button>
          <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
            <span>✓ 14 jours gratuits</span>
            <span>✓ Sans CB</span>
            <span>✓ Annulable</span>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
