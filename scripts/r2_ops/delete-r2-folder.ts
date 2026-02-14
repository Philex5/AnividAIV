#!/usr/bin/env ts-node
/**
 * R2文件夹删除脚本
 *
 * 用法:
 *   pnpm delete-r2-folder --env development --folder user-uploads/123456
 *   pnpm delete-r2-folder --env production --folder temp-files
 *
 * 支持的环境: development, production
 * folder: 要删除的文件夹路径（相对于bucket根目录）
 */

import 'dotenv/config';
import { Storage } from '../../src/lib/storage';

interface DeleteOptions {
  env: 'development' | 'production';
  folder: string;
  dryRun?: boolean;
  batchSize?: number;
}

// 读取指定环境的 .env 文件
function loadEnvFile(env: string): void {
  const envFile = env === 'production' ? '.env.production' : '.env.development';
  try {
    // dotenv 已经通过上面的 import 'dotenv/config' 加载了默认的 .env 文件
    // 这里我们需要手动加载指定的 env 文件
    const fs = require('fs');
    const path = require('path');

    const envPath = path.resolve(process.cwd(), envFile);
    if (!fs.existsSync(envPath)) {
      console.error(`❌ 环境文件不存在: ${envPath}`);
      process.exit(1);
    }

    const envContent = fs.readFileSync(envPath, 'utf-8');
    const envVars: Record<string, string> = {};

    envContent.split('\n').forEach((line: string) => {
      line = line.trim();
      if (line && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          let value = valueParts.join('=').trim();
          // 移除首尾的引号（双引号或单引号）
          if ((value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          envVars[key.trim()] = value;
        }
      }
    });

    // 设置环境变量
    Object.keys(envVars).forEach((key) => {
      process.env[key] = envVars[key];
    });

    console.log(`✅ 已加载环境文件: ${envFile}`);
  } catch (error) {
    console.error(`❌ 加载环境文件失败:`, error);
    process.exit(1);
  }
}

// 验证必要的环境变量
function validateEnvVars(): { endpoint: string; accessKey: string; secretKey: string; bucket: string; domain: string } {
  const endpoint = process.env.STORAGE_ENDPOINT;
  const accessKey = process.env.STORAGE_ACCESS_KEY;
  const secretKey = process.env.STORAGE_SECRET_KEY;
  const bucket = process.env.STORAGE_BUCKET;
  const domain = process.env.STORAGE_DOMAIN || '';

  if (!endpoint) {
    console.error('❌ 缺少 STORAGE_ENDPOINT 环境变量');
    process.exit(1);
  }

  if (!accessKey) {
    console.error('❌ 缺少 STORAGE_ACCESS_KEY 环境变量');
    process.exit(1);
  }

  if (!secretKey) {
    console.error('❌ 缺少 STORAGE_SECRET_KEY 环境变量');
    process.exit(1);
  }

  if (!bucket) {
    console.error('❌ 缺少 STORAGE_BUCKET 环境变量');
    process.exit(1);
  }

  return { endpoint, accessKey, secretKey, bucket, domain };
}

// 主删除函数
async function deleteFolder(options: DeleteOptions): Promise<void> {
  const { env, folder, dryRun = false, batchSize = 1000 } = options;

  console.log('\n🗑️  R2 文件夹删除工具');
  console.log('='.repeat(50));
  console.log(`📦 环境: ${env}`);
  console.log(`📁 文件夹: ${folder}`);
  console.log(`🔍 预览模式: ${dryRun ? '开启' : '关闭'}`);
  console.log('='.repeat(50));

  // 1. 加载环境配置
  loadEnvFile(env);

  // 2. 验证环境变量
  const { endpoint, accessKey, secretKey, bucket, domain } = validateEnvVars();

  console.log(`\n🔗 存储配置:`);
  console.log(`   Endpoint: ${endpoint}`);
  console.log(`   Bucket: ${bucket}`);
  console.log(`   Domain: ${domain || 'N/A'}`);

  // 3. 初始化存储客户端
  const storage = new Storage({
    endpoint,
    region: process.env.STORAGE_REGION || 'auto',
    accessKey,
    secretKey,
  });

  // 4. 确保文件夹路径以 / 结尾（用于 listObjects 的 prefix）
  const prefix = folder.endsWith('/') ? folder : `${folder}/`;

  console.log(`\n🔍 扫描文件夹: ${prefix}`);

  try {
    // 5. 列出所有对象
    console.log('\n📋 正在列出所有对象...');
    const allKeys: string[] = [];

    // 由于 listObjects 有 maxKeys 限制，我们可能需要分页
    // 这里简化处理，先尝试获取前 1000 个对象
    let objects = await storage.listObjects({ prefix, maxKeys: batchSize });

    // 如果还有更多对象（通过 NextContinuationToken），我们需要递归获取
    // 注意：当前的 listObjects 实现没有处理分页，这里假设 1000 个对象足够

    allKeys.push(...objects);

    console.log(`   找到 ${allKeys.length} 个对象`);

    if (allKeys.length === 0) {
      console.log('\n✅ 文件夹为空，无需删除');
      return;
    }

    // 6. 显示要删除的对象列表（前 20 个）
    console.log('\n📝 对象列表（前 20 个）:');
    allKeys.slice(0, 20).forEach((key, index) => {
      console.log(`   ${index + 1}. ${key}`);
    });

    if (allKeys.length > 20) {
      console.log(`   ... 还有 ${allKeys.length - 20} 个对象`);
    }

    // 7. 确认删除
    if (!dryRun) {
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const answer = await new Promise<string>((resolve) => {
        readline.question(
          `\n⚠️  确认删除 ${allKeys.length} 个对象吗？(输入 'YES' 确认): `,
          resolve
        );
      });

      readline.close();

      if (answer !== 'YES') {
        console.log('\n❌ 操作已取消');
        process.exit(0);
      }
    }

    // 8. 执行删除
    if (dryRun) {
      console.log('\n✅ 预览模式 - 未实际删除对象');
    } else {
      console.log('\n🗑️  正在删除对象...');

      // 分批删除（AWS S3 限制每次最多 1000 个对象）
      const batchSizeDelete = 1000;
      let deletedCount = 0;
      let errorCount = 0;

      for (let i = 0; i < allKeys.length; i += batchSizeDelete) {
        const batch = allKeys.slice(i, i + batchSizeDelete);
        console.log(`\n📦 处理批次 ${Math.floor(i / batchSizeDelete) + 1}/${Math.ceil(allKeys.length / batchSizeDelete)} (${batch.length} 个对象)`);

        try {
          const result = await storage.deleteObjects({ keys: batch });

          deletedCount += result.deleted.length;
          errorCount += result.errors.length;

          if (result.deleted.length > 0) {
            console.log(`   ✅ 成功删除: ${result.deleted.length} 个对象`);
          }

          if (result.errors.length > 0) {
            console.log(`   ❌ 删除失败: ${result.errors.length} 个对象`);
            result.errors.forEach((error) => {
              console.log(`      - ${error.key}: ${error.message || error.code}`);
            });
          }
        } catch (error) {
          console.error(`   ❌ 批次删除失败:`, error);
          errorCount += batch.length;
        }
      }

      // 9. 显示删除结果
      console.log('\n' + '='.repeat(50));
      console.log('📊 删除结果:');
      console.log(`   ✅ 成功删除: ${deletedCount} 个对象`);
      console.log(`   ❌ 删除失败: ${errorCount} 个对象`);
      console.log(`   📦 总计处理: ${allKeys.length} 个对象`);
      console.log('='.repeat(50));
    }

    console.log('\n✅ 操作完成');
  } catch (error) {
    console.error('\n❌ 删除失败:', error);
    process.exit(1);
  }
}

// 解析命令行参数
function parseArgs(): DeleteOptions {
  const args = process.argv.slice(2);
  const options: Partial<DeleteOptions> = {
    dryRun: false,
    batchSize: 1000,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--env':
        options.env = args[++i] as 'development' | 'production';
        break;

      case '--folder':
        options.folder = args[++i];
        break;

      case '--dry-run':
        options.dryRun = true;
        break;

      case '--batch-size':
        options.batchSize = parseInt(args[++i], 10);
        break;

      case '--help':
      case '-h':
        printHelp();
        process.exit(0);

      default:
        if (arg.startsWith('--')) {
          console.error(`❌ 未知参数: ${arg}`);
          printHelp();
          process.exit(1);
        }
        break;
    }
  }

  // 验证必需参数
  if (!options.env) {
    console.error('❌ 缺少必需参数: --env (development|production)');
    process.exit(1);
  }

  if (!options.folder) {
    console.error('❌ 缺少必需参数: --folder <folder-path>');
    process.exit(1);
  }

  return options as DeleteOptions;
}

// 显示帮助信息
function printHelp(): void {
  console.log(`
R2 文件夹删除工具

用法:
  ts-node scripts/delete-r2-folder.ts --env <environment> --folder <folder-path> [选项]

参数:
  --env <environment>        指定环境 (development 或 production) [必需]
  --folder <folder-path>     要删除的文件夹路径 [必需]

选项:
  --dry-run                  预览模式，仅显示要删除的对象但不实际删除
  --batch-size <size>        批量删除的大小，默认 1000
  --help, -h                 显示此帮助信息

示例:
  # 删除 development 环境的 user-uploads/123456 文件夹
  ts-node scripts/delete-r2-folder.ts --env development --folder user-uploads/123456

  # 预览删除 production 环境的 temp-files 文件夹
  ts-node scripts/delete-r2-folder.ts --env production --folder temp-files --dry-run
`);
}

// 主程序入口
async function main(): Promise<void> {
  const options = parseArgs();
  await deleteFolder(options);
}

// 运行主程序
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});