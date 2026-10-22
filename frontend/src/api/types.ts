// DRF sends decimals as strings.

export type Objektart = 'EFH' | 'EFE' | 'ZFH' | 'RMH' | 'REH' | 'MFH' | 'ETW' | 'DHH'
export type WegNenner = 100 | 1000
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
  EFH: 'Einfamilienhaus',
  EFE: 'Einfamilienhaus mit Einliegerwohnung',
  ZFH: 'Zweifamilienhaus',
  RMH: 'Reihenmittelhaus',
  REH: 'Reihenendhaus',
  MFH: 'Mehrfamilienhaus',
  ETW: 'Eigentumswohnung',
  DHH: 'Doppelhaushälfte',
}

// Objektarten with a WEG-Anteil; for the others it is hidden and sent as null.
// Same list as Mietobjekt.WEG_OBJEKTARTEN in the backend.
export const WEG_OBJEKTARTEN: Objektart[] = ['EFE', 'RMH', 'REH', 'MFH', 'ETW', 'DHH']

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
  weg_nenner: WegNenner | null
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
  // Zuordnungen to its Mietverträge minus its share of all Rechnungen.
  // Last 12 months; null for Eigennutzung.
  erwirtschafteter_betrag: string | null
}

export type MietobjektInput = Pick<
  Mietobjekt,
  'name' | 'strasse' | 'hausnummer' | 'plz' | 'ort' | 'objektart' | 'nutzung'
> &
  Partial<Omit<Mietobjekt, 'id' | 'restschuld' | 'bodenrichtwert'>>

// The amounts of the Kaufpreis popup. kaufpreis is Mietobjekt.kaufpreis; the others are "0.00" until entered.
export interface AnschaffungskostenInput {
  kaufpreis: string | null
  gebuehren: string
  vormerkung: string
  grundbuchauszug: string
  grunderwerbsteuer: string
  notarkosten: string
  maklerprovision: string
  abzug_instandhaltungsruecklage: string
  abzug_inventar: string
  einstellplaetze: string
  anschlusskosten: string
  architekt: string
  bauarbeiten: string
  baumaterial: string
  bodenbelaege: string
  taefelung: string
  elektro: string
  fenster: string
  garten: string
  heizung: string
  maler: string
  sanitaer: string
  umzaeunung: string
  sonstiges: string
  erschliessung: string
  anteil_grund_boden: string
}

// Computed by the API, the same way the popup computes them while typing.
export interface Anschaffungskosten extends AnschaffungskostenInput {
  summe_anschaffung: string
  summe_herstellung: string
  summe_nachtraeglich: string
  gesamtkosten: string
  gesamtkosten_objekt: string
}

export interface Einheit {
  id: number
  mietobjekt: number
  name: string
  // Any Mietvertrag, also future and ended ones; such an Einheit cannot be deleted.
  hat_vertraege: boolean
}

export type EinheitInput = Omit<Einheit, 'id' | 'hat_vertraege'>

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

// Same rules as the API's ?status= filter. heute as "YYYY-MM-DD", like the API's dates.
export function vertragsStatus(mv: Pick<Mietvertrag, 'beginn' | 'ende'>, heute: string): MietvertragStatus {
  if (mv.beginn > heute) return 'zukuenftig'
  if (mv.ende !== null && mv.ende < heute) return 'archiv'
  return 'laufend'
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
  // Zuordnungen to this contract.
  einnahmen_seit_beginn: string
  // The Einheit's equal share of the Mietobjekt's Rechnungen dated within the contract.
  kosten_seit_beginn: string
}

export type MietvertragInput = Omit<
  Mietvertrag,
  'id' | 'mieter' | 'einheit_name' | 'mietobjekt_name' | 'farbe' | 'einnahmen_seit_beginn' | 'kosten_seit_beginn'
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
  // abs(betrag) minus the Zuordnungen, so also positive for outgoing Buchungen.
  nicht_zugeordnet: string
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

// The logged-in Django user.
export interface Benutzer {
  username: string
  first_name: string
  last_name: string
}

export interface Anmeldestatus {
  angemeldet: boolean
}

export interface Anmeldedaten {
  username: string
  password: string
}
