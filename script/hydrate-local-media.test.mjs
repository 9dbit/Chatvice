import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { hydrate, validateManifest } from './hydrate-local-media.mjs';
const hash = data => createHash('sha256').update(data).digest('hex');
test('hydrates verified bytes; restart preserves subsequently modified uploads', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'media-test-'));
  try {
    const body = Buffer.from('media');
    const manifestBytes = Buffer.from(JSON.stringify({ files: [{ relativePath: 'uploads/a', size: body.length, sha256: hash(body) }] }));
    const args = { root, manifestBytes, expectedSha: hash(manifestBytes), prefix: 'seed/', getObject: async function* (key) { assert.equal(key, 'seed/uploads/a'); yield body; } };
    assert.equal((await hydrate(args)).seeded, true);
    assert.equal(await fs.readFile(path.join(root, 'uploads/a'), 'utf8'), 'media');
    await fs.writeFile(path.join(root, 'uploads/a'), 'new');
    assert.equal((await hydrate(args)).seeded, false);
    assert.equal(await fs.readFile(path.join(root, 'uploads/a'), 'utf8'), 'new');
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});
test('rejects traversal, duplicate files, corruption, and symlink destinations', async () => {
  const item = { relativePath: 'uploads/a', size: 1, sha256: hash('a') };
  for (const relativePath of ['../secret', '/uploads/a', 'uploads/../a', 'uploads//a', 'uploads/./a']) assert.throws(() => validateManifest({ files: [{ ...item, relativePath }] }));
  assert.throws(() => validateManifest({ files: [item, item] }));
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'media-test-'));
  try {
    const manifestBytes = Buffer.from(JSON.stringify({ files: [item] }));
    const args = { root, manifestBytes, expectedSha: hash(manifestBytes), prefix: '', getObject: async function* () { yield Buffer.from('b'); } };
    await assert.rejects(hydrate(args), /checksum/);
    await assert.rejects(fs.stat(path.join(root, 'uploads/a')), { code: 'ENOENT' });
    await fs.rm(path.join(root, 'uploads'), { recursive: true });
    await fs.symlink(os.tmpdir(), path.join(root, 'uploads'));
    await assert.rejects(hydrate(args), /Unsafe/);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});
