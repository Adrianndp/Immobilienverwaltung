import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import EditIcon from '@mui/icons-material/Edit'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useLieferant, useRechnungen } from '../api/hooks'
import type { Rechnung } from '../api/types'
import { Zeile } from '../components/InfoKarte'
import LieferantDialog from '../components/LieferantDialog'
import RechnungenTabelle from '../components/RechnungenTabelle'
import TabellenContainer from '../components/Tabelle'
import { formatEuro, laenderName, lieferantName, oderLeer } from '../format'

// [Jahr, Summe in Cent], newest year first. Cents avoid floating point drift when adding amounts.
function summeProJahr(rechnungen: Rechnung[]) {
  const summen = new Map<string, number>()
  for (const r of rechnungen) {
    const jahr = r.datum.slice(0, 4)
    summen.set(jahr, (summen.get(jahr) ?? 0) + Math.round(Number(r.betrag) * 100))
  }
  return [...summen].sort(([a], [b]) => b.localeCompare(a))
}

function LieferantDetail() {
  const id = Number(useParams().id)
  const { data: lieferant, loading, error, reload } = useLieferant(id)
  const [dialogOpen, setDialogOpen] = useState(false)
  const { data: rechnungen, loading: rechnungenLoading, error: rechnungenError } = useRechnungen(id)

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <IconButton component={Link} to="/kosten/lieferanten" aria-label="Zurück">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4">{lieferant ? lieferantName(lieferant) : 'Lieferant'}</Typography>
        {lieferant && (
          <Button startIcon={<EditIcon />} onClick={() => setDialogOpen(true)}>
            Bearbeiten
          </Button>
        )}
      </Stack>
      {dialogOpen && lieferant && (
        <LieferantDialog lieferant={lieferant} onClose={() => setDialogOpen(false)} onSaved={reload} />
      )}

      {loading && <CircularProgress />}
      {error && <Alert severity="error">Lieferant konnte nicht geladen werden.</Alert>}
      {lieferant && (
        <Paper variant="outlined" sx={{ p: 2, maxWidth: 600 }}>
          <Stack spacing={0.5}>
            <Zeile label="Firmenname" wert={oderLeer(lieferant.firmenname)} />
            <Zeile label="Vorname" wert={oderLeer(lieferant.vorname)} />
            <Zeile label="Nachname" wert={oderLeer(lieferant.nachname)} />
            <Zeile label="Straße" wert={oderLeer(`${lieferant.strasse} ${lieferant.hausnummer}`.trim())} />
            <Zeile label="Ort" wert={oderLeer(`${lieferant.plz} ${lieferant.ort}`.trim())} />
            <Zeile label="Land" wert={laenderName(lieferant.land)} />
            <Zeile label="E-Mail" wert={oderLeer(lieferant.email)} />
            <Zeile label="Telefon" wert={oderLeer(lieferant.telefon)} />
          </Stack>
        </Paper>
      )}

      <Typography variant="h6">Summe pro Jahr</Typography>
      {rechnungenLoading && <CircularProgress />}
      {rechnungenError && <Alert severity="error">Rechnungen konnten nicht geladen werden.</Alert>}
      {rechnungen?.length === 0 && <Typography color="text.secondary">Noch keine Rechnungen.</Typography>}
      {!!rechnungen?.length && (
        <>
          <TabellenContainer sx={{ maxWidth: 400 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Jahr</TableCell>
                  <TableCell align="right">Summe</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {summeProJahr(rechnungen).map(([jahr, cent]) => (
                  <TableRow key={jahr}>
                    <TableCell>{jahr}</TableCell>
                    <TableCell align="right">{formatEuro(String(cent / 100), 2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabellenContainer>

          <Typography variant="h6">Rechnungen</Typography>
          <RechnungenTabelle rechnungen={rechnungen} />
        </>
      )}
    </Stack>
  )
}

export default LieferantDetail
