import { Link } from "@tanstack/react-router";
import { Users, MapPin, CalendarDays } from "lucide-react";
import { Heading, Loading } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { useMietvertraege } from "@/api/hooks";
import { type MietvertragStatus, MIETVERTRAG_STATUS_LABELS } from "@/api/types";
import { formatEuro, formatDatum } from "@/format";
import { ContractEditor } from "./properties";
export function Tenants({ status }: { status: MietvertragStatus }) {
  const result = useMietvertraege(status);
  return (
    <>
      <Heading
        title="Meine Mieter"
        subtitle="Menschen, Verträge und Mietzahlungen im Überblick."
        action={<ContractEditor onSaved={result.reload} />}
      />
      <div className="toolbar">
        <div className="tabs">
          {Object.entries(MIETVERTRAG_STATUS_LABELS).map(([v, l]) => (
            <Button
              key={v}
              asChild
              variant="ghost"
              className={status === v ? "selected" : ""}
            >
              <Link to="/mieter" search={{ status: v as MietvertragStatus }}>
                {l}
              </Link>
            </Button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          {result.data?.length ?? 0} Mietverträge
        </span>
      </div>
      <Loading result={result}>
        <div className="property-grid">
          {(result.data ?? []).map((c) => (
            <div className="tenant-card" key={c.id} data-color={c.farbe}>
              <div className="flex items-center gap-3 mb-5">
                <span className="w-10 h-10 grid place-items-center bg-secondary rounded-full text-primary">
                  <Users size={20} />
                </span>
                <div>
                  <h2 className="font-semibold">
                    {c.mieter.vorname} {c.mieter.nachname}
                  </h2>
                  <div className="text-xs text-muted-foreground mt-1 flex gap-2 items-center">
                    <span className="identity-dot" />
                    {c.mietobjekt_name}
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-5">
                {c.einheit_name} · {formatDatum(c.beginn)} –{" "}
                {c.ende ? formatDatum(c.ende) : "Unbefristet"}
              </p>
              <dl className="property-stats">
                {[
                  ["Kaltmiete", c.kaltmiete],
                  ["Nebenkosten", c.nebenkosten],
                  ["Kaution", c.kaution],
                  ["Einnahmen seit Beginn", c.einnahmen_seit_beginn],
                  ["Kosten seit Beginn", c.kosten_seit_beginn],
                ].map(([l, v]) => (
                  <div key={l}>
                    <dt>{l}</dt>
                    <dd>{formatEuro(v ?? null, 2)}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-6">
                <ContractEditor contract={c} onSaved={result.reload} />
              </div>
            </div>
          ))}
        </div>
        {!result.data?.length && (
          <div className="empty-state">
            Keine Mietverträge in diesem Zeitraum.
          </div>
        )}
      </Loading>
    </>
  );
}
