import '@testing-library/jest-dom/vitest';

import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';

import { resetStore, server } from './server';

// Auth0 is mocked at the module boundary for ALL suites: the SDK's token
// machinery is third-party code we deliberately don't test (see README).
vi.mock('@auth0/auth0-react', async () => {
  const { auth0State } = await import('./auth0-state');
  return {
    useAuth0: () => auth0State,
    Auth0Provider: ({ children }: { children: unknown }) => children,
  };
});

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

beforeEach(async () => {
  resetStore();
  const { resetAuth0State } = await import('./auth0-state');
  resetAuth0State();
});

afterEach(() => server.resetHandlers());
afterAll(() => server.close());
