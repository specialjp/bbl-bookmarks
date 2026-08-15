import { createSign, generateKeyPairSync, KeyObject } from 'node:crypto';
import nock from 'nock';

const AUTH0_ORIGIN = 'https://dev-yg.us.auth0.com';
export const ISSUER = 'https://dev-yg.us.auth0.com/';
export const AUDIENCE = 'https://bbl-candidate-test-api';

export interface TokenClaims {
  sub: string;
  iss?: string;
  aud?: string;
  /** seconds from epoch; pass a past value for an expired token */
  exp?: number;
}

export interface TestAuth {
  /** sign a token the app will accept (unless claims are deliberately wrong) */
  signToken(claims: TokenClaims): string;
  /** profile served by the mocked /userinfo, keyed by sub */
  userinfoProfiles: Map<string, { email: string; name?: string }>;
  /** how many times /userinfo was actually hit */
  userinfoCalls(): number;
  cleanup(): void;
}

const b64url = (input: Buffer | string): string =>
  Buffer.from(input).toString('base64url');

function signRs256(payload: Record<string, unknown>, key: KeyObject): string {
  const header = b64url(
    JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: 'test-key' }),
  );
  const body = b64url(JSON.stringify(payload));
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${body}`);
  return `${header}.${body}.${signer.sign(key).toString('base64url')}`;
}

// Local RS256 keypair + nocked JWKS/userinfo, all via node:crypto — no ESM-only
// deps. Exercises the REAL jwks-rsa verification path (kid lookup, cache,
// issuer/audience checks) with zero live Auth0 traffic (ADR-010).
export function setupTestAuth(): TestAuth {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });
  const jwk = {
    ...publicKey.export({ format: 'jwk' }),
    kid: 'test-key',
    alg: 'RS256',
    use: 'sig',
  };

  const userinfoProfiles = new Map<string, { email: string; name?: string }>();
  let userinfoHits = 0;

  nock(AUTH0_ORIGIN)
    .persist()
    .get('/.well-known/jwks.json')
    .reply(200, { keys: [jwk] });

  nock(AUTH0_ORIGIN)
    .persist()
    .get('/userinfo')
    .reply(function () {
      userinfoHits += 1;
      const auth = this.req.headers.authorization ?? '';
      const token = String(auth).replace(/^Bearer /, '');
      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64url').toString(),
      ) as { sub: string };
      const profile = userinfoProfiles.get(payload.sub);
      if (!profile) return [401, { error: 'unknown test sub' }];
      return [200, { sub: payload.sub, ...profile }];
    });

  nock.disableNetConnect();
  nock.enableNetConnect(/127\.0\.0\.1|localhost/);

  return {
    signToken(claims: TokenClaims): string {
      const now = Math.floor(Date.now() / 1000);
      return signRs256(
        {
          iss: claims.iss ?? ISSUER,
          aud: claims.aud ?? AUDIENCE,
          sub: claims.sub,
          iat: now,
          exp: claims.exp ?? now + 600,
        },
        privateKey,
      );
    },
    userinfoProfiles,
    userinfoCalls: () => userinfoHits,
    cleanup: () => {
      nock.cleanAll();
      nock.enableNetConnect();
    },
  };
}
