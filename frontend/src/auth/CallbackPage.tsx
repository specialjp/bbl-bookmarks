import { useAuth0 } from '@auth0/auth0-react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import type { JSX } from 'react';

import { FullPageSpinner } from '@/components/FullPageSpinner';

// Public SPA route registered with Auth0 (http://localhost:3000/callback).
// auth0-react performs the code+PKCE exchange itself; navigation away is
// handled by onRedirectCallback in main.tsx — this page never navigates.
export function CallbackPage(): JSX.Element {
  const { error, loginWithRedirect } = useAuth0();

  if (error) {
    return (
      <Box sx={{ maxWidth: 480, mx: 'auto', mt: 10, px: 2 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Sign-in failed: {error.message}
        </Alert>
        <Button variant="contained" onClick={() => void loginWithRedirect()}>
          Try again
        </Button>
      </Box>
    );
  }
  return <FullPageSpinner />;
}
