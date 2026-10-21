// DRF sends decimals as strings.

export type Objektart = 'ETW' | 'EFH' | 'MFH' | 'GEW' | 'SON'
export type Nutzung = 'EIGEN' | 'VERMIETUNG'
export type Vermietung = 'GANZ' | 'TEILE'
export type Farbe =
  | '#1976D2'
  | '#ED6C02'
  | '#9C27B0'
  | '#2E7D32'
  | '#D32F2F'
  | '#0097A7'
  | '#795548'
  | '#616161'

// Labels of the Django TextChoices; the serializers send only the values.
export const OBJEKTART_LABELS: Record<Objektart, string> = {
  ETW: 'Eigentumswohnung',
  EFH: 'Einfamilienhaus',
  MFH: 'Mehrfamilienhaus',
  GEW: 'Gewerbe',
  SON: 'Sonstiges',
}

export const NUTZUNG_LABELS: Record<Nutzung, string> = {
  EIGEN: 'Eigennutzung',
  VERMIETUNG: 'Vermietung',
}

export const VERMIETUNG_LABELS: Record<Vermietung, string> = {
  GANZ: 'Vermietung im Ganzen',
  TEILE: 'Vermietung in Teilen (WG)',
}

export const FARBE_LABELS: Record<Farbe, string> = {
  '#1976D2': 'Blau',
  '#ED6C02': 'Orange',
  '#9C27B0': 'Lila',
  '#2E7D32': 'Grün',
  '#D32F2F': 'Rot',
  '#0097A7': 'Türkis',
  '#795548': 'Braun',
  '#616161': 'Grau',
}

export interface Mietobjekt {
  id: number
  name: string
  farbe: Farbe
  strasse: string
  hausnummer: string
  plz: string
  ort: string
  land: string
  objektart: Objektart
  nutzung: Nutzung
  vermietung: Vermietung | ''
  kaufdatum: string | null
  kaufpreis: string | null
  grundschuld: string | null
  marktwert: string | null
  wohnflaeche: string | null
  grundstuecksflaeche: string | null
  stockwerk: number | null
  baujahr: number | null
  weg_anteil: string | null
  weg_nenner: 100 | 1000 | null
  zimmer: number
  baeder: number
  kueche: number
  balkon: number
  terrasse: number
  keller: number
  garage: number
  tiefgarage: number
  carport: number
  stellplatz: number
  // Sum over the Mietobjekt's Darlehen, null without Darlehen.
  restschuld: string | null
  // €/m², the entry with the newest datum, null without Bodenrichtwerte.
  bodenrichtwert: string | null
}

export type MietobjektInput = Pick<
  Mietobjekt,
  'name' | 'strasse' | 'hausnummer' | 'plz' | 'ort' | 'objektart' | 'nutzung'
> &
  Partial<Omit<Mietobjekt, 'id' | 'restschuld' | 'bodenrichtwert'>>

export interface Einheit {
  id: number
  mietobjekt: number
  name: string
}

export type EinheitInput = Omit<Einheit, 'id'>

export interface Mieter {
  id: number
  vorname: string
  nachname: string
  strasse: string
  hausnummer: string
  plz: string
  ort: string
  land: string
  telefon: string
  email: string
  geburtsdatum: string | null
  kontoinhaber: string
  iban: string
}

export type MietvertragStatus = 'laufend' | 'zukuenftig' | 'archiv'

export const MIETVERTRAG_STATUS_LABELS: Record<MietvertragStatus, string> = {
  laufend: 'Laufend',
  zukuenftig: 'Zukünftig',
  archiv: 'Archiv',
}

// The ?status= URL parameter; missing or unknown values mean laufend.
export function mietvertragStatus(param: string | null): MietvertragStatus {
  return param !== null && param in MIETVERTRAG_STATUS_LABELS ? (param as MietvertragStatus) : 'laufend'
}

export interface Mietvertrag {
  id: number
  mieter: Mieter
  einheit: number
  beginn: string
  ende: string | null
  kaltmiete: string
  nebenkosten: string
  kaution: string
  einheit_name: string
  mietobjekt_name: string
  farbe: Farbe
}

export type MietvertragInput = Omit<
  Mietvertrag,
  'id' | 'mieter' | 'einheit_name' | 'mietobjekt_name' | 'farbe'
