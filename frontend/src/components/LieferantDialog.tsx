import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import { useState, type ChangeEvent, type FormEvent } from 'react'
import { validierungsFehler } from '../api/client'
import { useCreateLieferant } from '../api/hooks'
import type { LieferantInput } from '../api/types'
import { laenderName } from '../format'

const LEER_LIEFERANT: LieferantInput = {
  firmenname: '',
  vorname: '',
  nachname: '',
  strasse: '',
  hausnummer: '',
  plz: '',
  ort: '',
  land: 'DE',
  email: '',
  telefon: '',
}

interface Props {
  onClose: () => void
  onSaved: () => void
}

function LieferantDialog({ onClose, onSaved }: Props) {
  const createLieferant = useCreateLieferant()
  const [werte, setWerte] = useState(LEER_LIEFERANT)
  const [fehler, setFehler] = useState<Record<string, string>>({})
  const [allgemeinerFehler, setAllgemeinerFehler] = useState<string>()
  const [saving, setSaving] = useState(false)

  function feld(name: keyof LieferantInput) {
    return {
      name,
      value: werte[name],
      onChange: (e: ChangeEvent<HTMLInputElement>) => setWerte((w) => ({ ...w, [name]: e.target.value })),
      error: !!fehler[name],
      helperText: fehler[name],
      fullWidth: true,
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setFehler({})
    setAllgemeinerFehler(undefined)
    try {
      await createLieferant(werte)
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
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <form onSubmit={handleSubmit}>
        <DialogTitle>Lieferant anlegen</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            {allgemeinerFehler && (
              <Grid size={12}>
                <Alert severity="error">{allgemeinerFehler}</Alert>
              </Grid>
            )}
            <Grid size={12}>
              <TextField label="Firmenname" {...feld('firmenname')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Vorname" {...feld('vorname')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Nachname" {...feld('nachname')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 8 }}>
              <TextField label="Straße" {...feld('strasse')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="Hausnummer" {...feld('hausnummer')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="PLZ"
                {...feld('plz')}
                slotProps={{ htmlInput: { maxLength: 5, inputMode: 'numeric' } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 5 }}>
              <TextField label="Ort" {...feld('ort')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                label="Land"
                {...feld('land')}
                onChange={(e) => setWerte((w) => ({ ...w, land: e.target.value.toUpperCase() }))}
                helperText={fehler.land ?? laenderName(werte.land)}
                slotProps={{ htmlInput: { maxLength: 2 } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="E-Mail" type="email" {...feld('email')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Telefon" type="tel" {...feld('telefon')} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Abbrechen</Button>
          <Button type="submit" variant="contained" loading={saving}>
            Speichern
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default LieferantDialog
