import AddIcon from '@mui/icons-material/Add';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import { useEffect, useState, type JSX } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import type { Bookmark } from '@/api/types';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { ErrorAlert } from '@/components/ErrorAlert';
import { useDebouncedValue } from '@/components/useDebouncedValue';
import { useCollections } from '@/features/collections/api';

import { useBookmarks, useDeleteBookmark } from './api';
import { CreateBookmarkDialog } from './CreateBookmarkDialog';

const ALL = '__all__';
const UNCATEGORISED = '__uncategorised__';

// Filter state lives in the URL (?collectionId= / ?uncategorised= / ?q=) so
// filtered views are shareable and back-button friendly.
export function BookmarksPage(): JSX.Element {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const collectionParam = params.get('collectionId');
  const uncategorised = params.get('uncategorised') === 'true';
  const urlQ = params.get('q') ?? '';

  const [search, setSearch] = useState(urlQ);
  const debouncedSearch = useDebouncedValue(search, 300);

  useEffect(() => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (debouncedSearch) next.set('q', debouncedSearch);
        else next.delete('q');
        return next;
      },
      { replace: true },
    );
  }, [debouncedSearch, setParams]);

  const filters = {
    collectionId: collectionParam ?? undefined,
    uncategorised: uncategorised || undefined,
    q: urlQ || undefined,
  };
  const bookmarks = useBookmarks(filters);
  const collections = useCollections();
  const deleteBookmark = useDeleteBookmark();
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Bookmark | null>(null);

  const filterValue = uncategorised
    ? UNCATEGORISED
    : (collectionParam ?? ALL);

  const setFilter = (value: string): void => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('collectionId');
      next.delete('uncategorised');
      if (value === UNCATEGORISED) next.set('uncategorised', 'true');
      else if (value !== ALL) next.set('collectionId', value);
      return next;
    });
  };

  const collectionName = (id: string | null): string =>
    collections.data?.data.find((c) => c.id === id)?.name ?? '—';

  if (bookmarks.isError) {
    return (
      <ErrorAlert error={bookmarks.error} onRetry={() => void bookmarks.refetch()} />
    );
  }

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, mb: 3 }}
      >
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexGrow: 1 }}>
          <TextField
            size="small"
            placeholder="Search title and notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 260 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />
          <TextField
            select
            size="small"
            label="Collection"
            value={filterValue}
            onChange={(e) => setFilter(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value={ALL}>All bookmarks</MenuItem>
            <MenuItem value={UNCATEGORISED}>Uncategorised</MenuItem>
            {(collections.data?.data ?? []).map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)}>
          New bookmark
        </Button>
      </Stack>

      {bookmarks.isPending ? (
        <Skeleton variant="rounded" height={240} />
      ) : bookmarks.data.data.length === 0 ? (
        <EmptyState
          icon={<BookmarkBorderIcon fontSize="inherit" />}
          title={urlQ ? 'No bookmarks match your search' : 'No bookmarks yet'}
          subtitle={urlQ ? 'Try another phrase.' : 'Save your first link.'}
          actionLabel={urlQ ? undefined : 'Add a bookmark'}
          onAction={urlQ ? undefined : () => setCreating(true)}
        />
      ) : (
        <TableContainer sx={{ bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e6e8f0' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>URL</TableCell>
                <TableCell>Collection</TableCell>
                <TableCell>Added</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bookmarks.data.data.map((b) => (
                <TableRow
                  key={b.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => void navigate(`/bookmarks/${b.id}`)}
                >
                  <TableCell sx={{ fontWeight: 600 }}>{b.title}</TableCell>
                  <TableCell sx={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <Link
                      href={b.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {b.url}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {b.collectionId ? (
                      <Chip size="small" label={collectionName(b.collectionId)} />
                    ) : (
                      <Chip size="small" variant="outlined" label="uncategorised" />
                    )}
                  </TableCell>
                  <TableCell>{new Date(b.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      aria-label={`delete ${b.title}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setToDelete(b);
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <CreateBookmarkDialog
        open={creating}
        onClose={() => setCreating(false)}
        defaultCollectionId={collectionParam ?? undefined}
      />
      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete bookmark?"
        description={`“${toDelete?.title ?? ''}” will be permanently deleted.`}
        busy={deleteBookmark.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (!toDelete) return;
          deleteBookmark.mutate(
            { id: toDelete.id, title: toDelete.title },
            { onSuccess: () => setToDelete(null) },
          );
        }}
      />
    </Box>
  );
}