> & { mieter: Omit<Mieter, 'id'> }

export type Kategorie = 'SONSTIGE' | 'INSTANDHALTUNG' | 'ABSCHREIBUNG'

export const KATEGORIE_LABELS: Record<Kategorie, string> = {
  SONSTIGE: 'Sonstige Aufwendungen',
  INSTANDHALTUNG: 'Instandhaltungsaufwendung',
  ABSCHREIBUNG: 'Abschreibung',
}

export interface Kostenart {
  id: number
  name: string
  kategorie: Kategorie
  abschreibung_prozent: string | null
  kategorie_label: string
}

export type KostenartInput = Omit<Kostenart, 'id' | 'kategorie_label'>

export interface Lieferant {
  id: number
  firmenname: string
  vorname: string
  nachname: string
  strasse: string
  hausnummer: string
  plz: string
  ort: string
  land: string
  email: string
  telefon: string
}

export type LieferantInput = Omit<Lieferant, 'id'>

export interface RechnungsAnteil {
  mietobjekt: number
  mietobjekt_name: string
  prozent: string
}

export interface Rechnung {
  id: number
  lieferant: number
  kostenart: number
  datum: string
  name: string
  rechnungsnummer: string
  betrag: string
  anteile: RechnungsAnteil[]
  lieferant_name: string
  kostenart_name: string
  offener_betrag: string
  bezahlt_am: string | null
}

export type RechnungInput = Omit<
  Rechnung,
  'id' | 'anteile' | 'lieferant_name' | 'kostenart_name' | 'offener_betrag' | 'bezahlt_am'
> & { anteile: Omit<RechnungsAnteil, 'mietobjekt_name'>[] }

export interface Zuordnung {
  betrag: string
  mietvertrag: number | null
  rechnung: number | null
  darlehen: number | null
}

export interface Buchung {
  id: number
  buchungstag: string
  wertstellung: string
  kontoinhaber: string
  buchungstext: string
  buchungsart: string
  betrag: string
  zuordnungen: Zuordnung[]
  partner: string
  rechnungen: string
}

export interface BuchungImport {
  importiert: number
  uebersprungen: number
}

export interface Deckungsbeitrag {
  einnahmen: { label: string; betrag: string }[]
  einnahmen_summe: string
  ausgaben: { kostenart: string; betrag: string }[]
  ausgaben_summe: string
  ergebnis: string
}

export interface AnlageV {
  einnahmen: {
    label: string
    anzahl_zahlungen: number
    kaltmiete: string
    nebenkosten: string
    gesamt: string
  }[]
  einnahmen_summe: string
  kaltmiete_summe: string
  nebenkosten_summe: string
  schuldzinsen: string
  instandhaltung: string
  sonstige: string
  abschreibungen: string
  werbungskosten_summe: string
  ueberschuss: string
}

export type DarlehenArt = 'ANNUITAET' | 'TILGUNG'

export const DARLEHEN_ART_LABELS: Record<DarlehenArt, string> = {
  ANNUITAET: 'Annuitätendarlehen',
  TILGUNG: 'Tilgungsdarlehen',
}

export interface Darlehen {
  id: number
  mietobjekt: number
  mietobjekt_name: string
  bank: string
  iban: string
  beginn: string
  betrag: string
  art: DarlehenArt
  zinsbindung_bis: string | null
  sollzins: string
  tilgung: string
  rate: string
  restschuld: string
  verlauf: { datum: string; rest: string }[]
  zahlungen: { datum: string; betrag: string; betreff: string; bank: string; kontostand: string }[]
}

export type DarlehenInput = Pick<
  Darlehen,
  'mietobjekt' | 'bank' | 'iban' | 'beginn' | 'betrag' | 'art' | 'zinsbindung_bis' | 'sollzins' | 'tilgung'
>

export interface Bodenrichtwert {
  id: number
  mietobjekt: number
  datum: string
  // €/m²
  wert: string
  // Grundstücksfläche (only the WEG share, if set) times wert; null without Grundstücksfläche.
  grundstueckswert: string | null
}

export type BodenrichtwertInput = Pick<Bodenrichtwert, 'mietobjekt' | 'datum' | 'wert'>
