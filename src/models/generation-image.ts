import { generationImages, generations } from "@/db/schema";
import { db } from "@/db";
import { desc, eq, and, inArray } from "drizzle-orm";

// 创建生成图片记录
export async function insertGenerationImage(
  data: typeof generationImages.$inferInsert
): Promise<typeof generationImages.$inferSelect | undefined> {
  const [image] = await db().insert(generationImages).values(data).returning();
  return image;
}

// 批量插入生成图片记录
export async function insertGenerationImages(
  data: (typeof generationImages.$inferInsert)[]
): Promise<(typeof generationImages.$inferSelect)[]> {
  const images = await db().insert(generationImages).values(data).returning();
  return images;
}

// 根据UUID获取生成图片
export async function findGenerationImageByUuid(
  uuid: string
): Promise<typeof generationImages.$inferSelect | undefined> {
  const [image] = await db()
    .select()
    .from(generationImages)
    .where(eq(generationImages.uuid, uuid))
    .limit(1);

  return image;
}

export async function findGenerationImagesByUuids(
  uuids: string[]
): Promise<(typeof generationImages.$inferSelect)[]> {
  if (!uuids.length) {
    return [];
  }
  const images = await db()
    .select()
    .from(generationImages)
    .where(inArray(generationImages.uuid, uuids));

  return images;
}

// 根据生成记录UUID获取所有图片
export async function getGenerationImagesByGenerationUuid(
  generation_uuid: string
): Promise<(typeof generationImages.$inferSelect)[]> {
  const images = await db()
    .select()
    .from(generationImages)
    .where(eq(generationImages.generation_uuid, generation_uuid))
    .orderBy(generationImages.created_at);

  return images;
}

// 更新生成图片信息
export async function updateGenerationImage(
  uuid: string,
  data: Partial<typeof generationImages.$inferInsert>
): Promise<typeof generationImages.$inferSelect | undefined> {
  const [image] = await db()
    .update(generationImages)
    .set(data)
    .where(eq(generationImages.uuid, uuid))
    .returning();

  return image;
}

// 删除生成图片记录
export async function deleteGenerationImage(uuid: string): Promise<void> {
  await db().delete(generationImages).where(eq(generationImages.uuid, uuid));
}

// 根据生成记录UUID删除所有相关图片
export async function deleteGenerationImagesByGenerationUuid(
  generation_uuid: string
): Promise<void> {
  await db()
    .delete(generationImages)
    .where(eq(generationImages.generation_uuid, generation_uuid));
}

// 批量查询图片 - 根据多个generation_uuid查询
export async function getImagesByGenerationUuids(
  generationUuids: string[]
): Promise<(typeof generationImages.$inferSelect)[]> {
  if (generationUuids.length === 0) {
    return [];
  }
  
  const images = await db()
    .select()
    .from(generationImages)
    .where(inArray(generationImages.generation_uuid, generationUuids))
    .orderBy(desc(generationImages.created_at));

  return images;
}
