/**
 * 批量补充角色头像脚本
 *
 * 功能：处理以下情况的角色头像：
 * 1. avatar_generation_image_uuid 为 NULL
 * 2. avatar_generation_image_uuid 与 profile_generation_image_uuid 一致
 *
 * 处理流程：
 * 1. 从 profile_generation_image_uuid 获取立绘图片
 * 2. 下载并裁剪图片（顶部 1/3 正方形）
 * 3. 上传到 R2 存储
 * 4. 创建 generation 和 generation_image 记录
 * 5. 更新 character 的 avatar_generation_image_uuid
 *
 * 使用方法：
 * pnpm backfill:avatars
 * pnpm tsx scripts/backfill-character-avatars.ts
 *
 * 环境变量：确保 .env.development 文件中配置了数据库和 R2 相关环境变量
 */

import { config } from "dotenv";
import { eq, or, and, isNull, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import * as schema from "../src/db/schema";
import { getStandaloneDb } from "./db-standalone";
import { ImageProcessor } from "@/services/generation/image-processor";
import { Storage } from "@/lib/storage";

// Load environment variables BEFORE importing any config modules
config({ path: ".env", override: true });
config({ path: ".env.development", override: true });
config({ path: ".env.local", override: true });

// Get database instance with env loaded
const db = getStandaloneDb();
const { characters, generationImages, generations } = schema;

/**
 * 查询 generation_image by UUID
 */
async function findGenerationImageByUuid(uuid: string) {
  const [image] = await db
    .select()
    .from(generationImages)
    .where(eq(generationImages.uuid, uuid))
    .limit(1);
  return image;
}

/**
 * 更新 character
 */
async function updateCharacterModel(uuid: string, data: { avatar_generation_image_uuid: string }) {
  const [character] = await db
    .update(characters)
    .set({ ...data, updated_at: new Date() })
    .where(eq(characters.uuid, uuid))
    .returning();
  return character;
}

// 处理结果统计
interface ProcessResult {
  total: number;
  success: number;
  skipped: number;
  failed: number;
  errors: Array<{
    characterUuid: string;
    characterName: string;
    error: string;
  }>;
}

/**
 * 查询需要处理的角色
 * 条件：
 * 1. avatar_generation_image_uuid 为 NULL
 * 2. avatar_generation_image_uuid 等于 profile_generation_image_uuid
 * 3. profile_generation_image_uuid 不为 NULL（有立绘才能生成头像）
 */
async function findCharactersNeedingAvatar() {
  console.log("🔍 查询需要处理头像的角色...");

  const results = await db
    .select({
      uuid: characters.uuid,
      user_uuid: characters.user_uuid,
      name: characters.name,
      avatar_generation_image_uuid: characters.avatar_generation_image_uuid,
      profile_generation_image_uuid: characters.profile_generation_image_uuid,
      profile_image_url: generationImages.image_url,
    })
    .from(characters)
    .innerJoin(
      generationImages,
      eq(generationImages.uuid, characters.profile_generation_image_uuid)
    )
    .where(
      and(
        // 必须有立绘图片
        sql`${characters.profile_generation_image_uuid} IS NOT NULL`,
        // 头像为空 OR 头像与立绘相同
        or(
          isNull(characters.avatar_generation_image_uuid),
          sql`${characters.avatar_generation_image_uuid} = ${characters.profile_generation_image_uuid}`
        )
      )
    );

  console.log(`📊 找到 ${results.length} 个需要处理的角色`);
  return results;
}

/**
 * 处理单个角色的头像
 */
async function processCharacterAvatar(
  characterUuid: string,
  userUuid: string,
  characterName: string,
  profileImageUuid: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`\n🎨 处理角色: ${characterName} (${characterUuid})`);

    // 1. 获取立绘图片信息
    const profileImage = await findGenerationImageByUuid(profileImageUuid);
    if (!profileImage || !profileImage.image_url) {
      throw new Error("Profile image not found or missing URL");
    }

    console.log(`  📷 立绘图片 URL: ${profileImage.image_url}`);

    // 2. 下载图片
    console.log(`  ⬇️  下载图片...`);
    const imageProcessor = new ImageProcessor();
    const profileBuffer = await imageProcessor.downloadImage(profileImage.image_url);

    // 3. 裁剪为头像（顶部 1/3 正方形，512x512）
    console.log(`  ✂️  裁剪图片...`);
    const avatarBuffer = await imageProcessor.cropTopThirdSquare(profileBuffer, 512);

    // 4. 上传到 R2
    console.log(`  ☁️  上传到 R2...`);
    const storage = new Storage();
    const timestamp = Date.now();
    const uniqueId = uuidv4().substring(0, 8);
    const fileName = `${timestamp}-${uniqueId}.jpg`;
    const year = new Date().getUTCFullYear().toString();
    const month = String(new Date().getUTCMonth() + 1).padStart(2, "0");
    const storageKey = `uploads/${userUuid}/oc-avatar/${year}/${month}/${fileName}`;

    const uploadResult = await storage.uploadFile({
      body: avatarBuffer,
      key: storageKey,
      contentType: "image/jpeg",
      disposition: "inline",
    });

    console.log(`  ✅ 上传成功: ${uploadResult.url}`);

    // 5. 创建 generation 记录
    console.log(`  📝 创建 generation 记录...`);
    const generationUuid = uuidv4();
    const avatarImageUuid = uuidv4();

    await db.insert(generations).values({
      uuid: generationUuid,
      user_uuid: userUuid,
      type: "user_upload",
      sub_type: "oc-avatar",
      prompt: `Auto-crop from portrait ${profileImageUuid}`,
      model_id: "manual",
      status: "completed",
      counts: 1,
      success_count: 1,
      visibility_level: "private",
      character_uuids: characterUuid,
      created_at: new Date(),
    });

    // 6. 创建 generation_image 记录
    console.log(`  🖼️  创建 generation_image 记录...`);
    await db.insert(generationImages).values({
      uuid: avatarImageUuid,
      generation_uuid: generationUuid,
      user_uuid: userUuid,
      image_url: uploadResult.url,
      image_index: 0,
      gen_type: "user_upload",
      visibility_level: "private",
      status: "archived",
      created_at: new Date(),
    });

    // 7. 更新 character 的 avatar_generation_image_uuid
    console.log(`  💾 更新角色头像 UUID...`);
    await updateCharacterModel(characterUuid, {
      avatar_generation_image_uuid: avatarImageUuid,
    });

    console.log(`  ✅ 角色头像处理完成: ${avatarImageUuid}`);
    return { success: true };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`  ❌ 处理失败: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
}

/**
 * 主处理函数
 */
async function main() {
  console.log("========================================");
  console.log("🚀 开始批量补充角色头像");
  console.log("========================================");

  const startTime = Date.now();
  const result: ProcessResult = {
    total: 0,
    success: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  try {
    // 1. 查询需要处理的角色
    const charactersToProcess = await findCharactersNeedingAvatar();
    result.total = charactersToProcess.length;

    if (charactersToProcess.length === 0) {
      console.log("\n✅ 没有需要处理的角色");
      return;
    }

    // 2. 逐个处理角色
    for (const character of charactersToProcess) {
      const processResult = await processCharacterAvatar(
        character.uuid,
        character.user_uuid,
        character.name,
        character.profile_generation_image_uuid!
      );

      if (processResult.success) {
        result.success++;
      } else {
        result.failed++;
        result.errors.push({
          characterUuid: character.uuid,
          characterName: character.name,
          error: processResult.error || "Unknown error",
        });
      }

      // 添加延迟避免过载
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

  } catch (error) {
    console.error("\n❌ 脚本执行失败:", error);
  }

  // 3. 输出统计结果
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log("\n========================================");
  console.log("📊 处理结果统计");
  console.log("========================================");
  console.log(`总计: ${result.total} 个角色`);
  console.log(`✅ 成功: ${result.success} 个`);
  console.log(`⏭️  跳过: ${result.skipped} 个`);
  console.log(`❌ 失败: ${result.failed} 个`);
  console.log(`⏱️  耗时: ${elapsed} 秒`);

  if (result.errors.length > 0) {
    console.log("\n❌ 失败详情:");
    result.errors.forEach((err, index) => {
      console.log(`  ${index + 1}. ${err.characterName} (${err.characterUuid})`);
      console.log(`     错误: ${err.error}`);
    });
  }

  console.log("========================================");
}

// 执行主函数
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
