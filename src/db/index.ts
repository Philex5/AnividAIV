import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export function db() {
  // Detect if running in Cloudflare Workers environment
  const isCloudflareWorker =
    typeof globalThis !== "undefined" && "Cloudflare" in globalThis;

  const env = isCloudflareWorker ? (getCloudflareContext() as { env: any }).env : {};

  // Detect if set Hyperdrive
  const isHyperdrive = isCloudflareWorker && "HYPERDRIVE" in env;

  console.log("is cloudflare worker:", isCloudflareWorker);
  console.log("is hyperdrive:", isHyperdrive);

  let databaseUrl = process.env.DATABASE_URL;
  if (isCloudflareWorker && isHyperdrive) {
    const hyperdrive = env.HYPERDRIVE;
    databaseUrl = hyperdrive.connectionString;
    console.log("using Hyperdrive connection");
  }

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  // In Cloudflare Workers, create new connection each time
  if (isCloudflareWorker) {
    console.log("in Cloudflare Workers environment");
    // Workers environment uses minimal configuration
    const client = postgres(databaseUrl, {
      prepare: false,
      max: 1, // Limit to 1 connection in Workers
      idle_timeout: 10, // Shorter timeout for Workers
      connect_timeout: 5,
    });

    return drizzle(client);
  }

  // Database instance for Node.js environment
  let dbInstance: ReturnType<typeof drizzle> | null = null;

  // Node.js environment with connection pool configuration
  const client = postgres(databaseUrl, {
    prepare: false,
    max: 10, // Maximum connections in pool
    idle_timeout: 30, // Idle connection timeout (seconds)
    connect_timeout: 10, // Connection timeout (seconds)
  });
  dbInstance = drizzle({ client });

  return dbInstance;
}
