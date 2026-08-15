import FolderIcon from '@mui/icons-material/Folder';
import FolderOffIcon from '@mui/icons-material/FolderOff';
import LinkIcon from '@mui/icons-material/Link';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMemo, type JSX } from 'react';
import { Link as RouterLink } from 'react-router';

import type { Bookmark, Collection } from '@/api/types';
import { ErrorAlert } from '@/components/ErrorAlert';
import { useBookmarks } from '@/features/bookmarks/api';
import { useCollections } from '@/features/collections/api';

// Bonus /all page: collections with their bookmarks nested inside.
// Composed CLIENT-SIDE from the two list queries — no invented backend
// contract (DECISIONS); at this data size two cached queries beat a
// bespoke ?include=bookmarks endpoint.
export function AllPage(): JSX.Element {
  const collections = useCollections();
  const bookmarks = useBookmarks({});

  const grouped = useMemo(() => {
    const byCollection = new Map<string | null, Bookmark[]>();
    for (const b of bookmarks.data?.data ?? []) {
      const key = b.collectionId;
      byCollection.set(key, [...(byCollection.get(key) ?? []), b]);
    }
    return byCollection;
  }, [bookmarks.data]);

  if (collections.isError) {
    return (
      <ErrorAlert
        error={collections.error}
        onRetry={() => void collections.refetch()}
      />
    );
  }
  if (collections.isPending || bookmarks.isPending) {
    return <Skeleton variant="rounded" height={300} />;
  }

  const uncategorised = grouped.get(null) ?? [];

  const renderBookmarks = (items: Bookmark[]): JSX.Element =>
    items.length === 0 ? (
      <Typography variant="body2" color="text.secondary" sx={{ pl: 2 }}>
        No bookmarks.
      </Typography>
    ) : (
      <List dense disablePadding>
        {items.map((b) => (
          <ListItem key={b.id} sx={{ pl: 2 }}>
            <ListItemIcon sx={{ minWidth: 32 }}>
              <LinkIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={
                <RouterLink to={`/bookmarks/${b.id}`} style={{ textDecoration: 'none' }}>
                  <Typography component="span" color="text.primary">
                    {b.title}
                  </Typography>
                </RouterLink>
              }
              secondary={
                <Link href={b.url} target="_blank" rel="noreferrer" variant="body2">
                  {b.url}
                </Link>
              }
            />
          </ListItem>
        ))}
      </List>
    );

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
        All bookmarks
      </Typography>
      <Stack spacing={2}>
        {collections.data.data.map((c: Collection) => (
          <Card key={c.id}>
            <CardContent>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                <FolderIcon color="primary" fontSize="small" />
                <Typography
                  variant="h6"
                  component={RouterLink}
                  to={`/collections/${c.id}`}
                  sx={{ textDecoration: 'none', color: 'inherit' }}
                >
                  {c.name}
                </Typography>
                <Chip
                  size="small"
                  label={`${grouped.get(c.id)?.length ?? 0} bookmark${
                    (grouped.get(c.id)?.length ?? 0) === 1 ? '' : 's'
                  }`}
                />
              </Stack>
              {renderBookmarks(grouped.get(c.id) ?? [])}
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardContent>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
              <FolderOffIcon color="disabled" fontSize="small" />
              <Typography variant="h6">Uncategorised</Typography>
              <Chip
                size="small"
                label={`${uncategorised.length} bookmark${
                  uncategorised.length === 1 ? '' : 's'
                }`}
              />
            </Stack>
            {renderBookmarks(uncategorised)}
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
