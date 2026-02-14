/**
 * R2 文件迁移脚本
 *
 * 功能：将开发环境 R2 桶中的 generations 数据迁移到生产环境
 *
 * 使用方法：
 * tsx scripts/migrate-r2-generations.ts
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { generations, generationImages, generationVideos } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { Storage } from '@/lib/storage';

// 开发环境配置
const DEV_CONFIG = {
  DATABASE_URL: 'postgresql://postgres.myaaqpvunacvjvbaklmr:qa282Udwe4x.Uzj@aws-1-us-east-2.pooler.supabase.com:6543/postgres',
  STORAGE_ENDPOINT: 'https://37cc7953cbc0d25d9bca7f7c0b307108.r2.cloudflarestorage.com',
  STORAGE_ACCESS_KEY: 'a964b14eba490e07019a769389990101',
  STORAGE_SECRET_KEY: '2d327b35d1c655291f6088569eb758582d8cb8123c7d93ed46808c6f6e3962a8',
  STORAGE_BUCKET: 'aiiconsetdev',
  STORAGE_DOMAIN: 'https://test-icons.sparkiconai.com',
};

// 生产环境配置
const PROD_CONFIG = {
  DATABASE_URL: 'postgresql://postgres.finbdtigxoldlslyteki:qa282Udwe4x.Uzj@aws-1-us-east-2.pooler.supabase.com:6543/postgres',
  STORAGE_ENDPOINT: 'https://37cc7953cbc0d25d9bca7f7c0b307108.r2.cloudflarestorage.com',
  STORAGE_ACCESS_KEY: '2ed367b3f7ff2b19156230c867c59909',
  STORAGE_SECRET_KEY: '6f2c33f2d4dc0b834af3afa18dd6749ff658000c70124d0a329d8648da5f14a5',
  STORAGE_BUCKET: 'anividai-prod',
  STORAGE_DOMAIN: 'https://artworks.anividai.com',
};

class R2MigrationService {
  private devStorage: Storage;
  private prodStorage: Storage;
  private devDb: ReturnType<typeof drizzle>;
  private prodDb: ReturnType<typeof drizzle>;

  constructor() {
    // 初始化开发环境 Storage
    this.devStorage = new Storage({
      endpoint: DEV_CONFIG.STORAGE_ENDPOINT,
      region: 'auto',
      accessKey: DEV_CONFIG.STORAGE_ACCESS_KEY,
      secretKey: DEV_CONFIG.STORAGE_SECRET_KEY,
    });

    // 初始化生产环境 Storage
    this.prodStorage = new Storage({
      endpoint: PROD_CONFIG.STORAGE_ENDPOINT,
      region: 'auto',
      accessKey: PROD_CONFIG.STORAGE_ACCESS_KEY,
      secretKey: PROD_CONFIG.STORAGE_SECRET_KEY,
    });

    // 初始化数据库连接
    const devClient = postgres(DEV_CONFIG.DATABASE_URL);
    this.devDb = drizzle(devClient);

    const prodClient = postgres(PROD_CONFIG.DATABASE_URL);
    this.prodDb = drizzle(prodClient);
  }

  /**
   * 从开发环境下载文件并上传到生产环境
   */
  async migrateFile(url: string, generationUuid: string, filename: string): Promise<string> {
    try {
      console.log(`  下载文件: ${url}`);

      // 从开发环境 URL 下载文件
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download (${response.status}): ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const body = new Uint8Array(arrayBuffer);

      // 构建生产环境的key：保持路径完全一致 generations/{uuid}/filename
      const key = `generations/${generationUuid}/${filename}`;

      console.log(`  上传到生产环境: ${key} (${body.length} bytes)`);

      // 上传到生产环境
      try {
        const result = await this.prodStorage.uploadFile({
          body,
          key,
          contentType: this.getContentType(filename),
          bucket: PROD_CONFIG.STORAGE_BUCKET,
          disposition: 'inline',
        });

        console.log(`  ✓ 完成: ${result.url}`);
        return result.url;
      } catch (uploadError) {
        console.error(`  ✗ 上传失败:`, uploadError);
        throw uploadError;
      }
    } catch (error) {
      console.error(`  ✗ 失败: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 根据文件名获取Content-Type
   */
  private getContentType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const contentTypes: Record<string, string> = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'webp': 'image/webp',
      'gif': 'image/gif',
      'mp4': 'video/mp4',
      'webm': 'video/webm',
    };
    return contentTypes[ext || ''] || 'application/octet-stream';
  }

  /**
   * 提取URL中的文件名部分
   */
  private extractFilename(url: string): string {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    return pathParts[pathParts.length - 1];
  }

  /**
   * 提取 generation UUID 和文件名
   */
  private parseUrl(url: string): { generationUuid: string; filename: string } | null {
    try {
      // URL 格式: https://test-icons.sparkiconai.com/generations/{uuid}/filename.ext
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(p => p);

      if (pathParts.length >= 3 && pathParts[0] === 'generations') {
        return {
          generationUuid: pathParts[1],
          filename: pathParts.slice(2).join('/'),
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * 替换 URL 中的域名（保持路径完全一致）
   */
  private replaceUrlDomain(url: string, generationUuid: string, filename: string): string {
    // 新的 URL 格式: https://artworks.anividai.com/generations/{uuid}/filename.ext
    return `${PROD_CONFIG.STORAGE_DOMAIN}/generations/${generationUuid}/${filename}`;
  }

  /**
   * 迁移图片
   */
  async migrateImages(generationUuid: string): Promise<{ migrated: number; skipped: number; failed: number }> {
    console.log(`\n迁移图片 - generation: ${generationUuid}`);

    let migrated = 0;
    let skipped = 0;
    let failed = 0;

    // 从生产数据库获取需要迁移的图片记录
    const images = await this.prodDb
      .select()
      .from(generationImages)
      .where(eq(generationImages.generation_uuid, generationUuid));

    console.log(`  找到 ${images.length} 张图片`);

    for (const image of images) {
      const updates: Partial<typeof generationImages.$inferInsert> = {};
      let hasUpdates = false;

      // 处理主图片 URL
      if (image.image_url) {
        if (image.image_url.includes(DEV_CONFIG.STORAGE_DOMAIN)) {
          console.log(`  处理主图片: ${image.uuid}`);
          const parsed = this.parseUrl(image.image_url);
          if (parsed) {
            try {
              await this.migrateFile(image.image_url, parsed.generationUuid, parsed.filename);
              updates.image_url = this.replaceUrlDomain(image.image_url, parsed.generationUuid, parsed.filename);
              hasUpdates = true;
              migrated++;
            } catch (error) {
              console.error(`  主图片迁移失败: ${error instanceof Error ? error.message : String(error)}`);
              failed++;
            }
          } else {
            console.log(`  ⚠ 无法解析 URL: ${image.image_url}`);
            failed++;
          }
        } else if (!image.image_url.includes(PROD_CONFIG.STORAGE_DOMAIN)) {
          console.log(`  ⚠ 跳过非开发环境 URL: ${image.image_url}`);
          skipped++;
        } else {
          skipped++;
        }
      }

      // 处理缩略图 - mobile
      if (image.thumbnail_mobile && image.thumbnail_mobile.includes(DEV_CONFIG.STORAGE_DOMAIN)) {
        console.log(`  处理移动端缩略图`);
        const parsed = this.parseUrl(image.thumbnail_mobile);
        if (parsed) {
          try {
            await this.migrateFile(image.thumbnail_mobile, parsed.generationUuid, parsed.filename);
            updates.thumbnail_mobile = this.replaceUrlDomain(image.thumbnail_mobile, parsed.generationUuid, parsed.filename);
            hasUpdates = true;
            migrated++;
          } catch (error) {
            console.error(`  移动端缩略图迁移失败: ${error instanceof Error ? error.message : String(error)}`);
            failed++;
          }
        }
      } else if (image.thumbnail_mobile?.includes(PROD_CONFIG.STORAGE_DOMAIN)) {
        skipped++;
      }

      // 处理缩略图 - desktop
      if (image.thumbnail_desktop && image.thumbnail_desktop.includes(DEV_CONFIG.STORAGE_DOMAIN)) {
        console.log(`  处理桌面端缩略图`);
        const parsed = this.parseUrl(image.thumbnail_desktop);
        if (parsed) {
          try {
            await this.migrateFile(image.thumbnail_desktop, parsed.generationUuid, parsed.filename);
            updates.thumbnail_desktop = this.replaceUrlDomain(image.thumbnail_desktop, parsed.generationUuid, parsed.filename);
            hasUpdates = true;
            migrated++;
          } catch (error) {
            console.error(`  桌面端缩略图迁移失败: ${error instanceof Error ? error.message : String(error)}`);
            failed++;
          }
        }
      } else if (image.thumbnail_desktop?.includes(PROD_CONFIG.STORAGE_DOMAIN)) {
        skipped++;
      }

      // 处理缩略图 - detail
      if (image.thumbnail_detail && image.thumbnail_detail.includes(DEV_CONFIG.STORAGE_DOMAIN)) {
        console.log(`  处理详情页缩略图`);
        const parsed = this.parseUrl(image.thumbnail_detail);
        if (parsed) {
          try {
            await this.migrateFile(image.thumbnail_detail, parsed.generationUuid, parsed.filename);
            updates.thumbnail_detail = this.replaceUrlDomain(image.thumbnail_detail, parsed.generationUuid, parsed.filename);
            hasUpdates = true;
            migrated++;
          } catch (error) {
            console.error(`  详情页缩略图迁移失败: ${error instanceof Error ? error.message : String(error)}`);
            failed++;
          }
        }
      } else if (image.thumbnail_detail?.includes(PROD_CONFIG.STORAGE_DOMAIN)) {
        skipped++;
      }

      // 更新数据库
      if (hasUpdates) {
        await this.prodDb
          .update(generationImages)
          .set(updates)
          .where(eq(generationImages.id, image.id));
        console.log(`  ✓ 数据库已更新`);
      }
    }

    return { migrated, skipped, failed };
  }

  /**
   * 迁移视频
   */
  async migrateVideos(generationUuid: string): Promise<{ migrated: number; skipped: number; failed: number }> {
    console.log(`\n迁移视频 - generation: ${generationUuid}`);

    let migrated = 0;
    let skipped = 0;
    let failed = 0;

    // 从生产数据库获取需要迁移的视频记录
    const videos = await this.prodDb
      .select()
      .from(generationVideos)
      .where(eq(generationVideos.generation_uuid, generationUuid));

    console.log(`  找到 ${videos.length} 个视频`);

    for (const video of videos) {
      const updates: Partial<typeof generationVideos.$inferInsert> = {};
      let hasUpdates = false;

      // 处理视频 URL
      if (video.video_url && video.video_url.includes(DEV_CONFIG.STORAGE_DOMAIN)) {
        console.log(`  处理视频: ${video.uuid}`);
        const parsed = this.parseUrl(video.video_url);
        if (parsed) {
          try {
            await this.migrateFile(video.video_url, parsed.generationUuid, parsed.filename);
            updates.video_url = this.replaceUrlDomain(video.video_url, parsed.generationUuid, parsed.filename);
            hasUpdates = true;
            migrated++;
          } catch (error) {
            console.error(`  视频迁移失败: ${error instanceof Error ? error.message : String(error)}`);
            failed++;
          }
        }
      } else if (video.video_url?.includes(PROD_CONFIG.STORAGE_DOMAIN)) {
        skipped++;
      }

      // 处理海报图 URL
      if (video.poster_url && video.poster_url.includes(DEV_CONFIG.STORAGE_DOMAIN)) {
        console.log(`  处理海报图`);
        const parsed = this.parseUrl(video.poster_url);
        if (parsed) {
          try {
            await this.migrateFile(video.poster_url, parsed.generationUuid, parsed.filename);
            updates.poster_url = this.replaceUrlDomain(video.poster_url, parsed.generationUuid, parsed.filename);
            hasUpdates = true;
            migrated++;
          } catch (error) {
            console.error(`  海报图迁移失败: ${error instanceof Error ? error.message : String(error)}`);
            failed++;
          }
        }
      } else if (video.poster_url?.includes(PROD_CONFIG.STORAGE_DOMAIN)) {
        skipped++;
      }

      // 处理参考图 URL (可能是数组)
      if (video.reference_image_url && video.reference_image_url.includes(DEV_CONFIG.STORAGE_DOMAIN)) {
        console.log(`  处理参考图`);
        const refUrls = video.reference_image_url.split(',').map(url => url.trim());
        const newRefUrls: string[] = [];
        let refMigrated = 0;
        let refFailed = 0;

        for (const refUrl of refUrls) {
          if (refUrl.includes(DEV_CONFIG.STORAGE_DOMAIN)) {
            const parsed = this.parseUrl(refUrl);
            if (parsed) {
              try {
                await this.migrateFile(refUrl, parsed.generationUuid, parsed.filename);
                newRefUrls.push(this.replaceUrlDomain(refUrl, parsed.generationUuid, parsed.filename));
                refMigrated++;
              } catch (error) {
                console.error(`  参考图迁移失败: ${error instanceof Error ? error.message : String(error)}`);
                newRefUrls.push(refUrl); // 保留原URL
                refFailed++;
              }
            } else {
              newRefUrls.push(refUrl);
            }
          } else {
            newRefUrls.push(refUrl);
          }
        }

        if (newRefUrls.length > 0) {
          updates.reference_image_url = newRefUrls.join(',');
          hasUpdates = true;
        }

        migrated += refMigrated;
        failed += refFailed;
      } else if (video.reference_image_url?.includes(PROD_CONFIG.STORAGE_DOMAIN)) {
        const refCount = video.reference_image_url.split(',').length;
        skipped += refCount;
      }

      // 更新数据库
      if (hasUpdates) {
        await this.prodDb
          .update(generationVideos)
          .set(updates)
          .where(eq(generationVideos.id, video.id));
        console.log(`  ✓ 数据库已更新`);
      }
    }

    return { migrated, skipped, failed };
  }

  /**
   * 执行完整迁移
   */
  async migrate() {
    console.log('==========================================');
    console.log('R2 文件迁移 - 开发环境 → 生产环境');
    console.log('==========================================');
    console.log(`开发环境: ${DEV_CONFIG.STORAGE_DOMAIN}`);
    console.log(`生产环境: ${PROD_CONFIG.STORAGE_DOMAIN}`);
    console.log(`生产 Bucket: ${PROD_CONFIG.STORAGE_BUCKET}`);
    console.log('==========================================\n');

    try {
      // 从开发数据库获取所有 generation 记录
      const allGenerations = await this.devDb
        .select()
        .from(generations);

      console.log(`找到 ${allGenerations.length} 条 generation 记录\n`);

      let successCount = 0;
      let errorCount = 0;
      let skippedCount = 0;
      let migratedFilesCount = 0;
      let skippedFilesCount = 0;
      let failedFilesCount = 0;

      for (let i = 0; i < allGenerations.length; i++) {
        const gen = allGenerations[i];
        console.log(`\n[${i + 1}/${allGenerations.length}] 处理 generation: ${gen.uuid}`);
        console.log(`  类型: ${gen.type}, 状态: ${gen.status}`);

        try {
          let genMigratedFiles = 0;
          let genSkippedFiles = 0;
          let genFailedFiles = 0;

          // 迁移图片
          const imageStats = await this.migrateImages(gen.uuid);
          genMigratedFiles += imageStats.migrated;
          genSkippedFiles += imageStats.skipped;
          genFailedFiles += imageStats.failed;

          // 迁移视频
          const videoStats = await this.migrateVideos(gen.uuid);
          genMigratedFiles += videoStats.migrated;
          genSkippedFiles += videoStats.skipped;
          genFailedFiles += videoStats.failed;

          migratedFilesCount += genMigratedFiles;
          skippedFilesCount += genSkippedFiles;
          failedFilesCount += genFailedFiles;

          if (genFailedFiles > 0) {
            errorCount++;
            console.log(`⚠ Generation ${gen.uuid} 部分失败 (成功:${genMigratedFiles}, 跳过:${genSkippedFiles}, 失败:${genFailedFiles})`);
          } else if (genMigratedFiles > 0) {
            successCount++;
            console.log(`✓ Generation ${gen.uuid} 迁移完成 (成功:${genMigratedFiles}, 跳过:${genSkippedFiles})`);
          } else {
            skippedCount++;
            console.log(`○ Generation ${gen.uuid} 跳过 (已全部迁移或无文件)`);
          }
        } catch (error) {
          errorCount++;
          console.error(`✗ Generation ${gen.uuid} 迁移失败:`, error instanceof Error ? error.message : String(error));
        }
      }

      console.log('\n==========================================');
      console.log('迁移完成');
      console.log('==========================================');
      console.log(`总 Generation 数: ${allGenerations.length} 条`);
      console.log(`  - 成功迁移: ${successCount} 条`);
      console.log(`  - 部分失败: ${errorCount} 条`);
      console.log(`  - 已跳过: ${skippedCount} 条`);
      console.log(`\n总文件数统计:`);
      console.log(`  - 成功迁移: ${migratedFilesCount} 个文件`);
      console.log(`  - 已跳过(已存在): ${skippedFilesCount} 个文件`);
      console.log(`  - 迁移失败: ${failedFilesCount} 个文件`);
      console.log('==========================================\n');

    } catch (error) {
      console.error('迁移过程发生错误:', error);
      throw error;
    }
  }
}

// 执行迁移
async function main() {
  const migrationService = new R2MigrationService();
  await migrationService.migrate();
  process.exit(0);
}

main().catch((error) => {
  console.error('脚本执行失败:', error);
  process.exit(1);
});
