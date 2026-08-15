import { useAuth0 } from '@auth0/auth0-react';
import { useMemo } from 'react';

import { createApiClient, type ApiClient } from './client';

// audience + scope live in Auth0Provider's authorizationParams, so a bare
// getAccessTokenSilently() already returns the API-audience access token.
export function useApi(): ApiClient {
  const { getAccessTokenSilently } = useAuth0();
  return useMemo(
    () => createApiClient(() => getAccessTokenSilently()),
    [getAccessTokenSilently],
  );
}
