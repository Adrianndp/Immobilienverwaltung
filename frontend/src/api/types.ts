export interface Mietobjekt {
  id: number
  objekttyp: 'MFH' | 'ETW' | 'EFH' | 'GEW' | 'GAR' | 'SON'
  strasse: string
  hausnummer: string
  plz: string
  stadt: string
  land: string
  erstellt_am: string
  geaendert_am: string
  objekttyp_label: string
}

export type MietobjektInput = Pick<Mietobjekt, 'objekttyp' | 'strasse' | 'hausnummer' | 'plz' | 'stadt'>

export interface Einheit {
  id: number
  mietobjekt: number
  einheitstyp: 'WHG' | 'GEW' | 'GAR' | 'SON'
  bezeichnung: string
  vermietete_flaeche: string // DRF sends decimals as strings
  geschoss: 'KG' | 'UG' | 'EG' | 'OG' | 'ZG' | 'DG' | ''
  etage: number
  lage: 'L' | 'M' | 'R' | ''
  einheitstyp_label: string
  geschoss_label: string
  lage_label: string
}