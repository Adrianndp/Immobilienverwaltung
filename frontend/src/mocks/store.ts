import { vertragsStatus, KATEGORIE_LABELS, type Lieferant } from "@/api/types";
import { heuteIso, lieferantName } from "@/format";
// Rows are untyped JSON, like the API responses they stand in for.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;
const money = (n: number) => n.toFixed(2);
const base = {
  land: "DE",
  nutzung: "VERMIETUNG",
  vermietung: "GANZ",
  kaufdatum: "2020-06-15",
  kaufpreis: "320000.00",
  grundschuld: "250000.00",
  marktwert: "420000.00",
  wohnflaeche: "125.00",
  grundstuecksflaeche: "480.00",
  stockwerk: null,
  baujahr: 1998,
  weg_anteil: null,
  weg_nenner: null,
  zimmer: "4",
  baeder: 2,
  kueche: 1,
  balkon: 1,
  terrasse: 0,
  keller: 1,
  garage: 0,
  tiefgarage: 0,
  carport: 0,
  stellplatz: 1,
  restschuld: null,
  bodenrichtwert: null,
  erwirtschafteter_betrag: "0.00",
};
export const store: Record<string, Row[]> = {
  mietobjekte: [
    {
      ...base,
      id: 1,
      name: "Altbau Prenzlauer Berg",
      bild: "/images/property-0.webp",
      farbe: "#1976D2",
      strasse: "Kollwitzstraße",
      hausnummer: "42",
      plz: "10405",
      ort: "Berlin",
      objektart: "MFH",
      kaufpreis: "685000.00",
      marktwert: "890000.00",
      grundschuld: "540000.00",
      wohnflaeche: "280.00",
      baujahr: 1905,
    },
    {
      ...base,
      id: 2,
      name: "Stadtvilla Potsdam",
      bild: "/images/property-1.webp",
      farbe: "#2E7D32",
      strasse: "Lindenallee",
      hausnummer: "18",
      plz: "14469",
      ort: "Potsdam",
      objektart: "EFH",
      kaufdatum: "2021-09-01",
      kaufpreis: "425000.00",
      marktwert: "565000.00",
      grundschuld: "320000.00",
    },
    {
      ...base,
      id: 3,
      name: "Wohnhaus Eimsbüttel",
      bild: "/images/property-2.webp",
      farbe: "#ED6C02",
      strasse: "Osterstraße",
      hausnummer: "76",
      plz: "20259",
      ort: "Hamburg",
      objektart: "ZFH",
      kaufdatum: "2019-03-22",
      kaufpreis: "510000.00",
      marktwert: "680000.00",
      grundschuld: "380000.00",
    },
  ],
  einheiten: [
    { id: 1, mietobjekt: 1, name: "Erdgeschoss", hat_vertraege: true },
    { id: 2, mietobjekt: 1, name: "1. Obergeschoss", hat_vertraege: true },
    { id: 3, mietobjekt: 1, name: "Dachgeschoss", hat_vertraege: false },
    { id: 4, mietobjekt: 2, name: "Gesamtes Haus", hat_vertraege: true },
    { id: 5, mietobjekt: 3, name: "Wohnung links", hat_vertraege: true },
    { id: 6, mietobjekt: 3, name: "Wohnung rechts", hat_vertraege: true },
  ],
  mietvertraege: [],
  kostenarten: [
    {
      id: 1,
      name: "Instandhaltung",
      kategorie: "INSTANDHALTUNG",
      abschreibung_prozent: null,
    },
    {
      id: 2,
      name: "Gebäudeversicherung",
      kategorie: "SONSTIGE",
      abschreibung_prozent: null,
    },
    {
      id: 3,
      name: "Hausverwaltung",
      kategorie: "SONSTIGE",
      abschreibung_prozent: null,
    },
    {
      id: 4,
      name: "Gebäude-AfA",
      kategorie: "ABSCHREIBUNG",
      abschreibung_prozent: "2.00",
    },
  ],
  lieferanten: [
    {
      id: 1,
      firmenname: "Bauwerk Berlin GmbH",
      vorname: "",
      nachname: "",
      strasse: "Torstraße",
      hausnummer: "91",
      plz: "10119",
      ort: "Berlin",
      land: "DE",
      telefon: "030 285 4190",
      email: "kontakt@bauwerk-berlin.de",
    },
    {
      id: 2,
      firmenname: "Allianz Versicherung",
      vorname: "",
      nachname: "",
      strasse: "An den Treptowers",
      hausnummer: "3",
      plz: "12435",
      ort: "Berlin",
      land: "DE",
      telefon: "030 538 9300",
      email: "service@allianz.de",
    },
    {
      id: 3,
      firmenname: "Grün & Partner Hausverwaltung",
      vorname: "",
      nachname: "",
      strasse: "Große Bleichen",
      hausnummer: "12",
      plz: "20354",
      ort: "Hamburg",
      land: "DE",
      telefon: "040 351 820",
      email: "info@gruen-partner.de",
    },
  ],
  rechnungen: [],
  buchungen: [],
  darlehen: [
    {
      id: 1,
      mietobjekt: 1,
      bank: "Deutsche Kreditbank",
      iban: "DE87120300000012345678",
      beginn: "2020-07-01",
      betrag: "540000.00",
      art: "ANNUITAET",
      zinsbindung_bis: "2030-06-30",
      sollzins: "2.10",
      monatsbetrag: "2150.00",
    },
  ],
  bodenrichtwerte: [
    { id: 1, mietobjekt: 1, datum: "2024-01-01", wert: "780.00" },
    { id: 2, mietobjekt: 1, datum: "2025-01-01", wert: "820.00" },
    { id: 3, mietobjekt: 1, datum: "2026-01-01", wert: "850.00" },
  ],
  anschaffungskosten: [],
};
const people = [
  ["Anna", "Schneider", 1, "1250.00"],
  ["Max", "Weber", 2, "1380.00"],
  ["Familie", "Hoffmann", 4, "1750.00"],
  ["Lena", "Fischer", 5, "980.00"],
  ["Jonas", "Becker", 6, "1020.00"],
  ["Paul", "Richter", 1, "1100.00"],
  ["Clara", "Wagner", 3, "1190.00"],
];
people.forEach((p, i) =>
  store["mietvertraege"]?.push({
    id: i + 1,
    mieter: {
      id: i + 1,
      vorname: p[0],
      nachname: p[1],
      strasse: "",
      hausnummer: "",
      plz: "",
      ort: "",
      land: "DE",
      telefon: "0176 12345678",
      email: `mieter${i + 1}@beispiel.de`,
      geburtsdatum: null,
      kontoinhaber: `${p[0]} ${p[1]}`,
      iban: "DE02120300000012345678",
    },
    einheit: p[2],
    beginn: i === 6 ? "2027-02-01" : i === 5 ? "2018-01-01" : "2022-04-01",
    ende: i === 5 ? "2021-12-31" : null,
    kaltmiete: p[3],
    nebenkosten: "220.00",
    kaution: money(Number(p[3]) * 3),
  }),
);
for (let i = 0; i < 12; i++)
  store["rechnungen"]?.push({
    id: i + 1,
    lieferant: (i % 3) + 1,
    kostenart: (i % 3) + 1,
    datum: `2026-${String(11 - Math.floor(i / 2)).padStart(2, "0")}-15`,
    name: [
      "Heizungswartung",
      "Gebäudeversicherung",
      "Verwaltungskosten",
      "Fassadenreparatur",
    ][i % 4],
    rechnungsnummer: `RE-2026-${String(101 + i)}`,
    betrag: money(280 + i * 95),
    anteile:
      i % 4 === 0
        ? [
            { mietobjekt: 1, prozent: "50.00" },
            { mietobjekt: 3, prozent: "50.00" },
          ]
        : [{ mietobjekt: (i % 3) + 1, prozent: "100.00" }],
  });
