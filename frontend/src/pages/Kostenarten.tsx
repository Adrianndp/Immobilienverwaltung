import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import { useState } from 'react'
import { useKostenarten } from '../api/hooks'
import KostenartDialog from '../components/KostenartDialog'
import { formatProzent, LEER } from '../format'

function Kostenarten() {
  const { data: kostenarten, loading, error, reload } = useKostenarten()
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <Stack spacing={2}>
      <Stack direction="row" useFlexGap sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h4">Kostenarten</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Anlegen
        </Button>
      </Stack>
      {dialogOpen && <KostenartDialog onClose={() => setDialogOpen(false)} onSaved={reload} />}

      {loading && <CircularProgress />}
      {error && <Alert severity="error">Kostenarten konnten nicht geladen werden.</Alert>}
      {kostenarten?.length === 0 && (
        <Typography color="text.secondary">Noch keine Kostenarten angelegt.</Typography>
      )}

      {!!kostenarten?.length && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Kategorie (Anlage V)</TableCell>
                <TableCell align="right">Abschreibung %</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {kostenarten.map((k) => (
                <TableRow key={k.id}>
                  <TableCell>{k.name}</TableCell>
                  <TableCell>{k.kategorie_label}</TableCell>
                  <TableCell align="right">
                    {k.abschreibung_prozent ? formatProzent(k.abschreibung_prozent) : LEER}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  )
}

export default Kostenarten
