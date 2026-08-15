import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { BookmarksPage } from '@/features/bookmarks/BookmarksPage';

import { renderWithProviders } from './renderWithProviders';

const renderPage = (
  route = '/bookmarks',
): ReturnType<typeof renderWithProviders> =>
  renderWithProviders(<BookmarksPage />, { route, path: '/bookmarks' });

describe('BookmarksPage', () => {
  it('lists bookmarks with collection chips', async () => {
    renderPage();
    expect(await screen.findByText('Postgres deep dive')).toBeInTheDocument();
    expect(screen.getByText('Loose link')).toBeInTheDocument();
    expect(screen.getByText('uncategorised')).toBeInTheDocument();
  });

  it('create flow: dialog POST -> list refetch shows the new row -> success snackbar', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Postgres deep dive');

    await user.click(screen.getByRole('button', { name: /new bookmark/i }));
    const dialog = await screen.findByRole('dialog');
    await user.type(
      within(dialog).getByLabelText(/url/i),
      'https://example.com/new',
    );
    await user.type(within(dialog).getByLabelText(/title/i), 'Fresh find');
    await user.click(
      within(dialog).getByRole('button', { name: /add bookmark/i }),
    );

    // Cache invalidation proof: the refetched list contains the created row.
    expect(await screen.findByText('Fresh find')).toBeInTheDocument();
    // Every-mutation-notifies rule: success snackbar fired.
    expect(await screen.findByText(/bookmark “fresh find” added/i)).toBeInTheDocument();
  });

  it('collection filter updates ?collectionId= and narrows the table', async () => {
    const user = userEvent.setup();
    const { router } = renderPage();
    await screen.findByText('Postgres deep dive');

    await user.click(screen.getByRole('combobox', { name: /collection/i }));
    await user.click(await screen.findByRole('option', { name: 'Engineering' }));

    await waitFor(() =>
      expect(router.state.location.search).toContain('collectionId=col-1'),
    );
    await waitFor(() =>
      expect(screen.queryByText('Loose link')).not.toBeInTheDocument(),
    );
    expect(screen.getByText('Postgres deep dive')).toBeInTheDocument();
  });

  it('search box (debounced) writes ?q= and filters via the API', async () => {
    const user = userEvent.setup();
    const { router } = renderPage();
    await screen.findByText('Postgres deep dive');

    await user.type(
      screen.getByPlaceholderText(/search title and notes/i),
      'loose',
    );
    await waitFor(() =>
      expect(router.state.location.search).toContain('q=loose'),
    );
    // generous timeout: debounce (300ms) + refetch can exceed the default
    // 1s under CI/CPU contention (hook caught this as a flake once)
    await waitFor(
      () => expect(screen.getByText('Loose link')).toBeInTheDocument(),
      { timeout: 4000 },
    );
    await waitFor(() =>
      expect(screen.queryByText('Postgres deep dive')).not.toBeInTheDocument(),
    );
  });
});