for (let i = 0; i < 40; i++) {
  const incoming = i % 4 !== 0;
  const contract = store["mietvertraege"]?.[i % 5];
  const invoice = store["rechnungen"]?.[i % 12];
  const amount = incoming
    ? Number(contract?.["kaltmiete"]) + 220
    : -Number(invoice?.["betrag"]);
  store["buchungen"]?.push({
    id: i + 1,
    buchungstag: `2026-${String(11 - Math.floor(i / 5)).padStart(2, "0")}-${String(25 - (i % 5)).padStart(2, "0")}`,
    wertstellung: `2026-${String(11 - Math.floor(i / 5)).padStart(2, "0")}-${String(25 - (i % 5)).padStart(2, "0")}`,
    kontoinhaber: incoming
      ? `${contract?.["mieter"].vorname} ${contract?.["mieter"].nachname}`
      : "Bauwerk Berlin GmbH",
    buchungstext: incoming
      ? "Miete und Nebenkosten November"
      : "Rechnung " + invoice?.["rechnungsnummer"],
    buchungsart: incoming ? "Dauerauftrag" : "Überweisung",
    betrag: money(amount),
    zuordnungen:
      i % 3 === 0
        ? []
        : [
            {
              betrag: money(Math.abs(amount)),
              mietvertrag: incoming ? contract?.["id"] : null,
              rechnung: incoming ? null : invoice?.["id"],
              darlehen: null,
              ist_sondertilgung: false,
            },
          ],
  });
}
export const find = (resource: string, id: number) =>
  store[resource]?.find((r) => r["id"] === id);
