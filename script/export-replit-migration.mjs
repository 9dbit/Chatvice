#!/usr/bin/env node
// Read-only production access; creates private backup files. Run in source Replit.
import { promises as fs, createReadStream, constants } from "node:fs";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

class ExportError extends Error {}

export function selectApplicationVariables(names, env) {
  const result = {};
  for (const name of new Set(names)) {
    if (!/^[A-Z][A-Z0-9_]*$/.test(name)) continue;
    if (/^(REPL|RAILWAY_|WEB_REPL_|S3_)/.test(name)) continue;
    if (["DATABASE_URL", "PORT", "NODE_ENV", "ENABLE_BACKGROUND_JOBS", "APP_URL", "OBJECT_STORAGE_PROVIDER", "OBJECT_STORAGE_BUCKET", "PATH", "HOME", "TMPDIR", "USER", "LOGNAME", "SHELL"].includes(name)) continue;
    if (env[name] !== undefined && env[name] !== "") result[name] = env[name];
  }
  return result;
}

export async function discoverVariableNames(root) {
  const names = new Set(["DATABASE_URL", "SESSION_SECRET", "JWT_SECRET", "CUSTOM_DATA_ENC_KEY", "GAMING_ENC_KEY", "RESEND_API_KEY", "RESEND_FROM_EMAIL"]);
  async function walk(dir) {
    let entries;
    try { entries = await fs.readdir(dir, { withFileTypes: true }); }
    catch (error) { if (error.code === "ENOENT") return; throw error; }
    for (const entry of entries) {
      if (entry.isSymbolicLink() || ["node_modules", ".git", "dist", "__tests__"].includes(entry.name)) continue;
      const filename = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(filename);
      else if (/\.(ts|tsx|js|mjs|cjs)$/.test(entry.name)) {
        const source = await fs.readFile(filename, "utf8");
        for (const match of source.matchAll(/process\.env(?:\.([A-Z][A-Z0-9_]*)|\[['"]([A-Z][A-Z0-9_]*)['"]\])/g)) {
          names.add(match[1] || match[2]);
        }
      }
    }
  }
  for (const dir of ["server", "client/src", "shared", "script"]) await walk(path.join(root, dir));
  return [...names].sort();
}

export async function checksum(filename) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filename)) hash.update(chunk);
  return hash.digest("hex");
}

export function objectBackupName(key) {
  return createHash("sha256").update(key).digest("hex");
}

async function writePrivate(filename, value) {
  await fs.writeFile(filename, JSON.stringify(value, null, 2) + "\n", { mode: 0o600, flag: "wx" });
}

export async function exportLocalMedia(root, output) {
  const files = [], skippedSymlinks = [];
  async function walk(dir) {
    let entries;
    try { entries = await fs.readdir(dir, { withFileTypes: true }); }
    catch (error) { if (error.code === "ENOENT") return; throw error; }
    for (const entry of entries) {
      const filename = path.join(dir, entry.name);
      const relativePath = path.relative(root, filename).split(path.sep).join("/");
      if (entry.isSymbolicLink()) { skippedSymlinks.push(relativePath); continue; }
      if (entry.isDirectory()) await walk(filename);
      else if (entry.isFile()) {
        const backupPath = "local-media/" + objectBackupName(relativePath);
        const destination = path.join(output, backupPath);
        await fs.copyFile(filename, destination);
        await fs.chmod(destination, 0o600);
        const stat = await fs.stat(destination);
        files.push({ relativePath, backupPath, size: stat.size, sha256: await checksum(destination) });
      }
    }
  }
  await fs.mkdir(path.join(output, "local-media"), { mode: 0o700 });
  for (const dir of ["uploads", "exports", "attached_assets", "public/uploads", "client/public/uploads"]) await walk(path.join(root, dir));
  return { files, skippedSymlinks };
}

function runPrivate(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: "pipe", ...options });
  if (result.error || result.status !== 0) {
    // Child stderr can contain connection credentials. Do not forward it.
    throw new ExportError(command + " failed; verify installation, permissions and PostgreSQL client/server versions");
  }
}

