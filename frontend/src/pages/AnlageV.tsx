import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { Link } from 'react-router'
import { useAnlageV, useMietobjekte } from '../api/hooks'
import type { Mietobjekt } from '../api/types'
import { formatEuro } from '../format'

const AKTUELLES_JAHR = new Date().getFullYear()
const JAHRE = [0, 1, 2, 3, 4].map((i) => AKTUELLES_JAHR - i)

const SUMME = { fontWeight: 600 }

// Rendered only once the Mietobjekte are loaded, so the first one can be the default.
function Auswertung({ mietobjekte }: { mietobjekte: Mietobjekt[] }) {
  const [mietobjektId, setMietobjektId] = useState(mietobjekte[0].id)
  const [jahr, setJahr] = useState(AKTUELLES_JAHR)
  const { data, loading, error } = useAnlageV(mietobjektId, jahr)
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
        </Stack>

        {loading && <CircularProgress />}
        {error && <Alert severity="error">Auswertung konnte nicht geladen werden.</Alert>}
        {data && (
          <>
            <Stack spacing={1}>
              <Typography variant="h6">I. Einnahmen</Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Mieter</TableCell>
                      <TableCell align="right">Anzahl Zahlungen</TableCell>
                      <TableCell align="right">Kaltmiete</TableCell>
                      <TableCell align="right">Nebenkosten</TableCell>
                      <TableCell align="right">Gesamtbetrag</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.einnahmen.map((e) => (
                      <TableRow key={e.label}>
                        <TableCell>{e.label}</TableCell>
                        <TableCell align="right">{e.anzahl_zahlungen}</TableCell>
                        <TableCell align="right">{formatEuro(e.kaltmiete, 2)}</TableCell>
                        <TableCell align="right">{formatEuro(e.nebenkosten, 2)}</TableCell>
                        <TableCell align="right">{formatEuro(e.gesamt, 2)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell sx={SUMME}>Summe</TableCell>
                      <TableCell />
                      <TableCell align="right" sx={SUMME}>
                        {formatEuro(data.kaltmiete_summe, 2)}
                      </TableCell>
                      <TableCell align="right" sx={SUMME}>
                        {formatEuro(data.nebenkosten_summe, 2)}
                      </TableCell>
                      <TableCell align="right" sx={SUMME}>
                        {formatEuro(data.einnahmen_summe, 2)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>

            <Stack spacing={1}>
              <Typography variant="h6">II. Werbungskosten</Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ maxWidth: 700 }}>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell>1. Schuldzinsen, Geldbeschaffungskosten</TableCell>
                      <TableCell align="right">{formatEuro(data.schuldzinsen, 2)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>2. Instandhaltungsaufwendungen</TableCell>
                      <TableCell align="right">{formatEuro(data.instandhaltung, 2)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>3. Sonstige Aufwendungen</TableCell>
                      <TableCell align="right">{formatEuro(data.sonstige, 2)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>4. Abschreibungen</TableCell>
                      <TableCell align="right">{formatEuro(data.abschreibungen, 2)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={SUMME}>Summe</TableCell>
                      <TableCell align="right" sx={SUMME}>
                        {formatEuro(data.werbungskosten_summe, 2)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>

            <Stack spacing={1}>
              <Typography variant="h6">Überschuss</Typography>
              <Typography variant="h3" color={Number(data.ueberschuss) >= 0 ? 'success.main' : 'error.main'}>
                {formatEuro(data.ueberschuss, 2)}
              </Typography>
            </Stack>
          </>
        )}
      </Stack>
    </Paper>
  )
}

function AnlageV() {
  const { data: mietobjekte, loading, error } = useMietobjekte()

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Auswertung V</Typography>

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

export default AnlageV
