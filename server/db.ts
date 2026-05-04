import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL environment variable is required");
  throw new Error("DATABASE_URL environment variable is required");
}

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 20,
});

pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

let poolConnectLogged = false;
pool.on('connect', () => {
  if (!poolConnectLogged) {
    console.log('Database pool connected');
    poolConnectLogged = true;
  }
});

export const db = drizzle(pool, { schema });
export { pool };
