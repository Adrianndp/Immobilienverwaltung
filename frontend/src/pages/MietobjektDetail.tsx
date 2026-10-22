import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { ApiError } from '../api/client'
import {
  useCreateEinheit,
  useDeleteEinheit,
  useEinheiten,
  useMietobjekt,
  useMietvertraege,
  useUpdateEinheit,
  useUpdateMietobjekt,
} from '../api/hooks'
import {
  NUTZUNG_LABELS,
  OBJEKTART_LABELS,
  VERMIETUNG_LABELS,
  WEG_OBJEKTARTEN,
  vertragsStatus,
  type Einheit,
  type Mietobjekt,
  type Mietvertrag,
  type Nutzung,
  type Objektart,
  type Vermietung,
} from '../api/types'
import BodenrichtwertDialog from '../components/BodenrichtwertDialog'
import DarlehenDialog from '../components/DarlehenDialog'
import FarbAuswahl from '../components/FarbAuswahl'
import Laden, { Ladefehler } from '../components/Laden'
import LoeschenDialog from '../components/LoeschenDialog'
import MietvertragDialog from '../components/MietvertragDialog'
import { useMeldung } from '../components/meldung'
import WegAnteilFeld from '../components/WegAnteilFeld'
import { dezimal, formatDatum, formatEuro, heuteIso, laenderName } from '../format'

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
const GANZZAHL_OPTIONAL: Feld[] = ['stockwerk', 'baujahr']
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

interface OeffnenFeldProps {
  label: string
  wert: string
  helperText: string
  ariaLabel: string
  onOpen: () => void
}

