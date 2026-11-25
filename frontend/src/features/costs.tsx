import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Plus, Search, ArrowLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Heading,
  Loading,
  Editor,
  DataTable,
  ConfirmDelete,
  type Field,
} from "@/components/shared";
import * as api from "@/api/hooks";
import { KATEGORIE_LABELS, type Lieferant, type Rechnung } from "@/api/types";
import {
  formatEuro as euro,
  formatDatum,
  formatProzent,
  dezimal,
  lieferantName,
} from "@/format";
export function Invoices() {
  const result = api.useRechnungen(),
    vendors = api.useLieferanten(),
    categories = api.useKostenarten(),
    objects = api.useMietobjekte();
  const create = api.useCreateRechnung(),
    remove = api.useDeleteRechnung();
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState("alle");
  const rows = (result.data ?? []).filter(
    (r) =>
      (r.name + " " + r.lieferant_name + " " + r.rechnungsnummer)
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (status === "alle" ||
        (status === "offen"
          ? Number(r.offener_betrag) > 0
          : Number(r.offener_betrag) === 0)),
  );
  return (
    <>
      <Heading
        title="Rechnungen"
        subtitle="Alle Ausgaben und offenen Rechnungen im Blick."
        action={
          <Editor
            title="Rechnung anlegen"
            fields={[
              { key: "name", label: "Bezeichnung", required: true },
              {
                key: "rechnungsnummer",
                label: "Rechnungsnummer",
                required: true,
              },
              {
                key: "lieferant",
                label: "Lieferant",
                options: Object.fromEntries(
                  (vendors.data ?? []).map((v) => [v.id, lieferantName(v)]),
                ),
                required: true,
              },
              {
                key: "kostenart",
                label: "Kostenart",
                options: Object.fromEntries(
                  (categories.data ?? []).map((c) => [c.id, c.name]),
                ),
                required: true,
              },
              {
                key: "datum",
                label: "Rechnungsdatum",
                type: "date",
                required: true,
              },
              { key: "betrag", label: "Betrag (€)", required: true },
            ]}
            initial={{
              datum: "2026-11-25",
              anteile: [{ mietobjekt: 1, prozent: "100" }],
            }}
            prepare={(d) => ({
              ...d,
              lieferant: Number(d["lieferant"]),
              kostenart: Number(d["kostenart"]),
              betrag: dezimal(d["betrag"]),
              anteile: d["anteile"].map((a: any) => ({
                mietobjekt: Number(a.mietobjekt),
                prozent: dezimal(a.prozent),
              })),
            })}
            save={create}
            onSaved={result.reload}
            trigger={
              <Button>
                <Plus />
                Neue Rechnung
              </Button>
            }
            extra={(d, set) => {
              const a = d["anteile"] ?? [];
              const total = a.reduce(
                (s: number, x: any) => s + Number(dezimal(x.prozent)),
                0,
              );
              return (
                <div className="section mt-6">
                  <div className="flex justify-between mb-3">
                    <h3 className="font-semibold">
                      Aufteilung auf Mietobjekte
                    </h3>
                    <span
                      className={
                        total === 100 ? "text-positive" : "text-negative"
                      }
                    >
                      {total.toLocaleString("de-DE")} % / 100 %
                    </span>
                  </div>
                  {a.map((x: any, i: number) => (
                    <div className="flex gap-2 mb-2" key={i}>
                      <select
                        className="field-input"
                        value={x.mietobjekt}
                        onChange={(e) =>
                          set({
                            ...d,
                            anteile: a.map((r: any, j: number) =>
                              i === j
                                ? { ...r, mietobjekt: e.target.value }
                                : r,
                            ),
                          })
                        }
                      >
                        {(objects.data ?? []).map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name}
                          </option>
                        ))}
                      </select>
                      <input
                        aria-label={"Anteil " + (i + 1)}
                        className="field-input !w-24"
                        value={x.prozent}
                        onChange={(e) =>
                          set({
                            ...d,
                            anteile: a.map((r: any, j: number) =>
                              i === j ? { ...r, prozent: e.target.value } : r,
                            ),
                          })
                        }
                      />
                      <Button
                        variant="ghost"
                        type="button"
                        onClick={() =>
                          set({
                            ...d,
                            anteile: a.filter(
                              (_: unknown, j: number) => j !== i,
                            ),
                          })
                        }
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() =>
                        set({
                          ...d,
                          anteile: [
                            ...a,
                            {
                              mietobjekt:
                                (objects.data ?? []).find(
                                  (o) =>
                                    !a.some(
                                      (x: any) => Number(x.mietobjekt) === o.id,
                                    ),
                                )?.id ?? 1,
                              prozent: "0",
                            },
                          ],
                        })
                      }
                    >
                      <Plus />
                      Objekt hinzufügen
                    </Button>
                    <Button
                      variant="ghost"
                      type="button"
                      onClick={() =>
                        set({
                          ...d,
                          anteile: a.map((x: any, i: number) => ({
                            ...x,
                            prozent: (i === a.length - 1
                              ? 100 -
                                (Math.floor((100 / a.length) * 100) / 100) *
                                  (a.length - 1)
                              : Math.floor((100 / a.length) * 100) / 100
                            )
                              .toFixed(2)
                              .replace(".", ","),
                          })),
                        })
                      }
                    >
                      Gleichmäßig aufteilen
                    </Button>
                  </div>
                </div>
              );
            }}
          />
        }
      />
      <div className="summary-grid">
        {[
          [
            "Rechnungsvolumen",
            String(
              (result.data ?? []).reduce((s, r) => s + Number(r.betrag), 0),
            ),
          ],
          [
            "Offene Beträge",
            String(
              (result.data ?? []).reduce(
                (s, r) => s + Number(r.offener_betrag),
                0,
              ),
            ),
          ],
          ["Rechnungen", String(result.data?.length ?? 0)],
        ].map(([l, v], i) => (
          <div className="summary-item" key={l}>
            <div className="summary-label">{l}</div>
            <div className="summary-value">{i === 2 ? v : euro(v ?? null)}</div>
          </div>
        ))}
      </div>
      <div className="toolbar">
        <div className="searchbox">
          <Search />
          <input
            className="field-input"
            placeholder="Rechnungen suchen …"
            aria-label="Rechnungen suchen"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="field-input !w-auto"
          aria-label="Rechnungsstatus"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="alle">Alle Rechnungen</option>
          <option value="offen">Offen</option>
          <option value="bezahlt">Bezahlt</option>
        </select>
      </div>
      <Loading result={result}>
        <InvoiceTable
          rows={rows}
          onDelete={async (id) => {
            await remove(id);
            result.reload();
          }}
        />
      </Loading>
    </>
  );
}
function InvoiceTable({
  rows,
  onDelete,
}: {
  rows: Rechnung[];
  onDelete: (id: number) => Promise<void>;
}) {
  return (
    <DataTable
      columns={[
        "Datum",
        "Rechnung",
        "Lieferant",
        "Kostenart",
        "Betrag",
        "Mietobjekte",
        "Offener Betrag",
        "Status",
        "",
      ]}
      rows={rows.map((r) => [
        formatDatum(r.datum),
        <div>
          <strong>{r.name}</strong>
          <div className="text-[10px] text-muted-foreground mt-1">
            {r.rechnungsnummer}
          </div>
        </div>,
        r.lieferant_name,
        r.kostenart_name,
        <div className="money">{euro(r.betrag, 2)}</div>,
        <div className="flex flex-col gap-1">
          {r.anteile.map((a) => (
            <span key={a.mietobjekt} className="text-[10px]">
              {a.mietobjekt_name} · {formatProzent(a.prozent)}
            </span>
          ))}
        </div>,
        euro(r.offener_betrag, 2),
        <span
          className={`status-badge ${Number(r.offener_betrag) === 0 ? "" : Number(r.offener_betrag) < Number(r.betrag) ? "partial" : "open"}`}
        >
          {Number(r.offener_betrag) === 0
            ? "Bezahlt"
            : Number(r.offener_betrag) < Number(r.betrag)
              ? "Teilweise"
              : "Offen"}
        </span>,
        <ConfirmDelete
          label="Rechnung löschen"
          onDelete={() => onDelete(r.id)}
        />,
      ])}
    />
  );
}
export function Categories() {
  const result = api.useKostenarten(),
    create = api.useCreateKostenart();
  return (
    <>
      <Heading
        title="Kostenarten"
        subtitle="Aufwendungen strukturiert und steuerlich richtig zuordnen."
        action={
          <Editor
            title="Kostenart anlegen"
            fields={[
              { key: "name", label: "Name", required: true },
              {
                key: "kategorie",
                label: "Kategorie (Anlage V)",
                options: KATEGORIE_LABELS,
                required: true,
              },
            ]}
            initial={{ kategorie: "SONSTIGE", abschreibung_prozent: "" }}
            prepare={(d) => ({
              ...d,
              abschreibung_prozent:
                d["kategorie"] === "ABSCHREIBUNG"
                  ? dezimal(d["abschreibung_prozent"])
                  : null,
            })}
            save={create}
            onSaved={result.reload}
            trigger={
              <Button>
                <Plus />
                Neue Kostenart
              </Button>
            }
            extra={(d, set) =>
              d["kategorie"] === "ABSCHREIBUNG" ? (
                <label className="block text-xs mt-5">
                  Abschreibung (%)
                  <input
                    className="field-input mt-2"
                    required
                    value={d["abschreibung_prozent"]}
                    onChange={(e) =>
                      set({ ...d, abschreibung_prozent: e.target.value })
                    }
                  />
                </label>
              ) : null
            }
          />
        }
      />
      <Loading result={result}>
        <DataTable
          columns={["Name", "Kategorie (Anlage V)", "Abschreibung"]}
          rows={(result.data ?? []).map((c) => [
            <strong>{c.name}</strong>,
            c.kategorie_label,
            c.abschreibung_prozent
              ? formatProzent(c.abschreibung_prozent)
              : "–",
          ])}
        />
      </Loading>
    </>
  );
}
const vendorFields: Field[] = [
  { key: "firmenname", label: "Firmenname" },
  { key: "vorname", label: "Vorname" },
  { key: "nachname", label: "Nachname" },
  { key: "strasse", label: "Straße" },
  { key: "hausnummer", label: "Hausnummer" },
  { key: "plz", label: "Postleitzahl" },
  { key: "ort", label: "Ort" },
  { key: "land", label: "Land" },
  { key: "email", label: "E-Mail", type: "email" },
  { key: "telefon", label: "Telefon" },
];
function VendorEditor({
  vendor,
  onSaved,
}: {
  vendor?: Lieferant;
  onSaved: () => void;
}) {
  const create = api.useCreateLieferant(),
    update = api.useUpdateLieferant();
  return (
    <Editor
      title={vendor ? "Lieferant bearbeiten" : "Lieferant anlegen"}
      fields={vendorFields}
      initial={
        vendor ??
        Object.fromEntries(
          vendorFields.map((f) => [f.key, f.key === "land" ? "DE" : ""]),
        )
      }
      save={(d) => (vendor ? update(vendor.id, d) : create(d))}
      onSaved={onSaved}
      trigger={
        <Button>
          {vendor ? <Pencil /> : <Plus />}
          {vendor ? "Bearbeiten" : "Neuer Lieferant"}
        </Button>
      }
    />
  );
}
export function Vendors() {
  const result = api.useLieferanten();
  return (
    <>
      <Heading
        title="Lieferanten"
        subtitle="Ihre Ansprechpartner rund um die Immobilie."
        action={<VendorEditor onSaved={result.reload} />}
      />
      <Loading result={result}>
        <DataTable
          columns={["Lieferant", "Adresse", "E-Mail", "Telefon", ""]}
          rows={(result.data ?? []).map((v) => [
            <Link
              className="font-semibold"
              to="/kosten/lieferanten/$id"
              params={{ id: String(v.id) }}
            >
              {lieferantName(v)}
            </Link>,
            `${v.strasse} ${v.hausnummer}, ${v.plz} ${v.ort}`,
            v.email,
            v.telefon,
            <Button variant="ghost" asChild>
              <Link to="/kosten/lieferanten/$id" params={{ id: String(v.id) }}>
                Details →
              </Link>
            </Button>,
          ])}
        />
      </Loading>
    </>
  );
}
export function VendorDetail({ id }: { id: number }) {
  const result = api.useLieferant(id),
    invoices = api.useRechnungen(id),
    remove = api.useDeleteRechnung();
  const vendor = result.data;
  if (!vendor) return <Loading result={result}>{null}</Loading>;
  const years: Record<string, number> = {};
  for (const r of invoices.data ?? []) {
    const y = r.datum.slice(0, 4);
    years[y] = (years[y] ?? 0) + Number(r.betrag);
  }
  return (
    <>
      <Button variant="ghost" asChild className="mb-4">
        <Link to="/kosten/lieferanten">
          <ArrowLeft />
          Alle Lieferanten
        </Link>
      </Button>
      <Heading
        title={lieferantName(vendor)}
        subtitle={`${vendor.strasse} ${vendor.hausnummer} · ${vendor.plz} ${vendor.ort}`}
        action={<VendorEditor vendor={vendor} onSaved={result.reload} />}
      />
      <section className="section">
        <h2>Kontaktdaten</h2>
        <div className="detail-grid">
          {vendorFields.map((f) => (
            <div key={f.key}>
              <p className="text-xs text-muted-foreground">{f.label}</p>
              <p className="text-sm mt-2">{(vendor as any)[f.key] || "–"}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="section">
        <h2>Summe pro Jahr</h2>
        <DataTable
          columns={["Jahr", "Gesamtbetrag"]}
          rows={Object.entries(years).map(([y, n]) => [y, euro(String(n), 2)])}
        />
      </section>
      <section className="section">
        <h2>Rechnungen</h2>
        <InvoiceTable
          rows={invoices.data ?? []}
          onDelete={async (id) => {
            await remove(id);
            invoices.reload();
          }}
        />
      </section>
    </>
  );
}
