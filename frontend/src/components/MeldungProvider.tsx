import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import { useCallback, useState, type ReactNode } from 'react'
import { MeldungContext, type Meldung } from './meldung'

function MeldungProvider({ children }: { children: ReactNode }) {
  // Kept after closing, so the text does not vanish during the exit animation.
  const [meldung, setMeldung] = useState<Meldung>()
  const [offen, setOffen] = useState(false)

  const zeigen = useCallback((m: Meldung | string) => {
    setMeldung(typeof m === 'string' ? { text: m } : m)
    setOffen(true)
  }, [])

  return (
    <MeldungContext value={zeigen}>
      {children}
      <Snackbar
        open={offen}
        autoHideDuration={meldung?.fehler ? 8000 : 4000}
        onClose={(_, grund) => grund !== 'clickaway' && setOffen(false)}
      >
        <Alert severity={meldung?.fehler ? 'error' : 'success'} variant="filled" onClose={() => setOffen(false)}>
          {meldung?.text}
        </Alert>
      </Snackbar>
    </MeldungContext>
  )
}

export default MeldungProvider
