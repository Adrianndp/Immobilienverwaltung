import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'

// Spinner with a fixed height, so the content does not jump around while it loads.
function Laden({ klein }: { klein?: boolean }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: klein ? 1 : 4 }}>
      <CircularProgress size={klein ? 24 : 40} aria-label="Wird geladen" />
    </Box>
  )
}

// "Rechnungen konnten nicht geladen werden." plus the actual error.
export function Ladefehler({ text, error }: { text: string; error: Error }) {
  return (
    <Alert severity="error">
      {text} {error.message}
    </Alert>
  )
}

export default Laden
