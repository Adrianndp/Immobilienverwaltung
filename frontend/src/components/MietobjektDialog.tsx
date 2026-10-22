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
import { useCreateMietobjekt } from '../api/hooks'
import {
  NUTZUNG_LABELS,
  OBJEKTART_LABELS,
  VERMIETUNG_LABELS,
  type MietobjektInput,
  type Nutzung,
} from '../api/types'
import { DIALOG_FORMULAR, useVollbild } from './dialog'
import { useMeldung } from './meldung'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

function MietobjektDialog({ open, onClose, onCreated }: Props) {
  const meldung = useMeldung()
  const vollbild = useVollbild()
  const createMietobjekt = useCreateMietobjekt()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()
  const [fehler, setFehler] = useState<Record<string, string>>({})
  const [nutzung, setNutzung] = useState<Nutzung>('VERMIETUNG')

  function close() {
    setError(undefined)
    setFehler({})
    setNutzung('VERMIETUNG')
    onClose()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = Object.fromEntries(new FormData(event.currentTarget)) as unknown as MietobjektInput
    if (nutzung === 'EIGEN') data.vermietung = ''
    setSaving(true)
    setError(undefined)
    setFehler({})
    try {
      await createMietobjekt(data)
      onCreated()
      meldung('Mietobjekt angelegt')
      close()
    } catch (e) {
      // Field errors under their field, like in the other dialogs; only the rest goes to the top.
      const felder = validierungsFehler(e)
      if (felder) {
        const { non_field_errors, detail, ...rest } = felder
        setFehler(rest)
        const allgemein = [non_field_errors, detail].filter(Boolean).join(' ')
        if (allgemein) setError(allgemein)
      } else {
        setError(e instanceof Error ? e.message : String(e))
      }
    } finally {
      setSaving(false)
    }
  }

  function fehlerProps(name: string, hinweis?: string) {
    return { error: !!fehler[name], helperText: fehler[name] ?? hinweis }
  }

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm" fullScreen={vollbild}>
      <Box component="form" onSubmit={handleSubmit} sx={DIALOG_FORMULAR}>
        <DialogTitle>Mietobjekt hinzufügen</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField name="name" label="Name" required autoComplete="off" {...fehlerProps('name', 'z. B. Wohnung 1')} />
            <TextField select name="objektart" label="Objektart" defaultValue="ETW" required {...fehlerProps('objektart')}>
              {Object.entries(OBJEKTART_LABELS).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                select
                name="nutzung"
                label="Nutzung"
                value={nutzung}
                onChange={(e) => setNutzung(e.target.value as Nutzung)}
                required
                fullWidth
                {...fehlerProps('nutzung')}
              >
                {Object.entries(NUTZUNG_LABELS).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
              {nutzung === 'VERMIETUNG' && (
                <TextField
                  select
                  name="vermietung"
                  label="Art der Vermietung"
                  defaultValue="GANZ"
                  required
                  fullWidth
                  {...fehlerProps('vermietung')}
                >
                  {Object.entries(VERMIETUNG_LABELS).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField name="strasse" label="Straße" required fullWidth autoComplete="off" {...fehlerProps('strasse')} />
              <TextField name="hausnummer" label="Hausnummer" required autoComplete="off" {...fehlerProps('hausnummer')} />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                name="plz"
                label="PLZ"
                required
                autoComplete="off"
                {...fehlerProps('plz')}
                slotProps={{ htmlInput: { pattern: '\\d{5}', maxLength: 5, inputMode: 'numeric' } }}
              />
              <TextField name="ort" label="Ort" required fullWidth autoComplete="off" {...fehlerProps('ort')} />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={close}>Abbrechen</Button>
          <Button type="submit" variant="contained" loading={saving}>
            Speichern
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}

export default MietobjektDialog
