import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormHelperText from '@mui/material/FormHelperText'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import { useState, type FormEvent } from 'react'
import { validierungsFehler } from '../api/client'
import { useMietvertraege, useRechnungen, useZuordnenBuchung } from '../api/hooks'
import type { Buchung } from '../api/types'
import { Zeile } from './InfoKarte'
import { formatDatum, formatEuro } from '../format'

interface ZuordnungsZeile {
  ziel: number | ''
  betrag: string
}

interface Props {
  buchung: Buchung
  onClose: () => void
  onSaved: () => void
}

// Amounts as whole cents so that sums are exact.
function cent(betrag: string) {
  return Math.round((Number(betrag) || 0) * 100)
}

function BuchungZuordnenDialog({ buchung, onClose, onSaved }: Props) {
  const zuordnen = useZuordnenBuchung()
  const { data: mietvertraege } = useMietvertraege()
  const { data: rechnungen } = useRechnungen()
  // Incoming money is assigned to Mietverträge, outgoing money to Rechnungen.
  const eingehend = Number(buchung.betrag) > 0
  const feld = eingehend ? 'mietvertrag' : 'rechnung'
  const betragAbs = buchung.betrag.replace('-', '')
  const [zeilen, setZeilen] = useState<ZuordnungsZeile[]>(
    buchung.zuordnungen.length
      ? buchung.zuordnungen.map((z) => ({ ziel: z[feld] ?? '', betrag: z.betrag }))
      : [{ ziel: '', betrag: betragAbs }],
  )
  const [fehler, setFehler] = useState<Record<string, string>>({})
  const [allgemeinerFehler, setAllgemeinerFehler] = useState<string>()
  const [saving, setSaving] = useState(false)

  const offenCent = cent(betragAbs) - zeilen.reduce((s, z) => s + cent(z.betrag), 0)

  const optionen = eingehend
    ? mietvertraege?.map((m) => ({
        id: m.id,
        label: `${m.mieter.vorname} ${m.mieter.nachname} – ${m.mietobjekt_name} ${m.einheit_name}`,
      }))
    : rechnungen?.map((r) => ({ id: r.id, label: `${r.rechnungsnummer} – ${r.lieferant_name}` }))

  function setZeile(index: number, aenderung: Partial<ZuordnungsZeile>) {
    setZeilen((liste) => liste.map((z, i) => (i === index ? { ...z, ...aenderung } : z)))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setFehler({})
    setAllgemeinerFehler(undefined)
    try {
      await zuordnen(
        buchung.id,
        zeilen.map((z) => ({
          betrag: z.betrag,
          mietvertrag: eingehend ? Number(z.ziel) : null,
          rechnung: eingehend ? null : Number(z.ziel),
        })),
      )
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
        <DialogTitle>Buchung zuordnen</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            {allgemeinerFehler && <Alert severity="error">{allgemeinerFehler}</Alert>}

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={0.5}>
                <Zeile label="Buchungstag" wert={formatDatum(buchung.buchungstag)} />
                <Zeile label="Kontoinhaber" wert={buchung.kontoinhaber} />
                <Zeile label="Buchungstext" wert={buchung.buchungstext} />
                <Zeile label="Betrag" wert={formatEuro(buchung.betrag, 2)} />
              </Stack>
            </Paper>

            <Stack spacing={2}>
              {zeilen.map((z, i) => {
                const zielFehler =
                  fehler[`zuordnungen.${i}.${feld}`] ?? fehler[`zuordnungen.${i}.non_field_errors`]
                return (
                  <Stack key={i} direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
                    <TextField
                      select
                      label={eingehend ? 'Mietvertrag' : 'Rechnung'}
                      required
                      fullWidth
                      value={optionen?.length ? z.ziel : ''}
                      onChange={(e) => setZeile(i, { ziel: Number(e.target.value) })}
                      error={!!zielFehler}
                      helperText={zielFehler}
                    >
                      {optionen?.map((o) => (
                        <MenuItem key={o.id} value={o.id}>
                          {o.label}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      label="Betrag (€)"
                      type="number"
                      required
                      value={z.betrag}
                      onChange={(e) => setZeile(i, { betrag: e.target.value })}
                      error={!!fehler[`zuordnungen.${i}.betrag`]}
                      helperText={fehler[`zuordnungen.${i}.betrag`]}
                      slotProps={{ htmlInput: { step: '0.01', min: 0.01 } }}
                      sx={{ width: 160, flexShrink: 0 }}
                    />
                    <IconButton
                      aria-label="Zuordnung entfernen"
                      onClick={() => setZeilen((liste) => liste.filter((_, j) => j !== i))}
                      sx={{ mt: 1 }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                )
              })}
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Button startIcon={<AddIcon />} onClick={() => setZeilen((liste) => [...liste, { ziel: '', betrag: '' }])}>
                  Zuordnung hinzufügen
                </Button>
                <Typography color={offenCent < 0 ? 'error' : 'text.primary'}>
                  Noch nicht zugeordnet: {formatEuro(String(offenCent / 100), 2)}
                </Typography>
              </Stack>
              {fehler.zuordnungen && <FormHelperText error>{fehler.zuordnungen}</FormHelperText>}
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Abbrechen</Button>
          <Button type="submit" variant="contained" loading={saving} disabled={offenCent < 0}>
            Speichern
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default BuchungZuordnenDialog
