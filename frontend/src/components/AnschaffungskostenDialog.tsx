import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import InputAdornment from '@mui/material/InputAdornment'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useState, type FormEvent } from 'react'
import { validierungsFehler } from '../api/client'
import { useAnschaffungskosten, useUpdateAnschaffungskosten } from '../api/hooks'
import type { Anschaffungskosten, AnschaffungskostenInput, Mietobjekt } from '../api/types'
import { dezimal, formatEuro } from '../format'
import Laden, { Ladefehler } from './Laden'
import { DIALOG_FORMULAR, useVollbild } from './dialog'
import { useMeldung } from './meldung'

type Betrag = keyof AnschaffungskostenInput
type Werte = Record<Betrag, string>

interface Zeile {
  feld: Betrag
  label: string
  // Subtracted from the sum, shown with a minus sign.
  abzug?: boolean
}

// The same groups as Anschaffungskosten in the backend's models.py.
const ANSCHAFFUNG: Zeile[] = [
  { feld: 'kaufpreis', label: 'Kaufpreis' },
  { feld: 'gebuehren', label: 'Gebühren' },
  { feld: 'vormerkung', label: 'Landesoberkasse – Eintragung Vormerkung' },
  { feld: 'grundbuchauszug', label: 'Landesoberkasse – Erteilung Grundbuchauszug' },
  { feld: 'grunderwerbsteuer', label: 'Grunderwerbsteuer' },
  { feld: 'notarkosten', label: 'Notarkosten' },
  { feld: 'maklerprovision', label: 'Maklerprovision' },
  { feld: 'abzug_instandhaltungsruecklage', label: 'abzgl. mitverkaufte Instandhaltungsrücklage', abzug: true },
  { feld: 'abzug_inventar', label: 'abzgl. mitverkauftes Inventar', abzug: true },
]
const HERSTELLUNG: Zeile[] = [
  { feld: 'einstellplaetze', label: 'Ablösung für Einstellplätze' },
  { feld: 'anschlusskosten', label: 'Anschlusskosten' },
  { feld: 'architekt', label: 'Architektenhonorar' },
  { feld: 'bauarbeiten', label: 'Bauarbeiten' },
  { feld: 'baumaterial', label: 'Baumaterial und Baumaschinen' },
  { feld: 'bodenbelaege', label: 'Bodenbeläge' },
  { feld: 'taefelung', label: 'Decken- und Wandtäfelung' },
  { feld: 'elektro', label: 'Elektroinstallation' },
  { feld: 'fenster', label: 'Fenster und Fenstergitter' },
  { feld: 'garten', label: 'Gartenanlagen' },
  { feld: 'heizung', label: 'Heizungsanlagen' },
  { feld: 'maler', label: 'Malerarbeiten' },
  { feld: 'sanitaer', label: 'Sanitäre Installationen' },
  { feld: 'umzaeunung', label: 'Umzäunung' },
  { feld: 'sonstiges', label: 'Sonstiges' },
]
const NACHTRAEGLICH: Zeile[] = [{ feld: 'erschliessung', label: 'Erschließungskosten' }]
const GRUND_BODEN: Zeile = { feld: 'anteil_grund_boden', label: 'abzgl. Anteil Grund und Boden', abzug: true }

// Whole cents, so the sums have no floating point errors. Unreadable input counts as 0, like an empty field.
function cent(eingabe: string) {
  const wert = Number(dezimal(eingabe))
  return Number.isFinite(wert) ? Math.round(wert * 100) : 0
}

// The same calculation as summen() in the backend.
function summen(werte: Werte) {
  const summe = (zeilen: Zeile[]) => zeilen.reduce((s, z) => s + (z.abzug ? -1 : 1) * cent(werte[z.feld]), 0)
  const anschaffung = summe(ANSCHAFFUNG)
  const herstellung = summe(HERSTELLUNG)
  const nachtraeglich = summe(NACHTRAEGLICH)
  const gesamt = anschaffung + herstellung + nachtraeglich
  return { anschaffung, herstellung, nachtraeglich, gesamt, objekt: gesamt - cent(werte.anteil_grund_boden) }
}

// The API's values as inputs; zeros stay empty, so only the entered amounts stand out.
function eingaben(daten: Anschaffungskosten): Werte {
  const felder = [...ANSCHAFFUNG, ...HERSTELLUNG, ...NACHTRAEGLICH, GRUND_BODEN].map((z) => z.feld)
  return Object.fromEntries(
    felder.map((feld) => [feld, daten[feld] === null || Number(daten[feld]) === 0 ? '' : daten[feld]]),
  ) as Werte
}

interface BetragZeileProps {
  zeile: Zeile
  wert: string
  fehler?: string
  fett?: boolean
  onChange: (wert: string) => void
}

// Label on the left, the amount input right-aligned on the right.
function BetragZeile({ zeile, wert, fehler, fett, onChange }: BetragZeileProps) {
  const id = `anschaffungskosten-${zeile.feld}`
  return (
    <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
      {/* Aligned with the text of the small input. */}
      <Typography component="label" htmlFor={id} sx={{ pt: 1, fontWeight: fett ? 'bold' : undefined }}>
        {zeile.label}
      </Typography>
      <TextField
        id={id}
        size="small"
        value={wert}
        onChange={(e) => onChange(e.target.value)}
        error={!!fehler}
        helperText={fehler}
        autoComplete="off"
        sx={{ width: { xs: 150, sm: 200 }, flexShrink: 0, '& .MuiInputBase-input': { textAlign: 'right' } }}
        slotProps={{
          // Text with a decimal keyboard, so "1234,56" can be typed; dezimal() converts it on save.
          htmlInput: { inputMode: 'decimal' },
          input: {
            startAdornment: zeile.abzug && <InputAdornment position="start">−</InputAdornment>,
            endAdornment: <InputAdornment position="end">€</InputAdornment>,
          },
        }}
      />
    </Stack>
  )
}

