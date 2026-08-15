import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { ApiError, createApiClient } from '@/api/client';

import { server } from './server';

// The one pure-unit surface worth pinning: Nest error envelope -> ApiError.
describe('createApiClient', () => {
  const client = createApiClient(() => Promise.resolve('tok'), '');

  it('maps a validation error (message: string[]) to a joined message', async () => {
    server.use(
      http.post('/api/collections', () =>
        HttpResponse.json(
          {
            statusCode: 400,
            message: ['name should not be empty', 'name must be a string'],
            error: 'Bad Request',
          },
          { status: 400 },
        ),
      ),
    );
    const err = await client
      .post('/api/collections', { name: '' })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(400);
    expect((err as ApiError).message).toBe(
      'name should not be empty, name must be a string',
    );
  });

  it('maps 404 with a plain message', async () => {
    server.use(
      http.get('/api/collections/ghost', () =>
        HttpResponse.json(
          { statusCode: 404, message: 'Not Found' },
          { status: 404 },
        ),
      ),
    );
    const err = await client.get('/api/collections/ghost').catch((e: unknown) => e);
    expect((err as ApiError).status).toBe(404);
    expect((err as ApiError).message).toBe('Not Found');
  });

  it('sends the Bearer token and returns undefined for 204', async () => {
    let sawAuth = '';
    server.use(
      http.delete('/api/bookmarks/bm-1', ({ request }) => {
        sawAuth = request.headers.get('authorization') ?? '';
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await expect(client.del('/api/bookmarks/bm-1')).resolves.toBeUndefined();
    expect(sawAuth).toBe('Bearer tok');
  });
});
