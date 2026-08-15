import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';

import { ApiError } from '@/api/client';
import { useApi } from '@/api/useApi';
import type { Share } from '@/api/types';
import { useSnackbar } from '@/components/SnackbarProvider';
import { collectionKeys } from '@/features/collections/api';

// ADR-009: the recipient must be signed in; accepting binds them as the
// single grantee and unlocks read-only GET access.
export function useAcceptShare(): UseMutationResult<Share, ApiError, { token: string }> {
  const api = useApi();
  const qc = useQueryClient();
  const { notify } = useSnackbar();
  return useMutation({
    mutationFn: ({ token }) => api.post<Share>('/api/shares/accept', { token }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: collectionKeys.all });
      notify('Share accepted — the collection is now in “Shared with me”');
    },
    onError: (e) =>
      notify(
        e.status === 404
          ? 'That token is not valid (unknown or revoked)'
          : e.message,
        'error',
      ),
  });
}
