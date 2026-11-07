#!/usr/bin/env node
// Read-only source storage diagnostic. Prints fixed labels, never credentials or object keys.
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { preparePrivateTransfer, ensurePrivateDirectory } from "./export-replit-migration.mjs";
import { fileURLToPath, pathToFileURL } from "node:url";

const credentials = {
  audience: "replit", subject_token_type: "access_token",
  token_url: "http://127.0.0.1:1106/token", type: "external_account",
  credential_source: {
    url: "http://127.0.0.1:1106/credential",
    format: { type: "json", subject_token_field_name: "access_token" },
  },
  universe_domain: "googleapis.com",
};

export function safeStorageFailure(error) {
  const status = error?.response?.status ?? error?.statusCode ?? error?.code;
  const numeric = typeof status === "number" ? status : typeof status === "string" && /^[1-5]\d{2}$/.test(status) ? Number(status) : null;
  const allowed = ["ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND", "ECONNRESET", "EAI_AGAIN", "ERR_MODULE_NOT_FOUND", "MODULE_NOT_FOUND", "ERR_REQUIRE_ESM", "ERR_PACKAGE_PATH_NOT_EXPORTED", "ERR_PACKAGE_IMPORT_NOT_DEFINED", "ERR_INVALID_PACKAGE_CONFIG", "ENOENT", "EACCES", "EPERM", "STORAGE_SDK_UNAVAILABLE", "STORAGE_SDK_INTERFACE_INVALID", "STORAGE_SDK_INSTALL_FAILED", "PRIVATE_SDK_PATH_UNSAFE"];
  const code = Number.isInteger(numeric) && numeric >= 100 && numeric <= 599
    ? "HTTP_" + numeric : allowed.includes(error?.code) ? error.code : error?.name === "TypeError" ? "SDK_TYPE_ERROR" : error?.name === "SyntaxError" ? "SDK_SYNTAX_ERROR" : "UNKNOWN_ERROR";
  let endpoint = "UNKNOWN_ENDPOINT";
  try {
    const raw = error?.config?.url ?? error?.response?.config?.url ?? error?.response?.url;
    const url = new URL(raw);
    if (url.hostname === "127.0.0.1" && url.port === "1106") {
      endpoint = url.pathname === "/token" ? "SIDECAR_TOKEN"
        : url.pathname === "/credential" ? "SIDECAR_CREDENTIAL" : "SIDECAR_OTHER";
    } else if (["storage.googleapis.com", "www.googleapis.com"].includes(url.hostname)) {
      endpoint = "GOOGLE_STORAGE";
    } else if (["sts.googleapis.com", "oauth2.googleapis.com"].includes(url.hostname)) {
      endpoint = "GOOGLE_AUTH";
    } else endpoint = "OTHER_ENDPOINT";
  } catch { /* Print no unrecognized URL or error details. */ }
  return { code, endpoint };
}

export async function probeStorage(storage, bucketName, report = console.log) {
  let stage = "TOKEN_EXCHANGE";
  try {
    await storage.authClient.getAccessToken();
    report("TOKEN_EXCHANGE_PASS");
    stage = "BUCKET_LIST";
    await storage.bucket(bucketName).getFiles({ autoPaginate: false, maxResults: 1 });
    report("BUCKET_LIST_PASS");
    report("STORAGE_ACCESS_PASS");
    return { success: true };
  } catch (error) {
    const safe = safeStorageFailure(error);
    report("STORAGE_ACCESS_FAILED [" + stage + "]: " + safe.code + " " + safe.endpoint);
    return { success: false, stage, ...safe };
  }
}

