import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { ueberschneidung, validierungsFehler } from '../api/client'
import {
  useCreateMietvertrag,
  useEinheiten,
  useMietobjekte,
  useUpdateMietvertrag,
} from '../api/hooks'
import type { Mieter, Mietvertrag, MietvertragInput, Ueberschneidung } from '../api/types'
import { DIALOG_FORMULAR, useVollbild } from './dialog'
import { useMeldung } from './meldung'
import { alsEingabe, dezimal, formatDatum, laenderName } from '../format'

type MieterFeld = Exclude<keyof Mieter, 'id'>
type VertragFeld = 'beginn' | 'ende' | 'kaltmiete' | 'nebenkosten' | 'kaution'

// Form state: every input as a string, converted to API values on submit.
interface Formular {
  mieter: Record<MieterFeld, string>
  einheit: number | ''
  beginn: string
  ende: string
  kaltmiete: string
  nebenkosten: string
  kaution: string
}

const MIETER_FELDER: MieterFeld[] = [
  'vorname',
  'nachname',
  'strasse',
  'hausnummer',
  'plz',
  'ort',
  'land',
  'telefon',
  'email',
  'geburtsdatum',
  'kontoinhaber',
  'iban',
]

function anfangswerte(mv?: Mietvertrag, einheit?: number): Formular {
  const mieter = Object.fromEntries(
    MIETER_FELDER.map((f) => [f, mv ? (mv.mieter[f] ?? '') : f === 'land' ? 'DE' : '']),
  ) as Formular['mieter']
  return {
    mieter,
    einheit: mv?.einheit ?? einheit ?? '',
    beginn: mv?.beginn ?? '',
    ende: mv?.ende ?? '',
    kaltmiete: alsEingabe(mv?.kaltmiete ?? null),
    nebenkosten: alsEingabe(mv?.nebenkosten ?? null),
    kaution: alsEingabe(mv?.kaution ?? null),
  }
}

function zuDaten(f: Formular): MietvertragInput {
  return {
    mieter: { ...f.mieter, geburtsdatum: f.mieter.geburtsdatum || null },
    einheit: Number(f.einheit),
    beginn: f.beginn,
    ende: f.ende || null,
    kaltmiete: dezimal(f.kaltmiete),
    nebenkosten: dezimal(f.nebenkosten),
    // Optional in the form; the model defaults to 0.
    kaution: dezimal(f.kaution) || '0',
  }
}

// "2026-06-01" -> "2026-05-31", in local time like the date inputs.
function vortag(iso: string) {
  const [jahr, monat, tag] = iso.split('-').map(Number)
  const d = new Date(jahr, monat - 1, tag - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function Abschnitt({ titel, children }: { titel: string; children: ReactNode }) {
  return (
    <div>
      <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 1 }}>
        {titel}
      </Typography>
      <Grid container spacing={2}>
        {children}
      </Grid>
    </div>
  )
}

function Zelle({ children, breite = 6 }: { children: ReactNode; breite?: number }) {
  return <Grid size={{ xs: 12, sm: breite }}>{children}</Grid>
}

interface Props {
  // Without a Mietvertrag the dialog creates a new one.
  mietvertrag?: Mietvertrag
  // Preselected Einheit for a new Mietvertrag.
  einheit?: number
  onClose: () => void
  onSaved: () => void
}

