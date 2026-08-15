import { vi } from 'vitest';

// Mutable Auth0 state consumed by the module mock installed in setup.ts.
// Tests flip flags (isLoading/isAuthenticated) and assert on the spies.
export const auth0State = {
  isAuthenticated: true,
  isLoading: false,
  user: {
    email: 'candidate@test.com',
    name: 'Candidate',
    picture: undefined as string | undefined,
  },
  error: undefined as Error | undefined,
  loginWithRedirect: vi.fn(),
  logout: vi.fn(),
  getAccessTokenSilently: vi.fn().mockResolvedValue('test-access-token'),
};

export function resetAuth0State(): void {
  auth0State.isAuthenticated = true;
  auth0State.isLoading = false;
  auth0State.error = undefined;
  auth0State.loginWithRedirect.mockReset();
  auth0State.logout.mockReset();
  auth0State.getAccessTokenSilently
    .mockReset()
    .mockResolvedValue('test-access-token');
}
