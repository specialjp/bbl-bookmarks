import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';
import { createMemoryRouter, type RouteObject } from 'react-router';
import { RouterProvider } from 'react-router/dom';

import { AppSnackbarProvider } from '@/components/SnackbarProvider';
import { theme } from '@/theme';

// Fresh QueryClient per render (retry: 0 keeps error paths fast) + memory
// router so useSearchParams/useParams/useNavigate work in tests.
export function renderWithProviders(
  ui: ReactElement,
  { route = '/', path = '/' }: { route?: string; path?: string } = {},
): RenderResult & { router: ReturnType<typeof createMemoryRouter> } {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: 0 }, mutations: { retry: 0 } },
  });
  const routes: RouteObject[] = [
    { path, element: ui },
    { path: '*', element: <div data-testid="other-route" /> },
  ];
  const router = createMemoryRouter(routes, { initialEntries: [route] });

  const result = render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <AppSnackbarProvider>
          <RouterProvider router={router} />
        </AppSnackbarProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
  return { ...result, router };
}
