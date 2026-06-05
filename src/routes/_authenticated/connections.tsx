import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Facebook, Instagram, Link2, Unlink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/connections")({
  component: ConnectionsPage,
});

function ConnectionsPage() {
  const [mockModalOpen, setMockModalOpen] = useState(false);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Connexions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connectez vos comptes sociaux pour programmer et publier vos contenus.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Facebook */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1877F2]/10 text-[#1877F2]">
              <Facebook className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base">Facebook</CardTitle>
              <p className="text-xs text-muted-foreground">Page professionnelle</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              <Unlink className="h-3 w-3" />
              Non connecté
            </span>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Connectez votre page Facebook pour programmer des publications directement depuis Komaag.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setMockModalOpen(true)}
            >
              <Link2 className="h-4 w-4 mr-2" />
              Connecter Meta
            </Button>
          </CardContent>
        </Card>

        {/* Instagram */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-white">
              <Instagram className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base">Instagram</CardTitle>
              <p className="text-xs text-muted-foreground">Compte professionnel</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              <Unlink className="h-3 w-3" />
              Non connecté
            </span>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Connectez votre compte Instagram professionnel pour publier des posts et des stories.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setMockModalOpen(true)}
            >
              <Link2 className="h-4 w-4 mr-2" />
              Connecter Meta
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Mock modal */}
      <Dialog open={mockModalOpen} onOpenChange={setMockModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connexion Meta — Bientôt disponible</DialogTitle>
            <DialogDescription>
              L'intégration avec Facebook et Instagram arrive prochainement.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              Cette fonctionnalité vous permettra de :
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Connecter votre page Facebook et votre compte Instagram professionnel</li>
              <li>Programmer des publications depuis le calendrier Komaag</li>
              <li>Publier automatiquement vos contenus générés par IA</li>
            </ul>
            <p className="pt-2">
              Restez à l'écoute, cette fonctionnalité sera activée dans une prochaine mise à jour.
            </p>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setMockModalOpen(false)}>J'ai compris</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
