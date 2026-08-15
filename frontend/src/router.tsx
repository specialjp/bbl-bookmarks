import Typography from '@mui/material/Typography';
import { createBrowserRouter, Navigate } from 'react-router';

import { AuthGuard } from '@/auth/AuthGuard';
import { CallbackPage } from '@/auth/CallbackPage';
import { AppLayout } from '@/components/AppLayout';
import { BookmarkDetailPage } from '@/features/bookmarks/BookmarkDetailPage';
import { BookmarksPage } from '@/features/bookmarks/BookmarksPage';
import { CollectionDetailPage } from '@/features/collections/CollectionDetailPage';
import { CollectionsPage } from '@/features/collections/CollectionsPage';
import { RedeemSharePage } from '@/features/sharing/RedeemSharePage';

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
          { path: 'collections', element: <CollectionsPage /> },
          { path: 'collections/:id', element: <CollectionDetailPage /> },
          { path: 'bookmarks', element: <BookmarksPage /> },
          { path: 'bookmarks/:id', element: <BookmarkDetailPage /> },
          { path: 'shared', element: <RedeemSharePage /> },
          // /all (bonus) lands in the next commit.
          {
            path: '*',
            element: <Typography variant="h5">Page not found</Typography>,
          },
        ],
      },
    ],
  },
]);
