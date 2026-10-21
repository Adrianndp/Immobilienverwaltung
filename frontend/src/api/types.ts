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
}

export type MietobjektInput = Pick<
  Mietobjekt,
  'name' | 'strasse' | 'hausnummer' | 'plz' | 'ort' | 'objektart' | 'nutzung'
> &
  Partial<Omit<Mietobjekt, 'id'>>

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
