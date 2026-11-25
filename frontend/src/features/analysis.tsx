import { useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Heading, Loading, DataTable } from "@/components/shared";
import { useMietobjekte, useDeckungsbeitrag, useAnlageV } from "@/api/hooks";
import { formatEuro as euro } from "@/format";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
export function Analysis({ tax = false }: { tax?: boolean }) {
  const objects = useMietobjekte();
  const [id, setId] = useState(1),
    [year, setYear] = useState(2026),
    [month, setMonth] = useState(0);
  return (
    <>
      <Heading
        title={tax ? "Auswertung Anlage V" : "Objekt Deckungsbeitrag"}
        subtitle={
          tax
            ? "Einnahmen und Werbungskosten für Ihre Steuererklärung."
            : "Erträge und Aufwendungen Ihres Mietobjekts."
        }
        action={
          tax ? (
            <Button variant="outline" onClick={() => window.print()}>
              <Printer />
              Drucken
            </Button>
          ) : null
        }
      />
      <div className="toolbar justify-start">
        <select
          aria-label="Mietobjekt"
          className="field-input !w-auto"
          value={id}
          onChange={(e) => setId(Number(e.target.value))}
        >
          {(objects.data ?? []).map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Jahr"
          className="field-input !w-auto"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
        >
          {[2027, 2026, 2025, 2024, 2023, 2022].map((y) => (
            <option key={y}>{y}</option>
          ))}
        </select>
        {!tax && (
          <select
            aria-label="Monat"
            className="field-input !w-auto"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            <option value={0}>Ganzes Jahr</option>
            {[
              "Januar",
              "Februar",
              "März",
              "April",
              "Mai",
              "Juni",
              "Juli",
              "August",
              "September",
              "Oktober",
              "November",
              "Dezember",
            ].map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        )}
      </div>
      {tax ? (
        <TaxResult id={id} year={year} />
      ) : (
        <Contribution id={id} year={year} month={month} />
      )}
    </>
  );
}
function Contribution({
  id,
  year,
  month,
}: {
  id: number;
  year: number;
  month: number;
}) {
  const result = useDeckungsbeitrag(id, year, month || undefined),
    r = result.data;
  return (
    <Loading result={result}>
      {r && (
        <>
          <div className="summary-grid">
            {[
              ["Einnahmen", r.einnahmen_summe],
              ["Ausgaben", r.ausgaben_summe],
              ["Ergebnis", r.ergebnis],
            ].map(([l, v], i) => (
              <div className="summary-item" key={l}>
                <div className="summary-label">{l}</div>
                <div
                  className={`summary-value ${i === 2 ? "text-positive" : ""}`}
                >
                  {euro(v ?? null, 2)}
                </div>
              </div>
            ))}
          </div>
          <section className="section">
            <h2>Einnahmen</h2>
            <DataTable
              columns={["Mieter", "Betrag"]}
              rows={[
                ...r.einnahmen.map((x) => [x.label, euro(x.betrag, 2)]),
                [
                  <strong>Summe Einnahmen</strong>,
                  <strong>{euro(r.einnahmen_summe, 2)}</strong>,
                ],
              ]}
            />
          </section>
          <section className="section">
            <h2>Ausgaben nach Kostenart</h2>
            {r.ausgaben.length ? (
              <div className="grid md:grid-cols-2 gap-8">
                <DataTable
                  columns={["Kostenart", "Betrag"]}
                  rows={[
                    ...r.ausgaben.map((x) => [x.kostenart, euro(x.betrag, 2)]),
                    [
                      <strong>Summe Ausgaben</strong>,
                      <strong>{euro(r.ausgaben_summe, 2)}</strong>,
                    ],
                  ]}
                />
                <div className="chart-box">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={r.ausgaben.map((x) => ({
                          name: x.kostenart,
                          value: Number(x.betrag),
                        }))}
                        dataKey="value"
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={4}
                      >
                        {r.ausgaben.map((_, i) => (
                          <Cell
                            key={i}
                            fill={
                              [
                                "var(--primary)",
                                "var(--identity-blue)",
                                "var(--identity-orange)",
                                "var(--identity-teal)",
                              ][i % 4]
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => euro(String(v), 2)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="empty-state">Keine Ausgaben im Zeitraum.</div>
            )}
          </section>
        </>
      )}
    </Loading>
  );
}
function TaxResult({ id, year }: { id: number; year: number }) {
  const result = useAnlageV(id, year),
    r = result.data;
  return (
    <Loading result={result}>
      {r && (
        <>
          <section className="section">
            <div className="eyebrow text-muted-foreground mb-2">
              ANLAGE V · {year}
            </div>
            <h2>I. Einnahmen</h2>
            <DataTable
              columns={[
                "Mieter",
                "Zahlungen",
                "Kaltmiete",
                "Nebenkosten",
                "Gesamt",
              ]}
              rows={[
                ...r.einnahmen.map((x) => [
                  x.label,
                  String(x.anzahl_zahlungen),
                  euro(x.kaltmiete, 2),
                  euro(x.nebenkosten, 2),
                  euro(x.gesamt, 2),
                ]),
                [
                  <strong>Summe</strong>,
                  "",
                  euro(r.kaltmiete_summe, 2),
                  euro(r.nebenkosten_summe, 2),
                  euro(r.einnahmen_summe, 2),
                ],
              ]}
            />
          </section>
          <section className="section">
            <h2>II. Werbungskosten</h2>
            <DataTable
              columns={["Aufwendungen", "Betrag"]}
              rows={[
                ["Schuldzinsen", r.schuldzinsen],
                ["Instandhaltung", r.instandhaltung],
                ["Sonstige Aufwendungen", r.sonstige],
                ["Abschreibungen", r.abschreibungen],
                ["Summe Werbungskosten", r.werbungskosten_summe],
              ].map(([l, v]) => [l, euro(v ?? null, 2)])}
            />
          </section>
          <div className="summary-grid">
            <div className="summary-item">
              <div className="summary-label">Überschuss</div>
              <div className="summary-value text-positive">
                {euro(r.ueberschuss, 2)}
              </div>
            </div>
          </div>
        </>
      )}
    </Loading>
  );
}
