import { apiRequest, apiUpload, useApi } from './client'
import type {
  AnlageV,
  Anmeldedaten,
  Anmeldestatus,
  Benutzer,
  Bodenrichtwert,
  BodenrichtwertInput,
  Buchung,
  BuchungImport,
  Darlehen,
  DarlehenInput,
  Deckungsbeitrag,
  Einheit,
  EinheitInput,
  Kostenart,
  KostenartInput,
  Lieferant,
  LieferantInput,
  Mietobjekt,
  MietobjektInput,
  Mietvertrag,
  MietvertragInput,
  MietvertragStatus,
  Rechnung,
  RechnungInput,
  Zuordnung,
} from './types'

// Also sets the CSRF cookie that useAnmelden needs.
export function useAnmeldestatus() {
  return useApi<Anmeldestatus>('/auth/anmelden/')
}

export function useAnmelden() {
  return (daten: Anmeldedaten) => apiRequest<Benutzer>('POST', '/auth/anmelden/', daten)
}

export function useAbmelden() {
  return () => apiRequest<void>('POST', '/auth/abmelden/')
}

export function useBenutzer() {
  return useApi<Benutzer>('/benutzer/')
}

export function useMietobjekte() {
  return useApi<Mietobjekt[]>('/mietobjekte/')
}

export function useMietobjekt(id: number) {
  return useApi<Mietobjekt>(`/mietobjekte/${id}/`)
}

export function useEinheiten(mietobjektId?: number) {
  const query = mietobjektId === undefined ? '' : `?mietobjekt=${mietobjektId}`
  return useApi<Einheit[]>(`/einheiten/${query}`)
}

export function useCreateMietobjekt() {
  return (data: MietobjektInput) => apiRequest<Mietobjekt>('POST', '/mietobjekte/', data)
}

export function useUpdateMietobjekt() {
  return (id: number, data: Partial<MietobjektInput>) =>
    apiRequest<Mietobjekt>('PATCH', `/mietobjekte/${id}/`, data)
}

export function useCreateEinheit() {
  return (data: EinheitInput) => apiRequest<Einheit>('POST', '/einheiten/', data)
}

export function useDeleteEinheit() {
  return (id: number) => apiRequest<void>('DELETE', `/einheiten/${id}/`)
}

// Without status: all Mietverträge.
export function useMietvertraege(status?: MietvertragStatus) {
  const query = status === undefined ? '' : `?status=${status}`
  return useApi<Mietvertrag[]>(`/mietvertraege/${query}`)
}

export function useCreateMietvertrag() {
  return (data: MietvertragInput) => apiRequest<Mietvertrag>('POST', '/mietvertraege/', data)
}

export function useUpdateMietvertrag() {
  return (id: number, data: Partial<MietvertragInput>) =>
    apiRequest<Mietvertrag>('PATCH', `/mietvertraege/${id}/`, data)
}

export function useKostenarten() {
  return useApi<Kostenart[]>('/kostenarten/')
}

export function useCreateKostenart() {
  return (data: KostenartInput) => apiRequest<Kostenart>('POST', '/kostenarten/', data)
}

export function useLieferanten() {
  return useApi<Lieferant[]>('/lieferanten/')
}

export function useLieferant(id: number) {
  return useApi<Lieferant>(`/lieferanten/${id}/`)
}

export function useCreateLieferant() {
  return (data: LieferantInput) => apiRequest<Lieferant>('POST', '/lieferanten/', data)
}

export function useUpdateLieferant() {
  return (id: number, data: Partial<LieferantInput>) =>
    apiRequest<Lieferant>('PATCH', `/lieferanten/${id}/`, data)
}

export function useRechnungen(lieferantId?: number) {
  const query = lieferantId === undefined ? '' : `?lieferant=${lieferantId}`
  return useApi<Rechnung[]>(`/rechnungen/${query}`)
}

export function useCreateRechnung() {
  return (data: RechnungInput) => apiRequest<Rechnung>('POST', '/rechnungen/', data)
}

export function useDeleteRechnung() {
  return (id: number) => apiRequest<void>('DELETE', `/rechnungen/${id}/`)
}

export function useBuchungen() {
  return useApi<Buchung[]>('/buchungen/')
}

export function useImportBuchungen() {
  return (datei: File) => {
    const data = new FormData()
    data.append('datei', datei)
    return apiUpload<BuchungImport>('/buchungen/import/', data)
  }
}

export function useZuordnenBuchung() {
  return (id: number, zuordnungen: Zuordnung[]) =>
    apiRequest<Buchung>('PATCH', `/buchungen/${id}/`, { zuordnungen })
}

export function useDeckungsbeitrag(mietobjektId: number, jahr: number, monat?: number) {
  const query = `?mietobjekt=${mietobjektId}&jahr=${jahr}${monat === undefined ? '' : `&monat=${monat}`}`
  return useApi<Deckungsbeitrag>(`/auswertung/deckungsbeitrag/${query}`)
}

export function useAnlageV(mietobjektId: number, jahr: number) {
  return useApi<AnlageV>(`/auswertung/anlage-v/?mietobjekt=${mietobjektId}&jahr=${jahr}`)
}

// Without mietobjektId: all Darlehen.
export function useDarlehen(mietobjektId?: number) {
  const query = mietobjektId === undefined ? '' : `?mietobjekt=${mietobjektId}`
  return useApi<Darlehen[]>(`/darlehen/${query}`)
}

export function useCreateDarlehen() {
  return (data: DarlehenInput) => apiRequest<Darlehen>('POST', '/darlehen/', data)
}

export function useUpdateDarlehen() {
  return (id: number, data: Partial<DarlehenInput>) => apiRequest<Darlehen>('PATCH', `/darlehen/${id}/`, data)
}

// Newest first.
export function useBodenrichtwerte(mietobjektId: number) {
  return useApi<Bodenrichtwert[]>(`/bodenrichtwerte/?mietobjekt=${mietobjektId}`)
}

export function useCreateBodenrichtwert() {
  return (data: BodenrichtwertInput) => apiRequest<Bodenrichtwert>('POST', '/bodenrichtwerte/', data)
}

export function useDeleteBodenrichtwert() {
  return (id: number) => apiRequest<void>('DELETE', `/bodenrichtwerte/${id}/`)
}
