import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { loginFn, signupFn } from "@/lib/auth.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Connexion — KomTonMag AI" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const login = useServerFn(loginFn);
  const signup = useServerFn(signupFn);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [signupError, setSignupError] = useState<string | null>(null);

  async function doLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    setLoginError(null);
    try {
      const result = await login({
        data: {
          email: String(fd.get("email")),
          password: String(fd.get("password")),
        },
      });
      if (!result.ok) {
        setLoginError(result.error);
        toast.error(result.error);
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
      const result = await signup({
        data: {
          name: String(fd.get("name")),
          email: String(fd.get("email")),
          password: String(fd.get("password")),
        },
      });
      if (!result.ok) {
        setSignupError(result.error);
        toast.error(result.error);
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
                  <div>
                    <Label htmlFor="le">Email</Label>
                    <Input
                      id="le"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lp">Mot de passe</Label>
                    <Input
                      id="lp"
                      name="password"
                      type="password"
                      required
                      autoComplete="current-password"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Connexion..." : "Se connecter"}
                  </Button>
                  {loginError && (
                    <p
                      role="alert"
                      className="text-sm text-destructive text-center"
                    >
                      {loginError}
                    </p>
                  )}
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <form onSubmit={doSignup} className="space-y-3">
                  <div>
                    <Label htmlFor="sn">Nom</Label>
                    <Input id="sn" name="name" required />
                  </div>
                  <div>
                    <Label htmlFor="se">Email</Label>
                    <Input
                      id="se"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sp">Mot de passe</Label>
                    <Input
                      id="sp"
                      name="password"
                      type="password"
                      required
                      minLength={6}
                      autoComplete="new-password"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Création..." : "Créer mon compte"}
                  </Button>
                  {signupError && (
                    <p
                      role="alert"
                      className="text-sm text-destructive text-center"
                    >
                      {signupError}
                    </p>
                  )}
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
