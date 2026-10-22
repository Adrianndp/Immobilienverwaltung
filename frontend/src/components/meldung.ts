import { createContext, useContext } from 'react'

export interface Meldung {
  text: string
  fehler?: boolean
}

export const MeldungContext = createContext<(meldung: Meldung | string) => void>(() => {})

// Shows a short success (or error) message in the Snackbar of the layout.
export function useMeldung() {
  return useContext(MeldungContext)
}
