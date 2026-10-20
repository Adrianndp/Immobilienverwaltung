import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import { useState, type FormEvent } from 'react'
import { useCreateMietobjekt } from '../api/hooks'
import type { MietobjektInput } from '../api/types'

const OBJEKTTYPEN = [
  ['MFH', 'Mehrfamilienhaus'],
  ['ETW', 'Eigentumswohnung'],
  ['EFH', 'Einfamilienhaus'],
  ['GEW', 'Gewerbeeinheit'],
  ['GAR', 'Garage/Stellplatz'],
  ['SON', 'Sonstiges'],
]

interface Props {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

function MietobjektDialog({ open, onClose, onCreated }: Props) {
  const createMietobjekt = useCreateMietobjekt()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()

  function close() {
    setError(undefined)
    onClose()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = Object.fromEntries(new FormData(event.currentTarget)) as MietobjektInput
    setSaving(true)
    try {
      await createMietobjekt(data)
      onCreated()
      close()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
      <form onSubmit={handleSubmit}>
        <DialogTitle>Mietobjekt hinzufügen</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField select name="objekttyp" label="Objekttyp" defaultValue="MFH" required>
              {OBJEKTTYPEN.map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
            <Stack direction="row" spacing={2}>
              <TextField name="strasse" label="Straße" required fullWidth />
              <TextField name="hausnummer" label="Hausnummer" required />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField
                name="plz"
                label="PLZ"
                required
                slotProps={{ htmlInput: { pattern: '\\d{5}', maxLength: 5 } }}
              />
              <TextField name="stadt" label="Stadt" required fullWidth />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={close}>Abbrechen</Button>
          <Button type="submit" variant="contained" loading={saving}>
            Speichern
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default MietobjektDialog
