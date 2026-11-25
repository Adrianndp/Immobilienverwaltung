import { useState, useRef } from "react";
import { Upload, Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Heading,
  Loading,
  DataTable,
  Editor,
  ConfirmDelete,
} from "@/components/shared";
import * as api from "@/api/hooks";
import { type Buchung } from "@/api/types";
import { formatEuro as euro, formatDatum, dezimal } from "@/format";
import { toast } from "sonner";
// One row of the assignment form: target is "mietvertrag:<id>",
// "rechnung:<id>" or "darlehen:<id>".
type ZuordnungZeile = {
  target: string;
  betrag: string;
  ist_sondertilgung: boolean;
};
function Assignment({
  booking,
  onSaved,
}: {
  booking: Buchung;
  onSaved: () => void;
}) {
  const tenants = api.useMietvertraege(),
    invoices = api.useRechnungen(),
    loans = api.useDarlehen(),
    save = api.useZuordnenBuchung();
  const positive = Number(booking.betrag) > 0;
  const options = positive
    ? Object.fromEntries(
        (tenants.data ?? []).map((m) => [
          "mietvertrag:" + m.id,
          `${m.mieter.vorname} ${m.mieter.nachname} · ${m.einheit_name}`,
        ]),
      )
    : Object.fromEntries([
        ...(invoices.data ?? [])
          .filter(
            (r) =>
              Number(r.offener_betrag) > 0 ||
              booking.zuordnungen.some((z) => z.rechnung === r.id),
          )
          .map((r) => [
            "rechnung:" + r.id,
            `${r.rechnungsnummer} · ${r.lieferant_name}`,
          ]),
        ...(loans.data ?? []).map((l) => [
          "darlehen:" + l.id,
          l.bank + " · Darlehen",
        ]),
      ]);
  return (
    <Editor
      title="Buchung zuordnen"
      fields={[]}
      initial={{
        rows: booking.zuordnungen.map((z) => ({
          target: z.mietvertrag
            ? "mietvertrag:" + z.mietvertrag
            : z.rechnung
              ? "rechnung:" + z.rechnung
              : "darlehen:" + z.darlehen,
          betrag: z.betrag.replace(".", ","),
          ist_sondertilgung: z.ist_sondertilgung,
        })),
      }}
      prepare={(d) =>
        d["rows"].map((r: ZuordnungZeile) => {
          const [type, id] = r.target.split(":");
          return {
            betrag: dezimal(r.betrag),
            mietvertrag: type === "mietvertrag" ? Number(id) : null,
            rechnung: type === "rechnung" ? Number(id) : null,
            darlehen: type === "darlehen" ? Number(id) : null,
            ist_sondertilgung:
              type === "darlehen" && Boolean(r.ist_sondertilgung),
          };
        })
      }
      save={(d) => save(booking.id, d)}
      onSaved={onSaved}
      trigger={<Button variant="outline">Zuordnen</Button>}
      extra={(d, set) => {
        const rows: ZuordnungZeile[] = d["rows"] ?? [];
        const rest =
          Math.abs(Number(booking.betrag)) -
          rows.reduce((s, r) => s + Number(dezimal(r.betrag)), 0);
        return (
          <>
            <div className="mb-5">
              <strong>{booking.kontoinhaber}</strong>
              <p className="text-xs text-muted-foreground mt-2">
                {booking.buchungstext}
              </p>
              <p className="text-xl mt-3 font-semibold">
                {euro(booking.betrag, 2)}
              </p>
            </div>
            {rows.map((r, i) => (
              <div className="border rounded-md p-3 mb-3" key={i}>
                <div className="flex gap-2">
                  <select
                    className="field-input"
                    required
                    value={r.target}
                    onChange={(e) =>
                      set({
                        ...d,
                        rows: rows.map((x, j) =>
                          i === j ? { ...x, target: e.target.value } : x,
                        ),
                      })
                    }
                  >
                    <option value="">Empfänger auswählen</option>
                    {Object.entries(options).map(([v, l]) => (
                      <option value={v} key={v}>
                        {String(l)}
                      </option>
                    ))}
                  </select>
                  <input
                    aria-label="Zuordnungsbetrag"
                    required
                    className="field-input !w-28"
                    value={r.betrag}
                    onChange={(e) =>
                      set({
                        ...d,
                        rows: rows.map((x, j) =>
                          i === j ? { ...x, betrag: e.target.value } : x,
                        ),
                      })
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      set({
                        ...d,
                        rows: rows.filter((_, j) => j !== i),
                      })
                    }
                  >
                    ×
                  </Button>
                </div>
                {r.target.startsWith("darlehen:") && (
                  <label className="text-xs flex gap-2 items-center mt-3">
                    <input
                      type="checkbox"
                      checked={Boolean(r.ist_sondertilgung)}
                      onChange={(e) =>
                        set({
                          ...d,
                          rows: rows.map((x, j) =>
                            i === j
                              ? { ...x, ist_sondertilgung: e.target.checked }
                              : x,
                          ),
                        })
                      }
                    />
                    Sondertilgung
                  </label>
                )}
              </div>
            ))}
            <Button
              variant="outline"
              type="button"
              onClick={() =>
                set({
                  ...d,
                  rows: [
                    ...rows,
                    {
                      target: "",
                      betrag: rest.toFixed(2).replace(".", ","),
                      ist_sondertilgung: false,
                    },
                  ],
                })
              }
            >
              <Plus />
              Zuordnung hinzufügen
            </Button>
            <p
              className={`mt-5 font-semibold ${rest < 0 ? "text-negative" : "text-positive"}`}
            >
              Noch nicht zugeordnet: {euro(String(rest), 2)}
            </p>
          </>
        );
      }}
    />
  );
}
export function Account() {
  const result = api.useBuchungen(),
    upload = api.useImportBuchungen(),
    removeAll = api.useAlleBuchungenLoeschen();
  const [onlyOpen, setOnlyOpen] = useState(false),
    [search, setSearch] = useState(""),
    [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const rows = (result.data ?? []).filter(
    (b) =>
      (!onlyOpen || Number(b.nicht_zugeordnet) > 0) &&
      (b.buchungstext + " " + b.kontoinhaber)
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <Heading
        title="Konto"
        subtitle="Ihre Bankbewegungen, übersichtlich zugeordnet."
        action={
          <>
            <input
              ref={input}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setBusy(true);
                try {
                  const r = await upload(file);
                  toast.success(
                    `${r.importiert} importiert, ${r.uebersprungen} übersprungen`,
                  );
                  result.reload();
                } catch (e) {
                  toast.error(
                    e instanceof Error ? e.message : "Import fehlgeschlagen",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            />
            <Button disabled={busy} onClick={() => input.current?.click()}>
              <Upload />
              {busy ? "Wird importiert …" : "CSV importieren"}
            </Button>
          </>
        }
      />
      <div className="summary-grid">
        {[
          [
            "Einnahmen",
            String(
              (result.data ?? [])
                .filter((b) => Number(b.betrag) > 0)
                .reduce((s, b) => s + Number(b.betrag), 0),
            ),
          ],
          [
            "Ausgaben",
            String(
              (result.data ?? [])
                .filter((b) => Number(b.betrag) < 0)
                .reduce((s, b) => s + Number(b.betrag), 0),
            ),
          ],
          [
            "Nicht zugeordnet",
            String(
              (result.data ?? []).reduce(
                (s, b) => s + Number(b.nicht_zugeordnet),
                0,
              ),
            ),
          ],
        ].map(([l, v], i) => (
          <div className="summary-item" key={l}>
            <div className="summary-label">{l}</div>
            <div
              className={`summary-value ${i === 0 ? "text-positive" : i === 1 ? "text-negative" : ""}`}
            >
              {euro(v ?? null, 2)}
            </div>
          </div>
        ))}
      </div>
      <div className="toolbar">
        <div className="searchbox">
          <Search />
          <input
            className="field-input"
            placeholder="Buchungen suchen …"
            aria-label="Buchungen suchen"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-4 items-center">
          <label className="text-xs flex gap-2 items-center">
            <input
              type="checkbox"
              checked={onlyOpen}
              onChange={(e) => setOnlyOpen(e.target.checked)}
            />
            Nur offene Buchungen
          </label>
          <ConfirmDelete
            label="Alle Buchungen löschen"
            onDelete={async () => {
              await removeAll();
              result.reload();
            }}
          />
        </div>
      </div>
      <Loading result={result}>
        {!rows.length ? (
          <div className="empty-state">
            {onlyOpen
              ? "Alle Buchungen sind vollständig zugeordnet."
              : "Noch keine Buchungen."}
          </div>
        ) : (
          <DataTable
            columns={[
              "Buchungstag",
              "Wertstellung",
              "Kontoinhaber / Buchungstext",
              "Buchungsart",
              "Betrag",
              "Mieter / Lieferant",
              "Rechnung",
              "Status",
              "",
            ]}
            rows={rows.map((b) => [
              formatDatum(b.buchungstag),
              formatDatum(b.wertstellung),
              <div>
                <strong>{b.kontoinhaber}</strong>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {b.buchungstext}
                </p>
              </div>,
              b.buchungsart,
              <strong
                className={
                  Number(b.betrag) > 0 ? "text-positive" : "text-negative"
                }
              >
                {euro(b.betrag, 2)}
              </strong>,
              b.partner || "–",
              b.rechnungen || "–",
              <span
                className={`status-badge ${Number(b.nicht_zugeordnet) === 0 ? "" : Number(b.nicht_zugeordnet) < Math.abs(Number(b.betrag)) ? "partial" : "open"}`}
              >
                {Number(b.nicht_zugeordnet) === 0
                  ? "Zugeordnet"
                  : euro(b.nicht_zugeordnet, 2) + " offen"}
              </span>,
              <Assignment booking={b} onSaved={result.reload} />,
            ])}
          />
        )}
      </Loading>
    </>
  );
}
