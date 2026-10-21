import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useMietobjekte } from '../api/hooks'
import type { Mietobjekt } from '../api/types'
import MietobjektDialog from '../components/MietobjektDialog'
import { laenderName } from '../format'

const LEER = '–'

function formatEuro(value: string | null) {
  if (value === null) return LEER
  return Number(value).toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  })
}

// "2024-03-15" -> "15.03.2024", without going through Date to avoid time zone shifts.
function formatDatum(value: string | null) {
  if (value === null) return LEER
  const [jahr, monat, tag] = value.split('-')
  return `${tag}.${monat}.${jahr}`
}

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

function Zeile({ label, wert, zusatz }: { label: string; wert: string; zusatz?: ReactNode }) {
  return (
    <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        {zusatz}
        <Typography variant="body2">{wert}</Typography>
      </Stack>
    </Stack>
  )
}

function MietobjektKarte({ mietobjekt: m }: { mietobjekt: Mietobjekt }) {
  return (
    <Card sx={{ height: '100%', borderLeft: 4, borderLeftColor: m.farbe }}>
      <CardHeader
        title={m.name}
        action={
          <IconButton component={Link} to={`/mietobjekte/${m.id}`} aria-label="Bearbeiten">
            <EditIcon />
          </IconButton>
        }
      />
      <CardContent sx={{ pt: 0 }}>
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
            {/* Restschuld comes from Darlehen, which do not exist yet. */}
            <Zeile label="Restschuld" wert={LEER} />
            <Zeile label="Grundschuld" wert={formatEuro(m.grundschuld)} />
            <Zeile
              label="Marktwert"
              wert={formatEuro(m.marktwert)}
              zusatz={<Wertentwicklung kaufpreis={m.kaufpreis} marktwert={m.marktwert} />}
            />
            {/* Erwirtschafteter Betrag comes from Buchungen, which do not exist yet. */}
            <Zeile label="Erwirtschafteter Betrag" wert={LEER} />
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}

function Mietobjekte() {
  const { data: mietobjekte, loading, error, reload } = useMietobjekte()
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">Meine Mietobjekte</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Anlegen
        </Button>
      </Stack>
      <MietobjektDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onCreated={reload} />

      {loading && <CircularProgress />}
      {error && <Alert severity="error">Mietobjekte konnten nicht geladen werden.</Alert>}
      {mietobjekte?.length === 0 && (
        <Typography color="text.secondary">Noch keine Mietobjekte angelegt.</Typography>
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
