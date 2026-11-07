import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { auditHydratedMedia } from "../../script/audit-hydrated-media.mjs";

const digest = bytes => createHash("sha256").update(bytes).digest("hex");
const fixture = files => {
  const bytes = Buffer.from(JSON.stringify({ files }));
  return { manifestBytes: bytes, expectedSha: digest(bytes) };
};

async function withRoot(run) {
  const root = await fs.mkdtemp(path.join(tmpdir(), "chatvice-media-audit-"));
  try { await run(root); } finally { await fs.rm(root, { recursive: true, force: true }); }
}

test("verifies a fixture file by length and sha256 without modifying it", async () => withRoot(async root => {
  await fs.mkdir(path.join(root, "uploads"));
  const content = Buffer.from("test fixture, no customer data");
  const filename = path.join(root, "uploads", "fixture.txt");
  await fs.writeFile(filename, content);
  const report = await auditHydratedMedia({ root, ...fixture([{ relativePath: "uploads/fixture.txt", size: content.length, sha256: digest(content) }]) });
  assert.equal(report.verified, 1);
  assert.equal(report.missing, 0);
  assert.equal(report.bytesVerified, content.length);
  assert.deepEqual(await fs.readFile(filename), content);
}));

test("counts missing, wrong-size, and checksum-mismatched files", async () => withRoot(async root => {
  await fs.mkdir(path.join(root, "uploads"));
  await fs.writeFile(path.join(root, "uploads", "size.txt"), "a");
  await fs.writeFile(path.join(root, "uploads", "digest.txt"), "xxxx");
  const report = await auditHydratedMedia({ root, ...fixture([
    { relativePath: "uploads/missing.txt", size: 1, sha256: digest("x") },
    { relativePath: "uploads/size.txt", size: 2, sha256: digest("aa") },
    { relativePath: "uploads/digest.txt", size: 4, sha256: digest("yyyy") },
  ]) });
  assert.equal(report.missing, 1);
  assert.equal(report.sizeMismatch, 1);
  assert.equal(report.checksumMismatch, 1);
  assert.equal(report.verified, 0);
}));

test("rejects an invalid manifest checksum", async () => withRoot(async root => {
  await assert.rejects(auditHydratedMedia({ root, manifestBytes: Buffer.from('{"files":[]}'), expectedSha: "a".repeat(64) }), /checksum/);
}));

test("does not follow a symlinked media directory", async () => withRoot(async root => {
  const outside = await fs.mkdtemp(path.join(tmpdir(), "chatvice-media-outside-"));
  try {
    await fs.symlink(outside, path.join(root, "uploads"), "dir");
    const report = await auditHydratedMedia({ root, ...fixture([
      { relativePath: "uploads/fixture.txt", size: 1, sha256: digest("x") },
    ]) });
    assert.equal(report.unsafe, 1);
    assert.equal(report.verified, 0);
  } finally { await fs.rm(outside, { recursive: true, force: true }); }
}));
