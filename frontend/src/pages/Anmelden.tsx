import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import ApartmentIcon from '@mui/icons-material/Apartment'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { ApiError, validierungsFehler } from '../api/client'
import { useAnmelden, useAnmeldestatus } from '../api/hooks'
import Laden, { Ladefehler } from '../components/Laden'

// Only paths inside the app: "//evil.example" or "/\evil.example" would leave it.
function sicheresZiel(next: string | null) {
  return next && /^\/(?![/\\])/.test(next) ? next : '/'
}

function Anmelden() {
  const [searchParams] = useSearchParams()
  const ziel = sicheresZiel(searchParams.get('next'))
  const navigate = useNavigate()
  const { data: status, loading, error } = useAnmeldestatus()
  const anmelden = useAnmelden()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [passwortSichtbar, setPasswortSichtbar] = useState(false)
  const [feststelltaste, setFeststelltaste] = useState(false)
  const [fehler, setFehler] = useState<string>()
  const [sendend, setSendend] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSendend(true)
    setFehler(undefined)
    try {
      await anmelden({ username, password })
      navigate(ziel, { replace: true })
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        // The CSRF check failed, e.g. the cookie expired while the page was open.
        setFehler('Die Sitzung ist abgelaufen. Bitte lade die Seite neu und versuche es noch einmal.')
      } else {
        setFehler(validierungsFehler(e)?.detail ?? (e instanceof Error ? e.message : String(e)))
      }
      setPassword('')
      setSendend(false)
    }
  }

  function pruefeFeststelltaste(event: KeyboardEvent) {
    setFeststelltaste(event.getModifierState('CapsLock'))
  }

  if (status?.angemeldet) return <Navigate to={ziel} replace />

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: { xs: 'background.paper', sm: 'grey.100' },
        p: 2,
      }}
    >
      {/* On phones the form sits directly on the page; from sm on it is a card. */}
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 400,
          p: { xs: 1, sm: 4 },
          border: { xs: 0, sm: 1 },
          borderColor: { sm: 'divider' },
        }}
      >
        <Stack spacing={3}>
          <Stack spacing={1.5} sx={{ alignItems: 'center', textAlign: 'center' }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
              <ApartmentIcon />
            </Avatar>
            <div>
              <Typography variant="h5" component="h1">
                Immobilienverwaltung
              </Typography>
              <Typography sx={{ color: 'text.secondary' }}>Anmelden, um fortzufahren</Typography>
            </div>
          </Stack>

          {loading && <Laden />}
          {error && <Ladefehler text="Die Anmeldung ist gerade nicht erreichbar." error={error} />}
          {status && (
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                {fehler && <Alert severity="error">{fehler}</Alert>}
                <TextField
                  label="Benutzername"
                  required
                  fullWidth
                  autoFocus
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  slotProps={{ htmlInput: { autoCapitalize: 'none', autoCorrect: 'off', spellCheck: false } }}
                />
                <TextField
                  label="Passwort"
                  required
                  fullWidth
                  type={passwortSichtbar ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={pruefeFeststelltaste}
                  onKeyUp={pruefeFeststelltaste}
                  helperText={feststelltaste ? 'Die Feststelltaste ist aktiv.' : undefined}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            edge="end"
                            aria-label={passwortSichtbar ? 'Passwort verbergen' : 'Passwort anzeigen'}
                            onClick={() => setPasswortSichtbar((s) => !s)}
                          >
                            {passwortSichtbar ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
                <Button type="submit" variant="contained" size="large" fullWidth loading={sendend}>
                  Anmelden
                </Button>
              </Stack>
            </Box>
          )}
        </Stack>
      </Paper>
    </Box>
  )
}

export default Anmelden
