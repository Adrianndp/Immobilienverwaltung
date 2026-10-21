import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { useMietvertraege } from '../api/hooks'
import { mietvertragStatus, type Mietvertrag } from '../api/types'
import InfoKarte, { Zeile } from '../components/InfoKarte'
import MietvertragDialog from '../components/MietvertragDialog'
import { formatDatum, formatEuro, laenderName, LEER, oderLeer } from '../format'

function MietvertragKarte({ mietvertrag: mv, onEdit }: { mietvertrag: Mietvertrag; onEdit: () => void }) {
  const p = mv.mieter
  return (
    <InfoKarte
      titel={`${p.vorname} ${p.nachname}`}
      farbe={mv.farbe}
      aktion={
        <IconButton onClick={onEdit} aria-label="Bearbeiten">
          <EditIcon />
        </IconButton>
      }
    >
      <Stack spacing={2}>
        <div>
          <Typography>{oderLeer(`${p.strasse} ${p.hausnummer}`.trim())}</Typography>
          <Typography>{oderLeer(`${p.plz} ${p.ort}`.trim())}</Typography>
          <Typography>{laenderName(p.land)}</Typography>
        </div>
        <Stack spacing={0.5}>
          <Zeile label="Telefon" wert={oderLeer(p.telefon)} />
          <Zeile label="E-Mail" wert={oderLeer(p.email)} />
          <Zeile label="Geburtsdatum" wert={formatDatum(p.geburtsdatum)} />
        </Stack>
        <Stack spacing={0.5}>
          <Zeile label="Kontoinhaber" wert={oderLeer(p.kontoinhaber)} />
          <Zeile label="IBAN" wert={oderLeer(p.iban)} />
        </Stack>
        <Stack spacing={0.5}>
          <Zeile label="Vertragsbeginn" wert={formatDatum(mv.beginn)} />
          <Zeile label="Vertragsende" wert={formatDatum(mv.ende)} />
          <Zeile label="Kaltmiete" wert={formatEuro(mv.kaltmiete)} />
          <Zeile label="Nebenkosten" wert={formatEuro(mv.nebenkosten)} />
          <Zeile label="Kaution" wert={formatEuro(mv.kaution)} />
          <Zeile label="Objekt" wert={`${mv.mietobjekt_name} – ${mv.einheit_name}`} />
        </Stack>
        {/* Both come from Buchungen, which do not exist yet. */}
        <Stack spacing={0.5}>
          <Zeile label="Einnahmen seit Beginn" wert={LEER} />
          <Zeile label="Kosten seit Beginn" wert={LEER} />
        </Stack>
      </Stack>
    </InfoKarte>
  )
}

function Mieter() {
  const [searchParams] = useSearchParams()
  const status = mietvertragStatus(searchParams.get('status'))
  const { data: mietvertraege, loading, error, reload } = useMietvertraege(status)
  // undefined: closed, null: create, Mietvertrag: edit.
  const [dialog, setDialog] = useState<Mietvertrag | null>()

  const anlegen = (
    <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog(null)}>
      Anlegen
    </Button>
  )

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">Mieter</Typography>
        {anlegen}
      </Stack>
      {dialog !== undefined && (
        <MietvertragDialog
          mietvertrag={dialog ?? undefined}
          onClose={() => setDialog(undefined)}
          onSaved={reload}
        />
      )}

      {loading && <CircularProgress />}
      {error && <Alert severity="error">Mieter konnten nicht geladen werden.</Alert>}
      {mietvertraege?.length === 0 && (
        <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
          <Typography color="text.secondary">Keine Mieter in dieser Ansicht.</Typography>
          {anlegen}
        </Stack>
      )}

      <Grid container spacing={2}>
        {mietvertraege?.map((mv) => (
          <Grid key={mv.id} size={{ xs: 12, md: 6 }}>
            <MietvertragKarte mietvertrag={mv} onEdit={() => setDialog(mv)} />
          </Grid>
        ))}
      </Grid>
    </Stack>
  )
}

export default Mieter
