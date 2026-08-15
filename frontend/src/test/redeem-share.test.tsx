import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { RedeemSharePage } from '@/features/sharing/RedeemSharePage';

import { renderWithProviders } from './renderWithProviders';
import { server } from './server';

const renderAt = (route: string): ReturnType<typeof renderWithProviders> =>
  renderWithProviders(<RedeemSharePage />, { route, path: '/shared' });

describe('RedeemSharePage — link-based sharing (ADR-015)', () => {
  it('valid link auto-redeems and navigates to the shared collection', async () => {
    const { router } = renderAt('/shared?token=tok-valid');
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/collections/col-1'),
    );
  });

  it('used link (409) -> persistent alert, no navigation', async () => {
    server.use(
      http.post('/api/shares/accept', () =>
        HttpResponse.json(
          { statusCode: 409, message: 'Conflict' },
          { status: 409 },
        ),
      ),
    );
    const { router } = renderAt('/shared?token=tok-used');
    expect(
      await screen.findByText('This link was already used'),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/shared');
  });

  it("owner opening their OWN link (400) -> lands on their collection, not a dead end", async () => {
    server.use(
      http.post('/api/shares/accept', () =>
        HttpResponse.json(
          { statusCode: 400, message: 'You already own this collection' },
          { status: 400 },
        ),
      ),
    );
    const { router } = renderAt('/shared?token=tok-own&collection=col-1');
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/collections/col-1'),
    );
  });

  it('invalid link (404) -> alert + manual form available as fallback', async () => {
    const { router } = renderAt('/shared?token=tok-bogus');
    expect(
      await screen.findByText("This share link isn't valid"),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/shared');
    expect(screen.getByLabelText(/share link or token/i)).toBeInTheDocument();
  });
});
