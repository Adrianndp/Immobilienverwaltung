import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormHelperText from '@mui/material/FormHelperText'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import { useState, type ChangeEvent, type FormEvent } from 'react'
import { validierungsFehler } from '../api/client'
import { useCreateRechnung, useKostenarten, useLieferanten, useMietobjekte } from '../api/hooks'
import { dezimal, lieferantName } from '../format'
import { DIALOG_FORMULAR, useVollbild } from './dialog'
import { useMeldung } from './meldung'

type Feld = 'datum' | 'name' | 'rechnungsnummer' | 'betrag'

interface Anteil {
  mietobjekt: number | ''
  prozent: string
}

interface Props {
  onClose: () => void
  onSaved: () => void
}

function RechnungDialog({ onClose, onSaved }: Props) {
  const meldung = useMeldung()
  const vollbild = useVollbild()
  const createRechnung = useCreateRechnung()
  const { data: kostenarten } = useKostenarten()
  const { data: lieferanten } = useLieferanten()
  const { data: mietobjekte } = useMietobjekte()
  const [werte, setWerte] = useState<Record<Feld, string>>({
    datum: '',
    name: '',
    rechnungsnummer: '',
    betrag: '',
  })
  const [kostenart, setKostenart] = useState<number | ''>('')
  const [lieferant, setLieferant] = useState<number | ''>('')
  const [anteile, setAnteile] = useState<Anteil[]>([{ mietobjekt: '', prozent: '100' }])
  const [fehler, setFehler] = useState<Record<string, string>>({})
  const [allgemeinerFehler, setAllgemeinerFehler] = useState<string>()
  const [saving, setSaving] = useState(false)

  // Summed in hundredths so that e.g. 33.33 + 33.33 + 33.34 is exactly 100.
  const summeHundertstel = anteile.reduce((s, a) => s + Math.round((Number(dezimal(a.prozent)) || 0) * 100), 0)
  const summe = summeHundertstel / 100

  function feld(name: Feld) {
    return {
      name,
      value: werte[name],
      onChange: (e: ChangeEvent<HTMLInputElement>) => setWerte((w) => ({ ...w, [name]: e.target.value })),
      error: !!fehler[name],
      helperText: fehler[name],
      fullWidth: true,
    }
  }

  function setAnteil(index: number, aenderung: Partial<Anteil>) {
    setAnteile((liste) => liste.map((a, i) => (i === index ? { ...a, ...aenderung } : a)))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setFehler({})
    setAllgemeinerFehler(undefined)
    try {
      await createRechnung({
        ...werte,
        betrag: dezimal(werte.betrag),
        kostenart: Number(kostenart),
        lieferant: Number(lieferant),
        anteile: anteile.map((a) => ({ mietobjekt: Number(a.mietobjekt), prozent: dezimal(a.prozent) })),
      })
      onSaved()
      meldung('Rechnung angelegt')
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
    <Dialog open onClose={onClose} fullWidth maxWidth="md" fullScreen={vollbild}>
      <Box component="form" onSubmit={handleSubmit} sx={DIALOG_FORMULAR}>
        <DialogTitle>Rechnung anlegen</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            {allgemeinerFehler && <Alert severity="error">{allgemeinerFehler}</Alert>}

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="Datum"
                  type="date"
                  required
                  {...feld('datum')}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField label="Name" required {...feld('name')} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Rechnungsnummer" required {...feld('rechnungsnummer')} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Betrag (€)"
                  required
                  {...feld('betrag')}
                  slotProps={{ htmlInput: { inputMode: 'decimal' } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select
                  label="Kostenart"
                  required
                  fullWidth
                  value={kostenarten?.length ? kostenart : ''}
                  onChange={(e) => setKostenart(Number(e.target.value))}
                  error={!!fehler.kostenart}
                  helperText={
                    fehler.kostenart ?? (kostenarten?.length === 0 ? 'Noch keine Kostenarten angelegt.' : undefined)
                  }
                >
                  {kostenarten?.map((k) => (
                    <MenuItem key={k.id} value={k.id}>
                      {k.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select
                  label="Lieferant"
                  required
                  fullWidth
                  value={lieferanten?.length ? lieferant : ''}
                  onChange={(e) => setLieferant(Number(e.target.value))}
                  error={!!fehler.lieferant}
                  helperText={
                    fehler.lieferant ?? (lieferanten?.length === 0 ? 'Noch keine Lieferanten angelegt.' : undefined)
                  }
                >
                  {lieferanten?.map((l) => (
                    <MenuItem key={l.id} value={l.id}>
                      {lieferantName(l)}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>

            <div>
              <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 1 }}>
                Anteile
              </Typography>
              <Stack spacing={2}>
                {anteile.map((a, i) => (
                  <Stack
                    key={i}
                    direction="row"
                    useFlexGap
                    sx={{ alignItems: 'flex-start', flexWrap: { xs: 'wrap', sm: 'nowrap' }, gap: 2 }}
                  >
                    <TextField
                      select
                      label="Mietobjekt"
                      required
                      // Own line on phones, otherwise the select is squeezed to nothing.
                      sx={{ flex: { xs: '1 1 100%', sm: '1 1 auto' } }}
                      value={mietobjekte?.length ? a.mietobjekt : ''}
                      onChange={(e) => setAnteil(i, { mietobjekt: Number(e.target.value) })}
                      error={!!fehler[`anteile.${i}.mietobjekt`]}
                      helperText={fehler[`anteile.${i}.mietobjekt`]}
                    >
                      {mietobjekte?.map((m) => (
                        <MenuItem
                          key={m.id}
                          value={m.id}
                          // Each Mietobjekt may appear only once.
                          disabled={anteile.some((b, j) => j !== i && b.mietobjekt === m.id)}
                        >
                          {m.name}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      label="Prozent"
                      required
                      value={a.prozent}
                      onChange={(e) => setAnteil(i, { prozent: e.target.value })}
                      error={!!fehler[`anteile.${i}.prozent`]}
                      helperText={fehler[`anteile.${i}.prozent`]}
                      slotProps={{ htmlInput: { inputMode: 'decimal' } }}
                      sx={{ width: 140, flexShrink: 0 }}
                    />
                    <IconButton
                      aria-label="Anteil entfernen"
                      onClick={() => setAnteile((liste) => liste.filter((_, j) => j !== i))}
                      disabled={anteile.length === 1}
                      sx={{ mt: 1 }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                ))}
                <Stack
                  direction="row"
                  useFlexGap
                  sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}
                >
                  <Button
                    startIcon={<AddIcon />}
                    onClick={() => setAnteile((liste) => [...liste, { mietobjekt: '', prozent: '' }])}
                  >
                    Mietobjekt hinzufügen
                  </Button>
                  <Typography color={summeHundertstel === 10000 ? 'text.primary' : 'error'}>
                    Summe: {summe.toLocaleString('de-DE')} %
                  </Typography>
                </Stack>
                {fehler.anteile && <FormHelperText error>{fehler.anteile}</FormHelperText>}
              </Stack>
            </div>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Abbrechen</Button>
          <Button type="submit" variant="contained" loading={saving} disabled={summeHundertstel !== 10000}>
            Speichern
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}

export default RechnungDialog
