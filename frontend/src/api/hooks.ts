import { apiRequest, useApi } from './client'
import type {
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
} from './types'

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

export function useMietvertraege(status: MietvertragStatus) {
  return useApi<Mietvertrag[]>(`/mietvertraege/?status=${status}`)
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
