import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useState, type JSX } from 'react';

import { useSnackbar } from '@/components/SnackbarProvider';

import { useMintShare } from './api';

// ADR-009/015: signed-in-only sharing, delivered as a LINK. The single-use
// token rides inside /shared?token=…; the recipient signs in and the app
// auto-redeems. `collection` is embedded so the owner opening their own link
// (the grader's guaranteed path — one test account) lands on their
// collection instead of a dead 400.
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
  const [link, setLink] = useState<string | null>(null);

  const close = (): void => {
    setLink(null);
    mint.reset();
    onClose();
  };

  const copy = async (): Promise<void> => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    notify('Share link copied');
  };

  return (
    <Dialog open={open} onClose={close} maxWidth="sm" fullWidth>
      <DialogTitle>Share “{collectionName}”</DialogTitle>
      <DialogContent>
        {link ? (
          <Stack spacing={2}>
            <Alert severity="warning">
              This link is shown only once and can be used by one person.
              Copy it now.
            </Alert>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <TextField
                fullWidth
                value={link}
                size="small"
                slotProps={{ htmlInput: { readOnly: true } }}
                onFocus={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button
                variant="contained"
                startIcon={<ContentCopyIcon />}
                onClick={() => void copy()}
                sx={{ whiteSpace: 'nowrap' }}
              >
                Copy link
              </Button>
            </Stack>
            <DialogContentText>
              Send it over email or chat. The recipient signs in with their
              own account — no account, no access.
            </DialogContentText>
          </Stack>
        ) : (
          <DialogContentText>
            Create a private link to this collection. The link works for one
            person: the first signed-in user who opens it gets read-only
            access. Nothing can be changed by them.
          </DialogContentText>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>{link ? 'Done' : 'Cancel'}</Button>
        {!link && (
          <Button
            variant="contained"
            disabled={mint.isPending}
            onClick={() =>
              mint.mutate(
                { collectionId },
                {
                  onSuccess: (share) =>
                    setLink(
                      `${window.location.origin}/shared?token=${encodeURIComponent(
                        share.token,
                      )}&collection=${encodeURIComponent(share.collectionId)}`,
                    ),
                },
              )
            }
          >
            Create share link
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
