import { registerAs } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
  validateSync,
} from 'class-validator';

enum Environment {
  DEV = 'development',
  PROD = 'production',
  TEST = 'test',
}

// 1. The rules: every variable the app needs, and what a valid value looks like
class EnvironmentVariables {
  @IsOptional()
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.DEV;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 7000;

  @Matches(/^postgres(ql)?:\/\//, {
    message: 'DATABASE_URL must be a postgresql:// connection string',
  })
  DATABASE_URL: string;
}

// 2. Runs once at startup. A missing or invalid variable stops the app here,
//    not later in the middle of a request.
export function validate(config: Record<string, unknown>) {
  const env = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true, // "3000" from .env becomes 3000
  });
  const errors = validateSync(env, { skipMissingProperties: false });

  if (errors.length > 0) {
    const details = errors
      .map(
        (e) =>
          `  - ${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`,
      )
      .join('\n');
    throw new Error(`Invalid environment variables:\n${details}`);
  }
  return env;
}

// 3. The typed config the app reads, under the "app" namespace
export default registerAs('app', () => ({
  env: process.env.NODE_ENV ?? Environment.DEV,
  port: parseInt(process.env.PORT ?? '3000', 10),
  databaseUrl: process.env.DATABASE_URL as string,
}));
