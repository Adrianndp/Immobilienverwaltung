import Paper from '@mui/material/Paper'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import type { SxProps, Theme } from '@mui/material/styles'
import type { ReactNode } from 'react'
import { formatDatum } from '../format'

// Dates and right-aligned amounts stay on one line; the table scrolls instead.
export function DatumZelle({ wert }: { wert: string | null }) {
  return <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDatum(wert)}</TableCell>
}

interface Props {
  children: ReactNode
  sx?: SxProps<Theme>
}

// Wide tables scroll inside this container (not the page), with the first column kept in view.
function TabellenContainer({ children, sx = [] }: Props) {
  return (
    <TableContainer
      component={Paper}
      variant="outlined"
      sx={[
        (theme) => ({
          '& .MuiTableCell-alignRight': { whiteSpace: 'nowrap' },
          '& .MuiTableCell-root:first-of-type': {
            position: 'sticky',
            left: 0,
            zIndex: 1,
            bgcolor: 'background.paper',
          },
          // The sticky cell is opaque, so it repeats the row hover color itself.
          '& .MuiTableRow-hover:hover .MuiTableCell-root:first-of-type': {
            backgroundImage: `linear-gradient(${theme.palette.action.hover}, ${theme.palette.action.hover})`,
          },
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </TableContainer>
  )
}

export default TabellenContainer
