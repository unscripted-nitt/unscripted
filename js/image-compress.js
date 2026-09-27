// js/image-compress.js — shrinks photos in the browser before they are
// uploaded to Firebase Storage, so the public pages never have to download
// multi-megabyte originals (a 2000px poster PNG was ~5MB).
//
// Returns a WebP File no wider/taller than maxSize px. Falls back to the
// original file when it can't help: GIFs/SVGs (would lose animation/vectors),
// images already small enough, or browsers that can't encode WebP.

const SKIP_TYPES = ['image/gif', 'image/svg+xml'];

export async function compressImage(file, { maxSize = 1600, quality = 0.82 } = {}) {
  if (!file.type.startsWith('image/') || SKIP_TYPES.includes(file.type)) return file;

  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return file; // format the browser can't decode (e.g. HEIC on Chrome)
  }

  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', quality));
  if (!blob || blob.type !== 'image/webp' || blob.size >= file.size) return file;

  const name = file.name.replace(/\.[^.]+$/, '') + '.webp';
  return new File([blob], name, { type: 'image/webp', lastModified: Date.now() });
}
