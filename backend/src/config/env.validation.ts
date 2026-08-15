import { plainToInstance } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  validateSync,
} from 'class-validator';

class EnvironmentVariables {
  // Trailing slash required — Auth0 mints `iss` with it (ADR-013).
  @IsUrl({ require_tld: false, require_protocol: true })
  AUTH0_ISSUER: string;

  @IsString()
  AUTH0_AUDIENCE: string;

  @IsUrl({ require_tld: false, require_protocol: true })
  AUTH0_JWKS_URI: string;

  @IsString()
  DATABASE_URL: string;

  @IsOptional()
  @IsInt()
  PORT?: number;
}

export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, {
    skipMissingProperties: false,
    whitelist: true,
  });
  if (errors.length > 0) {
    throw new Error(
      `Invalid environment: ${errors
        .map((e) => Object.values(e.constraints ?? {}).join(', '))
        .join('; ')}`,
    );
  }
  if (!validated.AUTH0_ISSUER.endsWith('/')) {
    throw new Error(
      'AUTH0_ISSUER must end with a trailing slash — Auth0 mints iss with it (ADR-013)',
    );
  }
  return validated;
}
