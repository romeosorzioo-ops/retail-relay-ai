import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Connexion — KomTonMag AI" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [signupError, setSignupError] = useState<string | null>(null);

  async function doLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    setLoginError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: String(fd.get("email")),
        password: String(fd.get("password")),
      });
      if (error) {
        const msg =
          error.message === "Invalid login credentials"
            ? "Email ou mot de passe incorrect."
            : error.message;
        setLoginError(msg);
        toast.error(msg);
        return;
      }
      toast.success("Connexion réussie");
      navigate({ to: "/dashboard" });
    } catch (err) {
      const msg = "Connexion impossible pour le moment.";
      setLoginError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function doSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    setSignupError(null);
    try {
      const { error } = await supabase.auth.signUp({
        email: String(fd.get("email")),
        password: String(fd.get("password")),
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: { name: String(fd.get("name")) },
        },
      });
      if (error) {
        const msg =
          error.message === "User already registered"
            ? "Un compte existe déjà avec cet email."
            : error.message;
        setSignupError(msg);
        toast.error(msg);
        return;
      }
      toast.success("Compte créé");
      navigate({ to: "/dashboard" });
    } catch (err) {
      const msg = "Inscription impossible pour le moment.";
      setSignupError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
            K
          </div>
          <span className="font-semibold">KomTonMag AI</span>
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Bienvenue</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Connexion</TabsTrigger>
                <TabsTrigger value="signup">Inscription</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                <form onSubmit={doLogin} className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="login-email">Email</Label>
                    <Input id="login-email" name="email" type="email" required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="login-password">Mot de passe</Label>
                    <Input id="login-password" name="password" type="password" required />
                  </div>
                  {loginError && (
                    <p className="text-sm text-destructive">{loginError}</p>
                  )}
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Connexion…" : "Se connecter"}
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <form onSubmit={doSignup} className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="signup-name">Nom</Label>
                    <Input id="signup-name" name="name" required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input id="signup-email" name="email" type="email" required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="signup-password">Mot de passe</Label>
                    <Input
                      id="signup-password"
                      name="password"
                      type="password"
                      minLength={6}
                      required
                    />
                  </div>
                  {signupError && (
                    <p className="text-sm text-destructive">{signupError}</p>
                  )}
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Création…" : "Créer mon compte"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      <Toaster />
    </div>
  );
}
