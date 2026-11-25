import {
  Outlet,
  Link,
  createRootRoute,
  useRouter,
  HeadContent,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect } from "react";

import { AppShell } from "@/components/app-shell";
import { Toaster } from "@/components/ui/sonner";
import { useLocation } from "@tanstack/react-router";
import { useState } from "react";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          Seite nicht gefunden
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Diese Seite gibt es nicht oder sie wurde verschoben.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Zur Startseite
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Die Seite konnte nicht geladen werden
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Etwas ist schiefgelaufen. Bitte erneut versuchen oder zur Startseite
          zurückkehren.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Erneut versuchen
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Zur Startseite
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  // Per-route titles come from each route's head(); <HeadContent /> in RootComponent renders them.
  head: () => ({ meta: [{ title: "Immobilienverwaltung" }] }),
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootComponent() {
  const pathname = useLocation().pathname;
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    async function start() {
      // Demo data in the browser instead of the Django API; only when VITE_MOCK_API=true.
      if (import.meta.env["VITE_MOCK_API"] === "true") {
        const { worker } = await import("@/mocks/browser");
        await worker.start({ quiet: true });
      }
      if (active) setReady(true);
    }
    start().catch(console.error);
    return () => {
      active = false;
    };
  }, []);
  if (!ready)
    return (
      <div className="login-page">
        <BuildingLoading />
      </div>
    );
  return (
    <>
      <HeadContent />
      {pathname === "/login" ? (
        <Outlet />
      ) : (
        <AppShell>
          <Outlet />
        </AppShell>
      )}
      <Toaster position="bottom-right" />
    </>
  );
}

function BuildingLoading() {
  return (
    <div className="text-primary text-sm">
      Immobilienverwaltung wird geladen …
    </div>
  );
}
