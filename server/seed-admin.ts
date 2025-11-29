import { db } from "./db";
import { admins } from "@shared/schema";
import bcrypt from "bcryptjs";

async function seedAdmin() {
  console.log("Creating default admin user...");
  
  const SALT_ROUNDS = 10;
  const hashedPassword = await bcrypt.hash("admin123", SALT_ROUNDS);
  
  try {
    const existing = await db.select().from(admins).limit(1);
    if (existing.length > 0) {
      console.log("Admin user already exists, skipping.");
      return;
    }
    
    await db.insert(admins).values({
      id: "admin_default",
      email: "admin@jeany.ai",
      password: hashedPassword,
      name: "Super Admin",
    });
    
    console.log("Default admin created:");
    console.log("  Email: admin@jeany.ai");
    console.log("  Password: admin123");
    console.log("  (Change this password immediately in production!)");
  } catch (error: any) {
    if (error.code === "23505") {
      console.log("Admin user already exists.");
    } else {
      console.error("Error creating admin:", error);
    }
  }
  
  process.exit(0);
}

seedAdmin();
