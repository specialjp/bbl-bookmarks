import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { CollectionsPage } from '@/features/collections/CollectionsPage';

import { renderWithProviders } from './renderWithProviders';
import { server } from './server';

describe('CollectionsPage', () => {
  it('renders the collections from the API', async () => {
    renderWithProviders(<CollectionsPage />, {
      route: '/collections',
      path: '/collections',
    });
    expect(await screen.findByText('Engineering')).toBeInTheDocument();
    expect(screen.getByText('Recipes')).toBeInTheDocument();
  });

  it('empty list -> empty state with create CTA', async () => {
    server.use(
      http.get('/api/collections', () =>
        HttpResponse.json({
          data: [],
          meta: { page: 1, limit: 100, total: 0, totalPages: 0 },
        }),
      ),
    );
    renderWithProviders(<CollectionsPage />, {
      route: '/collections',
      path: '/collections',
    });
    expect(await screen.findByText('No collections yet')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /create your first collection/i }),
    ).toBeInTheDocument();
  });

  it('API failure -> inline error with retry (not a blank page)', async () => {
    server.use(
      http.get('/api/collections', () =>
        HttpResponse.json(
          { statusCode: 500, message: 'boom', error: 'Internal Server Error' },
          { status: 500 },
        ),
      ),
    );
    renderWithProviders(<CollectionsPage />, {
      route: '/collections',
      path: '/collections',
    });
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('boom'),
    );
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