function SummenZeile({ label, cent, gross }: { label: string; cent: number; gross?: boolean }) {
  const variant = gross ? 'h5' : 'body1'
  return (
    <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
      <Typography variant={variant} sx={{ fontWeight: 'bold' }}>
        {label}
      </Typography>
      {/* pr like the input's padding, so the € signs line up. */}
      <Typography variant={variant} sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', pr: 1.75 }}>
        {formatEuro(String(cent / 100), 2)}
      </Typography>
    </Stack>
  )
}

interface FormularProps {
  mietobjekt: Mietobjekt
  daten: Anschaffungskosten
  onClose: () => void
  onSaved: () => void
}

function Formular({ mietobjekt, daten, onClose, onSaved }: FormularProps) {
  const meldung = useMeldung()
  const updateAnschaffungskosten = useUpdateAnschaffungskosten()
  const [werte, setWerte] = useState(() => eingaben(daten))
  const [fehler, setFehler] = useState<Record<string, string>>({})
  const [allgemeinerFehler, setAllgemeinerFehler] = useState<string>()
  const [saving, setSaving] = useState(false)
  const summe = summen(werte)

  function zeilen(liste: Zeile[], fett?: boolean) {
    return liste.map((zeile) => (
      <BetragZeile
        key={zeile.feld}
        zeile={zeile}
        wert={werte[zeile.feld]}
        fehler={fehler[zeile.feld]}
        fett={fett}
        onChange={(wert) => setWerte((w) => ({ ...w, [zeile.feld]: wert }))}
      />
    ))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setFehler({})
    setAllgemeinerFehler(undefined)
    // Empty means no Kaufpreis, and 0 for the other amounts.
    const leer = (feld: Betrag) => (feld === 'kaufpreis' ? null : '0')
    const eingabe = Object.fromEntries(
      Object.entries(werte).map(([feld, wert]) => [feld, wert === '' ? leer(feld as Betrag) : dezimal(wert)]),
    ) as unknown as AnschaffungskostenInput
    try {
      await updateAnschaffungskosten(mietobjekt.id, eingabe)
      onSaved()
      meldung('Anschaffungskosten gespeichert')
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
    <Box component="form" onSubmit={handleSubmit} noValidate sx={DIALOG_FORMULAR}>
      <DialogContent>
        <Stack spacing={1.5}>
          {allgemeinerFehler && <Alert severity="error">{allgemeinerFehler}</Alert>}

          <Typography variant="h6">Anschaffungskosten und Anschaffungsnebenkosten</Typography>
          {zeilen(ANSCHAFFUNG)}
          <Divider />
          <SummenZeile label="Summe Anschaffungskosten und Anschaffungsnebenkosten" cent={summe.anschaffung} />

          <Typography variant="h6" sx={{ pt: 2 }}>
            Herstellungskosten
          </Typography>
          {zeilen(HERSTELLUNG)}
          <Divider />
          <SummenZeile label="Summe Herstellungskosten" cent={summe.herstellung} />

          <Typography variant="h6" sx={{ pt: 2 }}>
            Nachträgliche Anschaffungs- oder Herstellungskosten
          </Typography>
          {zeilen(NACHTRAEGLICH)}
          <Divider />
          <SummenZeile
            label="Summe nachträgliche Anschaffungs- oder Herstellungskosten"
            cent={summe.nachtraeglich}
          />

          <Divider sx={{ pt: 2 }} />
          <SummenZeile label="Gesamtkosten" cent={summe.gesamt} />
          {zeilen([GRUND_BODEN], true)}
          <Divider />
          <SummenZeile label="Gesamtkosten Objekt" cent={summe.objekt} gross />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Abbrechen</Button>
        <Button type="submit" variant="contained" loading={saving}>
          Speichern
        </Button>
      </DialogActions>
    </Box>
  )
}

interface Props {
  mietobjekt: Mietobjekt
  onClose: () => void
  // After saving; also the Mietobjekt's kaufpreis has changed.
  onSaved: () => void
}

function AnschaffungskostenDialog({ mietobjekt, onClose, onSaved }: Props) {
  const vollbild = useVollbild()
  const { data, loading, error } = useAnschaffungskosten(mietobjekt.id)

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md" fullScreen={vollbild}>
      <DialogTitle>Anschaffungskosten – {mietobjekt.name}</DialogTitle>
      {/* The form starts with the loaded values, so it is only rendered once they are there. */}
      {data ? (
        <Formular mietobjekt={mietobjekt} daten={data} onClose={onClose} onSaved={onSaved} />
      ) : (
        <>
          <DialogContent>
            {loading && <Laden />}
            {error && <Ladefehler text="Anschaffungskosten konnten nicht geladen werden." error={error} />}
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose}>Schließen</Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  )
}

export default AnschaffungskostenDialog
