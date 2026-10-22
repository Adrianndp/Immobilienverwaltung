import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { PieChart } from '@mui/x-charts/PieChart'
import { useState } from 'react'
import { Link } from 'react-router'
import { useDeckungsbeitrag, useMietobjekte } from '../api/hooks'
import type { Mietobjekt } from '../api/types'
import TabellenContainer from '../components/Tabelle'
import { formatEuro } from '../format'

const MONATE = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
]

const AKTUELLES_JAHR = new Date().getFullYear()
const JAHRE = [0, 1, 2, 3, 4].map((i) => AKTUELLES_JAHR - i)

interface BetragTabelleProps {
  spalte: string
  zeilen: { label: string; betrag: string }[]
  summe: string
}

function BetragTabelle({ spalte, zeilen, summe }: BetragTabelleProps) {
  return (
    <TabellenContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{spalte}</TableCell>
            <TableCell align="right">Betrag</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {zeilen.map((z) => (
            <TableRow key={z.label}>
              <TableCell>{z.label}</TableCell>
              <TableCell align="right">{formatEuro(z.betrag, 2)}</TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }}>Summe</TableCell>
            <TableCell align="right" sx={{ fontWeight: 600 }}>
              {formatEuro(summe, 2)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TabellenContainer>
  )
}

// Rendered only once the Mietobjekte are loaded, so the first one can be the default.
function Auswertung({ mietobjekte }: { mietobjekte: Mietobjekt[] }) {
  const [mietobjektId, setMietobjektId] = useState(mietobjekte[0].id)
  const [jahr, setJahr] = useState(AKTUELLES_JAHR)
  // 0 = Ganzes Jahr
  const [monat, setMonat] = useState(0)
  const { data, loading, error } = useDeckungsbeitrag(mietobjektId, jahr, monat || undefined)
  const farbe = mietobjekte.find((m) => m.id === mietobjektId)?.farbe

  return (
    <Paper variant="outlined" sx={{ p: 2, borderLeft: 4, borderLeftColor: farbe }}>
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            select
            label="Mietobjekt"
            value={mietobjektId}
            onChange={(e) => setMietobjektId(Number(e.target.value))}
            sx={{ minWidth: 240 }}
          >
            {mietobjekte.map((m) => (
              <MenuItem key={m.id} value={m.id}>
                {m.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Jahr"
            value={jahr}
            onChange={(e) => setJahr(Number(e.target.value))}
            sx={{ minWidth: 120 }}
          >
            {JAHRE.map((j) => (
              <MenuItem key={j} value={j}>
                {j}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Monat"
            value={monat}
            onChange={(e) => setMonat(Number(e.target.value))}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value={0}>Ganzes Jahr</MenuItem>
            {MONATE.map((name, i) => (
              <MenuItem key={name} value={i + 1}>
                {name}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        {loading && <CircularProgress />}
        {error && <Alert severity="error">Auswertung konnte nicht geladen werden.</Alert>}
        {data && (
          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={3}>
                <Stack spacing={1}>
                  <Typography variant="h6">Einnahmen</Typography>
                  <BetragTabelle spalte="Mieter" zeilen={data.einnahmen} summe={data.einnahmen_summe} />
                </Stack>
                <Stack spacing={1}>
                  <Typography variant="h6">Ausgaben</Typography>
                  <BetragTabelle
                    spalte="Kostenart"
                    zeilen={data.ausgaben.map((a) => ({ label: a.kostenart, betrag: a.betrag }))}
                    summe={data.ausgaben_summe}
                  />
                </Stack>
                <Stack spacing={1}>
                  <Typography variant="h6">Ergebnis</Typography>
                  <Typography variant="h3" color={Number(data.ergebnis) >= 0 ? 'success.main' : 'error.main'}>
                    {formatEuro(data.ergebnis, 2)}
                  </Typography>
                </Stack>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              {data.ausgaben.length ? (
                <PieChart
                  series={[
                    {
                      data: data.ausgaben.map((a) => ({ id: a.kostenart, value: Number(a.betrag), label: a.kostenart })),
                      valueFormatter: (v) => formatEuro(String(v.value), 2),
                    },
                  ]}
                  height={300}
                />
              ) : (
                <Typography color="text.secondary">Keine Ausgaben im Zeitraum.</Typography>
              )}
            </Grid>
          </Grid>
        )}
      </Stack>
    </Paper>
  )
}

function Deckungsbeitrag() {
  const { data: mietobjekte, loading, error } = useMietobjekte()

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Objekt Deckungsbeitrag</Typography>

      {loading && <CircularProgress />}
      {error && <Alert severity="error">Mietobjekte konnten nicht geladen werden.</Alert>}
      {mietobjekte?.length === 0 && (
        <Typography color="text.secondary">
          Legen Sie zuerst ein <Link to="/mietobjekte">Mietobjekt</Link> an.
        </Typography>
      )}
      {!!mietobjekte?.length && <Auswertung mietobjekte={mietobjekte} />}
    </Stack>
  )
}

export default Deckungsbeitrag
