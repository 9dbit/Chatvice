
import { createDatabaseBackup, createSchemaBackup } from "./backup";
import { backupConfiguration } from "./backupConfig";
import fs from "fs";
import path from "path";

async function createCheckpoint() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const checkpointDir = path.join(process.cwd(), "backups", "checkpoints");
  
  if (!fs.existsSync(checkpointDir)) {
    fs.mkdirSync(checkpointDir, { recursive: true });
  }

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔐 CREATING SYSTEM CHECKPOINT");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const manifest: Record<string, any> = {
    timestamp,
    created_at: new Date().toISOString(),
    system_info: {
      node_version: process.version,
      platform: process.platform,
      environment: process.env.NODE_ENV || "development"
    },
    backups: {}
  };

  try {
    // 1. Backup database schema
    console.log("📋 Step 1/4: Backing up database schema...");
    const schemaBackup = await createSchemaBackup();
    manifest.backups.schema = path.basename(schemaBackup);

    // 2. Backup database data
    console.log("\n📊 Step 2/4: Backing up database data...");
    const dbBackup = await createDatabaseBackup();
    manifest.backups.database = path.basename(dbBackup);

    // 3. Backup configuration
    console.log("\n⚙️  Step 3/4: Backing up configuration files...");
    const configBackup = backupConfiguration();
    manifest.backups.config = path.basename(configBackup);

    // 4. Backup uploaded files list
    console.log("\n📁 Step 4/4: Cataloging uploaded files...");
    const uploadsDir = path.join(process.cwd(), "uploads");
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      manifest.backups.uploads = {
        count: files.length,
        files: files
      };
      console.log(`✓ Cataloged ${files.length} uploaded files`);
    }

    // Save checkpoint manifest
    const manifestFile = path.join(checkpointDir, `checkpoint_${timestamp}.json`);
    fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ CHECKPOINT CREATED SUCCESSFULLY!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`\n📍 Checkpoint ID: ${timestamp}`);
    console.log(`📄 Manifest: ${manifestFile}`);
    console.log(`\n📦 Backed up components:`);
    console.log(`   ✓ Database Schema`);
    console.log(`   ✓ Database Data`);
    console.log(`   ✓ Configuration Files`);
    console.log(`   ✓ Uploaded Files Catalog`);
    console.log("\n💾 All backups stored in: ./backups/\n");

    return manifestFile;
  } catch (error) {
    console.error("\n❌ Checkpoint creation failed:", error);
    throw error;
  }
}

if (require.main === module) {
  createCheckpoint()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { createCheckpoint };
