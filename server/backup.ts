
import { db } from "./db";
import fs from "fs";
import path from "path";
import { sql } from "drizzle-orm";

export async function createDatabaseBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(process.cwd(), "backups", "database");
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  try {
    // Export all tables data
    const tables = [
      "admins",
      "merchants",
      "chat_sessions",
      "chat_messages",
      "ai_agents",
      "quick_replies",
      "triggers",
      "chat_buttons",
      "knowledge_base_items",
      "sources",
      "widget_settings",
      "welcome_bubble_settings",
      "notification_settings",
      "product_recommendation_settings",
      "product_cards",
      "supervisors",
      "work_schedules",
      "integrations",
      "team_activity_logs",
      "platform_settings",
      "landing_settings",
      "subscription_plans",
      "merchant_subscriptions",
      "transactions",
      "menu_orders"
    ];

    const backup: Record<string, any[]> = {};

    for (const table of tables) {
      try {
        const result = await db.execute(sql.raw(`SELECT * FROM ${table}`));
        backup[table] = result.rows;
        console.log(`✓ Backed up ${table}: ${result.rows.length} rows`);
      } catch (error) {
        console.log(`⚠ Skipped ${table}: ${error instanceof Error ? error.message : 'unknown error'}`);
      }
    }

    const backupFile = path.join(backupDir, `backup_${timestamp}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
    
    console.log(`\n✅ Database backup created: ${backupFile}`);
    return backupFile;
  } catch (error) {
    console.error("❌ Backup failed:", error);
    throw error;
  }
}

export async function createSchemaBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(process.cwd(), "backups", "schema");
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  try {
    // Export schema definition
    const schemaFile = path.join(process.cwd(), "shared", "schema.ts");
    const backupFile = path.join(backupDir, `schema_${timestamp}.ts`);
    
    fs.copyFileSync(schemaFile, backupFile);
    console.log(`✅ Schema backup created: ${backupFile}`);
    return backupFile;
  } catch (error) {
    console.error("❌ Schema backup failed:", error);
    throw error;
  }
}

// CLI execution
if (require.main === module) {
  (async () => {
    console.log("🔄 Starting backup process...\n");
    await createSchemaBackup();
    await createDatabaseBackup();
    console.log("\n🎉 Backup completed successfully!");
    process.exit(0);
  })();
}
