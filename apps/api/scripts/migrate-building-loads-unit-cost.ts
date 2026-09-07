import path from 'path';
import { config } from 'dotenv';
import postgres from 'postgres';

config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const sql = postgres(
    process.env.DATABASE_URL ??
      'postgres://postgres:postgres@localhost:5432/bdrms',
  );

  await sql.unsafe(`
    ALTER TABLE loads ADD COLUMN IF NOT EXISTS building_id integer;

    UPDATE loads
    SET building_id = (SELECT id FROM buildings ORDER BY id LIMIT 1)
    WHERE building_id IS NULL
      AND EXISTS (SELECT 1 FROM buildings);

    ALTER TABLE loads
      ALTER COLUMN building_id SET NOT NULL;

    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'loads_building_id_buildings_id_fk'
      ) THEN
        ALTER TABLE loads
          ADD CONSTRAINT loads_building_id_buildings_id_fk
          FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE RESTRICT;
      END IF;
    END $$;

    DROP INDEX IF EXISTS uq_loads_one_running;

    CREATE UNIQUE INDEX IF NOT EXISTS uq_loads_one_running_per_building
      ON loads (building_id)
      WHERE status = 'running';

    CREATE INDEX IF NOT EXISTS idx_loads_building_status
      ON loads USING btree (building_id, status);

    ALTER TABLE system_configs ADD COLUMN IF NOT EXISTS building_id integer;

    UPDATE system_configs
    SET building_id = (SELECT id FROM buildings ORDER BY id LIMIT 1)
    WHERE building_id IS NULL
      AND EXISTS (SELECT 1 FROM buildings);

    INSERT INTO system_configs (gas_unit_name, gas_unit_price, operating_cost_per_flat, building_id)
    SELECT
      COALESCE(src.gas_unit_name, 'm3'),
      COALESCE(src.gas_unit_price, '1.00'),
      COALESCE(src.operating_cost_per_flat, '1.00'),
      b.id
    FROM buildings b
    LEFT JOIN LATERAL (
      SELECT gas_unit_name, gas_unit_price, operating_cost_per_flat
      FROM system_configs
      WHERE building_id IS NOT NULL
      ORDER BY id
      LIMIT 1
    ) src ON true
    WHERE NOT EXISTS (
      SELECT 1 FROM system_configs sc WHERE sc.building_id = b.id
    );

    DELETE FROM system_configs WHERE building_id IS NULL;

    ALTER TABLE system_configs
      ALTER COLUMN building_id SET NOT NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS uq_system_configs_building
      ON system_configs (building_id);

    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'system_configs_building_id_fk'
      ) THEN
        ALTER TABLE system_configs
          ADD CONSTRAINT system_configs_building_id_fk
          FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE;
      END IF;
    END $$;
  `);

  const [loads] = await sql`SELECT count(*)::int AS count FROM loads`;
  const [configs] = await sql`SELECT count(*)::int AS count FROM system_configs`;
  console.log(`building-scoped loads ready. load rows: ${loads.count}; config rows: ${configs.count}`);

  await sql.end({ timeout: 5 });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