export async function sourceContext(root, env) {
  if (env.RAILWAY_PROJECT_ID) return "SOURCE_CONTEXT_REQUIRED";
  if (!(env.REPL_ID || env.REPLIT_DEPLOYMENT_ID || env.REPL_IDENTITY || env.WEB_REPL_RENEWAL)) return "SOURCE_CONTEXT_REQUIRED";
  let routes;
  try {
    routes = await fs.readFile(path.join(root, "server/routes.ts"), "utf8");
    await fs.access(path.join(root, "server/objectStorage.ts"));
  } catch (error) {
    if (error.code === "ENOENT") return "SOURCE_FILES_MISSING";
    throw error;
  }
  return routes.includes("Chatvice") ? "SOURCE_CONTEXT_PASS" : "SOURCE_APP_MISMATCH";
}

export async function originalDatabaseFilesPresent(backupRoot) {
  for (const name of ["database.dump", "source-config.json"]) {
    try {
      const stat = await fs.lstat(path.join(backupRoot, "chatvice-R7H1dF", name));
      if (!stat.isFile() || stat.isSymbolicLink() || !stat.size) return false;
    } catch (error) {
      if (error.code === "ENOENT") return false;
      throw error;
    }
  }
  return true; // Presence alone does not verify archive decoding or restoration.
}

export async function findStorageSdk(root, backupRoot, report = () => {}) {
  async function load(directory) {
    const resolved = createRequire(path.join(directory, "package.json")).resolve("@google-cloud/storage");
    const module = await import(pathToFileURL(resolved).href);
    const Storage = module.Storage || module.default?.Storage;
    if (typeof Storage !== "function") {
      throw Object.assign(new Error(), { code: "STORAGE_SDK_INTERFACE_INVALID" });
    }
    return { Storage };
  }
  try { return await load(root); }
  catch (error) { report("SDK_CANDIDATE [WORKSPACE]: " + safeStorageFailure(error).code); }
  const workspaceSdk = path.join(root, "chatvice-private-transfer", "sdk");
  const workspaceStat = await fs.lstat(workspaceSdk).catch(error => { if (error.code === "ENOENT") return null; throw error; });
  if (workspaceStat) {
    if (!workspaceStat.isDirectory() || workspaceStat.isSymbolicLink() || (workspaceStat.mode & 0o077) ||
        (process.getuid && workspaceStat.uid !== process.getuid())) {
      report("SDK_CANDIDATE [PRIVATE_WORKSPACE]: PERMISSIONS_OR_OWNER_REJECTED");
    } else {
      try { return await load(workspaceSdk); }
      catch (error) { report("SDK_CANDIDATE [PRIVATE_WORKSPACE]: " + safeStorageFailure(error).code); }
    }
  }
  const candidates = [];
  let entries;
  try { entries = await fs.readdir(backupRoot, { withFileTypes: true }); }
  catch (error) {
    if (error.code !== "ENOENT") throw error;
    report("PRIVATE_SDK_DIRECTORY_MISSING");
    entries = [];
  }
  for (const entry of entries) {
    if (!entry.isDirectory() || !/^sdk[.][A-Za-z0-9]+$/.test(entry.name)) continue;
    const directory = path.join(backupRoot, entry.name);
    const stat = await fs.lstat(directory);
    if ((stat.mode & 0o077) || (process.getuid && stat.uid !== process.getuid())) {
      report("SDK_CANDIDATE [PRIVATE]: PERMISSIONS_OR_OWNER_REJECTED");
      continue;
    }
    candidates.push({ directory, modified: stat.mtimeMs });
  }
  candidates.sort((a, b) => b.modified - a.modified);
  report("PRIVATE_SDK_CANDIDATES: " + candidates.length);
  for (const { directory } of candidates) {
    try { return await load(directory); }
    catch (error) { report("SDK_CANDIDATE [PRIVATE]: " + safeStorageFailure(error).code); }
  }
  throw Object.assign(new Error(), { code: "STORAGE_SDK_UNAVAILABLE" });
}


