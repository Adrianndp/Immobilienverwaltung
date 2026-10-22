import ButtonBase from '@mui/material/ButtonBase'
import FormHelperText from '@mui/material/FormHelperText'
import FormLabel from '@mui/material/FormLabel'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import { useId } from 'react'
import { FARBE_LABELS, type Farbe } from '../api/types'

interface Props {
  value: Farbe
  onChange: (farbe: Farbe) => void
  error?: string
}

function FarbAuswahl({ value, onChange, error }: Props) {
  const id = useId()
  return (
    <Stack spacing={1}>
      <FormLabel id={`${id}-label`} error={!!error}>
        Farbe
      </FormLabel>
      <Stack
        direction="row"
        spacing={1.5}
        useFlexGap
        role="group"
        aria-labelledby={`${id}-label`}
        aria-describedby={error ? `${id}-fehler` : undefined}
        sx={{ flexWrap: 'wrap' }}
      >
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
                '&.Mui-focusVisible': { outline: 3, outlineColor: 'primary.main' },
                // 44px tap area on touch screens; the circle itself stays 32px.
                '@media (pointer: coarse)': {
                  '&::after': { content: '""', position: 'absolute', inset: -6, borderRadius: '50%' },
                },
              }}
            />
          </Tooltip>
        ))}
      </Stack>
      {error && (
        <FormHelperText id={`${id}-fehler`} error>
          {error}
        </FormHelperText>
      )}
    </Stack>
  )
}

export default FarbAuswahl
