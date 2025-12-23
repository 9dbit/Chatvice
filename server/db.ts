import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Configure connection pool optimized for Neon serverless
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10, // Reduced for Neon serverless
  min: 0, // Allow pool to drain when idle (prevents Neon disconnect errors)
  idleTimeoutMillis: 20000, // 20 seconds - close idle connections before Neon does
  connectionTimeoutMillis: 10000, // 10 seconds
  maxUses: 7500, // Recycle connections after 7500 uses
});

// Monitor pool health - silently handle expected Neon disconnections
pool.on('error', (err: any) => {
  // 57P01 = admin_shutdown - expected with Neon serverless auto-suspend
  // 57P02 = crash_shutdown
  // 57P03 = cannot_connect_now
  if (err.code === '57P01' || err.code === '57P02' || err.code === '57P03') {
    // Silently handle - pool will auto-reconnect on next query
    return;
  }
  console.error('Database pool error:', err.message || err);
});

pool.on('connect', () => {
  // Only log in development for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log('Database connection established');
  }
});

export const db = drizzle(pool, { schema });
