import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
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
import { useState, type FormEvent } from 'react'
import { validierungsFehler } from '../api/client'
import { useBodenrichtwerte, useCreateBodenrichtwert, useDeleteBodenrichtwert } from '../api/hooks'
import type { Bodenrichtwert, Mietobjekt } from '../api/types'
import { formatDatum, formatEuro, LEER } from '../format'

// "270.00" -> "270,00 €/m²"
function proQuadratmeter(wert: string) {
  return `${formatEuro(wert, 2)}/m²`
}

// "2026-10-01" -> local Date, without time zone shifts.
function alsDatum(wert: string) {
  const [jahr, monat, tag] = wert.split('-').map(Number)
  return new Date(jahr, monat - 1, tag)
}

function Kennzahl({ label, wert }: { label: string; wert: string }) {
  return (
    <div>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h4">{wert}</Typography>
    </div>
  )
}

function Verlauf({ werte }: { werte: Bodenrichtwert[] }) {
  // The list comes newest first, the chart runs from old to new.
  const aufsteigend = [...werte].reverse()
  const mitGrundstueckswert = werte.some((w) => w.grundstueckswert !== null)

  return (
    <LineChart
      xAxis={[
        {
          data: aufsteigend.map((w) => alsDatum(w.datum)),
          scaleType: 'time',
          valueFormatter: (d: Date) => `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`,
        },
      ]}
      yAxis={[
        { id: 'bodenrichtwert', position: 'left', valueFormatter: (v: number) => formatEuro(String(v)), width: 70 },
        ...(mitGrundstueckswert
          ? [
              {
                id: 'grundstueckswert',
                position: 'right' as const,
                valueFormatter: (v: number) => formatEuro(String(v)),
                width: 90,
              },
            ]
          : []),
      ]}
      series={[
        {
          label: 'Bodenrichtwert (€/m²)',
          yAxisId: 'bodenrichtwert',
          // Values only change at the entered dates, so no smoothing between them.
          curve: 'linear',
          data: aufsteigend.map((w) => Number(w.wert)),
          valueFormatter: (v) => (v === null ? LEER : proQuadratmeter(String(v))),
        },
        ...(mitGrundstueckswert
          ? [
              {
                label: 'Grundstückswert',
                yAxisId: 'grundstueckswert',
                curve: 'linear' as const,
                data: aufsteigend.map((w) => (w.grundstueckswert === null ? null : Number(w.grundstueckswert))),
                valueFormatter: (v: number | null) => (v === null ? LEER : formatEuro(String(v), 2)),
              },
            ]
          : []),
      ]}
      height={300}
    />
  )
}

interface Props {
  mietobjekt: Mietobjekt
  onClose: () => void
  onSaved: () => void
}

function BodenrichtwertDialog({ mietobjekt, onClose, onSaved }: Props) {
  const { data, loading, error, reload } = useBodenrichtwerte(mietobjekt.id)
  const createBodenrichtwert = useCreateBodenrichtwert()
  const deleteBodenrichtwert = useDeleteBodenrichtwert()
  const [datum, setDatum] = useState('')
  const [wert, setWert] = useState('')
  const [fehler, setFehler] = useState<Record<string, string>>({})
  const [allgemeinerFehler, setAllgemeinerFehler] = useState<string>()
  const [saving, setSaving] = useState(false)

  const aktuell = data?.[0]

  function fehlerAnzeigen(e: unknown) {
    const felder = validierungsFehler(e)
    if (felder) {
      const { non_field_errors, detail, ...rest } = felder
      setFehler(rest)
      const allgemein = [non_field_errors, detail].filter(Boolean).join(' ')
      if (allgemein) setAllgemeinerFehler(allgemein)
    } else {
      setAllgemeinerFehler(e instanceof Error ? e.message : String(e))
    }
  }

  function geaendert() {
    reload()
    onSaved()
  }

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setFehler({})
    setAllgemeinerFehler(undefined)
    try {
      await createBodenrichtwert({ mietobjekt: mietobjekt.id, datum, wert })
      setDatum('')
      setWert('')
      geaendert()
    } catch (e) {
      fehlerAnzeigen(e)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    setFehler({})
    setAllgemeinerFehler(undefined)
    try {
      await deleteBodenrichtwert(id)
      geaendert()
    } catch (e) {
      fehlerAnzeigen(e)
    }
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>Bodenrichtwert – {mietobjekt.name}</DialogTitle>
      <DialogContent>
        {loading && <CircularProgress />}
        {error && <Alert severity="error">Bodenrichtwerte konnten nicht geladen werden.</Alert>}
        {data && (
          <Stack spacing={3}>
            {allgemeinerFehler && <Alert severity="error">{allgemeinerFehler}</Alert>}

            <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
              <Kennzahl label="Aktueller Bodenrichtwert" wert={aktuell ? proQuadratmeter(aktuell.wert) : LEER} />
              <Kennzahl
                label="Aktueller Grundstückswert"
                wert={aktuell ? formatEuro(aktuell.grundstueckswert, 2) : LEER}
              />
            </Stack>

            {mietobjekt.grundstuecksflaeche === null && (
              <Alert severity="info">
                Für den Grundstückswert fehlt die Grundstücksfläche im Mietobjekt.
              </Alert>
            )}

            {data.length > 0 && <Verlauf werte={data} />}

            <form onSubmit={handleAdd}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: 'flex-start' }}>
                <TextField
                  label="Datum"
                  type="date"
                  required
                  value={datum}
                  onChange={(e) => setDatum(e.target.value)}
                  error={!!fehler.datum}
                  helperText={fehler.datum}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  label="Bodenrichtwert (€/m²)"
                  type="number"
                  required
                  value={wert}
                  onChange={(e) => setWert(e.target.value)}
                  error={!!fehler.wert}
                  helperText={fehler.wert}
                  slotProps={{ htmlInput: { step: '0.01', min: '0.01' } }}
                />
                <Button type="submit" variant="outlined" startIcon={<AddIcon />} loading={saving} sx={{ mt: 1 }}>
                  Hinzufügen
                </Button>
              </Stack>
            </form>

            {data.length === 0 ? (
              <Typography color="text.secondary">Noch keine Bodenrichtwerte erfasst.</Typography>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Datum</TableCell>
                      <TableCell align="right">Bodenrichtwert</TableCell>
                      <TableCell align="right">Grundstückswert</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell>{formatDatum(b.datum)}</TableCell>
                        <TableCell align="right">{proQuadratmeter(b.wert)}</TableCell>
                        <TableCell align="right">{formatEuro(b.grundstueckswert, 2)}</TableCell>
                        <TableCell align="right">
                          <IconButton size="small" aria-label="Löschen" onClick={() => handleDelete(b.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Schließen</Button>
      </DialogActions>
    </Dialog>
  )
}

export default BodenrichtwertDialog
