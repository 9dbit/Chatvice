#!/usr/bin/env node
// Read-only source storage diagnostic. Prints fixed labels, never credentials or object keys.
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

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
  const allowed = ["ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND", "ECONNRESET", "EAI_AGAIN", "ERR_MODULE_NOT_FOUND", "MODULE_NOT_FOUND"];
  const code = Number.isInteger(numeric) && numeric >= 100 && numeric <= 599
    ? "HTTP_" + numeric : allowed.includes(error?.code) ? error.code : "UNKNOWN_ERROR";
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

export async function findStorageSdk(root, backupRoot) {
  try { return createRequire(path.join(root, "package.json"))("@google-cloud/storage"); }
  catch { /* Use the isolated SDK installed for migration. */ }
  const candidates = [];
  for (const entry of await fs.readdir(backupRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^sdk\.[A-Za-z0-9]+$/.test(entry.name)) continue;
    const directory = path.join(backupRoot, entry.name);
    const stat = await fs.lstat(directory);
    if ((stat.mode & 0o077) || (process.getuid && stat.uid !== process.getuid())) continue;
    candidates.push({ directory, modified: stat.mtimeMs });
  }
  candidates.sort((a, b) => b.modified - a.modified);
  for (const { directory } of candidates) {
    try { return createRequire(path.join(directory, "package.json"))("@google-cloud/storage"); }
    catch { /* An earlier installation may be incomplete. */ }
  }
  throw new Error("STORAGE_SDK_UNAVAILABLE");
}

async function main() {
  const root = await fs.realpath(process.cwd());
  const routes = await fs.readFile(path.join(root, "server/routes.ts"), "utf8");
  if (!routes.includes("Chatvice") || process.env.RAILWAY_PROJECT_ID ||
      !(process.env.REPL_ID || process.env.REPLIT_DEPLOYMENT_ID || process.env.REPL_IDENTITY || process.env.WEB_REPL_RENEWAL)) {
    console.log("SOURCE_CONTEXT_REQUIRED"); process.exitCode = 1; return;
  }
  if (!process.env.OBJECT_STORAGE_BUCKET) {
    console.log("SOURCE_BUCKET_NOT_CONFIGURED"); process.exitCode = 1; return;
  }
  const { Storage } = await findStorageSdk(root, path.join(os.homedir(), "chatvice-private-backups"));
  console.log("STORAGE_SDK_LOAD_PASS");
  const storage = new Storage({ projectId: "", credentials, retryOptions: { autoRetry: false } });
  const result = await probeStorage(storage, process.env.OBJECT_STORAGE_BUCKET);
  process.exitCode = result.success ? 0 : 1;
}

if (process.argv[1] && await fs.realpath(process.argv[1]).catch(() => "") === fileURLToPath(import.meta.url)) {
  main().catch(() => { console.log("STORAGE_DIAGNOSTIC_SETUP_FAILED"); process.exitCode = 1; });
}
