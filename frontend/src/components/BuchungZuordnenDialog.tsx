import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormHelperText from '@mui/material/FormHelperText'
import IconButton from '@mui/material/IconButton'
import ListSubheader from '@mui/material/ListSubheader'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import { useState, type FormEvent } from 'react'
import { validierungsFehler } from '../api/client'
import { useDarlehen, useMietvertraege, useRechnungen, useZuordnenBuchung } from '../api/hooks'
import type { Buchung, Zuordnung } from '../api/types'
import { Zeile } from './InfoKarte'
import { dezimal, formatDatum, formatEuro } from '../format'
import { DIALOG_FORMULAR, useVollbild } from './dialog'
import { useMeldung } from './meldung'

type ZielFeld = 'mietvertrag' | 'rechnung' | 'darlehen'

interface ZuordnungsZeile {
  // "rechnung:5": an outgoing Buchung can go to a Rechnung or a Darlehen, so the Select value names both.
  ziel: string
  betrag: string
}

function zielVon(z: Zuordnung) {
  const feld = (['mietvertrag', 'rechnung', 'darlehen'] as const).find((f) => z[f] !== null)
  return feld ? `${feld}:${z[feld]}` : ''
}

interface Props {
  buchung: Buchung
  onClose: () => void
  onSaved: () => void
}

// Amounts as whole cents so that sums are exact.
function cent(betrag: string) {
  return Math.round((Number(dezimal(betrag)) || 0) * 100)
}

function BuchungZuordnenDialog({ buchung, onClose, onSaved }: Props) {
  const meldung = useMeldung()
  const vollbild = useVollbild()
  const zuordnen = useZuordnenBuchung()
  const { data: mietvertraege } = useMietvertraege()
  const { data: rechnungen } = useRechnungen()
  const { data: darlehen } = useDarlehen()
  // Incoming money is assigned to Mietverträge, outgoing money to Rechnungen or Darlehen.
  const eingehend = Number(buchung.betrag) > 0
  const betragAbs = buchung.betrag.replace('-', '')
  const [zeilen, setZeilen] = useState<ZuordnungsZeile[]>(
    buchung.zuordnungen.length
      ? buchung.zuordnungen.map((z) => ({ ziel: zielVon(z), betrag: z.betrag }))
      : [{ ziel: '', betrag: betragAbs }],
  )
  const [fehler, setFehler] = useState<Record<string, string>>({})
  const [allgemeinerFehler, setAllgemeinerFehler] = useState<string>()
  const [saving, setSaving] = useState(false)

  const offenCent = cent(betragAbs) - zeilen.reduce((s, z) => s + cent(z.betrag), 0)

  // Select children must be a flat list, so the group headers are items of it.
  const optionen = eingehend
    ? mietvertraege?.map((m) => (
        <MenuItem key={m.id} value={`mietvertrag:${m.id}`}>
          {m.mieter.vorname} {m.mieter.nachname} – {m.mietobjekt_name} {m.einheit_name}
        </MenuItem>
      ))
    : rechnungen &&
      darlehen && [
        <ListSubheader key="rechnungen">Rechnungen</ListSubheader>,
        ...rechnungen.map((r) => (
          <MenuItem key={`r${r.id}`} value={`rechnung:${r.id}`}>
            {r.rechnungsnummer} – {r.lieferant_name}
          </MenuItem>
        )),
        <ListSubheader key="darlehen">Darlehen</ListSubheader>,
        ...darlehen.map((d) => (
          <MenuItem key={`d${d.id}`} value={`darlehen:${d.id}`}>
            Darlehen – {d.bank} – {d.mietobjekt_name}
          </MenuItem>
        )),
      ]

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
        zeilen.map((z) => {
          const [feld, id] = z.ziel.split(':')
          return {
            betrag: dezimal(z.betrag),
            mietvertrag: feld === 'mietvertrag' ? Number(id) : null,
            rechnung: feld === 'rechnung' ? Number(id) : null,
            darlehen: feld === 'darlehen' ? Number(id) : null,
          }
        }),
      )
      onSaved()
      meldung('Zuordnung gespeichert')
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
                const feld = z.ziel.split(':')[0] as ZielFeld
                const zielFehler =
                  fehler[`zuordnungen.${i}.${feld}`] ?? fehler[`zuordnungen.${i}.non_field_errors`]
                return (
                  <Stack
                    key={i}
                    direction="row"
                    useFlexGap
                    sx={{ alignItems: 'flex-start', flexWrap: { xs: 'wrap', sm: 'nowrap' }, gap: 2 }}
                  >
                    <TextField
                      select
                      label={eingehend ? 'Mietvertrag' : 'Rechnung / Darlehen'}
                      required
                      // Own line on phones, otherwise the select is squeezed to nothing.
                      sx={{ flex: { xs: '1 1 100%', sm: '1 1 auto' } }}
                      value={optionen?.length ? z.ziel : ''}
                      onChange={(e) => setZeile(i, { ziel: e.target.value })}
                      error={!!zielFehler}
                      helperText={zielFehler}
                    >
                      {optionen}
                    </TextField>
                    <TextField
                      label="Betrag (€)"
                      required
                      value={z.betrag}
                      onChange={(e) => setZeile(i, { betrag: e.target.value })}
                      error={!!fehler[`zuordnungen.${i}.betrag`]}
                      helperText={fehler[`zuordnungen.${i}.betrag`]}
                      slotProps={{ htmlInput: { inputMode: 'decimal' } }}
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
              <Stack
                direction="row"
                useFlexGap
                sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}
              >
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
      </Box>
    </Dialog>
  )
}

export default BuchungZuordnenDialog
