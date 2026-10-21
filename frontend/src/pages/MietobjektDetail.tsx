import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DeleteIcon from '@mui/icons-material/Delete'
import { useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { ApiError } from '../api/client'
import {
  useCreateEinheit,
  useDeleteEinheit,
  useEinheiten,
  useMietobjekt,
  useUpdateMietobjekt,
} from '../api/hooks'
import {
  NUTZUNG_LABELS,
  OBJEKTART_LABELS,
  VERMIETUNG_LABELS,
  type Mietobjekt,
  type Nutzung,
} from '../api/types'
import FarbAuswahl from '../components/FarbAuswahl'
import { laenderName } from '../format'

type Feld = Exclude<keyof Mietobjekt, 'id'>
type Fehler = Partial<Record<string, string[]>>

// How each input's string maps back to the API value. Fields not listed are plain strings.
const DEZIMAL: Feld[] = [
  'kaufpreis',
  'grundschuld',
  'marktwert',
  'wohnflaeche',
  'grundstuecksflaeche',
  'weg_anteil',
]
const GANZZAHL_OPTIONAL: Feld[] = ['stockwerk', 'baujahr', 'weg_nenner']
const ANZAHL: Feld[] = [
  'zimmer',
  'baeder',
  'kueche',
  'balkon',
  'terrasse',
  'keller',
  'garage',
  'tiefgarage',
  'carport',
  'stellplatz',
]
const ANZAHL_LABELS: Record<string, string> = {
  zimmer: 'Zimmer',
  baeder: 'Bäder',
  kueche: 'Küche',
  balkon: 'Balkon',
  terrasse: 'Terrasse',
  keller: 'Keller',
  garage: 'Garage',
  tiefgarage: 'Tiefgarage',
  carport: 'Carport',
  stellplatz: 'Stellplatz',
}

function zuWert(feld: Feld, eingabe: string) {
  if (ANZAHL.includes(feld)) return eingabe === '' ? 0 : Number(eingabe)
  if (GANZZAHL_OPTIONAL.includes(feld)) return eingabe === '' ? null : Number(eingabe)
  // Decimals stay strings, as DRF sends them; empty dates and decimals become null.
  if (DEZIMAL.includes(feld) || feld === 'kaufdatum') return eingabe === '' ? null : eingabe
  return eingabe
}

function Abschnitt({ titel, children }: { titel: string; children: ReactNode }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {titel}
      </Typography>
      <Grid container spacing={2}>
        {children}
      </Grid>
    </Paper>
  )
}

function Zelle({ children, breit }: { children: ReactNode; breit?: boolean }) {
  return <Grid size={breit ? { xs: 12, md: 8 } : { xs: 12, sm: 6, md: 4 }}>{children}</Grid>
}

