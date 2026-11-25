import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  Building2,
  Users,
  ReceiptText,
  Tags,
  Truck,
  Landmark,
  ChartNoAxesCombined,
  FileText,
  LogOut,
  Menu,
  Sun,
  Moon,
  ChevronRight,
  PanelLeftClose,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBenutzer, useAbmelden } from "@/api/hooks";
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useLocation().pathname;
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const user = useBenutzer();
  // First name if set in Django, otherwise the username; empty while loading.
  const vorname = user.data ? user.data.first_name || user.data.username : "";
  const vollerName = user.data
    ? `${user.data.first_name} ${user.data.last_name}`.trim() ||
      user.data.username
    : "";
  const initialen = vollerName
    .split(/\s+/)
    .map((teil) => teil[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const logout = useAbmelden();
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
  useEffect(() => setOpen(false), [pathname]);
  const nav = [
    { label: "Mietobjekte", to: "/mietobjekte", icon: Building2 },
    { label: "Mieter", to: "/mieter", icon: Users },
    { label: "KOSTEN", section: true },
    { label: "Rechnungen", to: "/kosten/rechnungen", icon: ReceiptText },
    { label: "Kostenarten", to: "/kosten/kostenarten", icon: Tags },
    { label: "Lieferanten", to: "/kosten/lieferanten", icon: Truck },
    { label: "FINANZEN", section: true },
    { label: "Konto", to: "/konto", icon: Landmark },
    { label: "AUSWERTUNG", section: true },
    {
      label: "Deckungsbeitrag",
      to: "/auswertung/deckungsbeitrag",
      icon: ChartNoAxesCombined,
    },
    { label: "Anlage V", to: "/auswertung/anlage-v", icon: FileText },
  ] as const;
  const current = nav.find((n) => "to" in n && pathname.startsWith(n.to));
  return (
    <>
      <aside className={`app-sidebar ${open ? "is-open" : ""}`}>
        <Link to="/mietobjekte" className="brand">
          <span className="brand-icon">
            <Building2 size={21} />
          </span>
          <span>
            Immobilien
            <span className="block text-[10px] font-normal opacity-60 mt-1">
              VERWALTUNG
            </span>
          </span>
        </Link>
        <div className="nav-label">ÜBERSICHT</div>
        <nav>
          {nav.map((n) =>
            "section" in n ? (
              <div className="nav-label" key={n.label}>
                {n.label}
              </div>
            ) : (
              <Link
                key={n.to}
                to={n.to}
                className={`nav-link ${pathname.startsWith(n.to) ? "active" : ""}`}
              >
                <n.icon />
                <span>{n.label}</span>
                {pathname.startsWith(n.to) && (
                  <ChevronRight className="ml-auto" />
                )}
              </Link>
            ),
          )}
        </nav>
        <div className="sidebar-bottom">
          <Button
            variant="ghost"
            className="w-full justify-start opacity-60"
            onClick={async () => {
              await logout();
              window.location.href = "/login";
            }}
          >
            <LogOut />
            Abmelden
          </Button>
          <div className="profile">
            <div className="avatar">{initialen}</div>
            <div>
              <div className="text-xs font-medium">{vollerName}</div>
              <div className="text-[10px] opacity-50 mt-1">
                Privater Vermieter
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="mobile-only ml-auto"
              onClick={() => setOpen(false)}
              aria-label="Menü schließen"
            >
              <PanelLeftClose />
            </Button>
          </div>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="mobile-only"
              aria-label="Menü öffnen"
              onClick={() => setOpen(!open)}
            >
              <Menu />
            </Button>
            <span className="text-xs text-muted-foreground">Portfolio</span>
            <ChevronRight size={13} className="text-muted-foreground" />
            <span className="text-xs font-medium">
              {current?.label ?? "Mietobjekte"}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground hidden sm:block">
              {vorname ? `Hallo, ${vorname}!` : "Hallo!"}
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label={dark ? "Heller Modus" : "Dunkler Modus"}
              title={dark ? "Heller Modus" : "Dunkler Modus"}
              onClick={() => setDark(!dark)}
            >
              {dark ? <Sun /> : <Moon />}
            </Button>
            <span className="h-8 w-8 bg-secondary rounded-full grid place-items-center text-[10px] font-medium">
              {initialen}
            </span>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </>
  );
}
