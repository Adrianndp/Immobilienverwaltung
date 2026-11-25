import { describe, expect, it } from "vitest";
import {
  validate,
  overlap,
  acquisition,
  analysis,
  store,
  decorate,
  loan,
} from "@/mocks/store";
import { dezimal, alsEingabe } from "@/format";
import { vertragsStatus } from "@/api/types";

describe("Django-compatible rules", () => {
  it("converts German decimal input to the API string", () => {
    expect(dezimal("1.234,56")).toBe("1234.56");
    expect(alsEingabe("1234.56")).toBe("1234,56");
  });
  it("requires a five-digit postcode", () => {
    expect(
      validate("mietobjekte", {
        name: "Haus",
        strasse: "Straße",
        hausnummer: "1",
        plz: "1234",
        ort: "Berlin",
        objektart: "EFH",
        nutzung: "EIGEN",
      })["plz"],
    ).toBeDefined();
    expect(
      validate("mietobjekte", {
        name: "Haus",
        strasse: "Straße",
        hausnummer: "1",
        plz: "12345",
        ort: "Berlin",
        objektart: "EFH",
        nutzung: "EIGEN",
      })["plz"],
    ).toBeUndefined();
  });
  it("requires the rental mode for rented properties", () => {
    expect(
      validate("mietobjekte", { nutzung: "VERMIETUNG" })["vermietung"],
    ).toBeDefined();
    expect(
      validate("mietobjekte", { nutzung: "EIGEN" })["vermietung"],
    ).toBeUndefined();
  });
  it("requires WEG numerator and denominator together", () => {
    expect(
      validate("mietobjekte", { weg_anteil: "50", weg_nenner: null })[
        "weg_anteil"
      ],
    ).toBeDefined();
    expect(
      validate("mietobjekte", { weg_anteil: "50", weg_nenner: 1000 })[
        "weg_anteil"
      ],
    ).toBeUndefined();
  });
  it("requires unique cost names", () => {
    expect(
      validate("kostenarten", {
        name: "Instandhaltung",
        kategorie: "SONSTIGE",
      })["name"],
    ).toBeDefined();
  });
  it("requires depreciation greater than zero and at most 100", () => {
    for (const value of ["0", "100.01"])
      expect(
        validate("kostenarten", {
          name: "Test",
          kategorie: "ABSCHREIBUNG",
          abschreibung_prozent: value,
        })["abschreibung_prozent"],
      ).toBeDefined();
    expect(
      validate("kostenarten", {
        name: "Test",
        kategorie: "ABSCHREIBUNG",
        abschreibung_prozent: "100",
      })["abschreibung_prozent"],
    ).toBeUndefined();
  });
  it("requires a company or last name", () => {
    expect(
      validate("lieferanten", { firmenname: "", nachname: "" })["nachname"],
    ).toBeDefined();
    expect(
      validate("lieferanten", { firmenname: "Firma", nachname: "" })[
        "nachname"
      ],
    ).toBeUndefined();
  });
  it("requires unique property invoice shares summing to 100 percent", () => {
    expect(
      validate("rechnungen", { anteile: [{ mietobjekt: 1, prozent: "99" }] })[
        "anteile"
      ],
    ).toBeDefined();
    expect(
      validate("rechnungen", {
        anteile: [
          { mietobjekt: 1, prozent: "50" },
          { mietobjekt: 1, prozent: "50" },
        ],
      })["anteile"],
    ).toBeDefined();
    expect(
      validate("rechnungen", {
        anteile: [
          { mietobjekt: 1, prozent: "50" },
          { mietobjekt: 2, prozent: "50" },
        ],
      })["anteile"],
    ).toBeUndefined();
  });
  it("rejects a contract end before its beginning", () => {
    expect(
      validate("mietvertraege", { beginn: "2026-12-01", ende: "2026-11-30" })[
        "ende"
      ],
    ).toBeDefined();
  });
  it("flags overlaps and only permits ending older contracts", () => {
    expect(
      overlap({ einheit: 1, beginn: "2026-12-01", ende: null })?.kann_beenden,
    ).toBe(true);
    expect(
      overlap({ einheit: 1, beginn: "2022-04-01", ende: null })?.kann_beenden,
    ).toBe(false);
  });
  it("derives current, future and archived status from dates", () => {
    expect(
      vertragsStatus({ beginn: "2026-01-01", ende: null }, "2026-11-25"),
    ).toBe("laufend");
    expect(
      vertragsStatus({ beginn: "2027-01-01", ende: null }, "2026-11-25"),
    ).toBe("zukuenftig");
    expect(
      vertragsStatus(
        { beginn: "2025-01-01", ende: "2026-01-01" },
        "2026-11-25",
      ),
    ).toBe("archiv");
  });
  it("limits assignments to the absolute transaction amount", () => {
    expect(
      validate("buchungen", {
        betrag: "100",
        zuordnungen: [{ betrag: "101", mietvertrag: 1 }],
      })["zuordnungen"],
    ).toBeDefined();
    expect(
      validate("buchungen", {
        betrag: "100",
        zuordnungen: [{ betrag: "100", mietvertrag: 1 }],
      })["zuordnungen"],
    ).toBeUndefined();
  });
  it("requires positive assignments with exactly one matching target", () => {
    for (const row of [
      { betrag: "0", mietvertrag: 1 },
      { betrag: "10", mietvertrag: 1, rechnung: 1 },
      { betrag: "10", rechnung: 1 },
    ])
      expect(
        validate("buchungen", { betrag: "100", zuordnungen: [row] })[
          "zuordnungen"
        ],
      ).toBeDefined();
    expect(
      validate("buchungen", {
        betrag: "-100",
        zuordnungen: [{ betrag: "10", mietvertrag: 1 }],
      })["zuordnungen"],
    ).toBeDefined();
  });
  it("allows special repayments only for loans", () => {
    expect(
      validate("buchungen", {
        betrag: "-100",
        zuordnungen: [{ betrag: "10", rechnung: 1, ist_sondertilgung: true }],
      })["zuordnungen"],
    ).toBeDefined();
    expect(
      validate("buchungen", {
        betrag: "-100",
        zuordnungen: [{ betrag: "10", darlehen: 1, ist_sondertilgung: true }],
      })["zuordnungen"],
    ).toBeUndefined();
  });
  it("requires an annuity payment exceeding initial monthly interest", () => {
    expect(
      validate("darlehen", {
        betrag: "120000",
        sollzins: "12",
        monatsbetrag: "1200",
        art: "ANNUITAET",
      })["monatsbetrag"],
    ).toBeDefined();
    expect(
      validate("darlehen", {
        betrag: "120000",
        sollzins: "12",
        monatsbetrag: "1201",
        art: "ANNUITAET",
      })["monatsbetrag"],
    ).toBeUndefined();
  });
  it("requires positive loan principal and rate, nonnegative interest", () => {
    const e = validate("darlehen", {
      betrag: "0",
      sollzins: "-1",
      monatsbetrag: "0",
      art: "TILGUNG",
    });
    expect(e["betrag"]).toBeDefined();
    expect(e["sollzins"]).toBeDefined();
    expect(e["monatsbetrag"]).toBeDefined();
  });
  it("requires positive and date-unique land values", () => {
    expect(
      validate("bodenrichtwerte", {
        mietobjekt: 1,
        datum: "2026-01-01",
        wert: "850",
      })["datum"],
    ).toBeDefined();
    expect(
      validate("bodenrichtwerte", {
        mietobjekt: 2,
        datum: "2026-01-01",
        wert: "0",
      })["wert"],
    ).toBeDefined();
  });
  it("computes acquisition, construction and land deductions numerically", () => {
    const r = acquisition({
      kaufpreis: "100000",
      notarkosten: "2000",
      abzug_inventar: "1000",
      bauarbeiten: "10000",
      erschliessung: "500",
      anteil_grund_boden: "20000",
    });
    expect(r["summe_anschaffung"]).toBe("101000.00");
    expect(r["gesamtkosten"]).toBe("111500.00");
    expect(r["gesamtkosten_objekt"]).toBe("91500.00");
  });
  it("requires nonnegative acquisition amounts and land share at most total cost", () => {
    expect(
      validate("anschaffungskosten", { kaufpreis: "100", notarkosten: "-1" })[
        "notarkosten"
      ],
    ).toBeDefined();
    expect(
      validate("anschaffungskosten", {
        kaufpreis: "100",
        anteil_grund_boden: "101",
      })["anteil_grund_boden"],
    ).toBeDefined();
    expect(
      validate("anschaffungskosten", {
        kaufpreis: "100",
        anteil_grund_boden: "100",
      })["anteil_grund_boden"],
    ).toBeUndefined();
  });
  it("restricts WEG denominator to 100 or 1000", () => {
    expect(
      validate("mietobjekte", { weg_anteil: "50", weg_nenner: 500 })[
        "weg_nenner"
      ],
    ).toBeDefined();
    expect(
      validate("mietobjekte", { weg_anteil: "50", weg_nenner: 100 })[
        "weg_nenner"
      ],
    ).toBeUndefined();
  });
  it("restricts property identity to the eight supplied colors", () => {
    expect(
      validate("mietobjekte", { farbe: "#000000" })["farbe"],
    ).toBeDefined();
    expect(
      validate("mietobjekte", { farbe: "#1976D2" })["farbe"],
    ).toBeUndefined();
  });
  it("reduces loan balance after a special repayment", () => {
    const row = {
      id: 987,
      mietobjekt: 1,
      beginn: "2026-01-01",
      betrag: "10000",
      sollzins: "0",
      monatsbetrag: "100",
      art: "TILGUNG",
    };
    const before = Number(loan(row)["restschuld"]);
    const bookings = store["buchungen"];
    if (!bookings) throw new Error("Missing demo bookings");
    bookings.push({
      id: 987,
      buchungstag: "2026-02-01",
      betrag: "-1000",
      zuordnungen: [{ darlehen: 987, betrag: "1000", ist_sondertilgung: true }],
    });
    try {
      expect(Number(loan(row)["restschuld"])).toBe(before - 1000);
    } finally {
      bookings.pop();
    }
  });
});
