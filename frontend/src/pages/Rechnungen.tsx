import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
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

function Rechnungen() {
  const { data: rechnungen, loading, error, reload } = useRechnungen()
  const deleteRechnung = useDeleteRechnung()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [zuLoeschen, setZuLoeschen] = useState<Rechnung>()
  const [loeschend, setLoeschend] = useState(false)
  const [loeschFehler, setLoeschFehler] = useState<string>()

  async function loeschen() {
    if (!zuLoeschen) return
    setLoeschend(true)
    setLoeschFehler(undefined)
    try {
      await deleteRechnung(zuLoeschen.id)
      reload()
    } catch (e) {
      // 400 from the backend: already linked to a bank payment.
      setLoeschFehler(validierungsFehler(e)?.detail ?? (e instanceof Error ? e.message : String(e)))
    } finally {
      setLoeschend(false)
      setZuLoeschen(undefined)
    }
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">Rechnungen</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Anlegen
        </Button>
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

      {loeschFehler && (
        <Alert severity="error" onClose={() => setLoeschFehler(undefined)}>
          {loeschFehler}
        </Alert>
      )}
      {loading && <CircularProgress />}
      {error && <Alert severity="error">Rechnungen konnten nicht geladen werden.</Alert>}
      {rechnungen?.length === 0 && (
        <Typography color="text.secondary">Noch keine Rechnungen angelegt.</Typography>
      )}

      {!!rechnungen?.length && <RechnungenTabelle rechnungen={rechnungen} onDelete={setZuLoeschen} />}
    </Stack>
  )
}

export default Rechnungen
