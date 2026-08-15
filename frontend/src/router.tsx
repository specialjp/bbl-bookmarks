import Typography from '@mui/material/Typography';
import { createBrowserRouter, Navigate } from 'react-router';

import { AuthGuard } from '@/auth/AuthGuard';
import { CallbackPage } from '@/auth/CallbackPage';
import { AppLayout } from '@/components/AppLayout';

// Data-mode router WITHOUT loaders: getAccessTokenSilently lives in React
// context (useAuth0), so data fetching pairs with TanStack Query in
// components instead of hoisting the Auth0 client out of React. Module scope
// on purpose — main.tsx's onRedirectCallback drives router.navigate.
export const router = createBrowserRouter([
  // Public SPA route for the Auth0 redirect — the ONLY unguarded route.
  { path: '/callback', element: <CallbackPage /> },
  {
    element: <AuthGuard />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/collections" replace /> },
          // Feature pages land in the next commits.
          {
            path: '*',
            element: <Typography variant="h5">Page not found</Typography>,
          },
        ],
      },
    ],
  },
]);
