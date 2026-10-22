import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import ApartmentIcon from '@mui/icons-material/Apartment'
import CategoryIcon from '@mui/icons-material/Category'
import DescriptionIcon from '@mui/icons-material/Description'
import EventAvailableIcon from '@mui/icons-material/EventAvailable'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import InsightsIcon from '@mui/icons-material/Insights'
import Inventory2Icon from '@mui/icons-material/Inventory2'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import PeopleIcon from '@mui/icons-material/People'
import PieChartIcon from '@mui/icons-material/PieChart'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import ScheduleIcon from '@mui/icons-material/Schedule'
import Collapse from '@mui/material/Collapse'
import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import { Fragment, useState, type ReactNode } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { MIETVERTRAG_STATUS_LABELS, mietvertragStatus, type MietvertragStatus } from '../api/types'

export const SIDEBAR_WIDTH = 240

// Touch screens get 44px rows; with a mouse the dense rows stay as they are.
const TOUCH_ZEILE = { '@media (pointer: coarse)': { minHeight: 44 } }

interface NavItem {
  label: string
  to: string
  icon: ReactNode
  unterpunkte?: { label: string; to: string; icon: ReactNode }[]
}

const MIETER_ICONS: Record<MietvertragStatus, ReactNode> = {
  laufend: <EventAvailableIcon fontSize="small" />,
  zukuenftig: <ScheduleIcon fontSize="small" />,
  archiv: <Inventory2Icon fontSize="small" />,
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
      icon: MIETER_ICONS[status],
    })),
  },
  {
    label: 'Kosten',
    to: '/kosten',
    icon: <ReceiptLongIcon />,
    unterpunkte: [
      { label: 'Rechnungen', to: '/kosten/rechnungen', icon: <ReceiptLongIcon fontSize="small" /> },
      { label: 'Kostenarten', to: '/kosten/kostenarten', icon: <CategoryIcon fontSize="small" /> },
      { label: 'Lieferanten', to: '/kosten/lieferanten', icon: <LocalShippingIcon fontSize="small" /> },
    ],
  },
  { label: 'Konto', to: '/konto', icon: <AccountBalanceIcon /> },
  {
    label: 'Auswertung',
    to: '/auswertung',
    icon: <InsightsIcon />,
    unterpunkte: [
      { label: 'Objekt Deckungsbeitrag', to: '/auswertung/deckungsbeitrag', icon: <PieChartIcon fontSize="small" /> },
      { label: 'Auswertung V', to: '/auswertung/anlage-v', icon: <DescriptionIcon fontSize="small" /> },
    ],
  },
]

// A link is active on its path and sub-paths; a ?status= in the link must also match the current one.
function istAktiv(to: string, pathname: string, status: MietvertragStatus) {
  const [pfad, query] = to.split('?')
  if (pathname !== pfad && !pathname.startsWith(`${pfad}/`)) return false
  const linkStatus = new URLSearchParams(query).get('status')
  return linkStatus === null || linkStatus === status
}

interface Props {
  begruessung: string
  // Below md the sidebar is a temporary drawer, opened from the top bar.
  mobilOffen: boolean
  onMobilSchliessen: () => void
}

function Sidebar({ begruessung, mobilOffen, onMobilSchliessen }: Props) {
  const { pathname, search } = useLocation()
  const [searchParams] = useSearchParams()
  const status = mietvertragStatus(searchParams.get('status'))

  // The group containing the current route; it opens on load and whenever the route changes.
  const aktiveGruppe = items.find((i) => i.unterpunkte && istAktiv(i.to, pathname, status))?.to
  const [offen, setOffen] = useState(() => new Set(aktiveGruppe ? [aktiveGruppe] : []))
  const route = pathname + search
  const [letzteRoute, setLetzteRoute] = useState(route)
  if (route !== letzteRoute) {
    setLetzteRoute(route)
    if (aktiveGruppe && !offen.has(aktiveGruppe)) setOffen(new Set(offen).add(aktiveGruppe))
  }

  function umschalten(to: string) {
    setOffen((alt) => {
      const neu = new Set(alt)
      if (!neu.delete(to)) neu.add(to)
      return neu
    })
  }

  const inhalt = (
    <>
      <Toolbar>
        <Typography variant="h6" noWrap>
          {begruessung}
        </Typography>
      </Toolbar>
      <List>
        {items.map(({ label, to, icon, unterpunkte }) =>
          unterpunkte ? (
            <Fragment key={to}>
              <ListItemButton onClick={() => umschalten(to)} aria-expanded={offen.has(to)}>
                <ListItemIcon>{icon}</ListItemIcon>
                <ListItemText
                  primary={label}
                  // Bold, not highlighted: the active sub-item carries the highlight.
                  slotProps={{ primary: { sx: { fontWeight: to === aktiveGruppe ? 600 : undefined } } }}
                />
                {offen.has(to) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </ListItemButton>
              <Collapse in={offen.has(to)} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {unterpunkte.map((u) => (
                    <ListItemButton
                      key={u.to}
                      component={Link}
                      to={u.to}
                      selected={istAktiv(u.to, pathname, status)}
                      onClick={onMobilSchliessen}
                      dense
                      sx={{ pl: 4, ...TOUCH_ZEILE }}
                    >
                      <ListItemIcon sx={{ minWidth: 32 }}>{u.icon}</ListItemIcon>
                      <ListItemText primary={u.label} slotProps={{ primary: { variant: 'body2' } }} />
                    </ListItemButton>
                  ))}
                </List>
              </Collapse>
            </Fragment>
          ) : (
            <ListItemButton
              key={to}
              component={Link}
              to={to}
              selected={istAktiv(to, pathname, status)}
              onClick={onMobilSchliessen}
            >
              <ListItemIcon>{icon}</ListItemIcon>
              <ListItemText primary={label} />
            </ListItemButton>
          ),
        )}
      </List>
    </>
  )

  return (
    <>
      <Drawer
        variant="temporary"
        open={mobilOffen}
        onClose={onMobilSchliessen}
        ModalProps={{ keepMounted: true }}
        sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: SIDEBAR_WIDTH } }}
      >
        {inhalt}
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: SIDEBAR_WIDTH },
        }}
      >
        {inhalt}
      </Drawer>
    </>
  )
}

export default Sidebar
