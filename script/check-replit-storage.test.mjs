import { test } from "node:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { probeStorage, safeStorageFailure, findStorageSdk, sourceContext, originalDatabaseFilesPresent } from "./check-replit-storage.mjs";

test("token exchange failure identifies the sidecar and never calls the bucket", async () => {
  const messages = [];
  const storage = {
    authClient: { getAccessToken: async () => { throw { message: "private-token", response: { status: 401 }, config: { url: "http://127.0.0.1:1106/token" } }; } },
    bucket: () => { assert.fail("Bucket must not be called after token failure"); },
  };
  const result = await probeStorage(storage, "private-bucket", message => messages.push(message));
  assert.deepEqual(result, { success: false, stage: "TOKEN_EXCHANGE", code: "HTTP_401", endpoint: "SIDECAR_TOKEN" });
  assert.deepEqual(messages, ["STORAGE_ACCESS_FAILED [TOKEN_EXCHANGE]: HTTP_401 SIDECAR_TOKEN"]);
});

test("bucket failure distinguishes Google Storage from token exchange", async () => {
  const messages = [];
  const storage = {
    authClient: { getAccessToken: async () => "private-token" },
    bucket: () => ({ getFiles: async () => { throw { response: { status: "401", config: { url: "https://storage.googleapis.com/storage/v1/b/private-bucket/o?private-key" } } }; } }),
  };
  const result = await probeStorage(storage, "private-bucket", message => messages.push(message));
  assert.equal(result.stage, "BUCKET_LIST");
  assert.equal(result.endpoint, "GOOGLE_STORAGE");
  assert.deepEqual(messages, ["TOKEN_EXCHANGE_PASS", "STORAGE_ACCESS_FAILED [BUCKET_LIST]: HTTP_401 GOOGLE_STORAGE"]);
});

test("successful probe limits listing and reveals neither tokens nor object keys", async () => {
  const messages = [];
  const storage = {
    authClient: { getAccessToken: async () => ({ token: "private-token" }) },
    bucket: name => {
      assert.equal(name, "private-bucket");
      return { getFiles: async query => {
        assert.deepEqual(query, { autoPaginate: false, maxResults: 1 });
        return [[{ name: "private-customer-object" }], null];
      } };
    },
  };
  assert.deepEqual(await probeStorage(storage, "private-bucket", message => messages.push(message)), { success: true });
  assert.deepEqual(messages, ["TOKEN_EXCHANGE_PASS", "BUCKET_LIST_PASS", "STORAGE_ACCESS_PASS"]);
});

test("unknown codes, URLs and messages are replaced with fixed labels", () => {
  assert.deepEqual(safeStorageFailure({ code: "private-token", message: "private-message", config: { url: "malformed-private" } }), { code: "UNKNOWN_ERROR", endpoint: "UNKNOWN_ENDPOINT" });
  assert.deepEqual(safeStorageFailure({ code: "ECONNREFUSED", config: { url: "https://private-host.example/secret" } }), { code: "ECONNREFUSED", endpoint: "OTHER_ENDPOINT" });
  assert.deepEqual(safeStorageFailure({ statusCode: 403, config: { url: "http://127.0.0.1:1106/credential" } }), { code: "HTTP_403", endpoint: "SIDECAR_CREDENTIAL" });
});

test("SDK resolution uses a private isolated migration installation", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "chatvice-storage-check-"));
  try {
    const project = path.join(root, "project");
    const backupRoot = path.join(root, "backups");
    const directory = path.join(backupRoot, "sdk.fixture");
    const module = path.join(directory, "node_modules/@google-cloud/storage");
    await fs.mkdir(project);
    await fs.mkdir(module, { recursive: true });
    await fs.chmod(directory, 0o700);
    await fs.writeFile(path.join(module, "package.json"), JSON.stringify({ main: "index.cjs" }));
    await fs.writeFile(path.join(module, "index.cjs"), "module.exports = { Storage: class Storage {} };");
    assert.equal(typeof (await findStorageSdk(project, backupRoot)).Storage, "function");
    await fs.chmod(directory, 0o755);
    await assert.rejects(findStorageSdk(project, backupRoot), { code: "STORAGE_SDK_UNAVAILABLE" });
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("missing private SDK directory reports a safe actionable setup failure", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "chatvice-storage-check-"));
  try {
    const messages = [];
    await assert.rejects(findStorageSdk(root, path.join(root, "missing"), message => messages.push(message)), { code: "STORAGE_SDK_UNAVAILABLE" });
    assert.deepEqual(messages, ["SDK_CANDIDATE [WORKSPACE]: MODULE_NOT_FOUND", "PRIVATE_SDK_DIRECTORY_MISSING", "PRIVATE_SDK_CANDIDATES: 0"]);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("source guard identifies missing Chatvice files and a different app", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "chatvice-storage-check-"));
  try {
    const env = { REPL_ID: "fixture" };
    assert.equal(await sourceContext(root, env), "SOURCE_FILES_MISSING");
    await fs.mkdir(path.join(root, "server"));
    await fs.writeFile(path.join(root, "server/routes.ts"), "// Different app");
    await fs.writeFile(path.join(root, "server/objectStorage.ts"), "");
    assert.equal(await sourceContext(root, env), "SOURCE_APP_MISMATCH");
    await fs.writeFile(path.join(root, "server/routes.ts"), "// Chatvice");
    assert.equal(await sourceContext(root, env), "SOURCE_CONTEXT_PASS");
    assert.equal(await sourceContext(root, { ...env, RAILWAY_PROJECT_ID: "target" }), "SOURCE_CONTEXT_REQUIRED");
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("original snapshot presence check requires nonempty regular files", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "chatvice-storage-check-"));
  try {
    assert.equal(await originalDatabaseFilesPresent(root), false);
    const directory = path.join(root, "chatvice-R7H1dF");
    await fs.mkdir(directory);
    await fs.writeFile(path.join(directory, "database.dump"), "fixture");
    await fs.writeFile(path.join(directory, "source-config.json"), "{}");
    assert.equal(await originalDatabaseFilesPresent(root), true);
    await fs.unlink(path.join(directory, "database.dump"));
    await fs.symlink(path.join(directory, "source-config.json"), path.join(directory, "database.dump"));
    assert.equal(await originalDatabaseFilesPresent(root), false);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("SDK discovery supports ESM packages without using CommonJS require", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "chatvice-storage-check-"));
  try {
    const module = path.join(root, "node_modules/@google-cloud/storage");
    await fs.mkdir(module, { recursive: true });
    await fs.writeFile(path.join(module, "package.json"), JSON.stringify({ type: "module", main: "index.mjs" }));
    await fs.writeFile(path.join(module, "index.mjs"), "export class Storage {}");
    assert.equal(typeof (await findStorageSdk(root, path.join(root, "no-backups"))).Storage, "function");
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("CLI reports missing source files explicitly without revealing paths or raw errors", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "chatvice-storage-check-"));
  try {
    const script = await fs.realpath(fileURLToPath(new URL("./check-replit-storage.mjs", import.meta.url)));
    const result = spawnSync(process.execPath, [script], {
      cwd: root, env: { ...process.env, REPL_ID: "fixture", RAILWAY_PROJECT_ID: "" }, encoding: "utf8",
    });
    assert.equal(result.status, 1);
    assert.equal(result.stdout.trim(), "SOURCE_FILES_MISSING");
    assert.equal(result.stderr, "");
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});
