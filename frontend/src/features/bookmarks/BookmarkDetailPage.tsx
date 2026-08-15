import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState, type JSX } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ErrorAlert } from '@/components/ErrorAlert';
import { useCollection } from '@/features/collections/api';

import { useBookmark, useDeleteBookmark } from './api';

function CollectionChip({ collectionId }: { collectionId: string }): JSX.Element {
  const collection = useCollection(collectionId);
  return (
    <Chip
      size="small"
      component={RouterLink}
      to={`/collections/${collectionId}`}
      clickable
      label={collection.data?.name ?? '…'}
    />
  );
}

export function BookmarkDetailPage(): JSX.Element {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const bookmark = useBookmark(id);
  const deleteBookmark = useDeleteBookmark();
  const [confirming, setConfirming] = useState(false);

  if (bookmark.isError) {
    return <ErrorAlert error={bookmark.error} onRetry={() => void bookmark.refetch()} />;
  }
  if (bookmark.isPending) return <Skeleton variant="rounded" height={260} />;

  const b = bookmark.data;
  return (
    <Box sx={{ maxWidth: 720 }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => void navigate(-1)} sx={{ mb: 2 }}>
        Back
      </Button>
      <Card>
        <CardContent>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start', mb: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, flexGrow: 1 }}>
              {b.title}
            </Typography>
            <Button
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setConfirming(true)}
            >
              Delete
            </Button>
          </Stack>

          <Stack spacing={1.5}>
            <Box>
              <Typography variant="overline" color="text.secondary">
                URL
              </Typography>
              <Typography>
                <Button
                  href={b.url}
                  target="_blank"
                  rel="noreferrer"
                  endIcon={<OpenInNewIcon fontSize="small" />}
                  sx={{ p: 0, textAlign: 'left', wordBreak: 'break-all' }}
                >
                  {b.url}
                </Button>
              </Typography>
            </Box>
            <Box>
              <Typography variant="overline" color="text.secondary">
                Collection
              </Typography>
              <Box>
                {b.collectionId ? (
                  <CollectionChip collectionId={b.collectionId} />
                ) : (
                  <Chip size="small" variant="outlined" label="uncategorised" />
                )}
              </Box>
            </Box>
            <Box>
              <Typography variant="overline" color="text.secondary">
                Notes
              </Typography>
              <Typography sx={{ whiteSpace: 'pre-wrap' }}>
                {b.notes ?? <em>none</em>}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              Added {new Date(b.createdAt).toLocaleString()} · Updated{' '}
              {new Date(b.updatedAt).toLocaleString()}
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirming}
        title="Delete bookmark?"
        description={`“${b.title}” will be permanently deleted.`}
        busy={deleteBookmark.isPending}
        onClose={() => setConfirming(false)}
        onConfirm={() =>
          deleteBookmark.mutate(
            { id: b.id, title: b.title },
            { onSuccess: () => void navigate('/bookmarks') },
          )
        }
      />
    </Box>
  );
}
