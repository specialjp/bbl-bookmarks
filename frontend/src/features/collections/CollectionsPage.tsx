import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import FolderIcon from '@mui/icons-material/Folder';
import PeopleIcon from '@mui/icons-material/People';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState, type JSX } from 'react';
import { useNavigate } from 'react-router';

import type { Collection } from '@/api/types';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { ErrorAlert } from '@/components/ErrorAlert';

import { useCollections, useDeleteCollection, useSharedWithMe } from './api';
import { CreateCollectionDialog } from './CreateCollectionDialog';

function CollectionCard({
  collection,
  onDelete,
}: {
  collection: Collection;
  onDelete?: (c: Collection) => void;
}): JSX.Element {
  const navigate = useNavigate();
  return (
    <Card sx={{ width: 260 }}>
      <CardActionArea onClick={() => void navigate(`/collections/${collection.id}`)}>
        <CardContent>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <FolderIcon color="primary" fontSize="small" />
            <Typography variant="subtitle1" noWrap sx={{ fontWeight: 600 }}>
              {collection.name}
            </Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            Created {new Date(collection.createdAt).toLocaleDateString()}
          </Typography>
          {!collection.isOwner && (
            <Chip size="small" label="read-only" sx={{ ml: 1 }} />
          )}
        </CardContent>
      </CardActionArea>
      {onDelete && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 1, pb: 1 }}>
          <IconButton
            size="small"
            aria-label={`delete ${collection.name}`}
            onClick={() => onDelete(collection)}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      )}
    </Card>
  );
}

export function CollectionsPage(): JSX.Element {
  const own = useCollections();
  const shared = useSharedWithMe();
  const deleteCollection = useDeleteCollection();
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Collection | null>(null);

  if (own.isError) return <ErrorAlert error={own.error} onRetry={() => void own.refetch()} />;

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Collections
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)}>
          New collection
        </Button>
      </Stack>

      {own.isPending ? (
        <Stack direction="row" spacing={2}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} variant="rounded" width={260} height={110} />
          ))}
        </Stack>
      ) : own.data.data.length === 0 ? (
        <EmptyState
          icon={<FolderIcon fontSize="inherit" />}
          title="No collections yet"
          subtitle="Group your bookmarks by topic."
          actionLabel="Create your first collection"
          onAction={() => setCreating(true)}
        />
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {own.data.data.map((c) => (
            <CollectionCard key={c.id} collection={c} onDelete={setToDelete} />
          ))}
        </Box>
      )}

      {shared.data && shared.data.data.length > 0 && (
        <Box sx={{ mt: 5 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2 }}>
            <PeopleIcon color="secondary" fontSize="small" />
            <Typography variant="h6">Shared with me</Typography>
          </Stack>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {shared.data.data.map((c) => (
              <CollectionCard key={c.id} collection={c} />
            ))}
          </Box>
        </Box>
      )}

      <CreateCollectionDialog open={creating} onClose={() => setCreating(false)} />
      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete collection?"
        description={`“${toDelete?.name ?? ''}” will be deleted. Its bookmarks are kept and become uncategorised.`}
        busy={deleteCollection.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (!toDelete) return;
          deleteCollection.mutate(
            { id: toDelete.id, name: toDelete.name },
            { onSuccess: () => setToDelete(null) },
          );
        }}
      />
    </Box>
  );
}
