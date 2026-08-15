import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useState, type FormEvent, type JSX } from 'react';

import { useCollections } from '@/features/collections/api';

import { useCreateBookmark } from './api';

const UNCATEGORISED = '__none__';

export function CreateBookmarkDialog({
  open,
  onClose,
  defaultCollectionId,
}: {
  open: boolean;
  onClose: () => void;
  defaultCollectionId?: string;
}): JSX.Element {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [collectionId, setCollectionId] = useState(
    defaultCollectionId ?? UNCATEGORISED,
  );
  const [urlError, setUrlError] = useState<string | null>(null);
  const collections = useCollections();
  const create = useCreateBookmark();

  const reset = (): void => {
    setUrl('');
    setTitle('');
    setNotes('');
    setCollectionId(defaultCollectionId ?? UNCATEGORISED);
    setUrlError(null);
  };

  const submit = (e: FormEvent): void => {
    e.preventDefault();
    try {
      new URL(url); // must include protocol — mirrors the API's @IsUrl rule
    } catch {
      setUrlError('Enter a full URL including https://');
      return;
    }
    create.mutate(
      {
        url,
        title: title.trim(),
        notes: notes.trim() || undefined,
        collectionId: collectionId === UNCATEGORISED ? undefined : collectionId,
      },
      {
        onSuccess: () => {
          reset();
          onClose();
        },
      },
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={submit}>
        <DialogTitle>New bookmark</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              autoFocus
              required
              fullWidth
              label="URL"
              placeholder="https://…"
              value={url}
              error={Boolean(urlError)}
              helperText={urlError}
              onChange={(e) => {
                setUrl(e.target.value);
                setUrlError(null);
              }}
            />
            <TextField
              required
              fullWidth
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              slotProps={{ htmlInput: { maxLength: 300 } }}
            />
            <TextField
              fullWidth
              multiline
              minRows={2}
              label="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <TextField
              select
              fullWidth
              label="Collection"
              value={collectionId}
              onChange={(e) => setCollectionId(e.target.value)}
            >
              <MenuItem value={UNCATEGORISED}>
                <em>Uncategorised</em>
              </MenuItem>
              {(collections.data?.data ?? []).map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={create.isPending || !url || !title.trim()}
          >
            Add bookmark
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
