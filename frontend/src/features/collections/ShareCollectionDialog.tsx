import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useState, type JSX } from 'react';

import { useSnackbar } from '@/components/SnackbarProvider';

import { useMintShare } from './api';

// ADR-009: signed-in-only sharing. The dialog mints a single-use token the
// owner passes to the recipient out-of-band; the recipient redeems it at
// /shared. The token is displayed exactly once.
export function ShareCollectionDialog({
  open,
  collectionId,
  collectionName,
  onClose,
}: {
  open: boolean;
  collectionId: string;
  collectionName: string;
  onClose: () => void;
}): JSX.Element {
  const mint = useMintShare();
  const { notify } = useSnackbar();
  const [token, setToken] = useState<string | null>(null);

  const close = (): void => {
    setToken(null);
    mint.reset();
    onClose();
  };

  const copy = async (): Promise<void> => {
    if (!token) return;
    await navigator.clipboard.writeText(token);
    notify('Token copied to clipboard');
  };

  return (
    <Dialog open={open} onClose={close} maxWidth="sm" fullWidth>
      <DialogTitle>Share “{collectionName}”</DialogTitle>
      <DialogContent>
        {token ? (
          <Stack spacing={2}>
            <Alert severity="warning">
              This token is shown only once. The recipient must be signed in
              and gets read-only access.
            </Alert>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <TextField
                fullWidth
                value={token}
                slotProps={{ htmlInput: { readOnly: true } }}
                size="small"
              />
              <IconButton onClick={() => void copy()} aria-label="copy token">
                <ContentCopyIcon />
              </IconButton>
            </Stack>
            <DialogContentText>
              Recipient: sign in, open “Redeem share”, paste the token.
            </DialogContentText>
          </Stack>
        ) : (
          <DialogContentText>
            Create a single-use invite token for another signed-in user. They
            will be able to view this collection and its bookmarks, but never
            change anything.
          </DialogContentText>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>{token ? 'Done' : 'Cancel'}</Button>
        {!token && (
          <Button
            variant="contained"
            disabled={mint.isPending}
            onClick={() =>
              mint.mutate(
                { collectionId },
                { onSuccess: (share) => setToken(share.token) },
              )
            }
          >
            Create token
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
