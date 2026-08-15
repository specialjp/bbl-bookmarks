import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { CollectionDetailPage } from '@/features/collections/CollectionDetailPage';

import { renderWithProviders } from './renderWithProviders';
import { fixtures, server } from './server';

const renderPage = (): ReturnType<typeof renderWithProviders> =>
  renderWithProviders(<CollectionDetailPage />, {
    route: '/collections/col-1',
    path: '/collections/:id',
  });

describe('CollectionDetailPage', () => {
  it('owner: adds a bookmark INTO this collection from the page', async () => {
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByText('Engineering')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /add bookmark/i }));
    const dialog = await screen.findByRole('dialog');
    await user.type(
      within(dialog).getByLabelText(/url/i),
      'https://example.com/from-detail',
    );
    await user.type(within(dialog).getByLabelText(/title/i), 'Added here');
    await user.click(
      within(dialog).getByRole('button', { name: /add bookmark/i }),
    );

    // Lands in THIS collection (dialog preselected col-1) and the page's own
    // list refetches — pins the collections-key invalidation fix.
    expect(await screen.findByText('Added here')).toBeInTheDocument();
    expect(
      await screen.findByText(/bookmark “added here” added/i),
    ).toBeInTheDocument();
  });

  it('grantee (read-only): no Add/Share/Delete controls, rows are not buttons', async () => {
    server.use(
      http.get('/api/collections/col-1', () =>
        HttpResponse.json({ ...fixtures.collections[0], isOwner: false }),
      ),
    );
    renderPage();
    expect(await screen.findByText('Engineering')).toBeInTheDocument();
    expect(screen.getByText(/read-only/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /add bookmark/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /share/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /delete collection/i }),
    ).not.toBeInTheDocument();

    // bookmark row renders as plain list item, not a dead ripple button
    await waitFor(() =>
      expect(screen.getByText('Postgres deep dive')).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole('button', { name: /postgres deep dive/i }),
    ).not.toBeInTheDocument();
  });
});
