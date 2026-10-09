import { test } from "node:test";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { selectApplicationVariables, discoverVariableNames, exportLocalMedia, objectBackupName, checksum, preflight, preparePrivateTransfer, prepareDatabaseConnection, classifyProcessFailure } from "./export-replit-migration.mjs";

async function fixture(run) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "chatvice-export-test-"));
  try { await run(root); }
  finally { await fs.rm(root, { recursive: true, force: true }); }
}

test("application variables exclude source database, worker flags and platform credentials", () => {
  const env = {
    DATABASE_URL: "source-database-secret", JWT_SECRET: "jwt", RESEND_API_KEY: "email",
    REPL_IDENTITY: "identity", WEB_REPL_RENEWAL: "renewal", REPLIT_CONNECTORS_HOSTNAME: "connector",
    RAILWAY_TOKEN: "railway", ENABLE_BACKGROUND_JOBS: "true", S3_SECRET_ACCESS_KEY: "bucket",
    APP_URL: "https://source.example.com", PATH: "system",
  };
  assert.deepEqual(selectApplicationVariables(Object.keys(env).filter(k => k !== "PATH"), env), { JWT_SECRET: "jwt", RESEND_API_KEY: "email" });
});

test("configuration discovery includes dot and bracket environment access without reading env values", async () => {
  await fixture(async root => {
    await fs.mkdir(path.join(root, "server"));
    await fs.writeFile(path.join(root, "server/index.ts"), "process.env.OPENAI_API_KEY; process.env['CUSTOM_API_SECRET']; process.env[dynamicKey]");
    const names = await discoverVariableNames(root);
    assert.ok(names.includes("OPENAI_API_KEY"));
    assert.ok(names.includes("CUSTOM_API_SECRET"));
    assert.ok(names.includes("DATABASE_URL"));
    assert.ok(!names.includes("dynamicKey"));
  });
});

test("object keys cannot traverse outside the backup directory", () => {
  const keys = ["../../secret", "/absolute/path", "uploads/file.png", "uploads/ä.png"];
  const names = keys.map(objectBackupName);
  for (const name of names) assert.match(name, /^[a-f0-9]{64}$/);
  assert.equal(new Set(names).size, keys.length);
});

test("local media preserves original paths, bytes and checksum", async () => {
  await fixture(async root => {
    const source = path.join(root, "source"), output = path.join(root, "output");
    await fs.mkdir(path.join(source, "uploads/nested"), { recursive: true });
    await fs.mkdir(output);
    await fs.writeFile(path.join(source, "uploads/nested/image.png"), Buffer.from([0, 1, 2, 255]));
    const result = await exportLocalMedia(source, output);
    assert.equal(result.files.length, 1);
    const file = result.files[0];
    assert.equal(file.relativePath, "uploads/nested/image.png");
    assert.equal(file.size, 4);
    assert.deepEqual(await fs.readFile(path.join(output, file.backupPath)), Buffer.from([0, 1, 2, 255]));
    assert.equal(file.sha256, await checksum(path.join(output, file.backupPath)));
    assert.equal((await fs.stat(path.join(output, file.backupPath))).mode & 0o777, 0o600);
  });
});

test("local media reports symlinks without following them", async () => {
  await fixture(async root => {
    const source = path.join(root, "source"), output = path.join(root, "output");
    await fs.mkdir(path.join(source, "uploads"), { recursive: true });
    await fs.mkdir(output);
    await fs.writeFile(path.join(root, "outside-secret"), "private");
    await fs.symlink(path.join(root, "outside-secret"), path.join(source, "uploads/link"));
    const result = await exportLocalMedia(source, output);
    assert.deepEqual(result.files, []);
    assert.deepEqual(result.skippedSymlinks, ["uploads/link"]);
  });
});

test("source guard refuses Railway before running database tools", async () => {
  await fixture(async root => {
    await fs.mkdir(path.join(root, "server"));
    await fs.writeFile(path.join(root, "server/routes.ts"), "// Chatvice");
    await fs.writeFile(path.join(root, "server/objectStorage.ts"), "");
    await assert.rejects(preflight(root, { REPL_ID: "source", RAILWAY_PROJECT_ID: "target", DATABASE_URL: "secret" }), /cannot run on Railway/);
  });
});

test("source guard refuses unrelated projects and a missing source database", async () => {
  await fixture(async root => {
    await fs.mkdir(path.join(root, "server"));
    await fs.writeFile(path.join(root, "server/routes.ts"), "// Other app");
    await fs.writeFile(path.join(root, "server/objectStorage.ts"), "");
    await assert.rejects(preflight(root, { REPL_ID: "source" }), /source Chatvice/);
    await fs.writeFile(path.join(root, "server/routes.ts"), "// Chatvice");
    await assert.rejects(preflight(root, { REPL_ID: "source" }), /DATABASE_URL is missing/);
  });
});

