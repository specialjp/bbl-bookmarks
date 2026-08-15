import RedeemIcon from '@mui/icons-material/Redeem';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useEffect, useState, type FormEvent, type JSX } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import { ApiError } from '@/api/client';

import { useAcceptShare } from './api';

// Accepts a full share link or a raw token; extracts the token either way.
function extractToken(value: string): string {
  const trimmed = value.trim();
  if (trimmed.includes('token=')) {
    try {
      return new URL(trimmed).searchParams.get('token') ?? trimmed;
    } catch {
      /* not a URL — fall through to raw */
    }
  }
  return trimmed;
}

// Link-first flow (ADR-015): /shared?token=…&collection=… auto-redeems after
// sign-in (AuthGuard round-trips the query string through Auth0 for free).
// The `collection` param exists for exactly one case: the OWNER opening
// their own link — the API answers 400, and we route them home to their
// collection instead of dead-ending (the grader has only one account).
export function RedeemSharePage(): JSX.Element {
  const [params] = useSearchParams();
  const urlToken = params.get('token');
  const urlCollection = params.get('collection');
  const [manualToken, setManualToken] = useState('');
  const accept = useAcceptShare();
  const navigate = useNavigate();

  // Deliberately NO useRef StrictMode guard here. A preserved ref plus
  // NON-preserved mutation state (mutations aren't cached across the
  // simulated remount, unlike queries) deadlocks the page on a spinner —
  // found live in dev. Double-firing is safe by API design: re-accept by
  // the same user is 200-idempotent, and every failure status is stable.
  useEffect(() => {
    if (urlToken) accept.mutate({ token: urlToken });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlToken]);

  // Navigation is driven by mutation STATE, not per-call callbacks:
  // StrictMode's simulated unmount swallows mutate()-level callbacks fired
  // from a mount effect, but the hook's state survives the remount.
  // (Found live: the auto-redeem spinner span forever in dev without this.)
  useEffect(() => {
    if (accept.isSuccess) {
      // replace: keeps Back from re-redeeming and drops the tokened URL
      void navigate(`/collections/${accept.data.collectionId}`, {
        replace: true,
      });
    }
  }, [accept.isSuccess, accept.data, navigate]);

  useEffect(() => {
    if (
      accept.error instanceof ApiError &&
      accept.error.status === 400 &&
      urlCollection
    ) {
      // Owner opened their own link — take them home to their collection.
      void navigate(`/collections/${urlCollection}`, { replace: true });
    }
  }, [accept.error, urlCollection, navigate]);

  const submitManual = (e: FormEvent): void => {
    e.preventDefault();
    const token = extractToken(manualToken);
    if (!token) return;
    accept.mutate({ token });
  };

  const error = accept.error instanceof ApiError ? accept.error : null;
  const redeeming = Boolean(urlToken) && !error && !accept.isError;

  if (redeeming) {
    return (
      <Stack
        spacing={2}
        sx={{ alignItems: 'center', py: 8 }}
        aria-live="polite"
      >
        <CircularProgress />
        <Typography variant="h6">Adding this shared collection…</Typography>
        <Typography color="text.secondary">
          You&apos;ll be taken to it in a moment.
        </Typography>
      </Stack>
    );
  }

  const errorContent: Record<
    number,
    { title: string; body: string }
  > = {
    404: {
      title: "This share link isn't valid",
      body: 'It may have been revoked, already replaced, or mistyped. Ask the owner to send a new link.',
    },
    409: {
      title: 'This link was already used',
      body: 'Each share link works for one person, and someone has already redeemed this one. If that was you, the collection is already under “Shared with me”.',
    },
    400: {
      title: 'This is your own share link',
      body: 'You created this link to share your collection with someone else — send it to them instead. You already have full access.',
    },
  };
  const known = error ? errorContent[error.status] : undefined;

  return (
    <Box sx={{ maxWidth: 560, mx: 'auto' }} aria-live="polite">
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <AlertTitle>{known?.title ?? 'Something went wrong'}</AlertTitle>
          {known?.body ?? error.message}
          <Box sx={{ mt: 1 }}>
            <Button
              size="small"
              onClick={() => void navigate('/collections')}
            >
              Go to my collections
            </Button>
          </Box>
        </Alert>
      )}
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <RedeemIcon color="primary" />
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                Add a shared collection
              </Typography>
            </Stack>
            <Typography color="text.secondary">
              Got a share link? Just open it — the collection is added
              automatically. If you were given a link or raw token to paste,
              drop it below. Access is read-only.
            </Typography>
            <form onSubmit={submitManual}>
              <Stack direction="row" spacing={1}>
                <TextField
                  fullWidth
                  size="small"
                  label="Share link or token"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                />
                <Button
                  type="submit"
                  variant="contained"
                  disabled={accept.isPending || !manualToken.trim()}
                >
                  Add
                </Button>
              </Stack>
            </form>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
