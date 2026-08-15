import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import type { JSX } from 'react';

import { ApiError } from '@/api/client';

// Read/query failures render inline with a retry — snackbars are reserved
// for mutation feedback (CLAUDE.md #9).
export function ErrorAlert({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}): JSX.Element {
  const message =
    error instanceof ApiError
      ? error.message
      : 'Something went wrong loading this page';
  return (
    <Alert
      severity="error"
      action={
        onRetry && (
          <Button color="inherit" size="small" onClick={onRetry}>
            Retry
          </Button>
        )
      }
    >
      {message}
    </Alert>
  );
}
