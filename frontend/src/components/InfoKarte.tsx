import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import type { ReactNode } from 'react'

interface Props {
  titel: string
  farbe: string
  aktion: ReactNode
  children: ReactNode
}

// Card with a colored left border, as used for Mietobjekte and Mieter.
function InfoKarte({ titel, farbe, aktion, children }: Props) {
  return (
    <Card sx={{ height: '100%', borderLeft: 4, borderLeftColor: farbe }}>
      <CardHeader title={titel} action={aktion} />
      <CardContent sx={{ pt: 0 }}>{children}</CardContent>
    </Card>
  )
}

export function Zeile({
  label,
  wert,
  zusatz,
  farbe,
  info,
}: {
  label: string
  wert: string
  zusatz?: ReactNode
  farbe?: string
  // Explanation behind an info icon next to the label.
  info?: string
}) {
  return (
    <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
      <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        {label}
        {info && (
          // enterTouchDelay 0: opens on tap instead of long press. The span is focusable for keyboard users
          // and a bit larger than the icon, so it is easier to hit.
          <Tooltip title={info} enterTouchDelay={0} leaveTouchDelay={4000} arrow>
            <Box
              component="span"
              tabIndex={0}
              sx={{ display: 'inline-flex', p: 0.5, ml: 0.25, my: -0.5, cursor: 'help' }}
            >
              <InfoOutlinedIcon sx={{ fontSize: 16 }} />
            </Box>
          </Tooltip>
        )}
      </Typography>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
        {zusatz}
        <Typography variant="body2" sx={{ textAlign: 'right', overflowWrap: 'anywhere', color: farbe }}>
          {wert}
        </Typography>
      </Stack>
    </Stack>
  )
}

export default InfoKarte