function MietobjektFormular({ mietobjekt }: { mietobjekt: Mietobjekt }) {
  const updateMietobjekt = useUpdateMietobjekt()
  const [gespeichert, setGespeichert] = useState(mietobjekt)
  const [werte, setWerte] = useState(mietobjekt)
  const [fehler, setFehler] = useState<Fehler>({})
  const [allgemeinerFehler, setAllgemeinerFehler] = useState<string>()
  const [saving, setSaving] = useState(false)
  const [erfolg, setErfolg] = useState(false)

  const geaendert = (Object.keys(werte) as (keyof Mietobjekt)[]).filter(
    (k) => werte[k] !== gespeichert[k],
  )

  function setFeld(feld: Feld, wert: unknown) {
    setWerte((w) => ({ ...w, [feld]: wert }))
  }

  function feld(name: Feld) {
    const zahl = DEZIMAL.includes(name) || ANZAHL.includes(name) || GANZZAHL_OPTIONAL.includes(name)
    return {
      name,
      value: werte[name] ?? '',
      onChange: (e: ChangeEvent<HTMLInputElement>) => setFeld(name, zuWert(name, e.target.value)),
      error: !!fehler[name],
      helperText: fehler[name]?.join(' '),
      fullWidth: true,
      ...(zahl && { type: 'number' }),
      ...(DEZIMAL.includes(name) && { slotProps: { htmlInput: { step: '0.01' } } }),
      ...(ANZAHL.includes(name) && { slotProps: { htmlInput: { min: 0 } } }),
    }
  }

  function setNutzung(nutzung: Nutzung) {
    setWerte((w) => ({ ...w, nutzung, vermietung: nutzung === 'EIGEN' ? '' : w.vermietung }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setFehler({})
    setAllgemeinerFehler(undefined)
    try {
      const daten = Object.fromEntries(geaendert.map((k) => [k, werte[k]]))
      const neu = await updateMietobjekt(mietobjekt.id, daten)
      setGespeichert(neu)
      setWerte(neu)
      setErfolg(true)
    } catch (e) {
      if (e instanceof ApiError && e.status === 400 && e.body && typeof e.body === 'object') {
        const { non_field_errors, detail, ...felder } = e.body as Fehler & { detail?: string }
        setFehler(felder)
        const allgemein = [...(non_field_errors ?? []), ...(detail ? [detail] : [])]
        if (allgemein.length) setAllgemeinerFehler(allgemein.join(' '))
      } else {
        setAllgemeinerFehler(e instanceof Error ? e.message : String(e))
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stack spacing={2}>
        {allgemeinerFehler && <Alert severity="error">{allgemeinerFehler}</Alert>}

        <Abschnitt titel="Grunddaten">
          <Zelle breit>
            <TextField label="Name" required {...feld('name')} />
          </Zelle>
          <Zelle>
            <TextField select label="Objektart" required {...feld('objektart')}>
              {Object.entries(OBJEKTART_LABELS).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
          </Zelle>
          <Zelle breit>
            <TextField label="Straße" required {...feld('strasse')} />
          </Zelle>
          <Zelle>
            <TextField label="Hausnummer" required {...feld('hausnummer')} />
          </Zelle>
          <Zelle>
            <TextField
              label="PLZ"
              required
              {...feld('plz')}
              slotProps={{ htmlInput: { maxLength: 5, inputMode: 'numeric' } }}
            />
          </Zelle>
          <Zelle>
            <TextField label="Ort" required {...feld('ort')} />
          </Zelle>
          <Zelle>
            <TextField
              label="Land"
              {...feld('land')}
              onChange={(e) => setFeld('land', e.target.value.toUpperCase())}
              helperText={fehler.land?.join(' ') ?? laenderName(werte.land)}
              slotProps={{ htmlInput: { maxLength: 2 } }}
            />
          </Zelle>
          <Zelle>
            <TextField
              label="Kaufdatum"
              type="date"
              {...feld('kaufdatum')}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Zelle>
          <Zelle>
            <TextField label="Kaufpreis (€)" {...feld('kaufpreis')} />
          </Zelle>
          <Zelle>
            <TextField label="Grundschuld (€)" {...feld('grundschuld')} />
          </Zelle>
          <Zelle>
            <TextField label="Marktwert (€)" {...feld('marktwert')} />
          </Zelle>
          <Grid size={12}>
            <FarbAuswahl
              value={werte.farbe}
              onChange={(farbe) => setFeld('farbe', farbe)}
              error={fehler.farbe?.join(' ')}
            />
          </Grid>
        </Abschnitt>

        <Abschnitt titel="Ausstattung">
          {ANZAHL.map((name) => (
            <Grid key={name} size={{ xs: 6, sm: 4, md: 2.4 }}>
              <TextField label={ANZAHL_LABELS[name]} {...feld(name)} />
            </Grid>
          ))}
        </Abschnitt>

        <Abschnitt titel="Flächen & Baudaten">
          <Zelle>
            <TextField label="Wohnfläche (m²)" {...feld('wohnflaeche')} />
          </Zelle>
          <Zelle>
            <TextField label="Grundstücksfläche (m²)" {...feld('grundstuecksflaeche')} />
          </Zelle>
          <Zelle>
            <TextField label="Stockwerk" {...feld('stockwerk')} />
          </Zelle>
          <Zelle>
            <TextField label="Baujahr" {...feld('baujahr')} />
          </Zelle>
          <Zelle>
            <TextField label="WEG-Anteil" {...feld('weg_anteil')} />
          </Zelle>
          <Zelle>
            <TextField select label="WEG-Nenner" {...feld('weg_nenner')} type={undefined}>
              <MenuItem value="">
                <em>Keiner</em>
              </MenuItem>
              <MenuItem value={100}>/100</MenuItem>
              <MenuItem value={1000}>/1000</MenuItem>
            </TextField>
          </Zelle>
        </Abschnitt>

        <Abschnitt titel="Nutzung">
          <Zelle>
            <TextField
              select
              label="Nutzung"
              required
              {...feld('nutzung')}
              onChange={(e) => setNutzung(e.target.value as Nutzung)}
            >
              {Object.entries(NUTZUNG_LABELS).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
          </Zelle>
          {werte.nutzung === 'VERMIETUNG' && (
            <Zelle>
              <TextField select label="Art der Vermietung" required {...feld('vermietung')}>
                {Object.entries(VERMIETUNG_LABELS).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
            </Zelle>
          )}
        </Abschnitt>

        <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end' }}>
          <Button component={Link} to="/mietobjekte">
            Zurück
          </Button>
          <Button type="submit" variant="contained" loading={saving} disabled={!geaendert.length}>
            Speichern
          </Button>
        </Stack>
      </Stack>
      <Snackbar
        open={erfolg}
        autoHideDuration={3000}
        onClose={() => setErfolg(false)}
        message="Gespeichert"
      />
    </form>
  )
}

function Einheiten({ mietobjektId }: { mietobjektId: number }) {
  const { data: einheiten, loading, error, reload } = useEinheiten(mietobjektId)
  const createEinheit = useCreateEinheit()
  const deleteEinheit = useDeleteEinheit()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [fehler, setFehler] = useState<string>()

  function fehlerText(e: unknown) {
    if (e instanceof ApiError && e.status === 400 && e.body && typeof e.body === 'object') {
      return Object.values(e.body as Fehler).flat().join(' ')
    }
    return e instanceof Error ? e.message : String(e)
  }

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setFehler(undefined)
    try {
      await createEinheit({ mietobjekt: mietobjektId, name })
      setName('')
      reload()
    } catch (e) {
      setFehler(fehlerText(e))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    setFehler(undefined)
    try {
      await deleteEinheit(id)
      reload()
    } catch (e) {
      setFehler(fehlerText(e))
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Einheiten
      </Typography>
      {loading && <CircularProgress size={24} />}
      {error && <Alert severity="error">Einheiten konnten nicht geladen werden.</Alert>}
      {einheiten?.length === 0 && <Typography color="text.secondary">Noch keine Einheiten.</Typography>}
      <List dense>
        {einheiten?.map((e) => (
          <ListItem
            key={e.id}
            disableGutters
            secondaryAction={
              <IconButton edge="end" aria-label={`${e.name} löschen`} onClick={() => handleDelete(e.id)}>
                <DeleteIcon />
              </IconButton>
            }
          >
            <ListItemText primary={e.name} />
          </ListItem>
        ))}
      </List>
      <form onSubmit={handleAdd}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
          <TextField
            label="Neue Einheit"
            size="small"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={!!fehler}
            helperText={fehler}
            required
            fullWidth
          />
          <Button type="submit" variant="outlined" startIcon={<AddIcon />} loading={saving}>
            Hinzufügen
          </Button>
        </Stack>
      </form>
    </Paper>
  )
}

function MietobjektDetail() {
  const id = Number(useParams().id)
  const { data: mietobjekt, loading, error } = useMietobjekt(id)

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <IconButton component={Link} to="/mietobjekte" aria-label="Zurück">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4">{mietobjekt?.name ?? 'Mietobjekt'}</Typography>
      </Stack>

      {loading && <CircularProgress />}
      {error && <Alert severity="error">Mietobjekt konnte nicht geladen werden.</Alert>}
      {mietobjekt && (
        <>
          <MietobjektFormular key={mietobjekt.id} mietobjekt={mietobjekt} />
          <Einheiten mietobjektId={mietobjekt.id} />
        </>
      )}
    </Stack>
  )
}

export default MietobjektDetail
