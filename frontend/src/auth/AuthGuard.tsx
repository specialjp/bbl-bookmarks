import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useRef, type JSX } from 'react';
import { Outlet, useLocation } from 'react-router';

import { FullPageSpinner } from '@/components/FullPageSpinner';

// Layout route: everything beneath it requires a signed-in user.
// Two load-bearing details:
//  - redirect only AFTER isLoading settles, or the SDK loops;
//  - a ref guards StrictMode's double effect from firing two redirects.
export function AuthGuard(): JSX.Element {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
  const location = useLocation();
  const redirecting = useRef(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !redirecting.current) {
      redirecting.current = true;
      void loginWithRedirect({
        appState: { returnTo: location.pathname + location.search },
      });
    }
  }, [isLoading, isAuthenticated, loginWithRedirect, location]);

  if (isLoading || !isAuthenticated) return <FullPageSpinner />;
  return <Outlet />;
}
