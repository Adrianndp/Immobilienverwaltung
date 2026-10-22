import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import type { ReactNode } from 'react'

interface Props {
  offen: boolean
  titel: string
  children: ReactNode
  // While the request runs: the button shows a spinner and cannot be clicked twice.
  loeschend: boolean
  onAbbrechen: () => void
  onLoeschen: () => void
}

// Confirmation before anything is deleted. Small on every screen size, unlike the form dialogs.
function LoeschenDialog({ offen, titel, children, loeschend, onAbbrechen, onLoeschen }: Props) {
  return (
    <Dialog open={offen} onClose={onAbbrechen}>
      <DialogTitle>{titel}</DialogTitle>
      <DialogContent>
        <DialogContentText>{children}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onAbbrechen}>Abbrechen</Button>
        <Button color="error" variant="contained" loading={loeschend} onClick={onLoeschen}>
          Löschen
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default LoeschenDialog
