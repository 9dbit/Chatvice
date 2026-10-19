#!/usr/bin/env node
/**
 * Read-only checksum audit of the media hydration manifest against MEDIA_ROOT.
 * Does not print credentials, object paths, file names, or customer content.
 * Run off-peak: verification reads every byte of every manifest-listed file.
 */
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateManifest } from "./hydrate-local-media.mjs";

const hexDigest = (buffer) => createHash("sha256").update(buffer).digest("hex");

async function shaFile(filename) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filename)) hash.update(chunk);
  return hash.digest("hex");
}

export async function auditHydratedMedia({ root, manifestBytes, expectedSha }) {
  if (!root || !path.isAbsolute(root)) throw new Error("MEDIA_ROOT must be absolute");
  if (!/^[0-9a-f]{64}$/.test(expectedSha || "") || hexDigest(manifestBytes) !== expectedSha) {
    throw new Error("Media manifest checksum mismatch");
  }
  const files = validateManifest(JSON.parse(manifestBytes.toString("utf8")));
  const rootStat = await fs.lstat(root);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new Error("Unsafe media root");

  const report = {
    expected: files.length,
    verified: 0,
    missing: 0,
    sizeMismatch: 0,
    checksumMismatch: 0,
    unsafe: 0,
    bytesExpected: 0,
    bytesVerified: 0,
  };

  for (const file of files) {
    report.bytesExpected += file.size;
    const parts = file.relativePath.split("/");
    let safe = true;
    let current = root;
    for (const part of parts.slice(0, -1)) {
      current = path.join(current, part);
      try {
        const st = await fs.lstat(current);
        if (!st.isDirectory() || st.isSymbolicLink()) safe = false;
      } catch (error) {
        if (error?.code === "ENOENT") { report.missing++; safe = false; break; }
        throw error;
      }
      if (!safe) { report.unsafe++; break; }
    }
    if (!safe) continue;

    const filename = path.join(root, file.relativePath);
    let stat;
    try {
      stat = await fs.lstat(filename);
    } catch (error) {
      if (error?.code === "ENOENT") { report.missing++; continue; }
      throw error;
    }
    if (!stat.isFile() || stat.isSymbolicLink()) { report.unsafe++; continue; }
    if (stat.size !== file.size) { report.sizeMismatch++; continue; }
    if ((await shaFile(filename)) !== file.sha256) { report.checksumMismatch++; continue; }
    report.verified++;
    report.bytesVerified += file.size;
  }
  return report;
}

async function main() {
  const env = process.env;
  const keys = ["MEDIA_ROOT", "LOCAL_MEDIA_MANIFEST_KEY", "LOCAL_MEDIA_MANIFEST_SHA256", "S3_ENDPOINT", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "OBJECT_STORAGE_BUCKET"];
  if (keys.some(key => !env[key])) throw new Error("Required media audit configuration is incomplete");
  const endpoint = new URL(env.S3_ENDPOINT);
  if (!["http:", "https:"].includes(endpoint.protocol) || endpoint.username || endpoint.password) throw new Error("Invalid storage endpoint configuration");
  const { S3Client, GetObjectCommand } = await import("@aws-sdk/client-s3");
  const client = new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION || "auto",
    credentials: { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY },
    forcePathStyle: env.S3_FORCE_PATH_STYLE === "true",
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  const object = await client.send(new GetObjectCommand({ Bucket: env.OBJECT_STORAGE_BUCKET, Key: env.LOCAL_MEDIA_MANIFEST_KEY }));
  const chunks = [];
  let total = 0;
  for await (const chunk of object.Body) {
    total += chunk.length;
    if (total > 10_000_000) throw new Error("Media manifest exceeds safety limit");
    chunks.push(chunk);
  }
  const report = await auditHydratedMedia({
    root: env.MEDIA_ROOT,
    manifestBytes: Buffer.concat(chunks),
    expectedSha: env.LOCAL_MEDIA_MANIFEST_SHA256,
  });
  console.log("MEDIA_INTEGRITY_AUDIT " + JSON.stringify(report));
  if (report.verified !== report.expected) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => {
    console.error("MEDIA_INTEGRITY_AUDIT_FAILED (details withheld)");
    process.exitCode = 2;
  });
}
