import { db } from "./db";
import { admins } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export async function seedMasterAdminFromEnv(): Promise<void> {
  const email = process.env.MASTER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.MASTER_ADMIN_PASSWORD;

  if (!email || !password) {
    console.log("[master-admin] MASTER_ADMIN_EMAIL/MASTER_ADMIN_PASSWORD not set; skipping seed");
    return;
  }

  try {
    const existing = await db.select().from(admins).where(eq(admins.email, email)).limit(1);
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);

    if (existing.length > 0) {
      const current = existing[0];
      const samePassword = await bcrypt.compare(password, current.password);
      if (samePassword) {
        console.log(`[master-admin] Master admin already up-to-date: ${email}`);
        return;
      }
      await db.update(admins).set({ password: hashed, name: current.name || "Master Admin" }).where(eq(admins.id, current.id));
      console.log(`[master-admin] Master admin password synced from secrets: ${email}`);
      return;
    }

    const id = `admin_master_${Date.now().toString(36)}`;
    await db.insert(admins).values({
      id,
      email,
      password: hashed,
      name: "Master Admin",
    });
    console.log(`[master-admin] Master admin created from secrets: ${email}`);
  } catch (error: any) {
    console.error("[master-admin] Failed to seed master admin:", error?.message || error);
  }
}
