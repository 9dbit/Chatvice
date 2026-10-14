import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const roots = new Set(['uploads', 'exports', 'attached_assets']);
export function validateManifest(manifest) {
  if (!Array.isArray(manifest.files) || manifest.files.length > 100000) throw new Error('Invalid media manifest');
  const seen = new Set();
  for (const f of manifest.files) {
    if (typeof f.relativePath !== 'string' || f.relativePath.includes('\\') || f.relativePath.includes('\0')) throw new Error('Invalid media path');
    const parts = f.relativePath.split('/');
    if (!roots.has(parts[0]) || parts.length < 2 || parts.some(p => !p || p === '.' || p === '..') || seen.has(f.relativePath)) throw new Error('Invalid media path');
    if (!Number.isSafeInteger(f.size) || f.size < 0 || !/^[a-f0-9]{64}$/.test(f.sha256)) throw new Error('Invalid media checksum');
    seen.add(f.relativePath);
  }
  return manifest.files;
}

export async function hydrate({ root, manifestBytes, expectedSha, getObject, prefix }) {
  if (createHash('sha256').update(manifestBytes).digest('hex') !== expectedSha) throw new Error('Manifest checksum mismatch');
  const files = validateManifest(JSON.parse(manifestBytes.toString()));
  await fs.mkdir(root, { recursive: true, mode: 0o700 });
  if ((await fs.lstat(root)).isSymbolicLink()) throw new Error('Media root must not be a symlink');
  const marker = path.join(root, '.migration-' + expectedSha);
  try { if ((await fs.readFile(marker, 'utf8')) === expectedSha) return { seeded: false, files: files.length }; }
  catch (e) { if (e.code !== 'ENOENT') throw e; }
  let next = 0;
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (next < files.length) {
      const item = files[next++], parts = item.relativePath.split('/');
      let dir = root;
      for (const part of parts.slice(0, -1)) {
        dir = path.join(dir, part);
        await fs.mkdir(dir, { recursive: true, mode: 0o700 });
        if (!(await fs.lstat(dir)).isDirectory()) throw new Error('Unsafe media directory');
      }
      const dest = path.join(root, item.relativePath);
      try {
        const stat = await fs.lstat(dest);
        if (!stat.isFile() || stat.size !== item.size || createHash('sha256').update(await fs.readFile(dest)).digest('hex') !== item.sha256) throw new Error('Existing media conflicts with backup');
        continue;
      } catch (e) { if (e.code !== 'ENOENT') throw e; }
      const temp = dest + '.migration-' + randomUUID();
      const handle = await fs.open(temp, 'wx', 0o600);
      try {
        const hash = createHash('sha256'); let size = 0;
        for await (const chunk of await getObject(prefix + item.relativePath)) {
          size += chunk.length;
          if (size > item.size) throw new Error('Media size mismatch');
          hash.update(chunk);
          await handle.writeFile(chunk);
        }
        if (size !== item.size || hash.digest('hex') !== item.sha256) throw new Error('Media checksum mismatch');
        await handle.close();
        await fs.link(temp, dest); // Never overwrite a concurrent writer.
      } finally { await handle.close().catch(() => {}); await fs.unlink(temp).catch(() => {}); }
    }
  }));
  await fs.writeFile(marker, expectedSha, { mode: 0o600 });
  return { seeded: true, files: files.length };
}

async function main() {
  const key = process.env.LOCAL_MEDIA_MANIFEST_KEY;
  if (!key) return;
  if (!process.env.MEDIA_ROOT || !path.isAbsolute(process.env.MEDIA_ROOT) || !/^[a-f0-9]{64}$/.test(process.env.LOCAL_MEDIA_MANIFEST_SHA256 || '')) throw new Error('Incomplete media migration configuration');
  const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
  const client = new S3Client({ endpoint: process.env.S3_ENDPOINT, region: process.env.S3_REGION || 'auto', forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true', credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY }, requestChecksumCalculation: 'WHEN_REQUIRED', responseChecksumValidation: 'WHEN_REQUIRED' });
  const getObject = async key => (await client.send(new GetObjectCommand({ Bucket: process.env.OBJECT_STORAGE_BUCKET, Key: key }))).Body;
  const body = await getObject(key); const chunks = []; let size = 0;
  for await (const chunk of body) { size += chunk.length; if (size > 10000000) throw new Error('Manifest too large'); chunks.push(chunk); }
  const result = await hydrate({ root: process.env.MEDIA_ROOT, manifestBytes: Buffer.concat(chunks), expectedSha: process.env.LOCAL_MEDIA_MANIFEST_SHA256, getObject, prefix: key.slice(0, key.lastIndexOf('/') + 1) });
  console.log('LOCAL_MEDIA_READY:', result.files);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(() => { console.error('LOCAL_MEDIA_HYDRATION_FAILED'); process.exitCode = 1; });
