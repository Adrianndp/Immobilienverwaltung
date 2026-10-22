import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import { useState, type FormEvent } from 'react'
import { validierungsFehler } from '../api/client'
import { useCreateKostenart } from '../api/hooks'
import { KATEGORIE_LABELS, type Kategorie } from '../api/types'
import { DIALOG_FORMULAR, useVollbild } from './dialog'

interface Props {
  onClose: () => void
  onSaved: () => void
}

function KostenartDialog({ onClose, onSaved }: Props) {
  const vollbild = useVollbild()
  const createKostenart = useCreateKostenart()
  const [name, setName] = useState('')
  const [kategorie, setKategorie] = useState<Kategorie>('SONSTIGE')
  const [prozent, setProzent] = useState('')
  const [fehler, setFehler] = useState<Record<string, string>>({})
  const [allgemeinerFehler, setAllgemeinerFehler] = useState<string>()
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setFehler({})
    setAllgemeinerFehler(undefined)
    try {
      await createKostenart({
        name,
        kategorie,
        abschreibung_prozent: kategorie === 'ABSCHREIBUNG' ? prozent || null : null,
      })
      onSaved()
      onClose()
    } catch (e) {
      const felder = validierungsFehler(e)
      if (felder) {
        const { non_field_errors, detail, ...rest } = felder
        setFehler(rest)
        const allgemein = [non_field_errors, detail].filter(Boolean).join(' ')
        if (allgemein) setAllgemeinerFehler(allgemein)
      } else {
        setAllgemeinerFehler(e instanceof Error ? e.message : String(e))
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" fullScreen={vollbild}>
      <Box component="form" onSubmit={handleSubmit} sx={DIALOG_FORMULAR}>
        <DialogTitle>Kostenart anlegen</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {allgemeinerFehler && <Alert severity="error">{allgemeinerFehler}</Alert>}
            <TextField
              label="Name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={!!fehler.name}
              helperText={fehler.name}
            />
            <TextField
              select
              label="Kategorie (Anlage V)"
              required
              value={kategorie}
              onChange={(e) => setKategorie(e.target.value as Kategorie)}
              error={!!fehler.kategorie}
              helperText={fehler.kategorie}
            >
              {Object.entries(KATEGORIE_LABELS).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
            {kategorie === 'ABSCHREIBUNG' && (
              <TextField
                label="Abschreibung %"
                type="number"
                required
                value={prozent}
                onChange={(e) => setProzent(e.target.value)}
                error={!!fehler.abschreibung_prozent}
                helperText={fehler.abschreibung_prozent}
                slotProps={{ htmlInput: { step: '0.01', min: 0.01, max: 100 } }}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Abbrechen</Button>
          <Button type="submit" variant="contained" loading={saving}>
            Speichern
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}

export default KostenartDialog
