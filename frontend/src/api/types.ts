// DRF sends decimals as strings.

export type Objektart = 'ETW' | 'EFH' | 'MFH' | 'GEW' | 'SON'
export type Nutzung = 'EIGEN' | 'VERMIETUNG'
export type Vermietung = 'GANZ' | 'TEILE'

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

export interface Mietobjekt {
  id: number
  name: string
  farbe: string
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
  'name' | 'farbe' | 'strasse' | 'hausnummer' | 'plz' | 'ort' | 'objektart' | 'nutzung'
> &
  Partial<Omit<Mietobjekt, 'id'>>

export interface Einheit {
  id: number
  mietobjekt: number
  name: string
}
