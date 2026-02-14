import { db } from "@/db";
import { characters, ocworlds, users } from "@/db/schema";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";

export type OCworld = typeof ocworlds.$inferSelect;
export type NewOCworld = typeof ocworlds.$inferInsert;

export type OCworldWithCount = OCworld & {
  character_count: number;
  liked?: boolean;
  favorited?: boolean;
  creator?: {
    display_name: string | null;
    avatar_url: string | null;
  };
  characters?: Array<{
    uuid: string;
    name?: string | null;
    thumbnail_mobile?: string | null;
    image_url?: string | null;
  }>;
};

export async function findworldById(
  id: number
): Promise<OCworld | undefined> {
  const [row] = await db()
    .select()
    .from(ocworlds)
    .where(eq(ocworlds.id, id))
    .limit(1);
  return row;
}

export async function findworldByUuid(
  uuid: string
): Promise<OCworld | undefined> {
  const [row] = await db()
    .select()
    .from(ocworlds)
    .where(eq(ocworlds.uuid, uuid))
    .limit(1);
  return row;
}

export async function findworldBySlug(
  slug: string
): Promise<OCworld | undefined> {
  const [row] = await db()
    .select()
    .from(ocworlds)
    .where(eq(ocworlds.slug, slug))
    .limit(1);
  return row;
}

export async function findworldBySlugAndCreator(
  slug: string,
  creatorUuid: string
): Promise<OCworld | undefined> {
  const [row] = await db()
    .select()
    .from(ocworlds)
    .where(
      and(
        eq(ocworlds.slug, slug),
        eq(ocworlds.creator_uuid, creatorUuid),
        eq(ocworlds.is_preset, false)
      )
    )
    .limit(1);
  return row;
}

export async function listworlds(options: {
  page: number;
  limit: number;
  visibility_level?: "public" | "private";
  search?: string;
  creatorUuid?: string;
  viewerUuid?: string;
  includePreset?: boolean;
  joinableOnly?: boolean;
}): Promise<{ worlds: OCworldWithCount[]; total: number }> {
  const {
    page,
    limit,
    visibility_level,
    search,
    creatorUuid,
    viewerUuid,
    includePreset,
    joinableOnly,
  } = options;
  const offset = (page - 1) * limit;

  const conditions = [];
  conditions.push(eq(ocworlds.is_active, true));

  if (visibility_level === "public") {
    conditions.push(eq(ocworlds.visibility_level, "public"));
  } else if (visibility_level === "private") {
    if (!viewerUuid) {
      return { worlds: [], total: 0 };
    }
    conditions.push(eq(ocworlds.visibility_level, "private"));
    conditions.push(eq(ocworlds.creator_uuid, viewerUuid));
  } else {
    if (viewerUuid) {
      conditions.push(
        or(
          eq(ocworlds.visibility_level, "public"),
          eq(ocworlds.creator_uuid, viewerUuid)
        )
      );
    } else {
      conditions.push(eq(ocworlds.visibility_level, "public"));
    }
  }

  if (joinableOnly) {
    if (viewerUuid) {
      conditions.push(
        or(eq(ocworlds.allow_join, true), eq(ocworlds.creator_uuid, viewerUuid))
      );
    } else {
      conditions.push(eq(ocworlds.allow_join, true));
    }
  }

  if (search?.trim()) {
    const q = `%${search.trim()}%`;
    conditions.push(
      or(ilike(ocworlds.name, q), ilike(ocworlds.description, q))
    );
  }

  if (creatorUuid) {
    conditions.push(eq(ocworlds.creator_uuid, creatorUuid));
  } else if (includePreset === false) {
    conditions.push(eq(ocworlds.is_preset, false));
  }

  const where =
    conditions.length > 0 ? and(...(conditions as any)) : undefined;

  const rows = await db()
    .select({
      world: ocworlds,
      character_count: sql<number>`count(${characters.id})`,
      creator: {
        display_name: users.display_name,
        avatar_url: users.avatar_url,
      },
    })
    .from(ocworlds)
    .leftJoin(characters, eq(characters.world_uuid, ocworlds.uuid))
    .leftJoin(users, eq(ocworlds.creator_uuid, users.uuid))
    .where(where)
    .groupBy(ocworlds.id, users.id)
    .orderBy(desc(ocworlds.is_preset), asc(ocworlds.name))
    .limit(limit)
    .offset(offset);

  const [totalRow] = await db()
    .select({ count: sql<number>`count(*)` })
    .from(ocworlds)
    .where(where);

  return {
    worlds: rows.map((r) => ({
      ...(r.world as OCworld),
      character_count: Number(r.character_count || 0),
      creator: r.creator as { display_name: string | null; avatar_url: string | null },
    })),
    total: Number(totalRow?.count || 0),
  };
}

export async function createworld(
  data: NewOCworld
): Promise<OCworld> {
  const [row] = await db().insert(ocworlds).values(data).returning();
  return row;
}

export async function updateworld(
  id: number,
  data: Partial<NewOCworld>
): Promise<OCworld | undefined> {
  const [row] = await db()
    .update(ocworlds)
    .set({ ...data, updated_at: new Date() })
    .where(eq(ocworlds.id, id))
    .returning();
  return row;
}

export async function deleteworld(id: number): Promise<boolean> {
  const res = await db().delete(ocworlds).where(eq(ocworlds.id, id));
  return res.length > 0;
}

export async function countworldsByCreator(creatorUuid: string): Promise<number> {
  const total = await db().$count(
    ocworlds,
    and(
      eq(ocworlds.creator_uuid, creatorUuid),
      eq(ocworlds.is_preset, false),
      eq(ocworlds.is_active, true)
    )
  );
  return total;
}

export async function countCharactersByworldUuid(
  uuid: string,
  options?: { visibility_level?: "public" | "private" }
): Promise<number> {
  const conditions = [eq(characters.world_uuid, uuid)];
  if (options?.visibility_level) {
    conditions.push(eq(characters.visibility_level, options.visibility_level));
  }
  const total = await db().$count(characters, and(...conditions));
  return total;
}
