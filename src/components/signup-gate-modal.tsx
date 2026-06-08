import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function SignupGateModal({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess?: () => void;
}) {
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
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: { store_name: storeName },
        },
      });
      if (error) throw error;
      toast.success("Compte créé !");
      localStorage.removeItem("komaag-pending-email");
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            Vos publications sont prêtes.
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gate-email">Email</Label>
            <Input
              id="gate-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gate-pwd">Mot de passe</Label>
            <Input
              id="gate-pwd"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gate-store">Nom du magasin</Label>
            <Input
              id="gate-store"
              required
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            variant="brand"
            size="lg"
            className="w-full"
            disabled={busy}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Créer mon compte
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            ✓ 14 jours gratuits · ✓ Sans CB · ✓ Annulable
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
