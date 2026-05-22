/**
 * Converts any image File to a WebP data-URL, resized to fit within
 * maxWidth × maxHeight while preserving the aspect ratio.
 *
 * Falls back to PNG if the browser doesn't support WebP encoding.
 */
export function convertToWebP(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxWidth / img.width, maxHeight / img.height);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);

      const webp = canvas.toDataURL("image/webp", quality);
      if (webp.startsWith("data:image/webp")) {
        resolve(webp);
      } else {
        resolve(canvas.toDataURL("image/png", quality));
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}
