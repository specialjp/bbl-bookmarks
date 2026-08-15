// Fail-fast env parsing: a missing value crashes at boot with a clear
// message instead of a cryptic Auth0 error three screens later.
function required(name: string): string {
  const value = import.meta.env[name] as string | undefined;
  if (!value) {
    throw new Error(
      `Missing ${name} — copy frontend/.env.example to frontend/.env`,
    );
  }
  return value;
}

export const config = {
  auth0Domain: required('VITE_AUTH0_DOMAIN'),
  auth0ClientId: required('VITE_AUTH0_CLIENT_ID'),
  auth0Audience: required('VITE_AUTH0_AUDIENCE'),
  /** '' = same-origin; dev uses the Vite proxy, prod the nginx proxy */
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '',
} as const;
