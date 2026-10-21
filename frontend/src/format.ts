export const LEER = '–'

const laenderNamen = new Intl.DisplayNames('de-DE', { type: 'region' })

// "DE" -> "Deutschland"; falls back to the code itself if it is not a known region.
export function laenderName(code: string) {
  try {
    return laenderNamen.of(code) ?? code
  } catch {
    return code
  }
}

export function oderLeer(value: string | null) {
  return value || LEER
}

export function formatEuro(value: string | null, nachkommastellen = 0) {
  if (value === null) return LEER
  return Number(value).toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: nachkommastellen,
    maximumFractionDigits: nachkommastellen,
  })
}

// "80.00" -> "80 %", "33.50" -> "33,5 %"
export function formatProzent(value: string) {
  return `${Number(value).toLocaleString('de-DE')} %`
}

// Lieferanten have either a firmenname or a person's name.
export function lieferantName(l: { firmenname: string; vorname: string; nachname: string }) {
  return l.firmenname || `${l.vorname} ${l.nachname}`.trim()
}

// "2024-03-15" -> "15.03.2024", without going through Date to avoid time zone shifts.
export function formatDatum(value: string | null) {
  if (!value) return LEER
  const [jahr, monat, tag] = value.split('-')
  return `${tag}.${monat}.${jahr}`
}
