import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { useState } from 'react'
import { useEinheiten, useMietobjekte } from '../api/hooks'
import { NUTZUNG_LABELS, OBJEKTART_LABELS, VERMIETUNG_LABELS } from '../api/types'
import MietobjektDialog from '../components/MietobjektDialog'

function EinheitenListe({ mietobjektId }: { mietobjektId: number }) {
  const { data: einheiten, loading, error } = useEinheiten(mietobjektId)

  if (loading) return <CircularProgress size={24} />
  if (error) return <Alert severity="error">Einheiten konnten nicht geladen werden.</Alert>
  if (!einheiten?.length) return <Typography color="text.secondary">Noch keine Einheiten.</Typography>

  return (
    <List dense disablePadding>
      {einheiten.map((e) => (
        <ListItem key={e.id} disableGutters>
          <ListItemText primary={e.name} />
        </ListItem>
      ))}
    </List>
  )
}

function Mietobjekte() {
  const { data: mietobjekte, loading, error, reload } = useMietobjekte()
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">Meine Mietobjekte</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Mietobjekt hinzufügen
        </Button>
      </Stack>
      <MietobjektDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onCreated={reload} />

      {loading && <CircularProgress />}
      {error && <Alert severity="error">Mietobjekte konnten nicht geladen werden.</Alert>}
      {mietobjekte?.length === 0 && (
        <Typography color="text.secondary">Noch keine Mietobjekte angelegt.</Typography>
      )}

      <div>
        {mietobjekte?.map((m) => (
          <Accordion key={m.id} slotProps={{ transition: { unmountOnExit: true } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: m.farbe, flexShrink: 0 }} />
                <Stack>
                  <Typography sx={{ fontWeight: 500 }}>{m.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {m.strasse} {m.hausnummer}, {m.plz} {m.ort}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {OBJEKTART_LABELS[m.objektart]} ·{' '}
                    {m.vermietung ? VERMIETUNG_LABELS[m.vermietung] : NUTZUNG_LABELS[m.nutzung]}
                  </Typography>
                </Stack>
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <EinheitenListe mietobjektId={m.id} />
            </AccordionDetails>
          </Accordion>
        ))}
      </div>
    </Stack>
  )
}

export default Mietobjekte