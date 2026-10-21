import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import ApartmentIcon from '@mui/icons-material/Apartment'
import InsightsIcon from '@mui/icons-material/Insights'
import PeopleIcon from '@mui/icons-material/People'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import { Fragment, type ReactNode } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { MIETVERTRAG_STATUS_LABELS, mietvertragStatus, type MietvertragStatus } from '../api/types'

export const SIDEBAR_WIDTH = 240

interface NavItem {
  label: string
  to: string
  icon: ReactNode
  // Sub-items of /mieter, one per ?status= value.
  unterpunkte?: { label: string; to: string; status: MietvertragStatus }[]
}

const items: NavItem[] = [
  { label: 'Mietobjekte', to: '/mietobjekte', icon: <ApartmentIcon /> },
  {
    label: 'Mieter',
    to: '/mieter',
    icon: <PeopleIcon />,
    unterpunkte: (Object.keys(MIETVERTRAG_STATUS_LABELS) as MietvertragStatus[]).map((status) => ({
      label: MIETVERTRAG_STATUS_LABELS[status],
      to: `/mieter?status=${status}`,
      status,
    })),
  },
  { label: 'Kosten', to: '/kosten', icon: <ReceiptLongIcon /> },
  { label: 'Konto', to: '/konto', icon: <AccountBalanceIcon /> },
  { label: 'Auswertung', to: '/auswertung', icon: <InsightsIcon /> },
]

function Sidebar() {
  const { pathname } = useLocation()
  const [searchParams] = useSearchParams()
  const status = mietvertragStatus(searchParams.get('status'))

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
        {items.map(({ label, to, icon, unterpunkte }) => (
          <Fragment key={to}>
            <ListItemButton
              component={Link}
              to={to}
              // With sub-items, the active sub-item is highlighted instead.
              selected={!unterpunkte && (pathname === to || pathname.startsWith(`${to}/`))}
            >
              <ListItemIcon>{icon}</ListItemIcon>
              <ListItemText primary={label} />
            </ListItemButton>
            {unterpunkte?.map((u) => (
              <ListItemButton
                key={u.to}
                component={Link}
                to={u.to}
                selected={pathname === to && status === u.status}
                dense
                sx={{ pl: 9 }}
              >
                <ListItemText primary={u.label} />
              </ListItemButton>
            ))}
          </Fragment>
        ))}
      </List>
    </Drawer>
  )
}

export default Sidebar
