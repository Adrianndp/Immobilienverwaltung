import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import { useState } from 'react'
import { Link } from 'react-router'
import { useMietobjekte } from '../api/hooks'
import type { Mietobjekt } from '../api/types'
import InfoKarte, { Zeile } from '../components/InfoKarte'
import MietobjektDialog from '../components/MietobjektDialog'
import Laden, { Ladefehler } from '../components/Laden'
import { formatDatum, formatEuro, laenderName } from '../format'

function Wertentwicklung({ kaufpreis, marktwert }: Pick<Mietobjekt, 'kaufpreis' | 'marktwert'>) {
  if (kaufpreis === null || marktwert === null || Number(kaufpreis) <= 0) return null
  const prozent = (Number(marktwert) / Number(kaufpreis) - 1) * 100
  const label = prozent.toLocaleString('de-DE', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    signDisplay: 'always',
  })
  return <Chip label={`${label} %`} size="small" color={prozent >= 0 ? 'success' : 'error'} />
}

function MietobjektKarte({ mietobjekt: m }: { mietobjekt: Mietobjekt }) {
  return (
    <InfoKarte
      titel={m.name}
      farbe={m.farbe}
      aktion={
        <IconButton component={Link} to={`/mietobjekte/${m.id}`} aria-label="Bearbeiten">
          <EditIcon />
        </IconButton>
      }
    >
      <Stack spacing={2}>
        <div>
          <Typography>
            {m.strasse} {m.hausnummer}
          </Typography>
          <Typography>
            {m.plz} {m.ort}
          </Typography>
          <Typography>{laenderName(m.land)}</Typography>
        </div>
        <Stack spacing={0.5}>
          <Zeile label="Kaufdatum" wert={formatDatum(m.kaufdatum)} />
          <Zeile label="Kaufpreis" wert={formatEuro(m.kaufpreis)} />
          <Zeile label="Restschuld" wert={formatEuro(m.restschuld)} />
          <Zeile label="Grundschuld" wert={formatEuro(m.grundschuld)} />
          <Zeile
            label="Marktwert"
            wert={formatEuro(m.marktwert)}
            zusatz={<Wertentwicklung kaufpreis={m.kaufpreis} marktwert={m.marktwert} />}
          />
          <Zeile
            label="Erwirtschafteter Betrag"
            wert={formatEuro(m.erwirtschafteter_betrag, 2)}
            farbe={Number(m.erwirtschafteter_betrag) >= 0 ? 'success.main' : 'error.main'}
          />
        </Stack>
      </Stack>
    </InfoKarte>
  )
}

function Mietobjekte() {
  const { data: mietobjekte, loading, error, reload } = useMietobjekte()
  const [dialogOpen, setDialogOpen] = useState(false)

  const anlegen = (
    <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
      Anlegen
    </Button>
  )

  return (
    <Stack spacing={2}>
      <Stack direction="row" useFlexGap sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h4">Meine Mietobjekte</Typography>
        {anlegen}
      </Stack>
      <MietobjektDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onCreated={reload} />

      {loading && <Laden />}
      {error && <Ladefehler text="Mietobjekte konnten nicht geladen werden." error={error} />}
      {mietobjekte?.length === 0 && (
        <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
          <Typography color="text.secondary">Noch keine Mietobjekte angelegt.</Typography>
          {anlegen}
        </Stack>
      )}

      <Grid container spacing={2}>
        {mietobjekte?.map((m) => (
          <Grid key={m.id} size={{ xs: 12, md: 6 }}>
            <MietobjektKarte mietobjekt={m} />
          </Grid>
        ))}
      </Grid>
    </Stack>
  )
}

export default Mietobjekte
