import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import { useState } from 'react'
import { useKostenarten } from '../api/hooks'
import KostenartDialog from '../components/KostenartDialog'
import TabellenContainer from '../components/Tabelle'
import Laden, { Ladefehler } from '../components/Laden'
import { formatProzent, LEER } from '../format'

function Kostenarten() {
  const { data: kostenarten, loading, error, reload } = useKostenarten()
  const [dialogOpen, setDialogOpen] = useState(false)

  const anlegen = (
    <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
      Anlegen
    </Button>
  )

  return (
    <Stack spacing={2}>
      <Stack direction="row" useFlexGap sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h4">Kostenarten</Typography>
        {anlegen}
      </Stack>
      {dialogOpen && <KostenartDialog onClose={() => setDialogOpen(false)} onSaved={reload} />}

      {loading && <Laden />}
      {error && <Ladefehler text="Kostenarten konnten nicht geladen werden." error={error} />}
      {kostenarten?.length === 0 && (
        <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
          <Typography color="text.secondary">Noch keine Kostenarten angelegt.</Typography>
          {anlegen}
        </Stack>
      )}

      {!!kostenarten?.length && (
        <TabellenContainer>
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
        </TabellenContainer>
      )}
    </Stack>
  )
}

export default Kostenarten
