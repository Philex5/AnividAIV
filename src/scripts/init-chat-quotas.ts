/**
 * 初始化聊天配额数据脚本
 * 此脚本将为所有现有用户创建配额记录
 */

import { db } from "@/db";
import { users, chatQuotas } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { ChatQuotaService, MEMBERSHIP_CHAT_QUOTA } from "@/services/chat/chat-quota-service";

/**
 * 创建聊天配额相关表
 */
export async function createChatQuotaTables() {
  console.log("Creating chat quota tables...");

  try {
    // 创建 chat_quotas 表
    await db().execute(sql`
      CREATE TABLE IF NOT EXISTS "chat_quotas" (
        "user_uuid" varchar(255) PRIMARY KEY NOT NULL,
        "membership_level" varchar(50) NOT NULL,
        "monthly_quota" integer NOT NULL,
        "monthly_used" integer DEFAULT 0 NOT NULL,
        "quota_reset_at" timestamp with time zone NOT NULL,
        "total_used" integer DEFAULT 0 NOT NULL,
        "created_at" timestamp with time zone DEFAULT now(),
        "updated_at" timestamp with time zone DEFAULT now()
      );
    `);

    // 创建 chat_quotas 表的索引
    await db().execute(sql`CREATE INDEX IF NOT EXISTS "idx_chat_quotas_membership" ON "chat_quotas" USING btree ("membership_level");`);
    await db().execute(sql`CREATE INDEX IF NOT EXISTS "idx_chat_quotas_reset_at" ON "chat_quotas" USING btree ("quota_reset_at");`);

    // 创建 chat_usage_logs 表
    await db().execute(sql`
      CREATE TABLE IF NOT EXISTS "chat_usage_logs" (
        "uuid" varchar(255) PRIMARY KEY NOT NULL,
        "user_uuid" varchar(255) NOT NULL,
        "session_id" varchar(255) NOT NULL,
        "membership_level" varchar(50) NOT NULL,
        "tokens_used" integer DEFAULT 0,
        "ap_used" integer DEFAULT 1,
        "created_at" timestamp with time zone DEFAULT now()
      );
    `);

    // 创建 chat_usage_logs 表的索引
    await db().execute(sql`CREATE INDEX IF NOT EXISTS "idx_chat_usage_logs_user_date" ON "chat_usage_logs" USING btree ("user_uuid","created_at");`);
    await db().execute(sql`CREATE INDEX IF NOT EXISTS "idx_chat_usage_logs_membership" ON "chat_usage_logs" USING btree ("membership_level");`);

    console.log("✅ Chat quota tables created successfully");
    return true;
  } catch (error) {
    console.error("❌ Failed to create chat quota tables:", error);
    throw error;
  }
}

/**
 * 为所有用户初始化配额
 */
export async function initializeChatQuotas() {
  console.log("Starting to initialize chat quotas for all users...");

  try {
    // 首先创建表
    await createChatQuotaTables();

    // 获取所有用户
    const allUsers = await db().select().from(users);
    console.log(`Found ${allUsers.length} users`);

    let createdCount = 0;
    let skippedCount = 0;

    for (const user of allUsers) {
      try {
        // 检查用户是否已有配额记录
        const [existingQuota] = await db()
          .select()
          .from(chatQuotas)
          .where(eq(chatQuotas.user_uuid, user.uuid))
          .limit(1);

        if (existingQuota) {
          skippedCount++;
          continue;
        }

        // 映射用户会员等级
        const membershipLevel = mapUserToMembershipLevel(user);

        // 创建配额记录
        await ChatQuotaService.createInitialQuota(user.uuid);

        createdCount++;
        console.log(`Created quota for user: ${user.email} (${membershipLevel})`);
      } catch (error) {
        console.error(`Failed to create quota for user ${user.email}:`, error);
      }
    }

    console.log("\n=== Initialization Complete ===");
    console.log(`Total users: ${allUsers.length}`);
    console.log(`Quotas created: ${createdCount}`);
    console.log(`Quotas skipped (already exist): ${skippedCount}`);
    console.log(`Failed: ${allUsers.length - createdCount - skippedCount}`);

    return {
      total: allUsers.length,
      created: createdCount,
      skipped: skippedCount,
      failed: allUsers.length - createdCount - skippedCount,
    };
  } catch (error) {
    console.error("Failed to initialize chat quotas:", error);
    throw error;
  }
}

/**
 * 映射用户到会员等级
 */
function mapUserToMembershipLevel(user: typeof users.$inferSelect): keyof typeof MEMBERSHIP_CHAT_QUOTA {
  if (user.is_sub && user.sub_plan_type === "pro") {
    return "pro";
  }
  // TODO: 根据实际业务逻辑添加更多会员等级判断
  // 目前简化为免费用户
  return "free";
}

/**
 * 获取下个月第一天零点的时间戳（UTC时间）
 * 确保全球统一：任何时区都使用相同的UTC时间进行比较
 */
function getNextMonthFirstDay(): Date {
  const now = new Date();

  // 获取当前 UTC 时间
  const currentUTCYear = now.getUTCFullYear();
  const currentUTCMonth = now.getUTCMonth();

  // 创建下个月第一天 UTC 零点
  const nextMonth = new Date(Date.UTC(
    currentUTCYear,
    currentUTCMonth + 1,
    1,
    0,
    0,
    0,
    0
  ));

  return nextMonth;
}

// 如果直接运行此脚本
if (require.main === module) {
  initializeChatQuotas()
    .then(() => {
      console.log("Script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Script failed:", error);
      process.exit(1);
    });
}

