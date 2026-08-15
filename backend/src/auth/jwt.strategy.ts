import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { passportJwtSecret } from 'jwks-rsa';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { UsersService } from '../users/users.service';
import { AuthUser } from './auth-user.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly users: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      algorithms: ['RS256'],
      issuer: config.getOrThrow<string>('AUTH0_ISSUER'),
      audience: config.getOrThrow<string>('AUTH0_AUDIENCE'),
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: config.getOrThrow<string>('AUTH0_JWKS_URI'),
      }),
      // The raw bearer is needed to call /userinfo on first sight of a sub.
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: { sub: string }): Promise<AuthUser> {
    const accessToken = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    return this.users.resolveFromToken(payload.sub, accessToken as string);
  }
}
