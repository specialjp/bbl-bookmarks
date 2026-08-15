import { config } from '@/config';

import type { ApiErrorBody } from './types';

export class ApiError extends Error {
  readonly status: number;
  readonly body: ApiErrorBody | null;

  constructor(status: number, message: string, body?: ApiErrorBody | null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body ?? null;
  }
}

export interface ApiClient {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, json: unknown): Promise<T>;
  put<T>(path: string, json: unknown): Promise<T>;
  patch<T>(path: string, json: unknown): Promise<T>;
  del(path: string): Promise<void>;
}

// Factory (not a hook) so tests can construct it with a stub token getter.
// Sends the Auth0 ACCESS token — never the ID token (ADR-005).
export function createApiClient(
  getToken: () => Promise<string>,
  baseUrl: string = config.apiBaseUrl,
): ApiClient {
  async function request<T>(
    path: string,
    init: RequestInit & { json?: unknown } = {},
  ): Promise<T> {
    const token = await getToken();
    const res = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.json !== undefined && { 'Content-Type': 'application/json' }),
        ...init.headers,
      },
      body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
      const message = Array.isArray(body?.message)
        ? body.message.join(', ')
        : (body?.message ?? `Request failed (${res.status})`);
      throw new ApiError(res.status, message, body);
    }
    return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
  }

  return {
    get: <T>(path: string) => request<T>(path),
    post: <T>(path: string, json: unknown) =>
      request<T>(path, { method: 'POST', json }),
    put: <T>(path: string, json: unknown) =>
      request<T>(path, { method: 'PUT', json }),
    patch: <T>(path: string, json: unknown) =>
      request<T>(path, { method: 'PATCH', json }),
    del: (path: string) => request<void>(path, { method: 'DELETE' }),
  };
}
