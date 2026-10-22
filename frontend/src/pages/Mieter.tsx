import Button from '@mui/material/Button'
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
import Laden, { Ladefehler } from '../components/Laden'
import { formatDatum, formatEuro, laenderName } from '../format'

// Only the filled ones, as a group; nothing if all are empty.
function OptionaleZeilen({ zeilen }: { zeilen: [label: string, wert: string][] }) {
  const gefuellt = zeilen.filter(([, wert]) => wert)
  if (gefuellt.length === 0) return null
  return (
    <Stack spacing={0.5}>
      {gefuellt.map(([label, wert]) => (
        <Zeile key={label} label={label} wert={wert} />
      ))}
    </Stack>
  )
}

function MietvertragKarte({ mietvertrag: mv, onEdit }: { mietvertrag: Mietvertrag; onEdit: () => void }) {
  const p = mv.mieter
  const adresse = [`${p.strasse} ${p.hausnummer}`.trim(), `${p.plz} ${p.ort}`.trim()].filter(Boolean)
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
        {/* Land only together with at least one other address line. */}
        {adresse.length > 0 && (
          <div>
            {adresse.map((zeile) => (
              <Typography key={zeile}>{zeile}</Typography>
            ))}
            <Typography>{laenderName(p.land)}</Typography>
          </div>
        )}
        <OptionaleZeilen
          zeilen={[
            ['Telefon', p.telefon],
            ['E-Mail', p.email],
            ['Geburtsdatum', p.geburtsdatum ? formatDatum(p.geburtsdatum) : ''],
          ]}
        />
        <OptionaleZeilen
          zeilen={[
            ['Kontoinhaber', p.kontoinhaber],
            ['IBAN', p.iban],
          ]}
        />
        <Stack spacing={0.5}>
          <Zeile label="Vertragsbeginn" wert={formatDatum(mv.beginn)} />
          <Zeile label="Vertragsende" wert={mv.ende ? formatDatum(mv.ende) : 'unbefristet'} />
          <Zeile label="Kaltmiete" wert={formatEuro(mv.kaltmiete)} />
          <Zeile label="Nebenkosten" wert={formatEuro(mv.nebenkosten)} />
          <Zeile label="Kaution" wert={formatEuro(mv.kaution)} />
          <Zeile label="Objekt" wert={`${mv.mietobjekt_name} – ${mv.einheit_name}`} />
        </Stack>
        <Stack spacing={0.5}>
          <Zeile label="Einnahmen seit Beginn" wert={formatEuro(mv.einnahmen_seit_beginn, 2)} />
          <Zeile label="Kosten seit Beginn" wert={formatEuro(mv.kosten_seit_beginn, 2)} />
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
      <Stack direction="row" useFlexGap sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
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

      {loading && <Laden />}
      {error && <Ladefehler text="Mieter konnten nicht geladen werden." error={error} />}
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
