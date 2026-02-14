import { sql } from "drizzle-orm";
import { getStandaloneDb } from "./db-standalone";

async function main() {
  const db = getStandaloneDb();

  const [{ total }] = await db.execute<{ total: number }>(
    sql`SELECT COUNT(*)::int as total FROM characters`
  );
  const [{ modules_null }] = await db.execute<{ modules_null: number }>(
    sql`SELECT COUNT(*)::int as modules_null FROM characters WHERE modules IS NULL`
  );
  const [{ invalid_world_fk }] = await db.execute<{ invalid_world_fk: number }>(
    sql`
      SELECT COUNT(*)::int as invalid_world_fk
      FROM characters c
      WHERE c.world_uuid IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM oc_worlds w WHERE w.uuid = c.world_uuid)
    `
  );

  const summary = {
    totalCharacters: total,
    modulesNull: modules_null,
    invalidworldFk: invalid_world_fk,
    finishedAt: new Date().toISOString(),
  };

  console.log(JSON.stringify(summary, null, 2));

  if (modules_null > 0 || invalid_world_fk > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
