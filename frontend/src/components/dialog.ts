import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'

// Dialogs fill the whole screen on phones.
export function useVollbild() {
  const theme = useTheme()
  return useMediaQuery(theme.breakpoints.down('sm'))
}

// For a <form> between the Dialog and its Title/Content/Actions: only the content scrolls,
// so the action buttons stay in view.
export const DIALOG_FORMULAR = { display: 'flex', flexDirection: 'column', minHeight: 0 } as const