// Read-only value whose editing happens in a popup: a click anywhere on the field opens it.
function OeffnenFeld({ label, wert, helperText, ariaLabel, onOpen }: OeffnenFeldProps) {
  return (
    <TextField
      label={label}
      value={wert}
      helperText={helperText}
      fullWidth
      // The icon button has no handler of its own: its click (also via keyboard) bubbles up to here.
      onClick={onOpen}
      sx={{
        '& .MuiInputBase-root': { cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } },
        '& .MuiInputBase-input': { cursor: 'pointer' },
      }}
      slotProps={{
        htmlInput: { readOnly: true },
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton edge="end" aria-label={ariaLabel}>
                <OpenInNewIcon />
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  )
}

interface FormularProps {
  mietobjekt: Mietobjekt
  onDarlehen: () => void
  onBodenrichtwert: () => void
  onGespeichert: () => void
}

function MietobjektFormular({ mietobjekt, onDarlehen, onBodenrichtwert, onGespeichert }: FormularProps) {
  const meldung = useMeldung()
  const updateMietobjekt = useUpdateMietobjekt()
  const [gespeichert, setGespeichert] = useState(mietobjekt)
  const [werte, setWerte] = useState(mietobjekt)
  const [fehler, setFehler] = useState<Fehler>({})
  const [allgemeinerFehler, setAllgemeinerFehler] = useState<string>()
  const [saving, setSaving] = useState(false)

  const geaendert = (Object.keys(werte) as (keyof Mietobjekt)[]).filter(
    (k) => werte[k] !== gespeichert[k],
  )

  function setFeld(feld: Feld, wert: unknown) {
    setWerte((w) => ({ ...w, [feld]: wert }))
  }

  function feld(name: Feld) {
    const ganzzahl = ANZAHL.includes(name) || GANZZAHL_OPTIONAL.includes(name)
    return {
      name,
      value: werte[name] ?? '',
      onChange: (e: ChangeEvent<HTMLInputElement>) => setFeld(name, zuWert(name, e.target.value)),
      error: !!fehler[name],
      helperText: fehler[name]?.join(' '),
      fullWidth: true,
      autoComplete: 'off',
      ...(ganzzahl && { type: 'number' }),
      // Text with a decimal keyboard, so "1234,56" can be typed; dezimal() converts it on save.
      ...(DEZIMAL.includes(name) && { slotProps: { htmlInput: { inputMode: 'decimal' } } }),
      ...(ANZAHL.includes(name) && { slotProps: { htmlInput: { min: 0 } } }),
    }
  }

  function setNutzung(nutzung: Nutzung) {
    setWerte((w) => ({ ...w, nutzung, vermietung: nutzung === 'EIGEN' ? '' : w.vermietung }))
  }

  // Objektarten without a WEG-Anteil hide the fields and save them as null.
  function setObjektart(objektart: Objektart) {
    setWerte((w) => ({
      ...w,
      objektart,
      ...(!WEG_OBJEKTARTEN.includes(objektart) && { weg_anteil: null, weg_nenner: null }),
    }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setFehler({})
    setAllgemeinerFehler(undefined)
    try {
      const daten = Object.fromEntries(
        geaendert.map((k) => {
          const wert = werte[k]
          return [k, DEZIMAL.includes(k as Feld) && typeof wert === 'string' ? dezimal(wert) : wert]
        }),
      )
      const neu = await updateMietobjekt(mietobjekt.id, daten)
      setGespeichert(neu)
      onGespeichert()
      setWerte(neu)
      meldung('Gespeichert')
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
            <TextField
              select
              label="Objektart"
              required
              {...feld('objektart')}
              onChange={(e) => setObjektart(e.target.value as Objektart)}
            >
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
          <Grid size={12}>
            <FarbAuswahl
              value={werte.farbe}
              onChange={(farbe) => setFeld('farbe', farbe)}
              error={fehler.farbe?.join(' ')}
            />
          </Grid>
        </Abschnitt>

        <Abschnitt titel="Kauf & Finanzierung">
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
            <TextField label="Marktwert (€)" {...feld('marktwert')} />
          </Zelle>
          <Zelle>
            <TextField label="Grundschuld (€)" {...feld('grundschuld')} />
          </Zelle>
          {/* Both from the props, not the form state: they change when the popups save. */}
          <Zelle>
            <OeffnenFeld
              label="Restschuld"
              wert={mietobjekt.restschuld ? formatEuro(mietobjekt.restschuld, 2) : 'Kein Darlehen – anlegen'}
              helperText="Darlehen anzeigen und bearbeiten"
              ariaLabel="Darlehen öffnen"
              onOpen={onDarlehen}
            />
          </Zelle>
          <Zelle>
            <OeffnenFeld
              label="Bodenrichtwert"
              wert={
                mietobjekt.bodenrichtwert
                  ? `${formatEuro(mietobjekt.bodenrichtwert, 2)}/m²`
                  : 'Noch kein Wert – erfassen'
              }
              helperText="Verlauf anzeigen und Werte erfassen"
              ariaLabel="Bodenrichtwert-Verlauf öffnen"
              onOpen={onBodenrichtwert}
            />
          </Zelle>
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
          {WEG_OBJEKTARTEN.includes(werte.objektart) && (
            <Zelle>
              <WegAnteilFeld
                anteil={werte.weg_anteil ?? ''}
                nenner={werte.weg_nenner}
                onAnteilChange={(anteil) => setFeld('weg_anteil', zuWert('weg_anteil', anteil))}
                onNennerChange={(nenner) => setFeld('weg_nenner', nenner)}
                error={[...(fehler.weg_anteil ?? []), ...(fehler.weg_nenner ?? [])].join(' ') || undefined}
              />
            </Zelle>
          )}
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
    </form>
  )
}

// The laufend Mietvertrag of the Einheit, otherwise the next zukünftig one.
function aktuellerVertrag(einheit: Einheit, mietvertraege: Mietvertrag[], heute: string) {
  const eigene = mietvertraege.filter((mv) => mv.einheit === einheit.id)
  return (
    eigene.find((mv) => vertragsStatus(mv, heute) === 'laufend') ??
    eigene
      .filter((mv) => vertragsStatus(mv, heute) === 'zukuenftig')
      .sort((a, b) => a.beginn.localeCompare(b.beginn))[0]
  )
}

// Why an Einheit cannot be deleted, the same rules as the API; undefined if it can.
function loeschSperre(einheit: Einheit, einheiten: Einheit[], vermietung: Vermietung | '') {
  if (einheit.hat_vertraege) return 'Einheit hat Mietverträge und kann nicht gelöscht werden.'
  if (vermietung === 'GANZ' && einheiten.length === 1) {
    return 'Die Einheit „Gesamt“ wird bei Vermietung im Ganzen benötigt.'
  }
}

function Einheiten({ mietobjektId, vermietung }: { mietobjektId: number; vermietung: Vermietung | '' }) {
  const meldung = useMeldung()
  const { data: einheiten, loading, error, reload } = useEinheiten(mietobjektId)
  const {
    data: mietvertraege,
    error: vertraegeFehler,
    reload: reloadMietvertraege,
  } = useMietvertraege()
  const heute = heuteIso()
  // The Einheit a new Mieter is created for.
  const [mieterFuer, setMieterFuer] = useState<Einheit>()
  const createEinheit = useCreateEinheit()
  const deleteEinheit = useDeleteEinheit()
  const updateEinheit = useUpdateEinheit()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [fehler, setFehler] = useState<string>()
  const [zuLoeschen, setZuLoeschen] = useState<Einheit>()
  const [loeschend, setLoeschend] = useState(false)
  // The Einheit whose name is being edited, with the new name.
  const [bearbeitet, setBearbeitet] = useState<{ id: number; name: string }>()
  const [umbenennend, setUmbenennend] = useState(false)

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
      meldung('Einheit hinzugefügt')
    } catch (e) {
      setFehler(fehlerText(e))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!zuLoeschen) return
    setLoeschend(true)
    try {
      await deleteEinheit(zuLoeschen.id)
      reload()
      meldung('Einheit gelöscht')
    } catch (e) {
      meldung({ text: fehlerText(e), fehler: true })
    } finally {
      setLoeschend(false)
      setZuLoeschen(undefined)
    }
  }

  async function handleUmbenennen(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!bearbeitet) return
    setUmbenennend(true)
    try {
      await updateEinheit(bearbeitet.id, { name: bearbeitet.name })
      setBearbeitet(undefined)
      reload()
      meldung('Einheit umbenannt')
    } catch (e) {
      meldung({ text: fehlerText(e), fehler: true })
    } finally {
      setUmbenennend(false)
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Einheiten
      </Typography>
      {loading && <Laden klein />}
      {error && <Ladefehler text="Einheiten konnten nicht geladen werden." error={error} />}
      {vertraegeFehler && <Ladefehler text="Mieter konnten nicht geladen werden." error={vertraegeFehler} />}
      {einheiten && <Typography variant="body2">Anzahl Verträge: {einheiten.length}</Typography>}
      {einheiten?.length === 0 && <Typography color="text.secondary">Noch keine Einheiten.</Typography>}
      <List dense>
        {einheiten?.map((e, i) => {
          const mv = mietvertraege && aktuellerVertrag(e, mietvertraege, heute)
          const status = mv && vertragsStatus(mv, heute)
          const name = mv && `${mv.mieter.vorname} ${mv.mieter.nachname}`
          const sperre = loeschSperre(e, einheiten, vermietung)
          const mieterText =
            mietvertraege &&
            (mv ? `${name}${status === 'zukuenftig' ? ` (ab ${formatDatum(mv.beginn)})` : ''}` : 'nicht vermietet')

          if (bearbeitet?.id === e.id) {
            return (
              <ListItem key={e.id} disableGutters>
                <Typography sx={{ width: 32, flexShrink: 0, color: 'text.secondary' }}>{i + 1}</Typography>
                <Stack
                  component="form"
                  onSubmit={handleUmbenennen}
                  direction="row"
                  spacing={1}
                  sx={{ flexGrow: 1, alignItems: 'center', py: 0.5 }}
                >
                  <TextField
                    label="Name"
                    size="small"
                    value={bearbeitet.name}
                    onChange={(ev) => setBearbeitet({ id: e.id, name: ev.target.value })}
                    onKeyDown={(ev) => ev.key === 'Escape' && setBearbeitet(undefined)}
                    required
                    fullWidth
                    autoFocus
                    autoComplete="off"
                  />
                  <IconButton type="submit" aria-label="Name speichern" loading={umbenennend}>
                    <CheckIcon />
                  </IconButton>
                  <IconButton aria-label="Abbrechen" onClick={() => setBearbeitet(undefined)}>
                    <CloseIcon />
                  </IconButton>
                </Stack>
              </ListItem>
            )
          }

          return (
            <ListItem
              key={e.id}
              disableGutters
              // Room for the three buttons; the default only fits one.
              sx={{ pr: 16 }}
              secondaryAction={
                <>
                  {mv ? (
                    <IconButton
                      component={Link}
                      to={`/mieter?status=${status}&vertrag=${mv.id}`}
                      aria-label={`Mietvertrag von ${name} öffnen`}
                    >
                      <OpenInNewIcon />
                    </IconButton>
                  ) : (
                    <IconButton
                      aria-label={`Mieter für ${e.name} anlegen`}
                      onClick={() => setMieterFuer(e)}
                      // Until the Mietverträge are loaded it is not known whether there is one.
                      disabled={!mietvertraege}
                    >
                      <OpenInNewIcon />
                    </IconButton>
                  )}
                  <IconButton
                    aria-label={`Einheit ${e.name} umbenennen`}
                    onClick={() => setBearbeitet({ id: e.id, name: e.name })}
                  >
                    <EditIcon />
                  </IconButton>
                  {sperre ? (
                    // A disabled button gets no mouse events; the span carries the tooltip and keyboard focus.
                    <Tooltip title={sperre} enterTouchDelay={0} leaveTouchDelay={4000}>
                      <span tabIndex={0}>
                        <IconButton edge="end" aria-label={`Einheit ${e.name} löschen`} disabled>
                          <DeleteIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                  ) : (
                    <IconButton edge="end" aria-label={`Einheit ${e.name} löschen`} onClick={() => setZuLoeschen(e)}>
                      <DeleteIcon />
                    </IconButton>
                  )}
                </>
              }
            >
              <Typography sx={{ width: 32, flexShrink: 0, color: 'text.secondary' }}>{i + 1}</Typography>
              <ListItemText
                primary={e.name}
                secondary={mieterText}
                slotProps={{ secondary: { sx: { color: mv ? 'text.primary' : 'text.secondary' } } }}
              />
            </ListItem>
          )
        })}
      </List>
      {mieterFuer && (
        <MietvertragDialog
          einheit={mieterFuer.id}
          onClose={() => setMieterFuer(undefined)}
          // The new Mietvertrag also changes hat_vertraege.
          onSaved={() => {
            reloadMietvertraege()
            reload()
          }}
        />
      )}
      <LoeschenDialog
        offen={!!zuLoeschen}
        titel="Einheit löschen?"
        loeschend={loeschend}
        onAbbrechen={() => setZuLoeschen(undefined)}
        onLoeschen={handleDelete}
      >
        „{zuLoeschen?.name}“ wird gelöscht.
      </LoeschenDialog>
      <form onSubmit={handleAdd}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'flex-start' } }}>
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
  const { data: mietobjekt, loading, error, reload } = useMietobjekt(id)
  const [darlehenOpen, setDarlehenOpen] = useState(false)
  const [bodenrichtwertOpen, setBodenrichtwertOpen] = useState(false)

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <IconButton component={Link} to="/mietobjekte" aria-label="Zurück">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4">{mietobjekt?.name ?? 'Mietobjekt'}</Typography>
      </Stack>

      {loading && <Laden />}
      {error && <Ladefehler text="Mietobjekt konnte nicht geladen werden." error={error} />}
      {mietobjekt && (
        <>
          <MietobjektFormular
            key={mietobjekt.id}
            mietobjekt={mietobjekt}
            onDarlehen={() => setDarlehenOpen(true)}
            onBodenrichtwert={() => setBodenrichtwertOpen(true)}
            onGespeichert={reload}
          />
          <Einheiten mietobjektId={mietobjekt.id} vermietung={mietobjekt.vermietung} />
          {/* Outside the form: React submit events would bubble through the Dialog's portal. */}
          {darlehenOpen && (
            <DarlehenDialog mietobjekt={mietobjekt} onClose={() => setDarlehenOpen(false)} onSaved={reload} />
          )}
          {bodenrichtwertOpen && (
            <BodenrichtwertDialog
              mietobjekt={mietobjekt}
              onClose={() => setBodenrichtwertOpen(false)}
              onSaved={reload}
            />
          )}
        </>
      )}
    </Stack>
  )
}

export default MietobjektDetail
