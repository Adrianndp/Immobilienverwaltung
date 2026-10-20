import { apiRequest, useApi } from './client'
import type { Einheit, Mietobjekt, MietobjektInput } from './types'

export function useMietobjekte() {
  return useApi<Mietobjekt[]>('/mietobjekte/')
}

export function useEinheiten(mietobjektId?: number) {
  const query = mietobjektId === undefined ? '' : `?mietobjekt=${mietobjektId}`
  return useApi<Einheit[]>(`/einheiten/${query}`)
}

export function useCreateMietobjekt() {
  return (data: MietobjektInput) => apiRequest<Mietobjekt>('POST', '/mietobjekte/', data)
}
