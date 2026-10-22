import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useLieferanten } from '../api/hooks'
import type { Lieferant } from '../api/types'
import LieferantDialog from '../components/LieferantDialog'
import TabellenContainer from '../components/Tabelle'
import Laden, { Ladefehler } from '../components/Laden'
import { oderLeer } from '../format'

function Lieferanten() {
  const { data: lieferanten, loading, error, reload } = useLieferanten()
  // undefined: closed, null: create, Lieferant: edit.
  const [dialog, setDialog] = useState<Lieferant | null>()
  const navigate = useNavigate()

  const anlegen = (
    <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog(null)}>
      Anlegen
    </Button>
  )

  return (
    <Stack spacing={2}>
      <Stack direction="row" useFlexGap sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h4">Lieferanten</Typography>
        {anlegen}
      </Stack>
      {dialog !== undefined && (
        <LieferantDialog lieferant={dialog ?? undefined} onClose={() => setDialog(undefined)} onSaved={reload} />
      )}

      {loading && <Laden />}
      {error && <Ladefehler text="Lieferanten konnten nicht geladen werden." error={error} />}
      {lieferanten?.length === 0 && (
        <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
          <Typography color="text.secondary">Noch keine Lieferanten angelegt.</Typography>
          {anlegen}
        </Stack>
      )}

      {!!lieferanten?.length && (
        <TabellenContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Firmenname</TableCell>
                <TableCell>Vorname</TableCell>
                <TableCell>Nachname</TableCell>
                <TableCell>Straße</TableCell>
                <TableCell>Hausnummer</TableCell>
                <TableCell>PLZ</TableCell>
                <TableCell>Ort</TableCell>
                <TableCell>Land</TableCell>
                <TableCell>E-Mail</TableCell>
                <TableCell>Telefon</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {lieferanten.map((l) => (
                <TableRow
                  key={l.id}
                  hover
                  onClick={() => navigate(`/kosten/lieferanten/${l.id}`)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{oderLeer(l.firmenname)}</TableCell>
                  <TableCell>{oderLeer(l.vorname)}</TableCell>
                  <TableCell>{oderLeer(l.nachname)}</TableCell>
                  <TableCell>{oderLeer(l.strasse)}</TableCell>
                  <TableCell>{oderLeer(l.hausnummer)}</TableCell>
                  <TableCell>{oderLeer(l.plz)}</TableCell>
                  <TableCell>{oderLeer(l.ort)}</TableCell>
                  <TableCell>{l.land}</TableCell>
                  <TableCell>{oderLeer(l.email)}</TableCell>
                  <TableCell>{oderLeer(l.telefon)}</TableCell>
                  <TableCell padding="none">
                    <IconButton
                      size="small"
                      aria-label="Bearbeiten"
                      onClick={(e) => {
                        // Otherwise the row click also opens the detail page.
                        e.stopPropagation()
                        setDialog(l)
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
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

export default Lieferanten