function MietvertragDialog({ mietvertrag, einheit, onClose, onSaved }: Props) {
  const meldung = useMeldung()
  const vollbild = useVollbild()
  const createMietvertrag = useCreateMietvertrag()
  const updateMietvertrag = useUpdateMietvertrag()
  const { data: mietobjekte } = useMietobjekte()
  const { data: einheiten } = useEinheiten()
  const [werte, setWerte] = useState(() => anfangswerte(mietvertrag, einheit))
  const [fehler, setFehler] = useState<Record<string, string>>({})
  const [allgemeinerFehler, setAllgemeinerFehler] = useState<string>()
  const [saving, setSaving] = useState(false)
  const [konflikt, setKonflikt] = useState<Ueberschneidung>()

  const objektNamen = new Map(mietobjekte?.map((m) => [m.id, m.name]))
  const einheitOptionen = (einheiten ?? [])
    .map((e) => ({ id: e.id, label: `${objektNamen.get(e.mietobjekt) ?? '?'} – ${e.name}` }))
    .sort((a, b) => a.label.localeCompare(b.label, 'de'))

  function fehlerProps(pfad: string) {
    return { error: !!fehler[pfad], helperText: fehler[pfad], fullWidth: true }
  }

  function mieterFeld(name: MieterFeld) {
    return {
      name,
      value: werte.mieter[name],
      onChange: (e: ChangeEvent<HTMLInputElement>) =>
        setWerte((w) => ({ ...w, mieter: { ...w.mieter, [name]: e.target.value } })),
      // The tenant's data, not the user's: no browser suggestions from the user's own profile.
      autoComplete: 'off',
      ...fehlerProps(`mieter.${name}`),
    }
  }

  function vertragFeld(name: VertragFeld) {
    return {
      name,
      value: werte[name],
      onChange: (e: ChangeEvent<HTMLInputElement>) =>
        setWerte((w) => ({ ...w, [name]: e.target.value })),
      ...fehlerProps(name),
    }
  }

  const datum = { type: 'date', slotProps: { inputLabel: { shrink: true } } }
  const betrag = { slotProps: { htmlInput: { inputMode: 'decimal' } } } as const

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    speichern(false)
  }

  async function speichern(aelterenBeenden: boolean) {
    setSaving(true)
    setFehler({})
    setAllgemeinerFehler(undefined)
    try {
      const daten = { ...zuDaten(werte), ...(aelterenBeenden && { aelteren_beenden: true }) }
      if (mietvertrag) await updateMietvertrag(mietvertrag.id, daten)
      else await createMietvertrag(daten)
      onSaved()
      meldung(mietvertrag ? 'Mieter gespeichert' : 'Mieter angelegt')
      onClose()
    } catch (e) {
      const ueberschneidet = ueberschneidung(e)
      if (ueberschneidet) {
        setKonflikt(ueberschneidet)
        return
      }
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
        <DialogTitle>{mietvertrag ? 'Mieter bearbeiten' : 'Mieter anlegen'}</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            {allgemeinerFehler && <Alert severity="error">{allgemeinerFehler}</Alert>}

            <Abschnitt titel="Person">
              <Zelle>
                <TextField label="Vorname" required {...mieterFeld('vorname')} />
              </Zelle>
              <Zelle>
                <TextField label="Nachname" required {...mieterFeld('nachname')} />
              </Zelle>
              <Zelle breite={8}>
                <TextField label="Straße" {...mieterFeld('strasse')} />
              </Zelle>
              <Zelle breite={4}>
                <TextField label="Hausnummer" {...mieterFeld('hausnummer')} />
              </Zelle>
              <Zelle breite={4}>
                <TextField
                  label="PLZ"
                  {...mieterFeld('plz')}
                  slotProps={{ htmlInput: { pattern: '\\d{5}', maxLength: 5, inputMode: 'numeric' } }}
                />
              </Zelle>
              <Zelle breite={5}>
                <TextField label="Ort" {...mieterFeld('ort')} />
              </Zelle>
              <Zelle breite={3}>
                <TextField
                  label="Land"
                  {...mieterFeld('land')}
                  onChange={(e) =>
                    setWerte((w) => ({ ...w, mieter: { ...w.mieter, land: e.target.value.toUpperCase() } }))
                  }
                  helperText={fehler['mieter.land'] ?? laenderName(werte.mieter.land)}
                  slotProps={{ htmlInput: { maxLength: 2 } }}
                />
              </Zelle>
              <Zelle breite={4}>
                <TextField label="Telefon" type="tel" {...mieterFeld('telefon')} />
              </Zelle>
              <Zelle breite={5}>
                <TextField label="E-Mail" type="email" {...mieterFeld('email')} />
              </Zelle>
              <Zelle breite={3}>
                <TextField label="Geburtsdatum" {...datum} {...mieterFeld('geburtsdatum')} />
              </Zelle>
            </Abschnitt>

            <Abschnitt titel="Bank">
              <Zelle>
                <TextField label="Kontoinhaber" {...mieterFeld('kontoinhaber')} />
              </Zelle>
              <Zelle>
                <TextField
                  label="IBAN"
                  {...mieterFeld('iban')}
                  slotProps={{ htmlInput: { maxLength: 34 } }}
                />
              </Zelle>
            </Abschnitt>

            <Abschnitt titel="Vertrag">
              <Grid size={12}>
                <TextField
                  select
                  label="Einheit"
                  required
                  name="einheit"
                  value={einheitOptionen.length ? werte.einheit : ''}
                  onChange={(e) => setWerte((w) => ({ ...w, einheit: Number(e.target.value) }))}
                  {...fehlerProps('einheit')}
                  helperText={
                    fehler.einheit ?? (einheiten?.length === 0 ? 'Noch keine Einheiten angelegt.' : undefined)
                  }
                >
                  {einheitOptionen.map((o) => (
                    <MenuItem key={o.id} value={o.id}>
                      {o.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Zelle>
                <TextField label="Vertragsbeginn" required {...datum} {...vertragFeld('beginn')} />
              </Zelle>
              <Zelle>
                <TextField label="Vertragsende" {...datum} {...vertragFeld('ende')} />
              </Zelle>
              <Zelle breite={4}>
                <TextField label="Kaltmiete (€)" required {...betrag} {...vertragFeld('kaltmiete')} />
              </Zelle>
              <Zelle breite={4}>
                <TextField label="Nebenkosten (€)" required {...betrag} {...vertragFeld('nebenkosten')} />
              </Zelle>
              <Zelle breite={4}>
                <TextField label="Kaution (€)" {...betrag} {...vertragFeld('kaution')} />
              </Zelle>
            </Abschnitt>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Abbrechen</Button>
          <Button type="submit" variant="contained" loading={saving}>
            {mietvertrag ? 'Speichern' : 'Anlegen'}
          </Button>
        </DialogActions>
      </Box>

      {/* Over the form, which stays open with its input on Abbrechen. */}
      <Dialog open={!!konflikt} onClose={() => setKonflikt(undefined)}>
        <DialogTitle>Einheit bereits vermietet</DialogTitle>
        <DialogContent>
          <Stack spacing={1}>
            {konflikt?.konflikte.map((k) => (
              <DialogContentText key={k.id}>
                {k.einheit_label} ist im Zeitraum bereits an {k.mieter_name} vermietet ({formatDatum(k.beginn)} bis{' '}
                {k.ende ? formatDatum(k.ende) : 'unbefristet'}).
              </DialogContentText>
            ))}
            {konflikt && !konflikt.kann_beenden && (
              <DialogContentText>Bitte Zeitraum oder Einheit ändern.</DialogContentText>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setKonflikt(undefined)}>Abbrechen</Button>
          {konflikt?.kann_beenden && (
            <Button
              variant="contained"
              // Closed first, so a new conflict from the resend can open it again.
              onClick={() => {
                setKonflikt(undefined)
                speichern(true)
              }}
            >
              Vertrag von {[...new Set(konflikt.konflikte.map((k) => k.mieter_name))].join(', ')} zum{' '}
              {formatDatum(vortag(werte.beginn))} beenden und speichern
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Dialog>
  )
}

export default MietvertragDialog
