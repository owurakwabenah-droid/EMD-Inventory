import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Boxes, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useOnline } from "@/hooks/use-online";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in | EMD Inventory" },
      {
        name: "description",
        content: "Sign in to EMD Inventory to manage stock, orders and customers offline-first.",
      },
      { property: "og:title", content: "Sign in | EMD Inventory" },
      {
        property: "og:description",
        content: "Sign in to EMD Inventory to manage stock, orders and customers offline-first.",
      },
    ],
  }),
  component: SignInPage,
});

function SignInPage() {
  const { signIn, session, loading } = useAuth();
  const navigate = useNavigate();
  const online = useOnline();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session) navigate({ to: "/dashboard", replace: true });
  }, [session, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(identifier, password);
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="brand-gradient hidden flex-col justify-between p-12 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2 text-sm font-medium opacity-90">
          <Boxes className="size-5" /> EMD Inventory
        </div>
        <div>
          <h2 className="max-w-sm text-4xl font-semibold leading-tight">
            Stock, orders and customers — even without signal.
          </h2>
          <p className="mt-4 max-w-sm text-sm opacity-80">
            Every change you make offline is queued locally and synced automatically the moment
            the connection returns.
          </p>
        </div>
        <p className="text-xs opacity-60">Secured with Supabase Auth</p>
      </div>

      <div className="flex items-center justify-center px-6 py-16">
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5">
          <div>
            <h1 className="text-2xl font-semibold">Welcome back</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in with your username or email address.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="identifier">Username or email</Label>
            <Input
              id="identifier"
              autoComplete="username"
              placeholder="boison"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {!online ? (
            <p className="text-sm text-muted-foreground">
              You're offline. Reconnect to sign in — an existing session stays available.
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={busy || loading}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null} Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}
