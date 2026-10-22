import IconButton from '@mui/material/IconButton'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import DeleteIcon from '@mui/icons-material/Delete'
import type { Rechnung } from '../api/types'
import TabellenContainer, { DatumZelle } from './Tabelle'
import { formatEuro, formatProzent } from '../format'

interface Props {
  rechnungen: Rechnung[]
  // Without onDelete the delete column is hidden.
  onDelete?: (rechnung: Rechnung) => void
}

function RechnungenTabelle({ rechnungen, onDelete }: Props) {
  return (
    <TabellenContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Datum</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Rechnungsnummer</TableCell>
            <TableCell align="right">Betrag</TableCell>
            <TableCell>Kostenart</TableCell>
            <TableCell>Lieferant</TableCell>
            <TableCell>Bezahlt am</TableCell>
            <TableCell align="right">Offener Betrag</TableCell>
            <TableCell>Mietobjekte</TableCell>
            {onDelete && <TableCell />}
          </TableRow>
        </TableHead>
        <TableBody>
          {rechnungen.map((r) => (
            <TableRow key={r.id}>
              <DatumZelle wert={r.datum} />
              <TableCell>{r.name}</TableCell>
              <TableCell>{r.rechnungsnummer}</TableCell>
              <TableCell align="right">{formatEuro(r.betrag, 2)}</TableCell>
              <TableCell>{r.kostenart_name}</TableCell>
              <TableCell>{r.lieferant_name}</TableCell>
              <DatumZelle wert={r.bezahlt_am} />
              <TableCell align="right">{formatEuro(r.offener_betrag, 2)}</TableCell>
              <TableCell>
                {r.anteile.map((a) => `${a.mietobjekt_name} ${formatProzent(a.prozent)}`).join(', ')}
              </TableCell>
              {onDelete && (
                <TableCell padding="checkbox">
                  <IconButton size="small" aria-label={`Rechnung ${r.rechnungsnummer} löschen`} onClick={() => onDelete(r)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TabellenContainer>
  )
}

export default RechnungenTabelle
