// There is no logo PNG in the project, so the full logo (star mark + "Freightbook.ai") is composed from the
// same parts as BrandWordmark: its star path and gradient, the brand font and the primary colour.
export const BRAND_FONT = '"FacebookSansBold", "Space Grotesk", sans-serif';
const MARK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24"><defs><linearGradient id="g" x1="3" y1="20" x2="21" y2="4" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FACC15"/><stop offset=".28" stop-color="#22C55E"/><stop offset=".56" stop-color="#3B82F6"/><stop offset=".82" stop-color="#EF4444"/><stop offset="1" stop-color="#F97316"/></linearGradient></defs><path d="M12 1.75C13.35 6.65 17.35 10.65 22.25 12C17.35 13.35 13.35 17.35 12 22.25C10.65 17.35 6.65 13.35 1.75 12C6.65 10.65 10.65 6.65 12 1.75Z" fill="url(#g)"/></svg>';
export const logoMark = typeof Image === 'undefined' ? null : Object.assign(new Image(), { src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(MARK_SVG)}` });
const logoCache: Partial<Record<'dark' | 'light' | 'white', HTMLCanvasElement>> = {};
export const resetBrandLogo = () => { delete logoCache.dark; delete logoCache.light; delete logoCache.white; };
/** The composed logo on a transparent canvas: dark or white wordmark, or 'white' for an all-white logo (star included). Null until the star has loaded. */
export function brandLogo(tone: 'dark' | 'light' | 'white') {
  if (!logoMark?.complete || !logoMark.naturalWidth) return null;
  const cached = logoCache[tone]; if (cached) return cached;
  const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d')!, size = 128, font = `bold ${Math.round(size * .6)}px ${BRAND_FONT}`;
  ctx.font = font;
  const main = ctx.measureText('Freightbook').width, ai = ctx.measureText('.ai').width;
  canvas.width = Math.ceil(size * 1.15 + main + ai + 8); canvas.height = size; // resizing resets the context
  ctx.drawImage(logoMark, 4, 4, size - 8, size - 8);
  ctx.font = font; ctx.textBaseline = 'middle';
  ctx.fillStyle = tone === 'dark' ? '#0f172a' : '#ffffff'; ctx.fillText('Freightbook', size * 1.1, size * .54);
  ctx.fillStyle = '#00AEEF'; ctx.fillText('.ai', size * 1.1 + main, size * .54);
  // All-white: keep the drawn shapes' coverage but paint every pixel white.
  if (tone === 'white') { ctx.globalCompositeOperation = 'source-in'; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  return (logoCache[tone] = canvas);
}
