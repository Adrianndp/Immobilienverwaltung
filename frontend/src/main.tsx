import CssBaseline from '@mui/material/CssBaseline'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'

// The default theme; only touch screens get 44px tap targets, so nothing changes with a mouse.
const TOUCH = { '@media (pointer: coarse)': { minWidth: 44, minHeight: 44 } }
const theme = createTheme({
  components: {
    MuiIconButton: { styleOverrides: { root: TOUCH } },
    MuiButton: { styleOverrides: { root: TOUCH } },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>,
)
