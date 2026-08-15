import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { describe, expect, it } from 'vitest';

import { AuthGuard } from '@/auth/AuthGuard';

import { auth0State } from './auth0-state';

// Guard is a layout route — mount it with a real child route, exactly as in
// router.tsx.
function renderGuarded(route = '/collections?x=1'): void {
  const router = createMemoryRouter(
    [
      {
        element: <AuthGuard />,
        children: [
          {
            path: '/collections',
            element: <div data-testid="protected-content">secret</div>,
          },
        ],
      },
    ],
    { initialEntries: [route] },
  );
  render(<RouterProvider router={router} />);
}

describe('AuthGuard', () => {
  it('authenticated -> renders the protected child, no redirect', async () => {
    renderGuarded();
    await waitFor(() =>
      expect(screen.getByTestId('protected-content')).toBeInTheDocument(),
    );
    expect(auth0State.loginWithRedirect).not.toHaveBeenCalled();
  });

  it('unauthenticated + settled -> loginWithRedirect with returnTo (path+search)', async () => {
    auth0State.isAuthenticated = false;
    auth0State.isLoading = false;
    renderGuarded('/collections?x=1');
    await waitFor(() =>
      expect(auth0State.loginWithRedirect).toHaveBeenCalledWith({
        appState: { returnTo: '/collections?x=1' },
      }),
    );
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('still loading -> spinner, NO redirect (prevents the redirect loop)', () => {
    auth0State.isAuthenticated = false;
    auth0State.isLoading = true;
    renderGuarded();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(auth0State.loginWithRedirect).not.toHaveBeenCalled();
  });
});