export async function installWorkspaceSdk(root, report = console.log, run = spawnSync) {
  const transfer = await preparePrivateTransfer(root);
  const sdk = await ensurePrivateDirectory(path.join(transfer, "sdk"));
  report("SDK_INSTALL_START");
  const result = run("npm", ["install", "--prefix", sdk, "--ignore-scripts", "--no-audit", "--no-fund", "--save-exact", "@google-cloud/storage@7.18.0"], { stdio: "pipe", encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  if (result.error || result.status !== 0) {
    await fs.writeFile(path.join(sdk, "npm-install.private.log"), String(result.stderr || result.stdout || "Installation failed"), { mode: 0o600 });
    await fs.chmod(path.join(sdk, "npm-install.private.log"), 0o600);
    throw Object.assign(new Error(), { code: "STORAGE_SDK_INSTALL_FAILED" });
  }
  report("SDK_INSTALL_PASS");
  return sdk;
}

export async function snapshotInventory(root, backupRoot) {
  const locations = [
    ["CURRENT_HOME", backupRoot],
    ["PREVIOUS_HOME", "/home/runner/chatvice-private-backups"],
    ["PRIVATE_WORKSPACE", path.join(root, "chatvice-private-transfer", "backups")],
  ];
  const result = [];
  for (const [label, directory] of locations) {
    let entries;
    try { entries = await fs.readdir(directory, { withFileTypes: true }); }
    catch (error) {
      if (error.code === "ENOENT") { result.push({ label, exists: false, filePairs: 0 }); continue; }
      throw error;
    }
    let filePairs = 0;
    for (const entry of entries) {
      if (!entry.isDirectory() || !entry.name.startsWith("chatvice-")) continue;
      let present = true;
      for (const name of ["database.dump", "source-config.json"]) {
        const stat = await fs.lstat(path.join(directory, entry.name, name)).catch(error => { if (error.code === "ENOENT") return null; throw error; });
        if (!stat?.isFile() || stat.isSymbolicLink() || !stat.size) present = false;
      }
      if (present) filePairs++;
    }
    result.push({ label, exists: true, filePairs });
  }
  return result; // File pairs only; no claim of complete or restored backups.
}

export async function main(report = console.log) {
  let stage = "SOURCE_DIRECTORY";
  try {
    const root = await fs.realpath(process.cwd());
    stage = "SOURCE_FILES";
    const context = await sourceContext(root, process.env);
    report(context);
    if (context !== "SOURCE_CONTEXT_PASS") { process.exitCode = 1; return; }
    if (!process.env.OBJECT_STORAGE_BUCKET) {
      report("SOURCE_BUCKET_NOT_CONFIGURED"); process.exitCode = 1; return;
    }
    const backupRoot = path.join(os.homedir(), "chatvice-private-backups");
    stage = "BACKUP_FILES";
    report("ORIGINAL_DATABASE_FILES_PRESENT: " + await originalDatabaseFilesPresent(backupRoot));
    for (const item of await snapshotInventory(root, backupRoot)) {
      report("BACKUP_LOCATION [" + item.label + "]: " + (item.exists ? "PRESENT" : "MISSING") + " DATABASE_FILE_PAIRS=" + item.filePairs);
    }
    if (process.argv.includes("--install-sdk")) {
      stage = "SDK_INSTALL";
      await installWorkspaceSdk(root, report);
    }
    stage = "SDK_DISCOVERY";
    const { Storage } = await findStorageSdk(root, backupRoot, report);
    report("STORAGE_SDK_LOAD_PASS");
    stage = "SDK_CLIENT_SETUP";
    const storage = new Storage({ projectId: "", credentials, retryOptions: { autoRetry: false } });
    if (typeof storage.authClient?.getAccessToken !== "function") {
      throw Object.assign(new Error(), { code: "STORAGE_SDK_INTERFACE_INVALID" });
    }
    const result = await probeStorage(storage, process.env.OBJECT_STORAGE_BUCKET, report);
    process.exitCode = result.success ? 0 : 1;
  } catch (error) {
    report("STORAGE_DIAGNOSTIC_SETUP_FAILED [" + stage + "]: " + safeStorageFailure(error).code);
    process.exitCode = 1;
  }
}

if (process.argv[1] && await fs.realpath(process.argv[1]).catch(() => "") === fileURLToPath(import.meta.url)) {
  await main();
}
