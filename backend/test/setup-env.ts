// Runs before any module loads (jest setupFiles). Sets EVERY env var the app
// needs so e2e is hermetic: no .env file dependence, identical in CI (ADR-010).
process.env.AUTH0_ISSUER = 'https://dev-yg.us.auth0.com/';
process.env.AUTH0_AUDIENCE = 'https://bbl-candidate-test-api';
process.env.AUTH0_JWKS_URI =
  'https://dev-yg.us.auth0.com/.well-known/jwks.json';
// Real URLs above are never contacted: nock intercepts them and
// disableNetConnect makes any accidental live call a hard test failure.
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5432/bookmarks_test?schema=public';
