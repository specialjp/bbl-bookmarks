import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Registered as APP_GUARD. Deliberately no @Public() escape hatch:
// "OIDC on every route" is true by construction (ADR-012).
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
