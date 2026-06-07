import { Link } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function PremiumLimitModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            🎉 Félicitations&nbsp;!
          </DialogTitle>
          <DialogDescription className="text-base text-foreground/80">
            Vous avez utilisé vos 3 publications offertes.
            <br />
            <br />
            Passez à une offre Komaag pour continuer à créer et programmer
            vos contenus.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            asChild
          >
            <a href="mailto:contact@komaag.com">Nous contacter</a>
          </Button>
          <Button variant="brand" asChild>
            <Link to="/pricing" onClick={() => onOpenChange(false)}>
              Voir les offres
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
