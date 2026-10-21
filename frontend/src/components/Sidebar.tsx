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
  unterpunkte?: { label: string; to: string }[]
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
    })),
  },
  {
    label: 'Kosten',
    to: '/kosten',
    icon: <ReceiptLongIcon />,
    unterpunkte: [
      { label: 'Rechnungen', to: '/kosten/rechnungen' },
      { label: 'Kostenarten', to: '/kosten/kostenarten' },
      { label: 'Lieferanten', to: '/kosten/lieferanten' },
    ],
  },
  { label: 'Konto', to: '/konto', icon: <AccountBalanceIcon /> },
  { label: 'Auswertung', to: '/auswertung', icon: <InsightsIcon /> },
]

// A link is active on its path and sub-paths; a ?status= in the link must also match the current one.
function istAktiv(to: string, pathname: string, status: MietvertragStatus) {
  const [pfad, query] = to.split('?')
  if (pathname !== pfad && !pathname.startsWith(`${pfad}/`)) return false
  const linkStatus = new URLSearchParams(query).get('status')
  return linkStatus === null || linkStatus === status
}

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
              selected={!unterpunkte && istAktiv(to, pathname, status)}
            >
              <ListItemIcon>{icon}</ListItemIcon>
              <ListItemText primary={label} />
            </ListItemButton>
            {unterpunkte?.map((u) => (
              <ListItemButton
                key={u.to}
                component={Link}
                to={u.to}
                selected={istAktiv(u.to, pathname, status)}
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
