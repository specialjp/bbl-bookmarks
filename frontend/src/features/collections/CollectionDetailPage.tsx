import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import DeleteIcon from '@mui/icons-material/Delete';
import LinkIcon from '@mui/icons-material/Link';
import ShareIcon from '@mui/icons-material/Share';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState, type JSX } from 'react';
import { useNavigate, useParams } from 'react-router';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { ErrorAlert } from '@/components/ErrorAlert';
import { CreateBookmarkDialog } from '@/features/bookmarks/CreateBookmarkDialog';

import {
  useCollection,
  useCollectionBookmarks,
  useDeleteCollection,
} from './api';
import { ShareCollectionDialog } from './ShareCollectionDialog';

export function CollectionDetailPage(): JSX.Element {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const collection = useCollection(id);
  const bookmarks = useCollectionBookmarks(id);
  const deleteCollection = useDeleteCollection();
  const [sharing, setSharing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (collection.isError) {
    return (
      <ErrorAlert
        error={collection.error}
        onRetry={() => void collection.refetch()}
      />
    );
  }
  if (collection.isPending) {
    return <Skeleton variant="rounded" height={220} />;
  }

  const c = collection.data;
  return (
    <Box>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => void navigate('/collections')}
        sx={{ mb: 2 }}
      >
        Collections
      </Button>

      <Stack direction="row" spacing={2} sx={{ alignItems: "center", mb: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {c.name}
        </Typography>
        {!c.isOwner && <Chip size="small" label="shared with you — read-only" />}
        <Box sx={{ flexGrow: 1 }} />
        {/* Mutating controls exist ONLY for the owner (readOnly rendering) */}
        {c.isOwner && (
          <>
            <Button
              startIcon={<AddIcon />}
              variant="contained"
              onClick={() => setAdding(true)}
            >
              Add bookmark
            </Button>
            <Button
              startIcon={<ShareIcon />}
              variant="outlined"
              onClick={() => setSharing(true)}
            >
              Share
            </Button>
            <IconButton
              color="error"
              aria-label="delete collection"
              onClick={() => setConfirmingDelete(true)}
            >
              <DeleteIcon />
            </IconButton>
          </>
        )}
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Created {new Date(c.createdAt).toLocaleString()}
      </Typography>

      <Typography variant="h6" sx={{ mb: 1 }}>
        Bookmarks
      </Typography>
      {bookmarks.isError ? (
        <ErrorAlert
          error={bookmarks.error}
          onRetry={() => void bookmarks.refetch()}
        />
      ) : bookmarks.isPending ? (
        <Skeleton variant="rounded" height={120} />
      ) : bookmarks.data.data.length === 0 ? (
        c.isOwner ? (
          <EmptyState
            icon={<BookmarkBorderIcon fontSize="inherit" />}
            title="No bookmarks in this collection"
            subtitle="Save your first link here."
            actionLabel="Add a bookmark"
            onAction={() => setAdding(true)}
          />
        ) : (
          <Typography color="text.secondary">
            No bookmarks in this collection.
          </Typography>
        )
      ) : (
        <List>
          {bookmarks.data.data.map((b) => {
            const content = (
              <>
                <ListItemIcon>
                  <LinkIcon />
                </ListItemIcon>
                <ListItemText
                  primary={b.title}
                  secondary={
                    <Link
                      href={b.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {b.url}
                    </Link>
                  }
                />
              </>
            );
            // Grantees get a plain row — a ripple button with a no-op click
            // reads as broken (UX review C1).
            return c.isOwner ? (
              <ListItemButton
                key={b.id}
                onClick={() => void navigate(`/bookmarks/${b.id}`)}
              >
                {content}
              </ListItemButton>
            ) : (
              <ListItem key={b.id}>{content}</ListItem>
            );
          })}
        </List>
      )}

      <CreateBookmarkDialog
        key={c.id}
        open={adding}
        onClose={() => setAdding(false)}
        defaultCollectionId={c.id}
      />
      <ShareCollectionDialog
        open={sharing}
        collectionId={c.id}
        collectionName={c.name}
        onClose={() => setSharing(false)}
      />
      <ConfirmDialog
        open={confirmingDelete}
        title="Delete collection?"
        description={`“${c.name}” will be deleted. Its bookmarks are kept and become uncategorised.`}
        busy={deleteCollection.isPending}
        onClose={() => setConfirmingDelete(false)}
        onConfirm={() =>
          deleteCollection.mutate(
            { id: c.id, name: c.name },
            { onSuccess: () => void navigate('/collections') },
          )
        }
      />
    </Box>
  );
}
