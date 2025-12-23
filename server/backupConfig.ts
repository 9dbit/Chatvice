
import fs from "fs";
import path from "path";

export function backupConfiguration() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(process.cwd(), "backups", "config");
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const configFiles = [
    ".replit",
    "drizzle.config.ts",
    "package.json",
    "tsconfig.json",
    "tailwind.config.ts",
    "vite.config.ts"
  ];

  const backup: Record<string, string> = {};

  for (const file of configFiles) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      backup[file] = fs.readFileSync(filePath, "utf-8");
      console.log(`✓ Backed up ${file}`);
    }
  }

  const backupFile = path.join(backupDir, `config_${timestamp}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
  
  console.log(`\n✅ Configuration backup created: ${backupFile}`);
  return backupFile;
}

if (require.main === module) {
  backupConfiguration();
}
