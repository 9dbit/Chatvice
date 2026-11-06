const imageTypes = ['image/png', 'image/gif', 'image/jpeg', 'image/jpg', 'image/webp'];

export async function preparePromoFile(file: File): Promise<Blob> {
  if (file.size > 5 * 1024 * 1024) throw new Error('Use a file smaller than 5 MB.');
  if (imageTypes.includes(file.type.toLowerCase())) return file;
  // iOS Files can report MP4 as QuickTime, octet-stream, or no MIME type.
  // Check the container, rather than rejecting a valid file on MIME alone.
  if (!/\.mp4$/i.test(file.name) && file.type !== 'video/mp4') {
    throw new Error('Use PNG, GIF, JPEG, WebP or an MP4 video.');
  }
  const bytes = new Uint8Array(await file.slice(0, 64).arrayBuffer());
  const text = (offset: number) => String.fromCharCode(...bytes.slice(offset, offset + 4));
  const brands = [text(8)];
  for (let i = 16; i + 4 <= bytes.length; i += 4) brands.push(text(i));
  if (text(4) !== 'ftyp' || !brands.some(b => /^(isom|iso[2-9]|mp4[12]|avc1|M4V |MSNV)$/.test(b))) {
    throw new Error('This file is not a supported MP4. Export it as MP4 (H.264) and try again.');
  }
  return new Blob([file], { type: 'video/mp4' });
}

export function uploadPromo(file: Blob, filename: string, onProgress: (progress: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload');
    xhr.withCredentials = true;
    xhr.timeout = 120000;
    xhr.upload.onprogress = event => {
      if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100));
    };
    xhr.onerror = () => reject(new Error('Upload failed. Check your connection and try again.'));
    xhr.ontimeout = () => reject(new Error('Upload timed out. Please try again.'));
    xhr.onabort = () => reject(new Error('Upload cancelled.'));
    xhr.onload = () => {
      let data: { url?: string; error?: string } = {};
      try { data = JSON.parse(xhr.responseText); } catch { /* report invalid server response */ }
      if (xhr.status < 200 || xhr.status >= 300 || !data.url) {
        reject(new Error(data.error || `Upload failed (HTTP ${xhr.status}).`));
      } else resolve(data.url);
    };
    const form = new FormData();
    form.append('file', file, filename);
    form.append('type', 'welcome_bubble_promo');
    xhr.send(form);
  });
}
