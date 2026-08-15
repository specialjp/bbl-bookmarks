import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { ApiError } from '@/api/client';
import { useApi } from '@/api/useApi';
import type { Bookmark, Collection, MintedShare, Paginated } from '@/api/types';
import { useSnackbar } from '@/components/SnackbarProvider';

// Query keys + mutations for collections. Snackbars fire HERE (onSuccess/
// onError) so no page can forget the every-mutation-notifies rule.

export const collectionKeys = {
  all: ['collections'] as const,
  list: () => [...collectionKeys.all, 'list'] as const,
  shared: () => [...collectionKeys.all, 'shared-with-me'] as const,
  detail: (id: string) => [...collectionKeys.all, 'detail', id] as const,
};

export function useCollections(): UseQueryResult<Paginated<Collection>> {
  const api = useApi();
  return useQuery({
    queryKey: collectionKeys.list(),
    queryFn: () => api.get<Paginated<Collection>>('/api/collections?limit=100'),
  });
}

export function useSharedWithMe(): UseQueryResult<Paginated<Collection>> {
  const api = useApi();
  return useQuery({
    queryKey: collectionKeys.shared(),
    queryFn: () =>
      api.get<Paginated<Collection>>('/api/collections/shared-with-me?limit=100'),
  });
}

export function useCollection(id: string): UseQueryResult<Collection> {
  const api = useApi();
  return useQuery({
    queryKey: collectionKeys.detail(id),
    queryFn: () => api.get<Collection>(`/api/collections/${id}`),
  });
}

export function useCollectionBookmarks(
  id: string,
): UseQueryResult<Paginated<Bookmark>> {
  const api = useApi();
  return useQuery({
    queryKey: [...collectionKeys.detail(id), 'bookmarks'] as const,
    queryFn: () =>
      api.get<Paginated<Bookmark>>(`/api/collections/${id}/bookmarks?limit=100`),
  });
}

export function useCreateCollection(): UseMutationResult<
  Collection,
  ApiError,
  { name: string }
> {
  const api = useApi();
  const qc = useQueryClient();
  const { notify } = useSnackbar();
  return useMutation({
    mutationFn: (body) => api.post<Collection>('/api/collections', body),
    onSuccess: (created) => {
      void qc.invalidateQueries({ queryKey: collectionKeys.all });
      notify(`Collection “${created.name}” created`);
    },
    onError: (e) => notify(e.message, 'error'),
  });
}

export function useDeleteCollection(): UseMutationResult<
  void,
  ApiError,
  { id: string; name: string }
> {
  const api = useApi();
  const qc = useQueryClient();
  const { notify } = useSnackbar();
  return useMutation({
    mutationFn: ({ id }) => api.del(`/api/collections/${id}`),
    onSuccess: (_void, { name }) => {
      void qc.invalidateQueries({ queryKey: collectionKeys.all });
      // bookmarks become uncategorised (ADR-008) — their lists change too
      void qc.invalidateQueries({ queryKey: ['bookmarks'] });
      notify(`Collection “${name}” deleted — its bookmarks are now uncategorised`);
    },
    onError: (e) => notify(e.message, 'error'),
  });
}

export function useMintShare(): UseMutationResult<
  MintedShare,
  ApiError,
  { collectionId: string }
> {
  const api = useApi();
  const { notify } = useSnackbar();
  return useMutation({
    mutationFn: ({ collectionId }) =>
      api.post<MintedShare>(`/api/collections/${collectionId}/shares`, {}),
    onSuccess: () =>
      notify('Share link created — copy it now, it is shown once'),
    onError: (e) => notify(e.message, 'error'),
  });
}
