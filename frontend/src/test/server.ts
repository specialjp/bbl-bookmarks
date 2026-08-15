import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import type { Bookmark, Collection, Paginated } from '@/api/types';

export const fixtures = {
  collections: [
    {
      id: 'col-1',
      name: 'Engineering',
      ownerId: 'user-1',
      isOwner: true,
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    },
    {
      id: 'col-2',
      name: 'Recipes',
      ownerId: 'user-1',
      isOwner: true,
      createdAt: '2026-08-02T00:00:00.000Z',
      updatedAt: '2026-08-02T00:00:00.000Z',
    },
  ] satisfies Collection[],
  bookmarks: [
    {
      id: 'bm-1',
      url: 'https://example.com/pg',
      title: 'Postgres deep dive',
      notes: null,
      collectionId: 'col-1',
      ownerId: 'user-1',
      createdAt: '2026-08-03T00:00:00.000Z',
      updatedAt: '2026-08-03T00:00:00.000Z',
    },
    {
      id: 'bm-2',
      url: 'https://example.com/loose',
      title: 'Loose link',
      notes: 'uncategorised',
      collectionId: null,
      ownerId: 'user-1',
      createdAt: '2026-08-04T00:00:00.000Z',
      updatedAt: '2026-08-04T00:00:00.000Z',
    },
  ] satisfies Bookmark[],
};

const page = <T>(data: T[]): Paginated<T> => ({
  data,
  meta: { page: 1, limit: 100, total: data.length, totalPages: 1 },
});

/** Mutable store the handlers read — tests reset it via resetStore(). */
export const store: { collections: Collection[]; bookmarks: Bookmark[] } = {
  collections: [...fixtures.collections],
  bookmarks: [...fixtures.bookmarks],
};

export function resetStore(): void {
  store.collections = [...fixtures.collections];
  store.bookmarks = [...fixtures.bookmarks];
}

export const server = setupServer(
  http.get('/api/collections', () => HttpResponse.json(page(store.collections))),
  http.get('/api/collections/shared-with-me', () => HttpResponse.json(page([]))),
  http.get('/api/collections/:id/bookmarks', ({ params }) =>
    HttpResponse.json(
      page(store.bookmarks.filter((b) => b.collectionId === params.id)),
    ),
  ),
  http.get('/api/collections/:id', ({ params }) => {
    const row = store.collections.find((c) => c.id === params.id);
    return row
      ? HttpResponse.json(row)
      : HttpResponse.json(
          { statusCode: 404, message: 'Not Found' },
          { status: 404 },
        );
  }),
  http.post('/api/shares/accept', async ({ request }) => {
    const { token } = (await request.json()) as { token: string };
    if (token === 'tok-valid') {
      return HttpResponse.json({
        id: 'share-1',
        collectionId: 'col-1',
        granteeUserId: 'user-1',
        createdAt: '2026-08-15T00:00:00.000Z',
        revokedAt: null,
      });
    }
    return HttpResponse.json(
      { statusCode: 404, message: 'Not Found' },
      { status: 404 },
    );
  }),
  http.get('/api/bookmarks', ({ request }) => {
    const url = new URL(request.url);
    const collectionId = url.searchParams.get('collectionId');
    const uncategorised = url.searchParams.get('uncategorised') === 'true';
    const q = url.searchParams.get('q')?.toLowerCase();
    let rows = store.bookmarks;
    if (collectionId) rows = rows.filter((b) => b.collectionId === collectionId);
    if (uncategorised) rows = rows.filter((b) => b.collectionId === null);
    if (q) {
      rows = rows.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          (b.notes ?? '').toLowerCase().includes(q),
      );
    }
    return HttpResponse.json(page(rows));
  }),
  http.post('/api/bookmarks', async ({ request }) => {
    const body = (await request.json()) as {
      url: string;
      title: string;
      notes?: string;
      collectionId?: string;
    };
    const created: Bookmark = {
      id: `bm-${store.bookmarks.length + 1}`,
      url: body.url,
      title: body.title,
      notes: body.notes ?? null,
      collectionId: body.collectionId ?? null,
      ownerId: 'user-1',
      createdAt: '2026-08-15T00:00:00.000Z',
      updatedAt: '2026-08-15T00:00:00.000Z',
    };
    store.bookmarks = [created, ...store.bookmarks];
    return HttpResponse.json(created, { status: 201 });
  }),
);
