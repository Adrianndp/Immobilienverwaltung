import Button from '@mui/material/Button'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import AddLinkIcon from '@mui/icons-material/AddLink'
import CancelIcon from '@mui/icons-material/Cancel'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import { useRef, useState, type ChangeEvent } from 'react'
import { validierungsFehler } from '../api/client'
import { useBuchungen, useImportBuchungen } from '../api/hooks'
import type { Buchung } from '../api/types'
import BuchungZuordnenDialog from '../components/BuchungZuordnenDialog'
import TabellenContainer, { DatumZelle } from '../components/Tabelle'
import Laden, { Ladefehler } from '../components/Laden'
import { useMeldung } from '../components/meldung'
import { formatDatum, formatEuro, oderLeer } from '../format'

function istOffen(b: Buchung) {
  return b.zuordnungen.length === 0 || Number(b.nicht_zugeordnet) > 0
}

function StatusIcon({ buchung: b }: { buchung: Buchung }) {
  if (b.zuordnungen.length === 0) return <CancelIcon color="error" fontSize="small" />
  if (Number(b.nicht_zugeordnet) > 0) return <ErrorIcon color="warning" fontSize="small" />
  return <CheckCircleIcon color="success" fontSize="small" />
}

function statusText(b: Buchung) {
  if (b.zuordnungen.length === 0) return 'Nicht zugeordnet'
  if (Number(b.nicht_zugeordnet) > 0) return `Teilweise zugeordnet – offen: ${formatEuro(b.nicht_zugeordnet, 2)}`
  return 'Vollständig zugeordnet'
}

function Konto() {
  const meldung = useMeldung()
  const { data: buchungen, loading, error, reload } = useBuchungen()
  const importBuchungen = useImportBuchungen()
  const dateiInput = useRef<HTMLInputElement>(null)
  const [importierend, setImportierend] = useState(false)
  const [zuzuordnen, setZuzuordnen] = useState<Buchung>()
  const [nurOffene, setNurOffene] = useState(false)
  const offene = buchungen?.filter(istOffen) ?? []
  const angezeigt = nurOffene ? offene : buchungen

  async function handleDatei(event: ChangeEvent<HTMLInputElement>) {
    const datei = event.target.files?.[0]
    // Reset so that choosing the same file again fires onChange again.
    event.target.value = ''
    if (!datei) return
    setImportierend(true)
    try {
      const ergebnis = await importBuchungen(datei)
      meldung(`${ergebnis.importiert} importiert, ${ergebnis.uebersprungen} übersprungen`)
    } catch (e) {
      meldung({
        text: validierungsFehler(e)?.detail ?? (e instanceof Error ? e.message : String(e)),
        fehler: true,
      })
    } finally {
      setImportierend(false)
      reload()
    }
  }

  const importButton = (
    <Button
      variant="contained"
      startIcon={<UploadFileIcon />}
      loading={importierend}
      onClick={() => dateiInput.current?.click()}
    >
      CSV importieren
    </Button>
  )

  return (
    <Stack spacing={2}>
      <Stack direction="row" useFlexGap sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h4">Konto</Typography>
        {importButton}
      </Stack>
      <input ref={dateiInput} type="file" accept=".csv,text/csv" hidden onChange={handleDatei} />
      {zuzuordnen && (
        <BuchungZuordnenDialog buchung={zuzuordnen} onClose={() => setZuzuordnen(undefined)} onSaved={reload} />
      )}

      {loading && <Laden />}
      {error && <Ladefehler text="Buchungen konnten nicht geladen werden." error={error} />}
      {buchungen?.length === 0 && (
        <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
          <Typography color="text.secondary">Noch keine Buchungen.</Typography>
          {importButton}
        </Stack>
      )}

      {!!buchungen?.length && (
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <FormControlLabel
            control={<Switch checked={nurOffene} onChange={(e) => setNurOffene(e.target.checked)} />}
            label="Nur offene Buchungen"
          />
          <Typography variant="body2" color="text.secondary">
            {offene.length} offen
          </Typography>
        </Stack>
      )}
      {nurOffene && !!buchungen?.length && !offene.length && (
        <Typography color="text.secondary">Alle Buchungen sind vollständig zugeordnet.</Typography>
      )}

      {!!angezeigt?.length && (
        <TabellenContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Buchungstag</TableCell>
                <TableCell>Kontoinhaber</TableCell>
                <TableCell>Buchungstext</TableCell>
                <TableCell>Wertstellung</TableCell>
                <TableCell>Buchungsart</TableCell>
                <TableCell align="right">Betrag</TableCell>
                <TableCell>Mieter/Lieferant</TableCell>
                <TableCell>Rechnung</TableCell>
                <TableCell />
                <TableCell align="center">Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {angezeigt.map((b) => {
                const betrag = Number(b.betrag)
                return (
                  <TableRow key={b.id}>
                    <DatumZelle wert={b.buchungstag} />
                    <TableCell>{b.kontoinhaber}</TableCell>
                    <TableCell>{b.buchungstext}</TableCell>
                    <DatumZelle wert={b.wertstellung} />
                    <TableCell>{b.buchungsart}</TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        color: betrag > 0 ? 'success.main' : betrag < 0 ? 'error.main' : undefined,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatEuro(b.betrag, 2)}
                    </TableCell>
                    <TableCell>{oderLeer(b.partner)}</TableCell>
                    <TableCell>{oderLeer(b.rechnungen)}</TableCell>
                    <TableCell padding="checkbox">
                      <IconButton
                        size="small"
                        aria-label={`Buchung vom ${formatDatum(b.buchungstag)} zuordnen`}
                        onClick={() => setZuzuordnen(b)}
                      >
                        <AddLinkIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title={statusText(b)}>
                        <IconButton size="small" onClick={() => setZuzuordnen(b)}>
                          <StatusIcon buchung={b} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TabellenContainer>
      )}
    </Stack>
  )
}

export default Konto
