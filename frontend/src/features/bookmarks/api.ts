import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { ApiError } from '@/api/client';
import { useApi } from '@/api/useApi';
import type { Bookmark, Paginated } from '@/api/types';
import { useSnackbar } from '@/components/SnackbarProvider';

export interface BookmarkFilters {
  collectionId?: string;
  uncategorised?: boolean;
  q?: string;
}

export interface BookmarkInput {
  url: string;
  title: string;
  notes?: string | null;
  collectionId?: string | null;
}

export const bookmarkKeys = {
  all: ['bookmarks'] as const,
  list: (filters: BookmarkFilters) =>
    [...bookmarkKeys.all, 'list', filters] as const,
  detail: (id: string) => [...bookmarkKeys.all, 'detail', id] as const,
};

function toQueryString(filters: BookmarkFilters): string {
  const params = new URLSearchParams({ limit: '100' });
  if (filters.collectionId) params.set('collectionId', filters.collectionId);
  if (filters.uncategorised) params.set('uncategorised', 'true');
  if (filters.q) params.set('q', filters.q);
  return params.toString();
}

export function useBookmarks(
  filters: BookmarkFilters,
): UseQueryResult<Paginated<Bookmark>> {
  const api = useApi();
  return useQuery({
    queryKey: bookmarkKeys.list(filters),
    queryFn: () =>
      api.get<Paginated<Bookmark>>(`/api/bookmarks?${toQueryString(filters)}`),
  });
}

export function useBookmark(id: string): UseQueryResult<Bookmark> {
  const api = useApi();
  return useQuery({
    queryKey: bookmarkKeys.detail(id),
    queryFn: () => api.get<Bookmark>(`/api/bookmarks/${id}`),
  });
}

// Snackbars fire in the hooks (success AND error) — pages cannot forget.

export function useCreateBookmark(): UseMutationResult<
  Bookmark,
  ApiError,
  BookmarkInput
> {
  const api = useApi();
  const qc = useQueryClient();
  const { notify } = useSnackbar();
  return useMutation({
    mutationFn: (body) => api.post<Bookmark>('/api/bookmarks', body),
    onSuccess: (created) => {
      void qc.invalidateQueries({ queryKey: bookmarkKeys.all });
      notify(`Bookmark “${created.title}” added`);
    },
    onError: (e) => notify(e.message, 'error'),
  });
}

export function useDeleteBookmark(): UseMutationResult<
  void,
  ApiError,
  { id: string; title: string }
> {
  const api = useApi();
  const qc = useQueryClient();
  const { notify } = useSnackbar();
  return useMutation({
    mutationFn: ({ id }) => api.del(`/api/bookmarks/${id}`),
    onSuccess: (_void, { title }) => {
      void qc.invalidateQueries({ queryKey: bookmarkKeys.all });
      notify(`Bookmark “${title}” deleted`);
    },
    onError: (e) => notify(e.message, 'error'),
  });
}