async function exportObjects(output, env) {
  if (!env.OBJECT_STORAGE_BUCKET) return { configured: false, objects: [] };
  const { Storage } = await import("@google-cloud/storage");
  const endpoint = "http://127.0.0.1:1106";
  const storage = new Storage({
    projectId: "",
    credentials: {
      audience: "replit",
      subject_token_type: "access_token",
      token_url: endpoint + "/token",
      type: "external_account",
      credential_source: { url: endpoint + "/credential", format: { type: "json", subject_token_field_name: "access_token" } },
      universe_domain: "googleapis.com",
    },
  });
  await fs.mkdir(path.join(output, "bucket-objects"), { mode: 0o700 });
  const bucket = storage.bucket(env.OBJECT_STORAGE_BUCKET);
  const objects = [];
  let query = { autoPaginate: false };
  do {
    const [files, nextQuery] = await bucket.getFiles(query);
    for (const file of files) {
      const [metadata] = await file.getMetadata();
      const backupPath = "bucket-objects/" + objectBackupName(file.name);
      const destination = path.join(output, backupPath);
      // Pin the generation so an overwritten source object cannot change mid-download.
      await bucket.file(file.name, { generation: metadata.generation }).download({ destination });
      await fs.chmod(destination, 0o600);
      const stat = await fs.stat(destination);
      if (metadata.size !== undefined && stat.size !== Number(metadata.size)) throw new ExportError("Object size mismatch");
      objects.push({
        key: file.name, backupPath, size: stat.size, sha256: await checksum(destination),
        generation: metadata.generation, contentType: metadata.contentType, cacheControl: metadata.cacheControl,
      });
    }
    query = nextQuery;
  } while (query);
  return { configured: true, objects };
}

