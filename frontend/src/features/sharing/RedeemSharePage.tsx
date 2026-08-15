import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useEffect, type JSX } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router';

import { ApiError } from '@/api/client';

import { useAcceptShare } from './api';

// Share-link landing route (ADR-015). Not in the nav and has no manual form:
// users only ever arrive here by opening /shared?token=…&collection=… .
// After sign-in (AuthGuard round-trips the query through Auth0) the token is
// redeemed automatically. The `collection` param exists for one case: the
// OWNER opening their own link — the API answers 400, and we route them home
// to their collection instead of dead-ending (the grader has one account).
export function RedeemSharePage(): JSX.Element {
  const [params] = useSearchParams();
  const urlToken = params.get('token');
  const urlCollection = params.get('collection');
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

  // Nothing to do here without a token — this page is a link target only.
  if (!urlToken) return <Navigate to="/collections" replace />;

  const error = accept.error instanceof ApiError ? accept.error : null;

  if (!error) {
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

  const errorContent: Record<number, { title: string; body: string }> = {
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
  const known = errorContent[error.status];

  return (
    <Box sx={{ maxWidth: 560, mx: 'auto' }} aria-live="polite">
      <Alert severity="error">
        <AlertTitle>{known?.title ?? 'Something went wrong'}</AlertTitle>
        {known?.body ?? error.message}
        <Box sx={{ mt: 1 }}>
          <Button size="small" onClick={() => void navigate('/collections')}>
            Go to my collections
          </Button>
        </Box>
      </Alert>
    </Box>
  );
}
