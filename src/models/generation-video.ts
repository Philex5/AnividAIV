import { generationVideos } from "@/db/schema";
import { db } from "@/db";
import { eq, inArray, desc } from "drizzle-orm";

export async function insertGenerationVideo(
  data: typeof generationVideos.$inferInsert
): Promise<typeof generationVideos.$inferSelect | undefined> {
  const [row] = await db().insert(generationVideos).values(data).returning();
  return row;
}

export async function insertGenerationVideos(
  data: (typeof generationVideos.$inferInsert)[]
): Promise<(typeof generationVideos.$inferSelect)[]> {
  const rows = await db().insert(generationVideos).values(data).returning();
  return rows;
}

export async function getGenerationVideosByGenerationUuid(
  generation_uuid: string
): Promise<(typeof generationVideos.$inferSelect)[]> {
  const rows = await db()
    .select()
    .from(generationVideos)
    .where(eq(generationVideos.generation_uuid, generation_uuid));
  return rows;
}

// 根据视频UUID查询单个视频记录
export async function findGenerationVideoByUuid(
  uuid: string
): Promise<typeof generationVideos.$inferSelect | undefined> {
  const [row] = await db()
    .select()
    .from(generationVideos)
    .where(eq(generationVideos.uuid, uuid))
    .limit(1);
  return row;
}

// 更新视频记录
export async function updateGenerationVideo(
  uuid: string,
  data: Partial<typeof generationVideos.$inferInsert>
): Promise<void> {
  await db()
    .update(generationVideos)
    .set(data)
    .where(eq(generationVideos.uuid, uuid));
}

// 批量查询视频 - 根据多个generation_uuid查询
export async function getVideosByGenerationUuids(
  generationUuids: string[]
): Promise<(typeof generationVideos.$inferSelect)[]> {
  if (generationUuids.length === 0) {
    return [];
  }

  const videos = await db()
    .select()
    .from(generationVideos)
    .where(inArray(generationVideos.generation_uuid, generationUuids))
    .orderBy(desc(generationVideos.created_at));

  return videos;
}

// 删除视频记录
export async function deleteGenerationVideo(uuid: string): Promise<void> {
  await db().delete(generationVideos).where(eq(generationVideos.uuid, uuid));
}

