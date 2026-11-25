import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Building2, Eye, EyeOff, ArrowRight } from "lucide-react";
import { useAnmeldestatus, useAnmelden } from "@/api/hooks";
import { validierungsFehler } from "@/api/client";
import { Button } from "@/components/ui/button";
export function Login({ next }: { next?: string }) {
  const status = useAnmeldestatus(),
    login = useAnmelden(),
    navigate = useNavigate();
  const [username, setUsername] = useState(""),
    [password, setPassword] = useState(""),
    [show, setShow] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  function go() {
    if (next?.startsWith("/") && !next.startsWith("//"))
      window.location.href = next;
    else void navigate({ to: "/mietobjekte" });
  }
  useEffect(() => {
    if (status.data?.angemeldet) go();
  }, [status.data]);
  return (
    <div className="login-page">
      <form
        className="login-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await login({ username, password });
            go();
          } catch (e) {
            setError(
              validierungsFehler(e)?.["detail"] ?? "Anmelden fehlgeschlagen.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <Building2 className="text-primary mb-6" size={38} />
        <h1>Willkommen zurück.</h1>
        <p className="subtitle mb-8">
          Anmelden bei Ihrer Immobilienverwaltung.
        </p>
        <label className="block text-xs mb-5">
          Benutzername
          <input
            className="field-input mt-2"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </label>
        <label className="block text-xs">
          Passwort
          <div className="flex gap-2 mt-2">
            <input
              className="field-input"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={show ? "Passwort verbergen" : "Passwort anzeigen"}
              onClick={() => setShow(!show)}
            >
              {show ? <EyeOff /> : <Eye />}
            </Button>
          </div>
        </label>
        {error && <p className="form-error mt-4">{error}</p>}
        <Button className="w-full mt-7" disabled={busy || status.loading}>
          {busy ? "Wird angemeldet …" : "Anmelden"}
          <ArrowRight />
        </Button>
      </form>
    </div>
  );
}
