// Photos are shrunk on the phone before saving (fast to sync, small to store).
export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = () => reject(r.error); r.readAsDataURL(file); });
}
export function loadImage(src) {
  return new Promise((resolve, reject) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => resolve(i); i.onerror = () => reject(new Error('Could not open that picture')); i.src = src; });
}
/** Returns a JPEG data URL no larger than `max` pixels on its longest side. */
export async function compress(file, max = 1280, quality = 0.8) {
  const img = await loadImage(await fileToDataUrl(file));
  const k = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
  g.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', quality);
}
/** data:…;base64 → Blob (for uploading). */
export async function dataUrlToBlob(url) { return (await fetch(url)).blob(); }

/**
 * Offline / demo style preview: paints the fabric onto the garment in the style picture.
 * Light background pixels stay; everything darker takes the fabric pattern with the photo's shading.
 */
export async function blendPreview(styleSrc, fabricSrc, size = 720) {
  const [style, fabric] = await Promise.all([loadImage(styleSrc), loadImage(fabricSrc)]);
  const k = size / Math.max(style.width, style.height);
  const w = Math.round(style.width * k); const h = Math.round(style.height * k);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.drawImage(style, 0, 0, w, h);
  const base = g.getImageData(0, 0, w, h);
  const f = document.createElement('canvas'); f.width = w; f.height = h;
  const fg = f.getContext('2d');
  const tile = Math.max(80, Math.round(w / 3));
  const th = Math.max(1, Math.round(tile * (fabric.height / fabric.width)));
  for (let y = 0; y < h; y += th) for (let x = 0; x < w; x += tile) fg.drawImage(fabric, x, y, tile, th);
  const fab = fg.getImageData(0, 0, w, h);
  const out = g.createImageData(w, h);
  for (let i = 0; i < base.data.length; i += 4) {
    const r = base.data[i]; const gg = base.data[i + 1]; const b = base.data[i + 2];
    const lum = (r * 0.299 + gg * 0.587 + b * 0.114) / 255;
    const sat = Math.max(r, gg, b) - Math.min(r, gg, b);
    const background = lum > 0.86 && sat < 30;
    const skin = r > 80 && r > gg && gg > b && r - b > 30 && r - b < 120 && lum < 0.7 && lum > 0.25 && sat < 110 && i < base.data.length * 0.22;
    if (background || skin) { out.data[i] = r; out.data[i + 1] = gg; out.data[i + 2] = b; } else {
      const shade = 0.55 + lum * 0.6;
      out.data[i] = Math.min(255, fab.data[i] * shade); out.data[i + 1] = Math.min(255, fab.data[i + 1] * shade); out.data[i + 2] = Math.min(255, fab.data[i + 2] * shade);
    }
    out.data[i + 3] = 255;
  }
  g.putImageData(out, 0, 0);
  return c.toDataURL('image/jpeg', 0.85);
}
