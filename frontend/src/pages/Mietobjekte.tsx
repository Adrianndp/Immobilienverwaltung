import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { useEinheiten, useMietobjekte } from '../api/hooks'

function formatFlaeche(value: string) {
  return `${Number(value).toLocaleString('de-DE', { minimumFractionDigits: 2 })} m²`
}

function EinheitenTabelle({ mietobjektId }: { mietobjektId: number }) {
  const { data: einheiten, loading, error } = useEinheiten(mietobjektId)

  if (loading) return <CircularProgress size={24} />
  if (error) return <Alert severity="error">Einheiten konnten nicht geladen werden.</Alert>
  if (!einheiten?.length) return <Typography color="text.secondary">Noch keine Einheiten.</Typography>

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Bezeichnung</TableCell>
          <TableCell>Typ</TableCell>
          <TableCell align="right">Fläche</TableCell>
          <TableCell>Geschoss</TableCell>
          <TableCell align="right">Etage</TableCell>
          <TableCell>Lage</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {einheiten.map((e) => (
          <TableRow key={e.id}>
            <TableCell>{e.bezeichnung}</TableCell>
            <TableCell>{e.einheitstyp_label}</TableCell>
            <TableCell align="right">{formatFlaeche(e.vermietete_flaeche)}</TableCell>
            <TableCell>{e.geschoss_label}</TableCell>
            <TableCell align="right">{e.etage}</TableCell>
            <TableCell>{e.lage_label}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function Mietobjekte() {
  const { data: mietobjekte, loading, error } = useMietobjekte()

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Meine Mietobjekte</Typography>

      {loading && <CircularProgress />}
      {error && <Alert severity="error">Mietobjekte konnten nicht geladen werden.</Alert>}
      {mietobjekte?.length === 0 && (
        <Typography color="text.secondary">Noch keine Mietobjekte angelegt.</Typography>
      )}

      <div>
        {mietobjekte?.map((m) => (
          <Accordion key={m.id} slotProps={{ transition: { unmountOnExit: true } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack>
                <Typography fontWeight={500}>
                  {m.strasse} {m.hausnummer}, {m.plz} {m.stadt}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {m.objekttyp_label}
                </Typography>
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <EinheitenTabelle mietobjektId={m.id} />
            </AccordionDetails>
          </Accordion>
        ))}
      </div>
    </Stack>
  )
}

export default Mietobjekte