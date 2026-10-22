import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { LineChart } from '@mui/x-charts/LineChart'
import { useState, type FormEvent } from 'react'
import { validierungsFehler } from '../api/client'
import {
  useAnschaffungskosten,
  useBodenrichtwerte,
  useCreateBodenrichtwert,
  useDeleteBodenrichtwert,
} from '../api/hooks'
import type { Bodenrichtwert, Mietobjekt } from '../api/types'
import TabellenContainer, { DatumZelle } from './Tabelle'
import Laden, { Ladefehler } from './Laden'
import LoeschenDialog from './LoeschenDialog'
import { useVollbild } from './dialog'
import { useMeldung } from './meldung'
import { dezimal, formatDatum, formatEuro, LEER } from '../format'

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

const KAUF = 'Kauf (Anteil Grund und Boden)'

// A row of the table and a point of the chart: an entered Bodenrichtwert, or (without one) the Kauf
// with the Anteil Grund und Boden from the Kaufpreis popup as Grundstückswert.
interface Punkt {
  datum: string | null
  bodenrichtwert?: Bodenrichtwert
  grundstueckswert: string | null
}

function Verlauf({ punkte }: { punkte: Punkt[] }) {
  // The list comes newest first, the chart runs from old to new. Without a Kaufdatum the Kauf has no place on it.
  const aufsteigend = punkte.filter((p) => p.datum !== null).reverse()
  const mitGrundstueckswert = aufsteigend.some((p) => p.grundstueckswert !== null)

  return (
    <LineChart
      xAxis={[
        {
          data: aufsteigend.map((p) => alsDatum(p.datum!)),
          scaleType: 'time',
          valueFormatter: (d: Date, context) => {
            const monat = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
            const kauf = aufsteigend.some((p) => !p.bodenrichtwert && alsDatum(p.datum!).getTime() === d.getTime())
            return context.location === 'tooltip' && kauf ? `${monat} – ${KAUF}` : monat
          },
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
          data: aufsteigend.map((p) => (p.bodenrichtwert ? Number(p.bodenrichtwert.wert) : null)),
          // The Kauf has no Bodenrichtwert; the line goes on past it.
          connectNulls: true,
          valueFormatter: (v) => (v === null ? LEER : proQuadratmeter(String(v))),
        },
        ...(mitGrundstueckswert
          ? [
              {
                label: 'Grundstückswert',
                yAxisId: 'grundstueckswert',
                curve: 'linear' as const,
                data: aufsteigend.map((p) => (p.grundstueckswert === null ? null : Number(p.grundstueckswert))),
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
  const meldung = useMeldung()
  const vollbild = useVollbild()
  const { data, loading, error, reload } = useBodenrichtwerte(mietobjekt.id)
  const { data: kosten, loading: kostenLaden, error: kostenFehler } = useAnschaffungskosten(mietobjekt.id)
  const createBodenrichtwert = useCreateBodenrichtwert()
  const deleteBodenrichtwert = useDeleteBodenrichtwert()
  const [datum, setDatum] = useState('')
  const [wert, setWert] = useState('')
  const [fehler, setFehler] = useState<Record<string, string>>({})
  const [allgemeinerFehler, setAllgemeinerFehler] = useState<string>()
  const [saving, setSaving] = useState(false)
  const [zuLoeschen, setZuLoeschen] = useState<Bodenrichtwert>()
  const [loeschend, setLoeschend] = useState(false)

  const aktuell = data?.[0]
  // Newest first, like the Bodenrichtwerte; a Kauf without Kaufdatum goes last.
  const punkte: Punkt[] = [
    ...(data ?? []).map((b) => ({ datum: b.datum, bodenrichtwert: b, grundstueckswert: b.grundstueckswert })),
    ...(kosten && Number(kosten.anteil_grund_boden) > 0
      ? [{ datum: mietobjekt.kaufdatum, grundstueckswert: kosten.anteil_grund_boden }]
      : []),
  ].sort((a, b) => (b.datum ?? '').localeCompare(a.datum ?? ''))

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
      await createBodenrichtwert({ mietobjekt: mietobjekt.id, datum, wert: dezimal(wert) })
      setDatum('')
      setWert('')
      geaendert()
      meldung('Bodenrichtwert hinzugefügt')
    } catch (e) {
      fehlerAnzeigen(e)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!zuLoeschen) return
    setLoeschend(true)
    setFehler({})
    setAllgemeinerFehler(undefined)
    try {
      await deleteBodenrichtwert(zuLoeschen.id)
      geaendert()
      meldung('Bodenrichtwert gelöscht')
    } catch (e) {
      fehlerAnzeigen(e)
    } finally {
      setLoeschend(false)
      setZuLoeschen(undefined)
    }
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="lg" fullScreen={vollbild}>
      <DialogTitle>Bodenrichtwert – {mietobjekt.name}</DialogTitle>
      <DialogContent>
        {(loading || kostenLaden) && <Laden />}
        {error && <Ladefehler text="Bodenrichtwerte konnten nicht geladen werden." error={error} />}
        {kostenFehler && (
          <Ladefehler text="Anschaffungskosten konnten nicht geladen werden." error={kostenFehler} />
        )}
        {data && !kostenLaden && (
          <Stack spacing={3}>
            {allgemeinerFehler && <Alert severity="error">{allgemeinerFehler}</Alert>}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between' }}>
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

            {punkte.some((p) => p.datum !== null) && <Verlauf punkte={punkte} />}

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
                  required
                  value={wert}
                  onChange={(e) => setWert(e.target.value)}
                  error={!!fehler.wert}
                  helperText={fehler.wert}
                  slotProps={{ htmlInput: { inputMode: 'decimal' } }}
                />
                <Button type="submit" variant="outlined" startIcon={<AddIcon />} loading={saving} sx={{ mt: 1 }}>
                  Hinzufügen
                </Button>
              </Stack>
            </form>

            {punkte.length === 0 ? (
              <Typography color="text.secondary">Noch keine Bodenrichtwerte erfasst.</Typography>
            ) : (
              <TabellenContainer>
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
                    {punkte.map(({ datum, bodenrichtwert: b, grundstueckswert }) => (
                      <TableRow key={b?.id ?? 'kauf'}>
                        <DatumZelle wert={datum} />
                        <TableCell align="right" sx={{ color: b ? undefined : 'text.secondary' }}>
                          {b ? proQuadratmeter(b.wert) : KAUF}
                        </TableCell>
                        <TableCell align="right">{formatEuro(grundstueckswert, 2)}</TableCell>
                        {/* The Kauf is changed in the Kaufpreis popup. */}
                        <TableCell align="right">
                          {b && (
                            <IconButton
                              size="small"
                              aria-label={`Bodenrichtwert vom ${formatDatum(b.datum)} löschen`}
                              onClick={() => setZuLoeschen(b)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabellenContainer>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Schließen</Button>
      </DialogActions>
      <LoeschenDialog
        offen={!!zuLoeschen}
        titel="Bodenrichtwert löschen?"
        loeschend={loeschend}
        onAbbrechen={() => setZuLoeschen(undefined)}
        onLoeschen={handleDelete}
      >
        Der Wert vom {formatDatum(zuLoeschen?.datum ?? null)} wird gelöscht.
      </LoeschenDialog>
    </Dialog>
  )
}

export default BodenrichtwertDialog
