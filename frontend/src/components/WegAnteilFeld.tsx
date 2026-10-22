import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import type { WegNenner } from '../api/types'

interface Props {
  anteil: string
  nenner: WegNenner | null
  onAnteilChange: (anteil: string) => void
  onNennerChange: (nenner: WegNenner) => void
  error?: string
}

// "WEG-Anteil [85,40] / [1000]": the share as a decimal, the denominator as a choice.
function WegAnteilFeld({ anteil, nenner, onAnteilChange, onNennerChange, error }: Props) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
      <TextField
        label="WEG-Anteil"
        value={anteil}
        onChange={(e) => onAnteilChange(e.target.value)}
        error={!!error}
        helperText={error}
        fullWidth
        autoComplete="off"
        // Text with a decimal keyboard, so "85,40" can be typed; dezimal() converts it on save.
        slotProps={{ htmlInput: { inputMode: 'decimal' } }}
      />
      {/* Centered on the 56px high input. */}
      <Typography aria-hidden sx={{ pt: 2 }}>
        /
      </Typography>
      <TextField
        select
        value={nenner ?? ''}
        onChange={(e) => onNennerChange(Number(e.target.value) as WegNenner)}
        error={!!error}
        sx={{ flexShrink: 0, width: 110 }}
        slotProps={{ htmlInput: { 'aria-label': 'WEG-Nenner' } }}
      >
        <MenuItem value={100}>100</MenuItem>
        <MenuItem value={1000}>1000</MenuItem>
      </TextField>
    </Stack>
  )
}

export default WegAnteilFeld
