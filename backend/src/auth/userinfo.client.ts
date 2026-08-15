import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'node:https';

export interface UserinfoResponse {
  sub: string;
  email: string;
  name?: string;
}

// Uses node:https (not fetch/undici) so nock can intercept it in tests —
// the same reason jwks-rsa was chosen over jose (ADR-010).
@Injectable()
export class UserinfoClient {
  constructor(private readonly config: ConfigService) {}

  fetchUserinfo(accessToken: string): Promise<UserinfoResponse> {
    const url = new URL(
      'userinfo',
      this.config.getOrThrow<string>('AUTH0_ISSUER'),
    );
    return new Promise((resolve, reject) => {
      const req = https.request(
        url,
        { headers: { Authorization: `Bearer ${accessToken}` } },
        (res) => {
          let body = '';
          res.on('data', (chunk: string) => (body += chunk));
          res.on('end', () => {
            if (res.statusCode !== 200) {
              reject(
                new UnauthorizedException(
                  `userinfo returned ${res.statusCode}`,
                ),
              );
              return;
            }
            try {
              resolve(JSON.parse(body) as UserinfoResponse);
            } catch {
              reject(new UnauthorizedException('userinfo returned non-JSON'));
            }
          });
        },
      );
      req.on('error', reject);
      req.end();
    });
  }
}