test("download archives remain private and are ignored by the source Git checkout", async () => {
  await fixture(async root => {
    const source = path.join(root, "source");
    await fs.mkdir(source);
    assert.equal(spawnSync("git", ["init", source], { stdio: "pipe" }).status, 0);
    const archive = path.join(root, "backup.tar.gz");
    await fs.writeFile(archive, "private archive");
    await fs.writeFile(archive + ".sha256", "checksum");
    const folder = await preparePrivateTransfer(source, archive);
    assert.equal((await fs.stat(folder)).mode & 0o777, 0o700);
    assert.equal((await fs.stat(path.join(folder, "backup.tar.gz"))).mode & 0o777, 0o600);
    assert.equal(await fs.readFile(path.join(folder, "backup.tar.gz"), "utf8"), "private archive");
    assert.equal(spawnSync("git", ["check-ignore", "--quiet", "--", "chatvice-private-transfer/backup.tar.gz"], { cwd: source }).status, 0);
    const status = spawnSync("git", ["status", "--porcelain"], { cwd: source, encoding: "utf8" });
    assert.equal(status.stdout.trim(), "");
  });
});

test("database URI is split into a private libpq service file, not passed as PGDATABASE", async () => {
  await fixture(async root => {
    const uri = "postgresql://export_user:p%40%23%3A%3D@source.example.com:5433/chatvice%2Dproduction?sslmode=require&channel_binding=require";
    const connection = await prepareDatabaseConnection(uri, root);
    assert.deepEqual(connection.args, ["--dbname=service=chatvice_migration", "--no-password"]);
    assert.equal(connection.env.PGDATABASE, undefined);
    assert.equal(connection.env.PGSERVICE, "chatvice_migration");
    const config = await fs.readFile(connection.env.PGSERVICEFILE, "utf8");
    for (const line of ["host=source.example.com", "port=5433", "user=export_user", "password=p@#:=", "dbname=chatvice-production", "sslmode=require", "channel_binding=require"]) {
      assert.ok(config.split("\n").includes(line));
    }
    assert.equal((await fs.stat(connection.env.PGSERVICEFILE)).mode & 0o777, 0o600);
    assert.ok(!connection.args.join(" ").includes("export_user"));
    assert.ok(!connection.args.join(" ").includes("p@#:="));
  });
});

test("database service handles IPv6 and libpq query overrides", async () => {
  await fixture(async root => {
    const connection = await prepareDatabaseConnection("postgresql://user:password@[::1]/default?dbname=selected&connect_timeout=30", root);
    const config = await fs.readFile(connection.env.PGSERVICEFILE, "utf8");
    assert.ok(config.includes("host=::1\n"));
    assert.ok(config.includes("dbname=selected\n"));
    assert.ok(config.includes("connect_timeout=30\n"));
    assert.ok(!config.includes("dbname=default\n"));
  });
});

test("database service rejects malformed URLs and line injection without leaking secrets", async () => {
  for (const uri of ["secret", "https://secret@example.com/db", "postgres://user:secret@example.com/db?host=x%0Apassword=leak", "postgres://user:secret@example.com/db?service=other"]) {
    await fixture(async root => {
      await assert.rejects(prepareDatabaseConnection(uri, root), error => {
        assert.ok(!error.message.includes("secret"));
        assert.ok(!error.message.includes("leak"));
        return true;
      });
      assert.deepEqual(await fs.readdir(root), []);
    });
  }
});

test("database diagnostics show only version numbers for a client/server mismatch", () => {
  const result = { status: 1, stderr: "pg_dump: error: server version: 17.5; pg_dump version: 16.2\npg_dump: error: aborting because of server version mismatch\npassword=hidden" };
  assert.equal(classifyProcessFailure(result), "POSTGRES_VERSION_MISMATCH (server 17.5, pg_dump 16.2)");
});

test("database diagnostics classify authentication, DNS, connection and permissions without echoing details", () => {
  for (const [stderr, code] of [
    ['password authentication failed for user "secret"', "DATABASE_AUTHENTICATION_FAILED"],
    ['could not translate host name "secret-host"', "DATABASE_DNS_FAILED"],
    ["secret connection refused", "DATABASE_CONNECTION_REFUSED"],
    ["secret timeout expired", "DATABASE_CONNECTION_TIMEOUT"],
    ["secret SSL error", "DATABASE_TLS_FAILED"],
    ["secret permission denied for table customer_data", "DATABASE_PERMISSION_DENIED"],
  ]) {
    assert.equal(classifyProcessFailure({ status: 1, stderr }), code);
  }
  assert.equal(classifyProcessFailure({ status: 1, stderr: "secret details" }), "PROCESS_FAILED (exit 1)");
  assert.equal(classifyProcessFailure({ error: { code: "ENOENT" } }), "EXECUTABLE_NOT_FOUND");
});
