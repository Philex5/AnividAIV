import { characterGenerations } from "@/db/schema";
import { db } from "@/db";
import { desc, eq, and, gte, lte } from "drizzle-orm";

export type CharacterGeneration = typeof characterGenerations.$inferSelect;
export type CharacterGenerationInsert = typeof characterGenerations.$inferInsert;

// 插入单条角色生成记录
export async function insertCharacterGeneration(
  data: CharacterGenerationInsert
): Promise<CharacterGeneration> {
  const [characterGeneration] = await db()
    .insert(characterGenerations)
    .values(data)
    .returning();
  return characterGeneration;
}

// 批量插入角色生成记录（支持多OC场景）
export async function insertCharacterGenerations(
  dataArray: CharacterGenerationInsert[]
): Promise<CharacterGeneration[]> {
  if (dataArray.length === 0) {
    return [];
  }
  
  const result = await db()
    .insert(characterGenerations)
    .values(dataArray)
    .returning();
  return result;
}

// 查询角色生成历史（支持筛选和分页）
export async function findCharacterGenerationsByCharacterUuid(
  characterUuid: string,
  filters: {
    generation_type?: string;
    visibility_level?: string;
    start_date?: Date;
    end_date?: Date;
    page?: number;
    limit?: number;
  } = {}
): Promise<CharacterGeneration[]> {
  const {
    generation_type,
    visibility_level,
    start_date,
    end_date,
    page = 1,
    limit = 20
  } = filters;

  const offset = (page - 1) * limit;
  
  // 构建查询条件
  const conditions = [eq(characterGenerations.character_uuid, characterUuid)];
  
  if (visibility_level) {
    conditions.push(eq(characterGenerations.visibility_level, visibility_level));
  }
  
  if (generation_type) {
    conditions.push(eq(characterGenerations.generation_type, generation_type));
  }
  
  if (start_date) {
    conditions.push(gte(characterGenerations.created_at, start_date));
  }
  
  if (end_date) {
    conditions.push(lte(characterGenerations.created_at, end_date));
  }

  const result = await db()
    .select()
    .from(characterGenerations)
    .where(and(...conditions))
    .orderBy(desc(characterGenerations.created_at))
    .limit(limit)
    .offset(offset);

  return result;
}

// 获取角色生成记录总数（支持筛选）
export async function getCharacterGenerationsCount(
  characterUuid: string,
  filters: {
    generation_type?: string;
    visibility_level?: string;
    start_date?: Date;
    end_date?: Date;
  } = {}
): Promise<number> {
  const {
    generation_type,
    visibility_level,
    start_date,
    end_date
  } = filters;

  // 构建查询条件
  const conditions = [eq(characterGenerations.character_uuid, characterUuid)];
  
  if (visibility_level) {
    conditions.push(eq(characterGenerations.visibility_level, visibility_level));
  }
  
  if (generation_type) {
    conditions.push(eq(characterGenerations.generation_type, generation_type));
  }
  
  if (start_date) {
    conditions.push(gte(characterGenerations.created_at, start_date));
  }
  
  if (end_date) {
    conditions.push(lte(characterGenerations.created_at, end_date));
  }

  const count = await db()
    .$count(characterGenerations, and(...conditions));

  return count;
}

// 根据生成UUID查询角色生成记录
export async function findCharacterGenerationsByGenerationUuid(
  generationUuid: string
): Promise<CharacterGeneration[]> {
  const result = await db()
    .select()
    .from(characterGenerations)
    .where(eq(characterGenerations.generation_uuid, generationUuid))
    .orderBy(desc(characterGenerations.created_at));

  return result;
}

// 根据角色UUID和生成UUID查询特定记录
export async function findCharacterGenerationByCharacterAndGeneration(
  characterUuid: string,
  generationUuid: string
): Promise<CharacterGeneration | undefined> {
  const [result] = await db()
    .select()
    .from(characterGenerations)
    .where(
      and(
        eq(characterGenerations.character_uuid, characterUuid),
        eq(characterGenerations.generation_uuid, generationUuid)
      )
    )
    .limit(1);

  return result;
}