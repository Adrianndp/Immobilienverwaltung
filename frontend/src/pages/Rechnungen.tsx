import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import { useState } from 'react'
import { validierungsFehler } from '../api/client'
import { useDeleteRechnung, useRechnungen } from '../api/hooks'
import type { Rechnung } from '../api/types'
import RechnungDialog from '../components/RechnungDialog'
import RechnungenTabelle from '../components/RechnungenTabelle'
import Laden, { Ladefehler } from '../components/Laden'
import { useMeldung } from '../components/meldung'

function Rechnungen() {
  const meldung = useMeldung()
  const { data: rechnungen, loading, error, reload } = useRechnungen()
  const deleteRechnung = useDeleteRechnung()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [zuLoeschen, setZuLoeschen] = useState<Rechnung>()
  const [loeschend, setLoeschend] = useState(false)

  async function loeschen() {
    if (!zuLoeschen) return
    setLoeschend(true)
    try {
      await deleteRechnung(zuLoeschen.id)
      reload()
      meldung('Rechnung gelöscht')
    } catch (e) {
      // 400 from the backend: already linked to a bank payment.
      meldung({ text: validierungsFehler(e)?.detail ?? (e instanceof Error ? e.message : String(e)), fehler: true })
    } finally {
      setLoeschend(false)
      setZuLoeschen(undefined)
    }
  }

  const anlegen = (
    <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
      Anlegen
    </Button>
  )

  return (
    <Stack spacing={2}>
      <Stack direction="row" useFlexGap sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h4">Rechnungen</Typography>
        {anlegen}
      </Stack>
      {dialogOpen && <RechnungDialog onClose={() => setDialogOpen(false)} onSaved={reload} />}

      <Dialog open={!!zuLoeschen} onClose={() => setZuLoeschen(undefined)}>
        <DialogTitle>Rechnung löschen?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            „{zuLoeschen?.name}“ ({zuLoeschen?.rechnungsnummer}) wird endgültig gelöscht.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setZuLoeschen(undefined)}>Abbrechen</Button>
          <Button color="error" variant="contained" loading={loeschend} onClick={loeschen}>
            Löschen
          </Button>
        </DialogActions>
      </Dialog>

      {loading && <Laden />}
      {error && <Ladefehler text="Rechnungen konnten nicht geladen werden." error={error} />}
      {rechnungen?.length === 0 && (
        <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
          <Typography color="text.secondary">Noch keine Rechnungen angelegt.</Typography>
          {anlegen}
        </Stack>
      )}

      {!!rechnungen?.length && <RechnungenTabelle rechnungen={rechnungen} onDelete={setZuLoeschen} />}
    </Stack>
  )
}

export default Rechnungen