export function loan(row: Row): Row {
  let rest = Number(row["betrag"]);
  const rate = Number(row["monatsbetrag"]),
    interest = Number(row["sollzins"]) / 1200;
  const start = new Date(row["beginn"]);
  let current = rest;
  const verlauf: { datum: string; rest: string }[] = [],
    zahlungen: Row[] = [];
  const assignments = (store["buchungen"] ?? [])
    .flatMap((b) =>
      b["zuordnungen"]
        .filter((z: Row) => z["darlehen"] === row["id"])
        .map((z: Row) => ({
          ...z,
          datum: b["buchungstag"],
          betreff: b["buchungstext"],
        })),
    )
    .sort((a: Row, b: Row) => a["datum"].localeCompare(b["datum"]));
  const applied = new Set<Row>();
  for (let i = 0; i <= 600 && rest > 0; i++) {
    const date = new Date(start.getFullYear(), start.getMonth() + i, 1)
      .toISOString()
      .slice(0, 10);
    const next = new Date(start.getFullYear(), start.getMonth() + i + 1, 1)
      .toISOString()
      .slice(0, 10);
    if (
      i % 12 === 0 ||
      date.slice(0, 7) === String(row["zinsbindung_bis"]).slice(0, 7)
    )
      verlauf.push({ datum: date, rest: money(rest) });
    const monthlyInterest = rest * interest;
    if (i > 0)
      rest = Math.max(
        0,
        rest - (row["art"] === "ANNUITAET" ? rate - monthlyInterest : rate),
      );
    for (const z of assignments) {
      if (z["datum"] < next && !applied.has(z)) {
        const amount = Number(z["betrag"]);
        const principal = z["ist_sondertilgung"]
          ? amount
          : Math.max(0, amount - monthlyInterest);
        rest = Math.max(0, rest - principal);
        applied.add(z);
        zahlungen.push({
          datum: z["datum"],
          betrag: z["betrag"],
          betreff: z["betreff"],
          bank: row["bank"],
          kontostand: money(rest),
          ist_sondertilgung: z["ist_sondertilgung"],
          zins: money(
            z["ist_sondertilgung"] ? 0 : Math.min(amount, monthlyInterest),
          ),
        });
      }
    }
    if (date <= heuteIso()) current = rest;
  }
  return {
    ...row,
    mietobjekt_name: find("mietobjekte", row["mietobjekt"])?.["name"],
    restschuld: money(current),
    verlauf,
    zahlungen,
  };
}
export function decorate(resource: string, r: Row): Row {
  if (resource === "mietobjekte") {
    const income = (store["buchungen"] ?? [])
      .filter(
        (b) =>
          b["buchungstag"] >=
          new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10),
      )
      .reduce(
        (sum, b) =>
          sum +
          b["zuordnungen"].reduce(
            (a: number, z: Row) =>
              a +
              (find(
                "einheiten",
                find("mietvertraege", z["mietvertrag"])?.["einheit"],
              )?.["mietobjekt"] === r["id"]
                ? Number(z["betrag"])
                : 0),
            0,
          ),
        0,
      );
    const expense = (store["rechnungen"] ?? [])
      .filter(
        (x) =>
          x["datum"] >=
          new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10),
      )
      .reduce(
        (s, x) =>
          s +
          (Number(x["betrag"]) *
            (x["anteile"].find((a: Row) => a["mietobjekt"] === r["id"])
              ?.prozent ?? 0)) /
            100,
        0,
      );
    const loans = (store["darlehen"] ?? []).filter(
      (x) => x["mietobjekt"] === r["id"],
    );
    return {
      ...r,
      restschuld: loans.length
        ? money(loans.reduce((s, x) => s + Number(loan(x)["restschuld"]), 0))
        : null,
      erwirtschafteter_betrag:
        r["nutzung"] === "EIGEN" ? null : money(income - expense),
      bodenrichtwert:
        (store["bodenrichtwerte"] ?? [])
          .filter((x) => x["mietobjekt"] === r["id"])
          .sort((a, b) => b["datum"].localeCompare(a["datum"]))[0]?.["wert"] ??
        null,
    };
  }
  if (resource === "einheiten")
    return {
      ...r,
      hat_vertraege: (store["mietvertraege"] ?? []).some(
        (m) => m["einheit"] === r["id"],
      ),
    };
  if (resource === "mietvertraege") {
    const unit = find("einheiten", r["einheit"]);
    const obj = find("mietobjekte", unit?.["mietobjekt"]);
    return {
      ...r,
      einheit_name: unit?.["name"],
      mietobjekt_name: obj?.["name"],
      farbe: obj?.["farbe"],
      einnahmen_seit_beginn: money(
        (store["buchungen"] ?? []).reduce(
          (s, b) =>
            s +
            b["zuordnungen"].reduce(
              (a: number, z: Row) =>
                a + (z["mietvertrag"] === r["id"] ? Number(z["betrag"]) : 0),
              0,
            ),
          0,
        ),
      ),
      kosten_seit_beginn: money(
        (store["rechnungen"] ?? [])
          .filter(
            (invoice) =>
              invoice["datum"] >= r["beginn"] &&
              invoice["datum"] <= (r["ende"] ?? "9999-12-31"),
          )
          .reduce(
            (sum, invoice) =>
              sum +
              (Number(invoice["betrag"]) *
                Number(
                  invoice["anteile"].find(
                    (a: Row) => a["mietobjekt"] === obj?.["id"],
                  )?.prozent ?? 0,
                )) /
                100 /
                Math.max(
                  1,
                  (store["einheiten"] ?? []).filter(
                    (u) => u["mietobjekt"] === obj?.["id"],
                  ).length,
                ),
            0,
          ),
      ),
    };
  }
  if (resource === "kostenarten")
    return {
      ...r,
      kategorie_label:
        KATEGORIE_LABELS[r["kategorie"] as keyof typeof KATEGORIE_LABELS],
    };
  if (resource === "rechnungen") {
    const paid = (store["buchungen"] ?? []).reduce(
      (s, b) =>
        s +
        b["zuordnungen"].reduce(
          (a: number, z: Row) =>
            a + (z["rechnung"] === r["id"] ? Number(z["betrag"]) : 0),
          0,
        ),
      0,
    );
    return {
      ...r,
      lieferant_name: lieferantName(
        find("lieferanten", r["lieferant"]) as Lieferant,
      ),
      kostenart_name: find("kostenarten", r["kostenart"])?.["name"],
      anteile: r["anteile"].map((a: Row) => ({
        ...a,
        mietobjekt_name: find("mietobjekte", a["mietobjekt"])?.["name"],
      })),
      offener_betrag: money(Math.max(0, Number(r["betrag"]) - paid)),
      bezahlt_am:
        paid >= Number(r["betrag"])
          ? ((store["buchungen"] ?? [])
              .filter((b) =>
                b["zuordnungen"].some((z: Row) => z["rechnung"] === r["id"]),
              )
              .map((b) => b["buchungstag"])
              .sort()
              .at(-1) ?? null)
          : null,
    };
  }
  if (resource === "buchungen")
    return {
      ...r,
      nicht_zugeordnet: money(
        Math.abs(Number(r["betrag"])) -
          r["zuordnungen"].reduce(
            (s: number, z: Row) => s + Number(z["betrag"]),
            0,
          ),
      ),
      partner: r["zuordnungen"]
        .map((z: Row) =>
          z["mietvertrag"]
            ? decorate(
                "mietvertraege",
                find("mietvertraege", z["mietvertrag"]) ?? {},
              )["mieter"]?.nachname
            : z["rechnung"]
              ? decorate("rechnungen", find("rechnungen", z["rechnung"]) ?? {})[
                  "lieferant_name"
                ]
              : find("darlehen", z["darlehen"])?.["bank"],
        )
        .join(", "),
      rechnungen: r["zuordnungen"]
        .map((z: Row) => find("rechnungen", z["rechnung"])?.["rechnungsnummer"])
        .filter(Boolean)
        .join(", "),
    };
  if (resource === "darlehen") return loan(r);
  if (resource === "bodenrichtwerte") {
    const object = find("mietobjekte", r["mietobjekt"]);
    const area = object?.["grundstuecksflaeche"];
    const share =
      object?.["weg_anteil"] && object?.["weg_nenner"]
        ? Number(object["weg_anteil"]) / Number(object["weg_nenner"])
        : 1;
    return {
      ...r,
      grundstueckswert:
        area === null || area === undefined
          ? null
          : money(Number(area) * share * Number(r["wert"])),
    };
  }
  return r;
}
export function validate(resource: string, d: Row, id?: number): Row {
  const errors: Row = {};
  const err = (k: string, v: string) => (errors[k] = [v]);
  if (resource === "mietobjekte") {
    for (const key of [
      "name",
      "strasse",
      "hausnummer",
      "plz",
      "ort",
      "objektart",
      "nutzung",
    ])
      if (!d[key]) err(key, "Dieses Feld ist erforderlich.");
    if (!/^\d{5}$/.test(d["plz"] ?? ""))
      err("plz", "Bitte eine fünfstellige Postleitzahl eingeben.");
    if (d["nutzung"] === "VERMIETUNG" && !d["vermietung"])
      err("vermietung", "Bitte Vermietung auswählen.");
    if (Boolean(d["weg_anteil"]) !== Boolean(d["weg_nenner"]))
      err("weg_anteil", "Anteil und Nenner müssen gemeinsam angegeben werden.");
    if (
      d["weg_nenner"] !== null &&
      d["weg_nenner"] !== undefined &&
      ![100, 1000].includes(d["weg_nenner"])
    )
      err("weg_nenner", "Der Nenner muss 100 oder 1000 sein.");
    if (
      d["farbe"] !== undefined &&
      ![
        "#1976D2",
        "#ED6C02",
        "#9C27B0",
        "#2E7D32",
        "#D32F2F",
        "#0097A7",
        "#795548",
        "#616161",
      ].includes(d["farbe"])
    )
      err("farbe", "Bitte eine der acht Objektfarben wählen.");
  }
  if (resource === "mietvertraege" && d["ende"] && d["ende"] < d["beginn"])
    err("ende", "Das Ende darf nicht vor dem Beginn liegen.");
  if (resource === "kostenarten") {
    if (!d["name"]) err("name", "Dieses Feld ist erforderlich.");
    if (store[resource]?.some((r) => r["id"] !== id && r["name"] === d["name"]))
      err("name", "Eine Kostenart mit diesem Namen existiert bereits.");
    if (
      d["kategorie"] === "ABSCHREIBUNG" &&
      !(
        Number(d["abschreibung_prozent"]) > 0 &&
        Number(d["abschreibung_prozent"]) <= 100
      )
    )
      err(
        "abschreibung_prozent",
        "Bitte einen Wert größer 0 und höchstens 100 eingeben.",
      );
  }
  if (resource === "lieferanten" && !d["firmenname"] && !d["nachname"])
    err("nachname", "Firmenname oder Nachname ist erforderlich.");
  if (resource === "rechnungen") {
    const a: Row[] = d["anteile"] ?? [];
    if (
      !a.length ||
      Math.abs(a.reduce((s, x) => s + Number(x["prozent"]), 0) - 100) > 0.001 ||
      new Set(a.map((x) => x["mietobjekt"])).size !== a.length
    )
      err(
        "anteile",
        "Mietobjekte dürfen nur einmal vorkommen. Die Summe muss 100 % betragen.",
      );
  }
  if (resource === "buchungen") {
    const a: Row[] = d["zuordnungen"] ?? [];
    if (
      a.some(
        (z) =>
          Number(z["betrag"]) <= 0 ||
          [z["mietvertrag"], z["rechnung"], z["darlehen"]].filter(Boolean)
            .length !== 1 ||
          (Number(d["betrag"]) > 0
            ? !z["mietvertrag"]
            : Boolean(z["mietvertrag"])) ||
          (z["ist_sondertilgung"] && !z["darlehen"]),
      ) ||
      a.reduce((s, z) => s + Number(z["betrag"]), 0) >
        Math.abs(Number(d["betrag"]))
    )
      err(
        "zuordnungen",
        "Positive Beträge, passende Empfänger und höchstens der Buchungsbetrag sind erforderlich.",
      );
  }
  if (resource === "darlehen") {
    if (!(Number(d["betrag"]) > 0))
      err("betrag", "Der Betrag muss größer 0 sein.");
    if (!(Number(d["sollzins"]) >= 0))
      err("sollzins", "Der Sollzins darf nicht negativ sein.");
    if (!(Number(d["monatsbetrag"]) > 0))
      err("monatsbetrag", "Die Rate muss größer 0 sein.");
    if (
      d["art"] === "ANNUITAET" &&
      Number(d["monatsbetrag"]) <=
        (Number(d["betrag"]) * Number(d["sollzins"])) / 1200
    )
      err(
        "monatsbetrag",
        "Die Rate muss die Zinsen des ersten Monats übersteigen.",
      );
  }
  if (resource === "bodenrichtwerte") {
    if (!(Number(d["wert"]) > 0)) err("wert", "Der Wert muss größer 0 sein.");
    if (
      store[resource]?.some(
        (r) =>
          r["id"] !== id &&
          r["datum"] === d["datum"] &&
          r["mietobjekt"] === d["mietobjekt"],
      )
    )
      err("datum", "Für dieses Datum existiert bereits ein Bodenrichtwert.");
  }
  if (resource === "anschaffungskosten") {
    for (const [key, value] of Object.entries(d))
      if (
        value !== null &&
        (!Number.isFinite(Number(value)) || Number(value) < 0)
      )
        err(key, "Der Betrag darf nicht negativ sein.");
    if (
      Number(d["anteil_grund_boden"]) > Number(acquisition(d)["gesamtkosten"])
    )
      err(
        "anteil_grund_boden",
        "Der Bodenanteil darf die Gesamtkosten nicht übersteigen.",
      );
  }
  return errors;
}
export function overlap(d: Row, id?: number) {
  const conflicts = (store["mietvertraege"] ?? []).filter(
    (r) =>
      r["id"] !== id &&
      r["einheit"] === d["einheit"] &&
      r["beginn"] <= (d["ende"] ?? "9999-12-31") &&
      (r["ende"] ?? "9999-12-31") >= d["beginn"],
  );
  return conflicts.length
    ? {
        code: "ueberschneidung",
        konflikte: conflicts.map((r) => ({
          id: r["id"],
          mieter_name: `${r["mieter"].vorname} ${r["mieter"].nachname}`,
          beginn: r["beginn"],
          ende: r["ende"],
          einheit_label: decorate("mietvertraege", r)["einheit_name"],
        })),
        kann_beenden: conflicts.every((r) => r["beginn"] < d["beginn"]),
      }
    : undefined;
}
export function acquisition(d: Row): Row {
  const sum = (keys: string[]) =>
    keys.reduce((s, k) => s + Number(d[k] ?? 0), 0);
  const a =
    sum([
      "kaufpreis",
      "gebuehren",
      "vormerkung",
      "grundbuchauszug",
      "grunderwerbsteuer",
      "notarkosten",
      "maklerprovision",
    ]) - sum(["abzug_instandhaltungsruecklage", "abzug_inventar"]);
  const h = sum([
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
  ]);
  const n = sum(["erschliessung"]);
  return {
    ...d,
    summe_anschaffung: money(a),
    summe_herstellung: money(h),
    summe_nachtraeglich: money(n),
    gesamtkosten: money(a + h + n),
    gesamtkosten_objekt: money(
      a + h + n - Number(d["anteil_grund_boden"] ?? 0),
    ),
  };
}
export function analysis(obj: number, year: number, month?: number) {
  const period = `${year}${month ? "-" + String(month).padStart(2, "0") : ""}`;
  const contracts = (store["mietvertraege"] ?? []).filter(
    (m) => find("einheiten", m["einheit"])?.["mietobjekt"] === obj,
  );
  const einnahmen = contracts.map((m) => {
    const payments = (store["buchungen"] ?? [])
      .filter((b) => b["buchungstag"].startsWith(period))
      .flatMap((b) =>
        b["zuordnungen"].filter((z: Row) => z["mietvertrag"] === m["id"]),
      );
    const total = payments.reduce(
      (s: number, z: Row) => s + Number(z["betrag"]),
      0,
    );
    const cold =
      (total * Number(m["kaltmiete"])) /
      (Number(m["kaltmiete"]) + Number(m["nebenkosten"]));
    return {
      label: `${m["mieter"].vorname} ${m["mieter"].nachname}`,
      betrag: money(total),
      anzahl_zahlungen: payments.length,
      kaltmiete: money(cold),
      nebenkosten: money(total - cold),
      gesamt: money(total),
    };
  });
  const invoices = (store["rechnungen"] ?? []).filter((r) =>
    r["datum"].startsWith(period),
  );
  const ausgaben = (store["kostenarten"] ?? [])
    .map((k) => ({
      kostenart: k["name"],
      betrag: money(
        invoices
          .filter((r) => r["kostenart"] === k["id"])
          .reduce(
            (s, r) =>
              s +
              (Number(r["betrag"]) *
                Number(
                  r["anteile"].find((a: Row) => a["mietobjekt"] === obj)
                    ?.prozent ?? 0,
                )) /
                100,
            0,
          ),
      ),
    }))
    .filter((x) => Number(x.betrag) > 0);
  const income = einnahmen.reduce((s, r) => s + Number(r.betrag), 0),
    expense = ausgaben.reduce((s, r) => s + Number(r.betrag), 0);
  const loans = (store["darlehen"] ?? []).filter(
    (l) => l["mietobjekt"] === obj,
  );
  const schuldzinsen = loans.reduce(
    (sum, l) =>
      sum +
      loan(l)
        ["zahlungen"].filter((p: Row) => p["datum"].startsWith(period))
        .reduce((a: number, p: Row) => a + Number(p["zins"]), 0),
    0,
  );
  const categorySum = (category: string) =>
    invoices
      .filter(
        (r) => find("kostenarten", r["kostenart"])?.["kategorie"] === category,
      )
      .reduce(
        (sum, r) =>
          sum +
          (Number(r["betrag"]) *
            Number(
              r["anteile"].find((a: Row) => a["mietobjekt"] === obj)?.prozent ??
                0,
            )) /
            100,
        0,
      );
  const instandhaltung = categorySum("INSTANDHALTUNG"),
    sonstige = categorySum("SONSTIGE");
  const abschreibungen = invoices
    .filter(
      (r) =>
        find("kostenarten", r["kostenart"])?.["kategorie"] === "ABSCHREIBUNG",
    )
    .reduce(
      (sum, r) =>
        sum +
        (((Number(r["betrag"]) *
          Number(
            r["anteile"].find((a: Row) => a["mietobjekt"] === obj)?.prozent ??
              0,
          )) /
          100) *
          Number(
            find("kostenarten", r["kostenart"])?.["abschreibung_prozent"] ?? 0,
          )) /
          100,
      0,
    );
  const werbungskosten =
    schuldzinsen + instandhaltung + sonstige + abschreibungen;
  return {
    einnahmen,
    einnahmen_summe: money(income),
    kaltmiete_summe: money(
      einnahmen.reduce((s, r) => s + Number(r.kaltmiete), 0),
    ),
    nebenkosten_summe: money(
      einnahmen.reduce((s, r) => s + Number(r.nebenkosten), 0),
    ),
    ausgaben,
    ausgaben_summe: money(expense),
    ergebnis: money(income - expense),
    schuldzinsen: money(schuldzinsen),
    instandhaltung: money(instandhaltung),
    sonstige: money(sonstige),
    abschreibungen: money(abschreibungen),
    werbungskosten_summe: money(werbungskosten),
    ueberschuss: money(income - werbungskosten),
  };
}
