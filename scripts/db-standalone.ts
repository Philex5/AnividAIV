import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { config } from "dotenv";

let dbInstance: ReturnType<typeof drizzle> | null = null;

function loadEnv() {
  config({ path: ".env", override: true });
  config({ path: ".env.development", override: true });
  config({ path: ".env.local", override: true });
}

export function getStandaloneDb() {
  if (dbInstance) return dbInstance;

  loadEnv();

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  const client = postgres(databaseUrl, {
    prepare: false,
    max: 5,
    idle_timeout: 30,
    connect_timeout: 10,
  });

  dbInstance = drizzle({ client });
  return dbInstance;
}

