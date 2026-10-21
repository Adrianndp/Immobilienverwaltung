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

export function formatEuro(value: string | null) {
  if (value === null) return LEER
  return Number(value).toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  })
}

// "2024-03-15" -> "15.03.2024", without going through Date to avoid time zone shifts.
export function formatDatum(value: string | null) {
  if (!value) return LEER
  const [jahr, monat, tag] = value.split('-')
  return `${tag}.${monat}.${jahr}`
}
