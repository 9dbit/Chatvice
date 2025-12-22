import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Configure connection pool optimized for Neon serverless
// Neon auto-suspends compute after idle, so we need:
// - Lower min connections to allow graceful scale-down
// - Shorter idle timeout to release connections faster
// - Retry logic handled by pool's built-in reconnection
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum pool size for high traffic
  min: 0, // Allow pool to scale to zero for Neon serverless
  idleTimeoutMillis: 10000, // Release idle connections after 10s
  connectionTimeoutMillis: 15000, // Allow more time for Neon cold start
  maxUses: 7500, // Recycle connections after 7500 uses
  allowExitOnIdle: true, // Allow process to exit if pool is idle
});

// Handle pool errors gracefully - Neon may terminate connections during suspend
pool.on('error', (err: Error & { code?: string }) => {
  // Code 57P01 = admin shutdown (Neon suspend), these are expected
  if (err.code === '57P01') {
    console.log('Database connection terminated by Neon (suspend). Will reconnect on next query.');
  } else {
    console.error('Unexpected database pool error:', err.message);
  }
});

pool.on('connect', () => {
  console.log('Database connection established');
});

export const db = drizzle(pool, { schema });
