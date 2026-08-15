import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import type { JSX } from 'react';

export function FullPageSpinner(): JSX.Element {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <CircularProgress />
    </Box>
  );
}
