import { eq, isNotNull } from "drizzle-orm";
import { getStandaloneDb } from "./db-standalone";
import { characters } from "../src/db/schema";

function parseArgs(argv: string[]) {
  const args = new Map<string, string>();
  for (const raw of argv) {
    if (!raw.startsWith("--")) continue;
    const [key, value] = raw.slice(2).split("=", 2);
    args.set(key, value ?? "true");
  }
  return {
    dryRun: (args.get("dry-run") ?? "false") === "true",
    limit: args.get("limit") ? Number(args.get("limit")) : undefined,
  };
}

async function main() {
  const { dryRun, limit } = parseArgs(process.argv.slice(2));
  const db = getStandaloneDb();

  const candidates = await db
    .select({ id: characters.id })
    .from(characters)
    .where(isNotNull(characters.modules))
    .orderBy(characters.id)
    .limit(limit ?? 1000000);

  if (!dryRun && candidates.length > 0) {
    for (const row of candidates) {
      await db
        .update(characters)
        .set({
          modules: null,
          world_uuid: null,
          tags: null,
        })
        .where(eq(characters.id, row.id));
    }
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        rolledBack: candidates.length,
        finishedAt: new Date().toISOString(),
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

