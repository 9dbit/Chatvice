import { PROMO_IMAGE_MAX_BYTES, PROMO_UPLOAD_MAX_BYTES, PROMO_VIDEO_EXTENSIONS } from '@shared/promoMedia';
const imageTypes = ['image/png', 'image/gif', 'image/jpeg', 'image/jpg', 'image/webp'];

export async function preparePromoFile(file: File): Promise<Blob> {
  if (!file.size) throw new Error('Choose a non-empty image or video.');
  if (imageTypes.includes(file.type.toLowerCase())) {
    if (file.size > PROMO_IMAGE_MAX_BYTES) throw new Error('Use an image smaller than 5 MB.');
    return file;
  }
  if (file.size > PROMO_UPLOAD_MAX_BYTES) throw new Error('Use a video smaller than 50 MB.');
  // Server decodes the actual bytes and converts them, including iPhone MOV.
  if (file.type.startsWith('video/') || PROMO_VIDEO_EXTENSIONS.test(file.name) || !file.type || file.type === 'application/octet-stream') return file;
  throw new Error('Choose a video or a PNG, GIF, JPEG or WebP image.');
}

export function uploadPromo(file: Blob, filename: string, onProgress: (progress: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload/promo');
    xhr.withCredentials = true;
    xhr.timeout = 180000;
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
