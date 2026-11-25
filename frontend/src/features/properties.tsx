import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Plus,
  Search,
  ChevronRight,
  MapPin,
  Building2,
  Wallet,
  TrendingUp,
  ArrowUpRight,
  LayoutGrid,
  List,
  SlidersHorizontal,
  ArrowLeft,
  Pencil,
} from "lucide-react";
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
import {
  OBJEKTART_LABELS,
  NUTZUNG_LABELS,
  VERMIETUNG_LABELS,
  FARBE_LABELS,
  WEG_OBJEKTARTEN,
  DARLEHEN_ART_LABELS,
  type Mietobjekt,
  type Mietvertrag,
  type MietvertragInput,
} from "@/api/types";
import {
  formatEuro as euro,
  formatDatum,
  dezimal,
  alsEingabe,
  formatProzent,
} from "@/format";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
// Three stock photos in public/images/, cycled by id. A missing file hides the <img> and the
// tinted placeholder of .property-image shows instead.
const photos = [
  "/images/property-0.webp",
  "/images/property-1.webp",
  "/images/property-2.webp",
];
export const propertyFields: Field[] = [
  { key: "name", label: "Objektname", required: true },
  {
    key: "objektart",
    label: "Objektart",
    options: OBJEKTART_LABELS,
    required: true,
  },
  { key: "strasse", label: "Straße", required: true },
  { key: "hausnummer", label: "Hausnummer", required: true },
  { key: "plz", label: "Postleitzahl", required: true },
  { key: "ort", label: "Ort", required: true },
  { key: "land", label: "Land" },
  { key: "nutzung", label: "Nutzung", options: NUTZUNG_LABELS, required: true },
];
const numberKeys = [
  "kaufpreis",
  "grundschuld",
  "marktwert",
  "wohnflaeche",
  "grundstuecksflaeche",
  "weg_anteil",
  "zimmer",
];
export function PropertyEditor({
  object,
  onSaved,
  addTile = false,
}: {
  object?: Mietobjekt;
  onSaved: () => void;
  addTile?: boolean;
}) {
  const create = api.useCreateMietobjekt(),
    update = api.useUpdateMietobjekt();
  return (
    <Editor
      title={object ? "Mietobjekt bearbeiten" : "Neues Mietobjekt"}
      fields={propertyFields}
      initial={
        object ?? {
          land: "DE",
          nutzung: "VERMIETUNG",
          vermietung: "GANZ",
          farbe: "#1976D2",
        }
      }
      save={(d) => (object ? update(object.id, d) : create(d))}
      onSaved={onSaved}
      prepare={(d) => ({
        ...d,
        vermietung: d["nutzung"] === "EIGEN" ? "" : (d["vermietung"] ?? "GANZ"),
        weg_anteil: WEG_OBJEKTARTEN.includes(d["objektart"])
          ? (d["weg_anteil"] ?? null)
          : null,
        weg_nenner: WEG_OBJEKTARTEN.includes(d["objektart"])
          ? (d["weg_nenner"] ?? null)
          : null,
      })}
      trigger={
        addTile ? (
          <Button variant="ghost" className="add-property w-full">
            <span className="plus-circle">
              <Plus size={20} />
            </span>
            <strong>Neues Mietobjekt hinzufügen</strong>
            <p>Erweitern Sie Ihr Immobilienportfolio</p>
          </Button>
        ) : object ? (
          <Button variant="outline">
            <Pencil />
            Bearbeiten
          </Button>
        ) : (
          <Button>
            <Plus />
            Neues Mietobjekt
          </Button>
        )
      }
      extra={(d, set) => (
        <div className="mt-5">
          {d["nutzung"] === "VERMIETUNG" && (
            <label className="text-xs text-muted-foreground">
              Vermietung
              <select
                className="field-input mt-2"
                value={d["vermietung"] ?? "GANZ"}
                onChange={(e) => set({ ...d, vermietung: e.target.value })}
              >
                {Object.entries(VERMIETUNG_LABELS).map(([v, l]) => (
                  <option value={v} key={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="text-xs text-muted-foreground mt-4 mb-2">
            Objektfarbe
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(FARBE_LABELS).map(([v, l]) => (
              <Button
                key={v}
                type="button"
                size="icon"
                variant="outline"
                data-color={v}
                title={l}
                aria-label={l}
                onClick={() => set({ ...d, farbe: v })}
              >
                <span className="identity-dot" />
                {d["farbe"] === v && <span>✓</span>}
              </Button>
            ))}
          </div>
        </div>
      )}
    />
  );
}
export function Properties() {
  const result = api.useMietobjekte();
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState("alle"),
    [view, setView] = useState("grid");
  const objects = result.data ?? [];
  const filtered = objects.filter(
    (o) =>
      (o.name + " " + o.ort).toLowerCase().includes(search.toLowerCase()) &&
      (filter === "alle" || o.nutzung === filter),
  );
  const sum = (k: "marktwert" | "restschuld" | "erwirtschafteter_betrag") =>
    String(objects.reduce((s, o) => s + Number(o[k] ?? 0), 0));
  return (
    <>
      <Heading
        title="Meine Mietobjekte"
        subtitle="Ihr Portfolio. Alle Werte auf einen Blick."
        action={<PropertyEditor onSaved={result.reload} />}
      />
      <div className="summary-grid">
        <div className="summary-item">
          <div className="summary-label">
            <Building2 size={16} />
            Portfoliowert
          </div>
          <div className="summary-value">{euro(sum("marktwert"))}</div>
          <div className="summary-note">
            {objects.length} Mietobjekte im Bestand
          </div>
        </div>
        <div className="summary-item">
          <div className="summary-label">
            <Wallet size={16} />
            Restschuld gesamt
          </div>
          <div className="summary-value">{euro(sum("restschuld"))}</div>
          <div className="summary-note">Aktueller Stand aller Darlehen</div>
        </div>
        <div className="summary-item">
          <div className="summary-label">
            <TrendingUp size={16} />
            Erwirtschafteter Betrag
          </div>
          <div className="summary-value text-positive">
            {euro(sum("erwirtschafteter_betrag"))}
            <ArrowUpRight className="inline ml-3" size={22} />
          </div>
          <div className="summary-note">In den letzten 12 Monaten</div>
        </div>
      </div>
      <div className="toolbar">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Alle Mietobjekte</h2>
          <span className="text-[10px] bg-secondary text-muted-foreground px-2 py-1 rounded">
            {objects.length}
          </span>
        </div>
        <div className="toolbar-controls">
          <div className="searchbox">
            <Search />
            <input
              className="field-input"
              aria-label="Mietobjekte suchen"
              placeholder="Mietobjekte suchen …"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            aria-label="Nutzung filtern"
            className="field-input !w-auto"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="alle">Alle Objekte</option>
            <option value="VERMIETUNG">Vermietung</option>
            <option value="EIGEN">Eigennutzung</option>
          </select>
          <div className="flex border rounded-md bg-card">
            <Button
              size="icon"
              variant={view === "grid" ? "secondary" : "ghost"}
              title="Kartenansicht"
              aria-label="Kartenansicht"
              onClick={() => setView("grid")}
            >
              <LayoutGrid />
            </Button>
            <Button
              size="icon"
              variant={view === "list" ? "secondary" : "ghost"}
              title="Listenansicht"
              aria-label="Listenansicht"
              onClick={() => setView("list")}
            >
              <List />
            </Button>
          </div>
        </div>
      </div>
      <Loading result={result}>
        {view === "list" ? (
          <DataTable
            columns={[
              "Mietobjekt",
              "Adresse",
              "Marktwert",
              "Restschuld",
              "Erwirtschaftet",
            ]}
            rows={filtered.map((o) => [
              <Link
                to="/mietobjekte/$id"
                params={{ id: String(o.id) }}
                className="font-medium"
              >
                {o.name}
              </Link>,
              `${o.strasse} ${o.hausnummer}, ${o.ort}`,
              euro(o.marktwert),
              euro(o.restschuld),
              euro(o.erwirtschafteter_betrag),
            ])}
          />
        ) : (
          <div className="property-grid">
            {filtered.map((o, i) => (
              <Link
                to="/mietobjekte/$id"
                params={{ id: String(o.id) }}
                key={o.id}
                className="property-card"
                data-color={o.farbe}
              >
                <div className="property-image">
                  {/* Without a photo, or if it fails to load, the tinted .property-image background shows. */}
                  {o.bild && (
                    <img
                      src={o.bild}
                      alt={o.name}
                      onError={(e) => {
                        e.currentTarget.hidden = true;
                      }}
                    />
                  )}
                  <span className="property-tag">
                    {OBJEKTART_LABELS[o.objektart]}
                  </span>
                </div>
                <div className="property-body">
                  <div className="property-title">
                    <span className="flex items-center gap-2">
                      <span className="identity-dot" />
                      {o.name}
                    </span>
                    <ChevronRight size={17} className="text-muted-foreground" />
                  </div>
                  <div className="property-address">
                    <MapPin size={12} />
                    {o.strasse} {o.hausnummer}, {o.plz} {o.ort}
                  </div>
                  <dl className="property-stats">
                    <div>
                      <dt>Kaufdatum</dt>
                      <dd>{formatDatum(o.kaufdatum)}</dd>
                    </div>
                    <div>
                      <dt>Kaufpreis</dt>
                      <dd>{euro(o.kaufpreis)}</dd>
                    </div>
                    <div>
                      <dt>Marktwert</dt>
                      <dd>{euro(o.marktwert)}</dd>
                    </div>
                    <div>
                      <dt>Grundschuld</dt>
                      <dd>{euro(o.grundschuld)}</dd>
                    </div>
                    <div>
                      <dt>Restschuld</dt>
                      <dd>{euro(o.restschuld)}</dd>
                    </div>
                    <div>
                      <dt>Nutzung</dt>
                      <dd>{NUTZUNG_LABELS[o.nutzung]}</dd>
                    </div>
                  </dl>
                  <div className="property-result">
                    <span>Erwirtschaftet · 12 Monate</span>
                    <strong
                      className={
                        Number(o.erwirtschafteter_betrag) < 0
                          ? "!text-negative"
                          : ""
                      }
                    >
                      {o.erwirtschafteter_betrag === null
                        ? "Eigennutzung"
                        : euro(o.erwirtschafteter_betrag)}
                      <ArrowUpRight size={15} className="inline ml-1" />
                    </strong>
                  </div>
                </div>
              </Link>
            ))}
            <PropertyEditor onSaved={result.reload} addTile />
          </div>
        )}
      </Loading>
      <div className="mt-7 flex items-center gap-2 text-[11px] text-muted-foreground">
        <span className="identity-dot" data-color="#2E7D32" />
        Alle Beträge in Euro · Erwirtschafteter Betrag der letzten 12 Monate
      </div>
    </>
  );
}
const tenantFields: Field[] = [
  { key: "vorname", label: "Vorname", required: true },
  { key: "nachname", label: "Nachname", required: true },
  { key: "strasse", label: "Straße" },
  { key: "hausnummer", label: "Hausnummer" },
  { key: "plz", label: "Postleitzahl" },
  { key: "ort", label: "Ort" },
  { key: "land", label: "Land" },
  { key: "telefon", label: "Telefon" },
  { key: "email", label: "E-Mail", type: "email" },
  { key: "geburtsdatum", label: "Geburtsdatum", type: "date" },
  { key: "kontoinhaber", label: "Kontoinhaber" },
  { key: "iban", label: "IBAN" },
];
export function ContractEditor({
  contract,
  unit,
  onSaved,
}: {
  contract?: Mietvertrag;
  unit?: number;
  onSaved: () => void;
}) {
  const units = api.useEinheiten();
  const create = api.useCreateMietvertrag(),
    update = api.useUpdateMietvertrag();
  const initial = contract
    ? {
        ...contract,
        ...contract.mieter,
        kaltmiete: alsEingabe(contract.kaltmiete),
        nebenkosten: alsEingabe(contract.nebenkosten),
        kaution: alsEingabe(contract.kaution),
      }
    : {
        land: "DE",
        einheit: unit ?? "",
        beginn: "2026-12-01",
        ende: "",
        kaltmiete: "",
        nebenkosten: "",
        kaution: "",
      };
  const fields = [
    ...tenantFields,
    {
      key: "einheit",
      label: "Einheit",
      options: Object.fromEntries(
        (units.data ?? []).map((u) => [u.id, u.name]),
      ),
      required: true,
    },
    { key: "beginn", label: "Vertragsbeginn", type: "date", required: true },
    { key: "ende", label: "Vertragsende", type: "date" },
    ...["kaltmiete", "nebenkosten", "kaution"].map((k) => ({
      key: k,
      label:
        (
          {
            kaltmiete: "Kaltmiete (€)",
            nebenkosten: "Nebenkosten (€)",
            kaution: "Kaution (€)",
          } as Record<string, string>
        )[k] ?? k,
      required: true,
    })),
  ];
  return (
    <Editor
      title={contract ? "Mietvertrag bearbeiten" : "Mietvertrag anlegen"}
      fields={fields}
      initial={initial}
      save={(d) => (contract ? update(contract.id, d) : create(d))}
      onSaved={onSaved}
      prepare={(d) => ({
        mieter: Object.fromEntries(
          tenantFields.map((f) => [
            f.key,
            f.key === "geburtsdatum" ? d[f.key] || null : (d[f.key] ?? ""),
          ]),
        ),
        einheit: Number(d["einheit"]),
        beginn: d["beginn"],
        ende: d["ende"] || null,
        kaltmiete: dezimal(d["kaltmiete"]),
        nebenkosten: dezimal(d["nebenkosten"]),
        kaution: dezimal(d["kaution"]),
      })}
      trigger={
        <Button variant={contract ? "outline" : "default"}>
          {contract ? <Pencil /> : <Plus />}
          {contract ? "Vertrag bearbeiten" : "Mietvertrag anlegen"}
        </Button>
      }
    />
  );
}
const acquisitionGroups: Record<string, string[]> = {
  Anschaffungsnebenkosten: [
    "gebuehren",
    "vormerkung",
    "grundbuchauszug",
    "grunderwerbsteuer",
    "notarkosten",
    "maklerprovision",
  ],
  Abzüge: ["abzug_instandhaltungsruecklage", "abzug_inventar"],
  Herstellungskosten: [
    "einstellplaetze",
    "anschlusskosten",
    "architekt",
    "bauarbeiten",
    "baumaterial",
    "bodenbelaege",
    "taefelung",
    "elektro",
    "fenster",
    "garten",
    "heizung",
    "maler",
    "sanitaer",
    "umzaeunung",
    "sonstiges",
  ],
  "Nachträgliche Kosten": ["erschliessung"],
};
function FinanceDialogs({ id, reload }: { id: number; reload: () => void }) {
  const ac = api.useAnschaffungskosten(id),
    loans = api.useDarlehen(id),
    land = api.useBodenrichtwerte(id);
  const saveAc = api.useUpdateAnschaffungskosten(),
    createLoan = api.useCreateDarlehen(),
    updateLoan = api.useUpdateDarlehen(),
    createLand = api.useCreateBodenrichtwert(),
    deleteLand = api.useDeleteBodenrichtwert();
  const loan = loans.data?.[0];
  const keys = [
    "kaufpreis",
    ...Object.values(acquisitionGroups).flat(),
    "anteil_grund_boden",
  ];
  return (
    <div className="flex flex-wrap gap-3">
      <Editor
        title="Anschaffungskosten bearbeiten"
        fields={[]}
        initial={Object.fromEntries(
          keys.map((k) => [k, alsEingabe((ac.data as any)?.[k] ?? "0.00")]),
        )}
        save={(d) => saveAc(id, d)}
        onSaved={() => {
          ac.reload();
          reload();
        }}
        prepare={(d) =>
          Object.fromEntries(keys.map((k) => [k, dezimal(d[k] || "0")]))
        }
        trigger={
          <Button variant="outline">Kaufpreis & Anschaffungskosten</Button>
        }
        extra={(d, set) => {
          const n = (k: string) => Number(dezimal(d[k] || "0"));
          const a =
            n("kaufpreis") +
            (acquisitionGroups["Anschaffungsnebenkosten"] ?? []).reduce(
              (s, k) => s + n(k),
              0,
            ) -
            (acquisitionGroups["Abzüge"] ?? []).reduce((s, k) => s + n(k), 0);
          const h = (acquisitionGroups["Herstellungskosten"] ?? []).reduce(
            (s, k) => s + n(k),
            0,
          );
          return (
            <div className="mt-5">
              {[
                ["Kaufpreis", ["kaufpreis"]],
                ...Object.entries(acquisitionGroups),
                ["Grund & Boden", ["anteil_grund_boden"]],
              ].map(([group, items]) => (
                <section className="section" key={String(group)}>
                  <h3 className="text-sm font-semibold mb-4">
                    {String(group)}
                  </h3>
                  <div className="form-grid">
                    {(items as string[]).map((k) => (
                      <label key={k}>
                        {k
                          .replaceAll("_", " ")
                          .replace("gebuehren", "Gebühren")
                          .replace("taefelung", "Täfelung")
                          .replace("umzaeunung", "Umzäunung")
                          .replace("erschliessung", "Erschließung")
                          .replace(/^./, (c) => c.toUpperCase())}{" "}
                        (€)
                        <input
                          className="field-input"
                          aria-label={k}
                          value={d[k] ?? "0"}
                          onChange={(e) => set({ ...d, [k]: e.target.value })}
                        />
                      </label>
                    ))}
                  </div>
                </section>
              ))}
              <div className="section">
                <p>Anschaffung: {euro(String(a))}</p>
                <p>Herstellung: {euro(String(h))}</p>
                <p>Nachträglich: {euro(String(n("erschliessung")))}</p>
                <strong>
                  Gesamtkosten: {euro(String(a + h + n("erschliessung")))}
                </strong>
                <p>
                  Gebäudeanteil:{" "}
                  {euro(
                    String(
                      a + h + n("erschliessung") - n("anteil_grund_boden"),
                    ),
                  )}
                </p>
              </div>
            </div>
          );
        }}
      />
      <Editor
        title="Darlehen bearbeiten"
        fields={[
          { key: "bank", label: "Bank", required: true },
          { key: "iban", label: "IBAN" },
          { key: "beginn", label: "Beginn", type: "date", required: true },
          { key: "betrag", label: "Darlehensbetrag (€)", required: true },
          { key: "art", label: "Darlehensart", options: DARLEHEN_ART_LABELS },
          { key: "zinsbindung_bis", label: "Zinsbindung bis", type: "date" },
          { key: "sollzins", label: "Sollzins (%)", required: true },
          {
            key: "monatsbetrag",
            label:
              loan?.art === "TILGUNG"
                ? "Tilgungsrate (€ / Monat)"
                : "Rate (€ / Monat)",
            required: true,
          },
        ]}
        initial={
          loan
            ? {
                ...loan,
                betrag: alsEingabe(loan.betrag),
                sollzins: alsEingabe(loan.sollzins),
                monatsbetrag: alsEingabe(loan.monatsbetrag),
              }
            : {
                mietobjekt: id,
                art: "ANNUITAET",
                beginn: "2026-12-01",
                betrag: "",
                sollzins: "",
                monatsbetrag: "",
              }
        }
        prepare={(d) => ({
          ...d,
          mietobjekt: id,
          betrag: dezimal(d["betrag"]),
          sollzins: dezimal(d["sollzins"]),
          monatsbetrag: dezimal(d["monatsbetrag"]),
          zinsbindung_bis: d["zinsbindung_bis"] || null,
        })}
        save={(d) => (loan ? updateLoan(loan.id, d) : createLoan(d))}
        onSaved={() => {
          loans.reload();
          reload();
        }}
        trigger={<Button variant="outline">Restschuld & Darlehen</Button>}
        extra={() =>
          loan ? (
            <>
              <h3 className="font-semibold mt-7">Restschuldverlauf</h3>
              <p className="text-xs text-muted-foreground mt-2">
                Zinsbindung bis {formatDatum(loan.zinsbindung_bis)}
              </p>
              <div className="chart-box">
                <ResponsiveContainer>
                  <LineChart
                    data={loan.verlauf.map((p) => ({
                      ...p,
                      rest: Number(p.rest),
                    }))}
                  >
                    <XAxis
                      dataKey="datum"
                      tickFormatter={(d) => d.slice(0, 4)}
                    />
                    <YAxis tickFormatter={(n) => `${n / 1000} Tsd.`} />
                    <Tooltip formatter={(v) => euro(String(v))} />
                    <Line dataKey="rest" stroke="var(--primary)" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <DataTable
                columns={["Datum", "Betrag", "Betreff", "Kontostand"]}
                rows={loan.zahlungen.map((p) => [
                  formatDatum(p.datum),
                  euro(p.betrag),
                  p.ist_sondertilgung ? "Sondertilgung" : p.betreff,
                  euro(p.kontostand),
                ])}
              />
            </>
          ) : null
        }
      />
      <Editor
        title="Bodenrichtwert anlegen"
        fields={[
          { key: "datum", label: "Datum", type: "date", required: true },
          { key: "wert", label: "Wert (€ / m²)", required: true },
        ]}
        initial={{ datum: "2026-01-01", wert: "" }}
        prepare={(d) => ({ ...d, mietobjekt: id, wert: dezimal(d["wert"]) })}
        save={createLand}
        onSaved={() => {
          land.reload();
          reload();
        }}
        trigger={<Button variant="outline">Bodenrichtwerte</Button>}
        extra={() => (
          <div className="mt-5">
            <DataTable
              columns={["Datum", "€/m²", "Grundstückswert", ""]}
              rows={(land.data ?? []).map((b) => [
                formatDatum(b.datum),
                euro(b.wert),
                euro(b.grundstueckswert),
                <ConfirmDelete
                  label="Bodenrichtwert löschen"
                  onDelete={async () => {
                    await deleteLand(b.id);
                    land.reload();
                    reload();
                  }}
                />,
              ])}
            />
            <div className="chart-box">
              <ResponsiveContainer>
                <LineChart
                  data={[...(land.data ?? [])]
                    .reverse()
                    .map((b) => ({ ...b, wert: Number(b.wert) }))}
                >
                  <XAxis dataKey="datum" />
                  <YAxis />
                  <Tooltip />
                  <Line dataKey="wert" stroke="var(--primary)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      />
    </div>
  );
}
export function PropertyDetail({ id }: { id: number }) {
  const result = api.useMietobjekt(id),
    units = api.useEinheiten(id),
    contracts = api.useMietvertraege();
  const update = api.useUpdateMietobjekt(),
    createUnit = api.useCreateEinheit(),
    updateUnit = api.useUpdateEinheit(),
    deleteUnit = api.useDeleteEinheit();
  const obj = result.data;
  const reload = () => {
    result.reload();
    units.reload();
    contracts.reload();
  };
  if (!obj) return <Loading result={result}>{null}</Loading>;
  return (
    <>
      <Button asChild variant="ghost" className="mb-4 -ml-3">
        <Link to="/mietobjekte">
          <ArrowLeft />
          Alle Mietobjekte
        </Link>
      </Button>
      <Heading
        title={obj.name}
        subtitle={`${obj.strasse} ${obj.hausnummer} · ${obj.plz} ${obj.ort}`}
        action={<PropertyEditor object={obj} onSaved={reload} />}
      />
      <div className="flex flex-wrap gap-2 mb-7">
        {Object.entries(FARBE_LABELS).map(([v, l]) => (
          <Button
            key={v}
            variant="outline"
            size="icon"
            aria-label={l}
            title={l}
            data-color={v}
            onClick={async () => {
              await update(id, { farbe: v as any });
              result.reload();
            }}
          >
            <span className="identity-dot" />
            {obj.farbe === v ? "✓" : ""}
          </Button>
        ))}
      </div>
      <div className="summary-grid">
        {[
          ["Marktwert", obj.marktwert],
          ["Restschuld", obj.restschuld],
          ["Erwirtschaftet · 12 Monate", obj.erwirtschafteter_betrag],
        ].map(([l, v]) => (
          <div className="summary-item" key={l}>
            <div className="summary-label">{l}</div>
            <div className="summary-value">{euro(v ?? null)}</div>
          </div>
        ))}
      </div>
      {[
        {
          title: "Grunddaten & Nutzung",
          keys: [
            "name",
            "strasse",
            "hausnummer",
            "plz",
            "ort",
            "land",
            "objektart",
            "nutzung",
            "vermietung",
          ],
        },
        {
          title: "Flächen & Baudaten",
          keys: [
            "wohnflaeche",
            "grundstuecksflaeche",
            "stockwerk",
            "baujahr",
            ...(WEG_OBJEKTARTEN.includes(obj.objektart)
              ? ["weg_anteil", "weg_nenner"]
              : []),
          ],
        },
        {
          title: "Kauf & Finanzierung",
          keys: ["kaufdatum", "kaufpreis", "grundschuld", "marktwert"],
        },
        {
          title: "Ausstattung",
          keys: [
            "zimmer",
            "baeder",
            "kueche",
            "balkon",
            "terrasse",
            "keller",
            "garage",
            "tiefgarage",
            "carport",
            "stellplatz",
          ],
        },
      ].map((s) => (
        <section className="section" key={s.title}>
          <div className="flex justify-between items-center mb-5">
            <h2 className="!mb-0">{s.title}</h2>
            <Editor
              title={s.title + " bearbeiten"}
              fields={s.keys.map((k) => ({
                key: k,
                label:
                  (
                    {
                      wohnflaeche: "Wohnfläche (m²)",
                      grundstuecksflaeche: "Grundstücksfläche (m²)",
                      weg_anteil: "WEG-Anteil",
                      weg_nenner: "WEG-Nenner",
                      kaufdatum: "Kaufdatum",
                      baeder: "Bäder",
                      kueche: "Küchen",
                    } as Record<string, string>
                  )[k] ?? k.replace(/^./, (c) => c.toUpperCase()),
                ...(k === "kaufdatum" ? { type: "date" } : {}),
                ...(k === "objektart"
                  ? { options: OBJEKTART_LABELS }
                  : k === "nutzung"
                    ? { options: NUTZUNG_LABELS }
                    : k === "vermietung"
                      ? { options: VERMIETUNG_LABELS }
                      : {}),
              }))}
              initial={Object.fromEntries(
                s.keys.map((k) => [
                  k,
                  numberKeys.includes(k)
                    ? alsEingabe((obj as any)[k])
                    : ((obj as any)[k] ?? ""),
                ]),
              )}
              prepare={(d) =>
                Object.fromEntries(
                  s.keys.map((k) => [
                    k,
                    numberKeys.includes(k)
                      ? d[k]
                        ? dezimal(d[k])
                        : null
                      : [
                            "stockwerk",
                            "baujahr",
                            "weg_nenner",
                            "baeder",
                            "kueche",
                            "balkon",
                            "terrasse",
                            "keller",
                            "garage",
                            "tiefgarage",
                            "carport",
                            "stellplatz",
                          ].includes(k)
                        ? d[k] === ""
                          ? null
                          : Number(d[k])
                        : k === "vermietung" && d["nutzung"] === "EIGEN"
                          ? ""
                          : d[k],
                  ]),
                )
              }
              save={(d) => update(id, d)}
              onSaved={reload}
              trigger={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={s.title + " bearbeiten"}
                >
                  <Pencil />
                </Button>
              }
            />
          </div>
          <dl className="detail-grid">
            {s.keys.map((k) => (
              <div key={k}>
                <dt className="text-xs text-muted-foreground mb-2">
                  {(
                    {
                      wohnflaeche: "Wohnfläche (m²)",
                      grundstuecksflaeche: "Grundstücksfläche (m²)",
                      weg_anteil: "WEG-Anteil",
                      weg_nenner: "WEG-Nenner",
                    } as Record<string, string>
                  )[k] ?? k.replace(/^./, (c) => c.toUpperCase())}
                </dt>
                <dd className="text-sm">
                  {k === "objektart"
                    ? OBJEKTART_LABELS[obj.objektart]
                    : k === "nutzung"
                      ? NUTZUNG_LABELS[obj.nutzung]
                      : ["kaufpreis", "marktwert", "grundschuld"].includes(k)
                        ? euro((obj as any)[k])
                        : k === "kaufdatum"
                          ? formatDatum(obj.kaufdatum)
                          : String((obj as any)[k] ?? "–")}
                </dd>
              </div>
            ))}
          </dl>
          {s.title === "Kauf & Finanzierung" && (
            <div className="mt-6">
              <FinanceDialogs id={id} reload={reload} />
            </div>
          )}
        </section>
      ))}
      <section className="section">
        <div className="flex justify-between items-center mb-5">
          <h2 className="!mb-0">Einheiten</h2>
          <Editor
            title="Einheit anlegen"
            fields={[{ key: "name", label: "Name", required: true }]}
            save={(d) => createUnit({ mietobjekt: id, name: d["name"] })}
            onSaved={reload}
          />
        </div>
        <DataTable
          columns={[
            "Einheit",
            "Mieter",
            "Kaltmiete",
            "Vertragsbeginn",
            "Vertragsende",
            "Aktionen",
          ]}
          rows={(units.data ?? []).map((u) => {
            const c = (contracts.data ?? []).find(
              (m) => m.einheit === u.id && (!m.ende || m.ende >= "2026-11-25"),
            );
            return [
              u.name,
              c ? `${c.mieter.vorname} ${c.mieter.nachname}` : "Leerstand",
              c ? euro(c.kaltmiete) : "–",
              c ? formatDatum(c.beginn) : "–",
              c ? formatDatum(c.ende) : "–",
              <div className="flex gap-2">
                <Editor
                  title="Einheit umbenennen"
                  fields={[{ key: "name", label: "Name" }]}
                  initial={{ name: u.name }}
                  save={(d) => updateUnit(u.id, d)}
                  onSaved={reload}
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Einheit umbenennen"
                    >
                      <Pencil />
                    </Button>
                  }
                />
                {u.hat_vertraege ? (
                  <Button
                    variant="ghost"
                    disabled
                    title="Diese Einheit hat Mietverträge"
                  >
                    Löschen
                  </Button>
                ) : (
                  <ConfirmDelete
                    label="Einheit löschen"
                    onDelete={async () => {
                      await deleteUnit(u.id);
                      reload();
                    }}
                  />
                )}
                {c ? (
                  <ContractEditor contract={c} onSaved={reload} />
                ) : (
                  <ContractEditor unit={u.id} onSaved={reload} />
                )}
              </div>,
            ];
          })}
        />
      </section>
    </>
  );
}
