import { Auth0Provider } from '@auth0/auth0-react';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom'; // RR v8: react-router-dom no longer exists

import { AppSnackbarProvider } from '@/components/SnackbarProvider';
import { config } from '@/config';
import { router } from '@/router';
import { theme } from '@/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Auth0Provider
      domain={config.auth0Domain}
      clientId={config.auth0ClientId}
      authorizationParams={{
        redirect_uri: `${window.location.origin}/callback`,
        audience: config.auth0Audience, // ACCESS token for the API — never the ID token (ADR-005)
        scope: 'openid profile email',
      }}
      // Tenant refresh-grant status is unverifiable without admin access;
      // the fallback keeps silent renewal working either way.
      useRefreshTokens
      useRefreshTokensFallback
      cacheLocation="localstorage"
      // auth0-react's default restore uses history.replaceState, which a
      // data router never observes — drive the router explicitly.
      onRedirectCallback={(appState) =>
        void router.navigate(appState?.returnTo ?? '/collections', {
          replace: true,
        })
      }
    >
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <AppSnackbarProvider>
            <RouterProvider router={router} />
          </AppSnackbarProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </Auth0Provider>
  </StrictMode>,
);
