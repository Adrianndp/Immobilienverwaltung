import Box from '@mui/material/Box'
import { Outlet } from 'react-router'
import Sidebar from './Sidebar.tsx'

function Layout() {
  return (
    <Box sx={{ display: 'flex' }}>
      <Sidebar />
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Outlet />
      </Box>
    </Box>
  )
}

export default Layout
