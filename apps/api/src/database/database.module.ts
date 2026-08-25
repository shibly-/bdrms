import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export const DRIZZLE = 'DRIZZLE_DB';

function createPostgresClient(connectionString: string) {
  const onVercel = Boolean(process.env.VERCEL);
  // Serverless: one client per isolate, no prepared statements (PgBouncer /
  // Neon / Supabase transaction poolers), and TLS for hosted Postgres.
  return postgres(
    connectionString,
    onVercel
      ? {
          max: 1,
          idle_timeout: 20,
          connect_timeout: 10,
          prepare: false,
          ssl: 'require',
        }
      : {},
  );
}

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const connectionString =
          configService.get<string>('DATABASE_URL') ??
          'postgres://postgres:postgres@localhost:5432/bdrms';
        const client = createPostgresClient(connectionString);
        return drizzle(client, { schema });
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule {}