async function exportResend(variables, env) {
  if (variables.RESEND_API_KEY) return "direct";
  if (!env.REPLIT_CONNECTORS_HOSTNAME) return "not-configured";
  const token = env.REPL_IDENTITY ? "repl " + env.REPL_IDENTITY : env.WEB_REPL_RENEWAL ? "depl " + env.WEB_REPL_RENEWAL : null;
  if (!token) throw new ExportError("Replit Resend connector token unavailable");
  const response = await fetch("https://" + env.REPLIT_CONNECTORS_HOSTNAME + "/api/v2/connection?include_secrets=true&connector_names=resend", {
    headers: { Accept: "application/json", "X_REPLIT_TOKEN": token },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new ExportError("Replit Resend connector export failed");
  const data = await response.json();
  const settings = data.items?.[0]?.settings;
  if (!settings?.api_key) return "not-connected";
  variables.RESEND_API_KEY = settings.api_key;
  if (settings.from_email) variables.RESEND_FROM_EMAIL = settings.from_email;
  return "connector-exported";
}

export async function preflight(root, env = process.env) {
  const routes = await fs.readFile(path.join(root, "server/routes.ts"), "utf8");
  await fs.access(path.join(root, "server/objectStorage.ts"));
  if (!routes.includes("Chatvice") || !(env.REPL_ID || env.REPLIT_DEPLOYMENT_ID || env.REPL_IDENTITY || env.WEB_REPL_RENEWAL)) {
    throw new ExportError("Run this script inside the source Chatvice Replit workspace");
  }
  if (env.RAILWAY_PROJECT_ID) throw new ExportError("Source export cannot run on Railway");
  if (!env.DATABASE_URL) throw new ExportError("Source DATABASE_URL is missing");
  for (const command of ["pg_dump", "pg_restore", "tar", "git"]) runPrivate(command, ["--version"]);
}


export async function preparePrivateTransfer(root, archive) {
  const result = spawnSync("git", ["rev-parse", "--git-path", "info/exclude"], { cwd: root, encoding: "utf8", stdio: "pipe" });
  if (result.error || result.status !== 0) throw new ExportError("A Git checkout is required for the private download folder");
  const exclude = path.resolve(root, result.stdout.trim());
  const rule = "/chatvice-private-transfer/";
  const existing = await fs.readFile(exclude, "utf8").catch(error => { if (error.code === "ENOENT") return ""; throw error; });
  if (!existing.split(/\r?\n/).includes(rule)) {
    await fs.mkdir(path.dirname(exclude), { recursive: true });
    await fs.appendFile(exclude, "\n" + rule + "\n");
  }
  runPrivate("git", ["check-ignore", "--quiet", "--", "chatvice-private-transfer/"], { cwd: root });
  const folder = path.join(root, "chatvice-private-transfer");
  let stat = await fs.lstat(folder).catch(error => { if (error.code === "ENOENT") return null; throw error; });
  if (stat && (!stat.isDirectory() || stat.isSymbolicLink())) throw new ExportError("Private transfer folder must be a real directory");
  if (!stat) await fs.mkdir(folder, { mode: 0o700 });
  await fs.chmod(folder, 0o700);
  for (const source of [archive, archive + ".sha256"]) {
    const destination = path.join(folder, path.basename(source));
    await fs.copyFile(source, destination, constants.COPYFILE_EXCL);
    await fs.chmod(destination, 0o600);
  }
  return folder;
}

export async function main() {
  process.umask(0o077);
  const root = await fs.realpath(process.cwd());
  await preflight(root);
  if (process.argv.includes("--check")) { console.log("SOURCE_PREFLIGHT_PASS"); return; }
  const parent = path.join(os.homedir(), "chatvice-private-backups");
  await fs.mkdir(parent, { recursive: true, mode: 0o700 });
  await fs.chmod(parent, 0o700);
  if (parent === root || parent.startsWith(root + path.sep)) throw new ExportError("Backup directory must be outside the repository");
  const output = await fs.mkdtemp(path.join(parent, "chatvice-"));
  const startedAt = new Date().toISOString();
  console.log("Creating private backup in " + output);
  const variables = selectApplicationVariables(await discoverVariableNames(root), process.env);
  const resend = await exportResend(variables, process.env);
  await writePrivate(path.join(output, "source-config.json"), {
    applicationVariables: variables,
    sourceDatabaseUrl: process.env.DATABASE_URL,
    sourceBucketName: process.env.OBJECT_STORAGE_BUCKET || null,
  });
  const dump = path.join(output, "database.dump");
  runPrivate("pg_dump", ["--format=custom", "--no-owner", "--no-acl", "--file", dump], {
    env: { ...process.env, PGDATABASE: process.env.DATABASE_URL, PGCONNECT_TIMEOUT: "20" },
  });
  runPrivate("pg_restore", ["--file=/dev/null", dump]);
  console.log("DATABASE_ARCHIVE_DECODE_PASS");
  const localMedia = await exportLocalMedia(root, output);
  const objectStorage = await exportObjects(output, process.env);
  await writePrivate(path.join(output, "manifest.json"), {
    version: 1, startedAt, finishedAt: new Date().toISOString(),
    database: { path: "database.dump", size: (await fs.stat(dump)).size, sha256: await checksum(dump), archiveDecodePass: true },
    config: { path: "source-config.json", sha256: await checksum(path.join(output, "source-config.json")), variableNames: Object.keys(variables).sort(), resend },
    localMedia, objectStorage,
    limitations: ["A live database snapshot and media export are not one atomic snapshot; synchronize final writes before cutover.", "Database restore, target media upload and feature parity remain unverified."],
  });
  if (localMedia.skippedSymlinks.length) throw new ExportError("Media symlinks require manual review; no complete archive was produced");
  const archive = output + ".tar.gz";
  runPrivate("tar", ["-czf", archive, "-C", parent, path.basename(output)]);
  await fs.chmod(archive, 0o600);
  await fs.writeFile(archive + ".sha256", (await checksum(archive)) + "  " + path.basename(archive) + "\n", { mode: 0o600, flag: "wx" });
  const transfer = await preparePrivateTransfer(root, archive);
  console.log("SOURCE_EXPORT_PASS");
  console.log("Download the archive and checksum from the Replit Files folder: " + transfer);
  console.log("Primary backup: " + archive);
  console.log("Checksum file: " + archive + ".sha256");
  console.log("Contains production secrets and customer data; do not publish or commit it.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    // No SDK/connection errors, credentials, file keys or tokens in terminal output.
    console.error("SOURCE_EXPORT_FAILED: " + (error instanceof ExportError ? error.message : "export did not complete") + ". Keep Replit active.");
    process.exitCode = 1;
  });
}
