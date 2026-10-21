import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import ApartmentIcon from '@mui/icons-material/Apartment'
import InsightsIcon from '@mui/icons-material/Insights'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import { Link, useLocation } from 'react-router'

export const SIDEBAR_WIDTH = 240

const items = [
  { label: 'Mietobjekte', to: '/mietobjekte', icon: <ApartmentIcon /> },
  { label: 'Kosten', to: '/kosten', icon: <ReceiptLongIcon /> },
  { label: 'Konto', to: '/konto', icon: <AccountBalanceIcon /> },
  { label: 'Auswertung', to: '/auswertung', icon: <InsightsIcon /> },
]

function Sidebar() {
  const { pathname } = useLocation()

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': { width: SIDEBAR_WIDTH },
      }}
    >
      <Toolbar>
        <Typography variant="h6" noWrap>
          Hallo, Adrian!
        </Typography>
      </Toolbar>
      <List>
        {items.map(({ label, to, icon }) => (
          <ListItemButton
            key={to}
            component={Link}
            to={to}
            selected={pathname === to || pathname.startsWith(`${to}/`)}
          >
            <ListItemIcon>{icon}</ListItemIcon>
            <ListItemText primary={label} />
          </ListItemButton>
        ))}
      </List>
    </Drawer>
  )
}

export default Sidebar
