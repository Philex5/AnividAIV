import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as dotenv from "dotenv";

// 加载环境变量
dotenv.config({ path: '.env.development' });

let dbInstance: ReturnType<typeof drizzle> | null = null;

export function getStandaloneDb() {
  if (dbInstance) {
    return dbInstance;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set in environment variables");
  }

  console.log('Connecting to database...');

  // 创建 postgres 客户端
  const client = postgres(databaseUrl, {
    prepare: false,
    max: 10,
    idle_timeout: 30,
    connect_timeout: 10,
  });

  dbInstance = drizzle({ client });
  return dbInstance;
}