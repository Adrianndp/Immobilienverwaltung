const laenderNamen = new Intl.DisplayNames('de-DE', { type: 'region' })

// "DE" -> "Deutschland"; falls back to the code itself if it is not a known region.
export function laenderName(code: string) {
  try {
    return laenderNamen.of(code) ?? code
  } catch {
    return code
  }
}
