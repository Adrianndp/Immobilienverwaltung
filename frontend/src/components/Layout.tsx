import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import MenuIcon from '@mui/icons-material/Menu'
import { useState } from 'react'
import { Outlet } from 'react-router'
import { useBenutzer } from '../api/hooks'
import MeldungProvider from './MeldungProvider.tsx'
import Sidebar from './Sidebar.tsx'

function Layout() {
  const [menuOffen, setMenuOffen] = useState(false)
  const { data: benutzer } = useBenutzer()
  // First name if set in Django, otherwise the username. Plain "Hallo!" while loading.
  const name = benutzer && (benutzer.first_name || benutzer.username)
  const begruessung = name ? `Hallo, ${name}!` : 'Hallo!'

  return (
    <Box sx={{ display: 'flex' }}>
      {/* Below md only: the sidebar becomes a drawer behind this button. */}
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{ display: { md: 'none' }, borderBottom: 1, borderColor: 'divider' }}
      >
        <Toolbar variant="dense">
          <IconButton edge="start" aria-label="Menü öffnen" onClick={() => setMenuOffen(true)} sx={{ mr: 1 }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap>
            {begruessung}
          </Typography>
        </Toolbar>
      </AppBar>
      <Sidebar begruessung={begruessung} mobilOffen={menuOffen} onMobilSchliessen={() => setMenuOffen(false)} />
      {/* minWidth 0: wide tables scroll in their container instead of widening the page. */}
      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, p: { xs: 2, sm: 3 } }}>
        <Toolbar variant="dense" sx={{ display: { md: 'none' } }} />
        <MeldungProvider>
          <Outlet />
        </MeldungProvider>
      </Box>
    </Box>
  )
}

export default Layout
