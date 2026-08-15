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
      notify('Collection added — you have read-only access');
    },
    // Every mutation notifies (CLAUDE.md #9); the redeem page ALSO renders a
    // persistent inline alert — the snackbar times out, the alert survives.
    onError: (e) =>
      e.status === 400
        ? notify(
            'This is your own share link — send it to someone else',
            'info',
          )
        : notify(
            e.status === 404
              ? 'That share link is not valid (unknown or revoked)'
              : e.status === 409
                ? 'That share link was already used by someone else'
                : e.message,
            'error',
          ),
  });
}
