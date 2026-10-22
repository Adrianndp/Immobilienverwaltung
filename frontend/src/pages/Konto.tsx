import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import AddLinkIcon from '@mui/icons-material/AddLink'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import { useRef, useState, type ChangeEvent } from 'react'
import { validierungsFehler } from '../api/client'
import { useBuchungen, useImportBuchungen } from '../api/hooks'
import type { Buchung } from '../api/types'
import BuchungZuordnenDialog from '../components/BuchungZuordnenDialog'
import TabellenContainer, { DatumZelle } from '../components/Tabelle'
import { formatEuro, oderLeer } from '../format'

function Konto() {
  const { data: buchungen, loading, error, reload } = useBuchungen()
  const importBuchungen = useImportBuchungen()
  const dateiInput = useRef<HTMLInputElement>(null)
  const [importierend, setImportierend] = useState(false)
  const [meldung, setMeldung] = useState<{ text: string; fehler: boolean }>()
  const [zuzuordnen, setZuzuordnen] = useState<Buchung>()

  async function handleDatei(event: ChangeEvent<HTMLInputElement>) {
    const datei = event.target.files?.[0]
    // Reset so that choosing the same file again fires onChange again.
    event.target.value = ''
    if (!datei) return
    setImportierend(true)
    try {
      const ergebnis = await importBuchungen(datei)
      setMeldung({ text: `${ergebnis.importiert} importiert, ${ergebnis.uebersprungen} übersprungen`, fehler: false })
    } catch (e) {
      setMeldung({
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

      <Snackbar open={!!meldung} autoHideDuration={6000} onClose={() => setMeldung(undefined)}>
        <Alert
          severity={meldung?.fehler ? 'error' : 'success'}
          variant="filled"
          onClose={() => setMeldung(undefined)}
        >
          {meldung?.text}
        </Alert>
      </Snackbar>

      {loading && <CircularProgress />}
      {error && <Alert severity="error">Buchungen konnten nicht geladen werden.</Alert>}
      {buchungen?.length === 0 && (
        <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
          <Typography color="text.secondary">Noch keine Buchungen.</Typography>
          {importButton}
        </Stack>
      )}

      {!!buchungen?.length && (
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
              </TableRow>
            </TableHead>
            <TableBody>
              {buchungen.map((b) => {
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
                      <IconButton size="small" aria-label="Zuordnen" onClick={() => setZuzuordnen(b)}>
                        <AddLinkIcon fontSize="small" />
                      </IconButton>
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
