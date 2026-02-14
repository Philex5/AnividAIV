import { eq, isNull, sql } from "drizzle-orm";
import { getStandaloneDb } from "./db-standalone";
import { characters, ocworlds } from "../src/db/schema";
import { CharacterModulesSchema, type CharacterModules } from "../src/types/oc";

type worldslugToUuid = Record<string, string>;

function parseArgs(argv: string[]) {
  const args = new Map<string, string>();
  for (const raw of argv) {
    if (!raw.startsWith("--")) continue;
    const [key, value] = raw.slice(2).split("=", 2);
    args.set(key, value ?? "true");
  }
  return {
    batchSize: Number(args.get("batch-size") ?? "500"),
    limit: args.get("limit") ? Number(args.get("limit")) : undefined,
    dryRun: (args.get("dry-run") ?? "false") === "true",
  };
}

function mapThemeIdToworldslug(themeId: unknown): string {
  if (typeof themeId !== "string") return "generic";
  const normalized = themeId.trim().toLowerCase();
  if (!normalized) return "generic";
  if (normalized.includes("cyber")) return "cyberpunk";
  if (normalized.includes("fantasy")) return "fantasy";
  return "generic";
}

function toStringArray(value: unknown): string[] | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) {
    const normalized = value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
    return normalized.length ? normalized : undefined;
  }
  if (typeof value === "string") {
    const normalized = value
      .split(/[,，\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
    return normalized.length ? normalized : undefined;
  }
  return undefined;
}

function mapCharacterToModules(row: typeof characters.$inferSelect): CharacterModules {
  const modules: CharacterModules = {
    appearance: {
      name: row.name ?? undefined,
      gender: (row.gender as any) ?? undefined,
      age: row.age ?? undefined,
      species: row.species ?? undefined,
      role: row.role ?? undefined,
      body_type: row.body_type ?? undefined,
      hair_color: row.hair_color ?? undefined,
      hair_style: row.hair_style ?? undefined,
      eye_color: row.eye_color ?? undefined,
      outfit_style: row.outfit_style ?? undefined,
      accessories: toStringArray(row.accessories) ?? undefined,
      appearance_features: toStringArray(row.appearance_features) ?? undefined,
    },
    personality: {
      personality_tags: toStringArray(row.personality_tags) ?? [],
      quotes: undefined,
      greeting: undefined,
    },
    background: {
      brief_introduction: row.brief_introduction ?? undefined,
      background_story: row.background_story ?? undefined,
      background_segments: row.background_segments ?? undefined,
    },
    art: {
      fullbody_style: row.art_style ?? undefined,
      avatar_style: undefined,
    },
  };

  return CharacterModulesSchema.parse(modules);
}

async function getworldslugToUuid(): Promise<worldslugToUuid> {
  const db = getStandaloneDb();
  const worlds = await db
    .select({ uuid: ocworlds.uuid, slug: ocworlds.slug })
    .from(ocworlds);

  return Object.fromEntries(worlds.map((w) => [w.slug, w.uuid]));
}

async function main() {
  const { batchSize, limit, dryRun } = parseArgs(process.argv.slice(2));
  if (!Number.isFinite(batchSize) || batchSize <= 0) {
    throw new Error("Invalid --batch-size");
  }

  const db = getStandaloneDb();
  const worldslugToUuid = await getworldslugToUuid();

  let migrated = 0;
  let failed = 0;
  const failedUuids: string[] = [];

  while (true) {
    if (limit !== undefined && migrated + failed >= limit) break;

    const remaining = limit !== undefined ? Math.max(limit - (migrated + failed), 0) : undefined;
    const take = remaining !== undefined ? Math.min(batchSize, remaining) : batchSize;
    if (take <= 0) break;

    const batch = await db
      .select()
      .from(characters)
      .where(isNull(characters.modules))
      .orderBy(characters.id)
      .limit(take);

    if (batch.length === 0) break;

    for (const row of batch) {
      try {
        const modules = mapCharacterToModules(row);

        const worldslug = mapThemeIdToworldslug(row.theme_id);
        const worldUuid = worldslugToUuid[worldslug];

        if (!dryRun) {
          await db
            .update(characters)
            .set({
              modules,
              tags: row.tags ?? [],
              world_uuid: row.world_uuid ?? worldUuid ?? null,
              updated_at: sql`now()`,
            })
            .where(eq(characters.id, row.id));
        }

        migrated += 1;
      } catch (error) {
        failed += 1;
        failedUuids.push(row.uuid);
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Migration failed for character uuid=${row.uuid}: ${message}`);
      }
    }
  }

  const summary = {
    batchSize,
    dryRun,
    migrated,
    failed,
    failedUuids,
    finishedAt: new Date().toISOString(),
  };

  console.log(JSON.stringify(summary, null, 2));

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
