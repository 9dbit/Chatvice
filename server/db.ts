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
  connectionTimeoutMillis: 20000, // 20s for Neon cold start in production
  maxUses: 7500, // Recycle connections after 7500 uses
  allowExitOnIdle: false, // Keep process alive for production
});

// Handle pool errors gracefully - Neon may terminate connections during suspend
pool.on('error', (err: Error & { code?: string }) => {
  // Code 57P01 = admin shutdown (Neon suspend), these are expected
  if (err.code === '57P01') {
    console.log('Database connection terminated by Neon (suspend). Will reconnect on next query.');
  } else {
    console.error('Database pool error:', err.message);
  }
});

pool.on('connect', () => {
  console.log('Database connection established');
});

// Query with automatic retry for Neon cold start scenarios
export async function queryWithRetry<T>(
  queryFn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await queryFn();
    } catch (error: any) {
      lastError = error;
      
      // Retry on connection errors (Neon cold start)
      const isRetryable = 
        error.code === '57P01' || // Admin shutdown
        error.code === 'ECONNRESET' ||
        error.code === 'ETIMEDOUT' ||
        error.message?.includes('Connection terminated');
      
      if (isRetryable && attempt < maxRetries) {
        console.log(`Database query attempt ${attempt} failed, retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError;
}

// Test database connectivity on startup
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    await queryWithRetry(async () => {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
    });
    console.log('Database connection test successful');
    return true;
  } catch (error: any) {
    console.error('Database connection test failed:', error.message);
    return false;
  }
}

export const db = drizzle(pool, { schema });
