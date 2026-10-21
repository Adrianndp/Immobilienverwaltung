import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { LineChart } from '@mui/x-charts/LineChart'
import { useState, type ChangeEvent, type FormEvent } from 'react'
import { validierungsFehler } from '../api/client'
import { useCreateDarlehen, useDarlehen, useUpdateDarlehen } from '../api/hooks'
import { DARLEHEN_ART_LABELS, type Darlehen, type Mietobjekt } from '../api/types'
import { formatDatum, formatEuro, LEER } from '../format'

type Feld = 'bank' | 'iban' | 'beginn' | 'betrag' | 'art' | 'zinsbindung_bis' | 'sollzins' | 'tilgung'

// "1.850" -> "1.85": percentages with up to 3 decimals, without trailing zeros.
function prozentEingabe(wert: string) {
  return String(Number(wert))
}

// "2026-10-01" -> local Date, without time zone shifts.
function alsDatum(wert: string) {
  const [jahr, monat, tag] = wert.split('-').map(Number)
  return new Date(jahr, monat - 1, tag)
}

interface FormularProps {
  mietobjekt: Mietobjekt
  darlehen: Darlehen | undefined
  onClose: () => void
  onSaved: () => void
}

function DarlehenFormular({ mietobjekt, darlehen, onClose, onSaved }: FormularProps) {
  const createDarlehen = useCreateDarlehen()
  const updateDarlehen = useUpdateDarlehen()
  const [werte, setWerte] = useState<Record<Feld, string>>({
    bank: darlehen?.bank ?? '',
    iban: darlehen?.iban ?? '',
    beginn: darlehen?.beginn ?? '',
    betrag: darlehen?.betrag ?? '',
    art: darlehen?.art ?? 'ANNUITAET',
    zinsbindung_bis: darlehen?.zinsbindung_bis ?? '',
    sollzins: darlehen ? prozentEingabe(darlehen.sollzins) : '',
    tilgung: darlehen ? prozentEingabe(darlehen.tilgung) : '',
  })
  const [fehler, setFehler] = useState<Record<string, string>>({})
  const [allgemeinerFehler, setAllgemeinerFehler] = useState<string>()
  const [saving, setSaving] = useState(false)

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setFehler({})
    setAllgemeinerFehler(undefined)
    const daten = {
      ...werte,
      art: werte.art as Darlehen['art'],
      zinsbindung_bis: werte.zinsbindung_bis || null,
      mietobjekt: mietobjekt.id,
    }
    try {
      if (darlehen) await updateDarlehen(darlehen.id, daten)
      else await createDarlehen(daten)
      onSaved()
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
    <form onSubmit={handleSubmit}>
      <DialogContent>
        <Stack spacing={3}>
          {allgemeinerFehler && <Alert severity="error">{allgemeinerFehler}</Alert>}

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Stack spacing={2}>
                <Typography variant="h6">Objekt: {mietobjekt.name}</Typography>
                <TextField label="Bank" required {...feld('bank')} />
                <TextField label="IBAN" required {...feld('iban')} />
                <TextField
                  label="Beginn"
                  type="date"
                  required
                  {...feld('beginn')}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Stack spacing={2}>
                <TextField
                  label="Darlehensbetrag (€)"
                  type="number"
                  required
                  {...feld('betrag')}
                  slotProps={{ htmlInput: { step: '0.01' } }}
                />
                <TextField select label="Art des Darlehens" required {...feld('art')}>
                  {Object.entries(DARLEHEN_ART_LABELS).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Zinsbindung bis"
                  type="date"
                  {...feld('zinsbindung_bis')}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Stack spacing={2}>
                <div>
                  <Typography variant="body2" color="text.secondary">
                    Kontostand
                  </Typography>
                  <Typography variant="h4">{darlehen ? formatEuro(darlehen.restschuld, 2) : LEER}</Typography>
                </div>
                <TextField
                  label="Sollzinssatz (%)"
                  type="number"
                  required
                  {...feld('sollzins')}
                  slotProps={{ htmlInput: { step: '0.001' } }}
                />
                <TextField
                  label="Tilgung (%)"
                  type="number"
                  required
                  {...feld('tilgung')}
                  slotProps={{ htmlInput: { step: '0.001' } }}
                />
                <TextField
                  label="Rate"
                  value={darlehen ? formatEuro(darlehen.rate, 2) : LEER}
                  fullWidth
                  slotProps={{ htmlInput: { readOnly: true } }}
                />
              </Stack>
            </Grid>
          </Grid>

          {darlehen && (
            <LineChart
              xAxis={[
                {
                  data: darlehen.verlauf.map((v) => alsDatum(v.datum)),
                  scaleType: 'time',
                  valueFormatter: (d: Date) => `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`,
                },
              ]}
              yAxis={[{ valueFormatter: (v: number) => formatEuro(String(v)), width: 90 }]}
              // Debt as a negative value, rising towards 0.
              series={[
                {
                  data: darlehen.verlauf.map((v) => -Number(v.rest)),
                  showMark: false,
                  valueFormatter: (v) => formatEuro(String(v), 2),
                },
              ]}
              height={300}
            />
          )}

          <Stack spacing={1}>
            <Typography variant="h6">Zahlungen</Typography>
            {!darlehen?.zahlungen.length ? (
              <Typography color="text.secondary">Noch keine Zahlungen zugeordnet.</Typography>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Datum</TableCell>
                      <TableCell align="right">Betrag</TableCell>
                      <TableCell>Betreff</TableCell>
                      <TableCell>Bank</TableCell>
                      <TableCell align="right">Kontostand</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {darlehen.zahlungen.map((z, i) => (
                      <TableRow key={i}>
                        <TableCell>{formatDatum(z.datum)}</TableCell>
                        <TableCell align="right">{formatEuro(z.betrag, 2)}</TableCell>
                        <TableCell>{z.betreff}</TableCell>
                        <TableCell>{z.bank}</TableCell>
                        <TableCell align="right">{formatEuro(z.kontostand, 2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Schließen</Button>
        <Button type="submit" variant="contained" loading={saving}>
          Speichern
        </Button>
      </DialogActions>
    </form>
  )
}

interface Props {
  mietobjekt: Mietobjekt
  onClose: () => void
  onSaved: () => void
}

function DarlehenDialog({ mietobjekt, onClose, onSaved }: Props) {
  const { data, loading, error, reload } = useDarlehen(mietobjekt.id)
  // One Darlehen per Mietobjekt in the popup: the first one.
  const darlehen = data?.[0]

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>Darlehen</DialogTitle>
      {loading && (
        <DialogContent>
          <CircularProgress />
        </DialogContent>
      )}
      {error && (
        <DialogContent>
          <Alert severity="error">Darlehen konnte nicht geladen werden.</Alert>
        </DialogContent>
      )}
      {data && (
        <DarlehenFormular
          // Remount after the first save so the form starts from the created Darlehen.
          key={darlehen?.id ?? 'neu'}
          mietobjekt={mietobjekt}
          darlehen={darlehen}
          onClose={onClose}
          onSaved={() => {
            reload()
            onSaved()
          }}
        />
      )}
    </Dialog>
  )
}

export default DarlehenDialog
