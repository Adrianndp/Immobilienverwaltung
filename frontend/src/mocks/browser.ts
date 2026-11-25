import { setupWorker } from "msw/browser";
import { http, HttpResponse } from "msw";
import {
  store,
  find,
  decorate,
  validate,
  overlap,
  acquisition,
  analysis,
  type Row,
} from "./store";
import { vertragsStatus } from "@/api/types";
import { heuteIso } from "@/format";
let session = !document.cookie.includes("demo_session=out");
export const worker = setupWorker(
  http.all("/api/*", async ({ request }) => {
    const url = new URL(request.url);
    const parts = url.pathname.slice(5).split("/").filter(Boolean);
    const resource = parts[0] ?? "";
    const action = parts[1];
    const id = Number(action);
    const method = request.method;
    if (resource === "auth") {
      if (action === "abmelden") {
        session = false;
        document.cookie = "demo_session=out; path=/; SameSite=Lax";
        return new HttpResponse(null, { status: 204 });
      }
      if (method === "GET") {
        document.cookie = "csrftoken=demo-csrf; path=/; SameSite=Lax";
        return HttpResponse.json({ angemeldet: session });
      }
      const d = (await request.json()) as Row;
      if (d["username"] === "demo" && d["password"] === "demo") {
        session = true;
        document.cookie = "demo_session=in; path=/; SameSite=Lax";
        return HttpResponse.json({
          username: "demo",
          first_name: "Adrian",
          last_name: "Diaz",
        });
      }
      return HttpResponse.json(
        { detail: "Benutzername oder Passwort ist falsch." },
        { status: 400 },
      );
    }
    if (!session)
      return HttpResponse.json(
        { detail: "Nicht angemeldet." },
        { status: 403 },
      );
    if (resource === "benutzer")
      return HttpResponse.json({
        username: "demo",
        first_name: "Adrian",
        last_name: "Diaz",
      });
    if (resource === "auswertung")
      return HttpResponse.json(
        analysis(
          Number(url.searchParams.get("mietobjekt")),
          Number(url.searchParams.get("jahr")),
          url.searchParams.has("monat")
            ? Number(url.searchParams.get("monat"))
            : undefined,
        ),
      );
    if (parts[2] === "anschaffungskosten") {
      let row =
        store["anschaffungskosten"]?.find((r) => r["mietobjekt"] === id) ??
        Object.fromEntries(
          [
            "gebuehren",
            "vormerkung",
            "grundbuchauszug",
            "grunderwerbsteuer",
            "notarkosten",
            "maklerprovision",
            "abzug_instandhaltungsruecklage",
            "abzug_inventar",
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
            "erschliessung",
            "anteil_grund_boden",
          ].map((k) => [k, "0.00"]),
        );
      row = {
        ...row,
        kaufpreis: find("mietobjekte", id)?.["kaufpreis"] ?? "0.00",
      };
      if (method === "PUT") {
        const data = (await request.json()) as Row;
        const result = acquisition(data);
        if (
          Object.values(data).some((v) => Number(v) < 0) ||
          Number(data["anteil_grund_boden"]) > Number(result["gesamtkosten"])
        )
          return HttpResponse.json(
            {
              anteil_grund_boden: [
                "Alle Beträge müssen positiv sein. Der Bodenanteil darf die Gesamtkosten nicht übersteigen.",
              ],
            },
            { status: 400 },
          );
        row = { ...data, mietobjekt: id };
        store["anschaffungskosten"] = (store["anschaffungskosten"] ?? [])
          .filter((r) => r["mietobjekt"] !== id)
          .concat(row);
        const object = find("mietobjekte", id);
        if (object) object["kaufpreis"] = data["kaufpreis"];
      }
      return HttpResponse.json(acquisition(row));
    }
    if (resource === "buchungen" && action === "alle-loeschen") {
      const count = store["buchungen"]?.length ?? 0;
      store["buchungen"] = [];
      return HttpResponse.json({ geloescht: count });
    }
    if (resource === "buchungen" && action === "import") {
      const form = await request.formData();
      const file = form.get("datei");
      if (!(file instanceof File))
        return HttpResponse.json(
          { detail: "Bitte eine CSV-Datei auswählen." },
          { status: 400 },
        );
      const lines = (await file.text()).trim().split(/\r?\n/);
      const keys = (lines.shift() ?? "").split(",");
      const required = [
        "buchungstag",
        "wertstellung",
        "kontoinhaber",
        "buchungstext",
        "buchungsart",
        "betrag",
      ];
      if (!required.every((k) => keys.includes(k)))
        return HttpResponse.json(
          { detail: "Die CSV-Datei enthält nicht die erwarteten Spalten." },
          { status: 400 },
        );
      let importiert = 0,
        uebersprungen = 0;
      for (const line of lines) {
        const vals = line.split(",");
        const row = Object.fromEntries(keys.map((k, i) => [k, vals[i] ?? ""]));
        if (
          !Number.isFinite(Number(row["betrag"])) ||
          !/^\d{4}-\d{2}-\d{2}$/.test(row["buchungstag"] ?? "")
        )
          return HttpResponse.json(
            { detail: "Ungültige Datums- oder Betragswerte." },
            { status: 400 },
          );
        if (
          store["buchungen"]?.some(
            (b) =>
              b["buchungstag"] === row["buchungstag"] &&
              b["buchungstext"] === row["buchungstext"] &&
              b["betrag"] === row["betrag"],
          )
        )
          uebersprungen++;
        else {
          store["buchungen"]?.push({
            ...row,
            id: Date.now() + importiert,
            zuordnungen: [],
          });
          importiert++;
        }
      }
      return HttpResponse.json({ importiert, uebersprungen });
    }
    if (!store[resource])
      return HttpResponse.json({ detail: "Nicht gefunden." }, { status: 404 });
    if (method === "GET") {
      if (id) {
        const r = find(resource, id);
        return r
          ? HttpResponse.json(decorate(resource, r))
          : HttpResponse.json({ detail: "Nicht gefunden." }, { status: 404 });
      }
      let rows = store[resource] ?? [];
      for (const key of ["mietobjekt", "lieferant"])
        if (url.searchParams.has(key))
          rows = rows.filter(
            (r) => r[key] === Number(url.searchParams.get(key)),
          );
      if (resource === "mietvertraege" && url.searchParams.has("status"))
        rows = rows.filter(
          (r) =>
            vertragsStatus(r as any, heuteIso()) ===
            url.searchParams.get("status"),
        );
      if (resource === "bodenrichtwerte")
        rows = [...rows].sort((a, b) => b["datum"].localeCompare(a["datum"]));
      if (resource === "buchungen")
        rows = [...rows].sort((a, b) =>
          b["buchungstag"].localeCompare(a["buchungstag"]),
        );
      return HttpResponse.json(rows.map((r) => decorate(resource, r)));
    }
    if (method === "DELETE") {
      const r = find(resource, id);
      if (
        resource === "einheiten" &&
        (store["mietvertraege"] ?? []).some((m) => m["einheit"] === id)
      )
        return HttpResponse.json(
          { detail: "Einheiten mit Verträgen können nicht gelöscht werden." },
          { status: 400 },
        );
      store[resource] = (store[resource] ?? []).filter((r) => r["id"] !== id);
      if (resource === "rechnungen")
        for (const b of store["buchungen"] ?? [])
          b["zuordnungen"] = b["zuordnungen"].filter(
            (z: Row) => z["rechnung"] !== id,
          );
      return new HttpResponse(null, { status: 204 });
    }
    const data = (await request.json()) as Row;
    const row = { ...(id ? find(resource, id) : {}), ...data };
    if (resource === "mietobjekte") {
      const defaults = {
        land: "DE",
        farbe: "#1976D2",
        vermietung: "",
        kaufdatum: null,
        kaufpreis: null,
        grundschuld: null,
        marktwert: null,
        wohnflaeche: null,
        grundstuecksflaeche: null,
        stockwerk: null,
        baujahr: null,
        weg_anteil: null,
        weg_nenner: null,
        zimmer: "0",
        baeder: 0,
        kueche: 0,
        balkon: 0,
        terrasse: 0,
        keller: 0,
        garage: 0,
        tiefgarage: 0,
        carport: 0,
        stellplatz: 0,
      };
      for (const [k, v] of Object.entries(defaults))
        if (row[k] === undefined) row[k] = v;
      if (row["nutzung"] === "EIGEN") row["vermietung"] = "";
      if (
        !["EFE", "RMH", "REH", "MFH", "ETW", "DHH"].includes(row["objektart"])
      ) {
        row["weg_anteil"] = null;
        row["weg_nenner"] = null;
      }
    }
    const errors = validate(resource, row, id || undefined);
    if (Object.keys(errors).length)
      return HttpResponse.json(errors, { status: 400 });
    if (resource === "mietvertraege") {
      const conflict = overlap(row, id || undefined);
      if (conflict) {
        if (!row["aelteren_beenden"] || !conflict.kann_beenden)
          return HttpResponse.json(conflict, { status: 409 });
        for (const c of conflict.konflikte) {
          const old = find(resource, c.id);
          const d = new Date(row["beginn"]);
          d.setDate(d.getDate() - 1);
          if (old) old["ende"] = d.toISOString().slice(0, 10);
        }
      }
      row["mieter"] = { ...row["mieter"], id: row["mieter"]?.id ?? Date.now() };
    }
    if (id) {
      const i = store[resource]?.findIndex((r) => r["id"] === id) ?? -1;
      if (i < 0)
        return HttpResponse.json(
          { detail: "Nicht gefunden." },
          { status: 404 },
        );
      const list = store[resource];
      if (list) list[i] = row;
    } else {
      row["id"] =
        Math.max(0, ...(store[resource] ?? []).map((r) => r["id"])) + 1;
      store[resource]?.push(row);
    }
    return HttpResponse.json(decorate(resource, row), {
      status: method === "POST" ? 201 : 200,
    });
  }),
);
