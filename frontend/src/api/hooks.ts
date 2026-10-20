import { useApi } from './client'
import type { Einheit, Mietobjekt } from './types'

export function useMietobjekte() {
  return useApi<Mietobjekt[]>('/mietobjekte/')
}

export function useEinheiten(mietobjektId?: number) {
  const query = mietobjektId === undefined ? '' : `?mietobjekt=${mietobjektId}`
  return useApi<Einheit[]>(`/einheiten/${query}`)
}