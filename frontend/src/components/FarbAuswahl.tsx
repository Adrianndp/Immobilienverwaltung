import ButtonBase from '@mui/material/ButtonBase'
import FormHelperText from '@mui/material/FormHelperText'
import FormLabel from '@mui/material/FormLabel'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import { FARBE_LABELS, type Farbe } from '../api/types'

interface Props {
  value: Farbe
  onChange: (farbe: Farbe) => void
  error?: string
}

function FarbAuswahl({ value, onChange, error }: Props) {
  return (
    <Stack spacing={1}>
      <FormLabel error={!!error}>Farbe</FormLabel>
      <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
        {(Object.entries(FARBE_LABELS) as [Farbe, string][]).map(([farbe, label]) => (
          <Tooltip key={farbe} title={label}>
            <ButtonBase
              aria-label={label}
              aria-pressed={farbe === value}
              onClick={() => onChange(farbe)}
              sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                bgcolor: farbe,
                outline: farbe === value ? 3 : 0,
                outlineColor: 'text.primary',
                outlineOffset: 2,
              }}
            />
          </Tooltip>
        ))}
      </Stack>
      {error && <FormHelperText error>{error}</FormHelperText>}
    </Stack>
  )
}

export default FarbAuswahl
