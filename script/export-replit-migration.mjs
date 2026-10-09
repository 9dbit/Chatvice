#!/usr/bin/env node
// Read-only production access; creates private backup files. Run in source Replit.
import { promises as fs, createReadStream, constants, writeFileSync } from "node:fs";
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


export async function prepareDatabaseConnection(databaseUrl, directory) {
  let url;
  try { url = new URL(databaseUrl); } catch { throw new ExportError("DATABASE_URL must be a valid PostgreSQL URI"); }
  if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new ExportError("DATABASE_URL must use PostgreSQL");
  const config = new Map();
  try {
    config.set("host", decodeURIComponent(url.hostname.replace(/^\[|\]$/g, "")));
    config.set("port", url.port || "5432");
    if (url.username) config.set("user", decodeURIComponent(url.username));
    if (url.password) config.set("password", decodeURIComponent(url.password));
    config.set("dbname", decodeURIComponent(url.pathname.replace(/^\//, "")));
    config.set("connect_timeout", "20");
    for (const [key, value] of url.searchParams) config.set(key, value);
  } catch { throw new ExportError("DATABASE_URL contains invalid encoding"); }
  if (!config.get("host") || !config.get("dbname")) throw new ExportError("DATABASE_URL must specify host and database");
  for (const [key, value] of config) {
    if (!/^[a-z][a-z0-9_]*$/.test(key) || ["service", "servicefile"].includes(key) ||
        /[\r\n\0]/.test(value) || value.trim() !== value) {
      throw new ExportError("DATABASE_URL contains a parameter that cannot be safely stored in the connection file");
    }
  }
  const serviceFile = path.join(directory, "postgres-service.private.conf");
  await fs.writeFile(serviceFile, "[chatvice_migration]\n" + [...config].map(([k, v]) => k + "=" + v).join("\n") + "\n", { mode: 0o600, flag: "wx" });
  return {
    args: ["--dbname=service=chatvice_migration", "--no-password"],
    env: { PGSERVICEFILE: serviceFile, PGSERVICE: "chatvice_migration", PGCONNECT_TIMEOUT: "20" },
  };
}

export function classifyProcessFailure(result) {
  if (result.error?.code === "ENOENT") return "EXECUTABLE_NOT_FOUND";
  if (result.error?.code === "EACCES") return "EXECUTABLE_PERMISSION_DENIED";
  if (result.error?.code === "ENOBUFS") return "PROCESS_OUTPUT_LIMIT";
  const stderr = String(result.stderr || "");
  if (/server version mismatch/i.test(stderr)) {
    const server = stderr.match(/server version:\s*(\d+(?:\.\d+)*)/i)?.[1];
    const client = stderr.match(/pg_dump version:\s*(\d+(?:\.\d+)*)/i)?.[1];
    return "POSTGRES_VERSION_MISMATCH" + (server && client ? " (server " + server + ", pg_dump " + client + ")" : "");
  }
  if (/password authentication failed|no password supplied|authentication failed/i.test(stderr)) return "DATABASE_AUTHENTICATION_FAILED";
  if (/could not translate host name|name or service not known|nodename nor servname/i.test(stderr)) return "DATABASE_DNS_FAILED";
  if (/connection refused/i.test(stderr)) return "DATABASE_CONNECTION_REFUSED";
  if (/timeout expired|connection timed out/i.test(stderr)) return "DATABASE_CONNECTION_TIMEOUT";
  if (/SSL|TLS|certificate/i.test(stderr)) return "DATABASE_TLS_FAILED";
  if (/permission denied/i.test(stderr)) return "DATABASE_PERMISSION_DENIED";
  if (/database .* does not exist/i.test(stderr)) return "DATABASE_NOT_FOUND";
  if (/invalid connection option|syntax error in service file/i.test(stderr)) return "DATABASE_CONNECTION_PARAMETER_UNSUPPORTED";
  return "PROCESS_FAILED" + (Number.isInteger(result.status) ? " (exit " + result.status + ")" : "");
}

function postgresTools(env = process.env) {
  return { dump: env.PG_DUMP_BIN || "pg_dump", restore: env.PG_RESTORE_BIN || "pg_restore" };
}

function runPrivate(command, args, options = {}) {
  const { privateErrorFile, ...spawnOptions } = options;
  const result = spawnSync(command, args, { stdio: "pipe", ...spawnOptions });
  if (result.error || result.status !== 0) {
    if (privateErrorFile && result.stderr) {
      writeFileSync(privateErrorFile, String(result.stderr), { mode: 0o600, flag: "wx" });
    }
    throw new ExportError(path.basename(command) + ": " + classifyProcessFailure(result) +
      (privateErrorFile ? "; details saved privately beside the backup, not printed" : ""));
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
  const tools = postgresTools(env);
  for (const command of [tools.dump, tools.restore, "tar", "git"]) runPrivate(command, ["--version"]);
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


let exportStage = "SOURCE_PREFLIGHT";
let exportOutput;

export function safeFailureCode(error) {
  const status = error?.response?.status ?? error?.statusCode ?? error?.code;
  if (Number.isInteger(status) && status >= 100 && status <= 599) return "HTTP_" + status;
  const known = ["ENOENT", "EACCES", "EPERM", "ENOSPC", "EMFILE", "ENOTDIR", "EISDIR", "EEXIST", "ETIMEDOUT", "ECONNREFUSED", "ENOTFOUND", "ECONNRESET", "EAI_AGAIN"];
  return known.includes(error?.code) ? error.code : "UNKNOWN_ERROR";
}

function stage(name) {
  exportStage = name;
  console.log("EXPORT_STAGE: " + name);
}

export async function reuseDatabaseSnapshot(sourceDirectory, output, expectedDatabaseUrl, backupRoot) {
  const parent = await fs.realpath(backupRoot);
  const source = await fs.realpath(sourceDirectory);
  if (path.dirname(source) !== parent || !path.basename(source).startsWith("chatvice-") || source === output) {
    throw new ExportError("Database reuse is limited to an existing private Chatvice backup folder");
  }
  for (const name of ["source-config.json", "database.dump"]) {
    const stat = await fs.lstat(path.join(source, name));
    if (!stat.isFile() || stat.isSymbolicLink() || (stat.mode & 0o077) !== 0 ||
        (process.getuid && stat.uid !== process.getuid())) {
      throw new ExportError("Database reuse requires private regular files owned by the current user");
    }
  }
  const config = JSON.parse(await fs.readFile(path.join(source, "source-config.json"), "utf8"));
  if (config.sourceDatabaseUrl !== expectedDatabaseUrl || !config.applicationVariables || typeof config.applicationVariables !== "object") {
    throw new ExportError("Saved database configuration does not match the current source");
  }
  const dump = path.join(source, "database.dump");
  const originalChecksum = await checksum(dump);
  for (const name of ["source-config.json", "database.dump"]) {
    const destination = path.join(output, name);
    await fs.copyFile(path.join(source, name), destination, constants.COPYFILE_EXCL);
    await fs.chmod(destination, 0o600);
  }
  if (await checksum(path.join(output, "database.dump")) !== originalChecksum) {
    throw new ExportError("Reused database checksum mismatch");
  }
  return { config, snapshotFileModifiedAt: (await fs.stat(dump)).mtime.toISOString(), reusedFrom: path.basename(source) };
}

function reportFailure(error) {
  if (exportOutput) {
    try {
      const detail = String(error?.stack || error?.message || "Unknown error");
      writeFileSync(path.join(exportOutput, "export-error.private.log"), "Stage: " + exportStage + "\n" + detail + "\n", { mode: 0o600, flag: "wx" });
    } catch { /* Never print raw error details if private logging fails. */ }
  }
  const reason = error instanceof ExportError ? error.message : safeFailureCode(error);
  console.error("SOURCE_EXPORT_FAILED [" + exportStage + "]: " + reason + ". Keep Replit active.");
  if (exportOutput) console.error("Private diagnostics saved beside the backup; do not paste that log into chat.");
}

export async function main() {
  process.umask(0o077);
  const root = await fs.realpath(process.cwd());
  stage("SOURCE_PREFLIGHT");
  await preflight(root);
  if (process.argv.includes("--check")) { console.log("SOURCE_PREFLIGHT_PASS"); return; }
  const parent = path.join(os.homedir(), "chatvice-private-backups");
  await fs.mkdir(parent, { recursive: true, mode: 0o700 });
  await fs.chmod(parent, 0o700);
  if (parent === root || parent.startsWith(root + path.sep)) throw new ExportError("Backup directory must be outside the repository");
  const output = await fs.mkdtemp(path.join(parent, "chatvice-"));
  exportOutput = output;
  const startedAt = new Date().toISOString();
  console.log("Creating private backup in " + output);
  const tools = postgresTools();
  const dump = path.join(output, "database.dump");
  const reuseIndex = process.argv.indexOf("--reuse-database");
  let variables, resend, databaseProvenance;
  if (reuseIndex >= 0) {
    if (!process.argv[reuseIndex + 1] || process.argv[reuseIndex + 1].startsWith("--")) {
      throw new ExportError("--reuse-database requires the completed dump's backup folder");
    }
    stage("DATABASE_REUSE");
    const reused = await reuseDatabaseSnapshot(process.argv[reuseIndex + 1], output, process.env.DATABASE_URL, parent);
    if (reused.config.sourceBucketName !== (process.env.OBJECT_STORAGE_BUCKET || null)) {
      throw new ExportError("Saved bucket configuration does not match the current source");
    }
    variables = reused.config.applicationVariables;
    resend = "saved-source-config";
    databaseProvenance = { snapshotFileModifiedAt: reused.snapshotFileModifiedAt, reusedFrom: reused.reusedFrom };
    console.log("DATABASE_REUSE_CHECKSUM_PASS");
  } else {
    stage("SOURCE_CONFIG");
    variables = selectApplicationVariables(await discoverVariableNames(root), process.env);
    resend = await exportResend(variables, process.env);
    await writePrivate(path.join(output, "source-config.json"), {
      applicationVariables: variables, sourceDatabaseUrl: process.env.DATABASE_URL,
      sourceBucketName: process.env.OBJECT_STORAGE_BUCKET || null,
    });
    const connection = await prepareDatabaseConnection(process.env.DATABASE_URL, output);
    stage("DATABASE_DUMP");
    runPrivate(tools.dump, [...connection.args, "--format=custom", "--no-owner", "--no-acl", "--file", dump], {
      env: { ...process.env, ...connection.env },
      privateErrorFile: path.join(output, "pg_dump-error.private.log"),
    });
    databaseProvenance = { snapshotFileModifiedAt: (await fs.stat(dump)).mtime.toISOString() };
  }
  stage("DATABASE_DECODE");
  runPrivate(tools.restore, ["--file=/dev/null", dump], {
    privateErrorFile: path.join(output, "pg_restore-error.private.log"),
  });
  console.log("DATABASE_ARCHIVE_DECODE_PASS");
  stage("LOCAL_MEDIA");
  const localMedia = await exportLocalMedia(root, output);
  console.log("LOCAL_MEDIA_FILES: " + localMedia.files.length);
  stage("REPLIT_OBJECT_STORAGE");
  const objectStorage = await exportObjects(output, process.env);
  console.log("BUCKET_OBJECTS: " + objectStorage.objects.length);
  stage("MANIFEST");
  await writePrivate(path.join(output, "manifest.json"), {
    version: 1, startedAt, finishedAt: new Date().toISOString(),
    database: { path: "database.dump", size: (await fs.stat(dump)).size, sha256: await checksum(dump), archiveDecodePass: true, ...databaseProvenance },
    config: { path: "source-config.json", sha256: await checksum(path.join(output, "source-config.json")), variableNames: Object.keys(variables).sort(), resend },
    localMedia, objectStorage,
    limitations: ["A live database snapshot and media export are not one atomic snapshot; synchronize final writes before cutover.", "Database restore, target media upload and feature parity remain unverified."],
  });
  if (localMedia.skippedSymlinks.length) throw new ExportError("Media symlinks require manual review; no complete archive was produced");
  stage("PACKAGE_ARCHIVE");
  const archive = output + ".tar.gz";
  runPrivate("tar", ["-czf", archive, "-C", parent, path.basename(output)]);
  await fs.chmod(archive, 0o600);
  await fs.writeFile(archive + ".sha256", (await checksum(archive)) + "  " + path.basename(archive) + "\n", { mode: 0o600, flag: "wx" });
  stage("PRIVATE_TRANSFER");
  const transfer = await preparePrivateTransfer(root, archive);
  console.log("SOURCE_EXPORT_PASS");
  console.log("Download the archive and checksum from the Replit Files folder: " + transfer);
  console.log("Primary backup: " + archive);
  console.log("Checksum file: " + archive + ".sha256");
  console.log("Contains production secrets and customer data; do not publish or commit it.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    reportFailure(error);
    process.exitCode = 1;
  });
}
