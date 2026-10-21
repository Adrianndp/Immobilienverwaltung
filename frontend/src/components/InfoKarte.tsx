import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Stack from '@mui/material/Stack'
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

export function Zeile({ label, wert, zusatz }: { label: string; wert: string; zusatz?: ReactNode }) {
  return (
    <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
      <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
        {label}
      </Typography>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
        {zusatz}
        <Typography variant="body2" sx={{ textAlign: 'right', overflowWrap: 'anywhere' }}>
          {wert}
        </Typography>
      </Stack>
    </Stack>
  )
}

export default InfoKarte
