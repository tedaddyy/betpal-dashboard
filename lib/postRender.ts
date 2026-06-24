// Branded social-post renderer. Draws a BetPal-themed post onto a canvas from a
// spec, so the on-screen mockup and the downloaded PNG are pixel-identical and
// always on-brand (theme + real logo). No fabricated odds ever appear here —
// the model only supplies copy; numbers are never invented in the artwork.

export interface PostSpec {
  format: 'square' | 'story' | 'landscape';
  template: 'odds' | 'stat' | 'announce' | 'quote';
  accent: 'green' | 'white' | 'dark';
  headline: string;
  subtext: string;
  cta: string;
}

export const FORMATS: Record<PostSpec['format'], { w: number; h: number; label: string }> = {
  square: { w: 1080, h: 1080, label: 'Square 1:1' },
  story: { w: 1080, h: 1920, label: 'Story 9:16' },
  landscape: { w: 1200, h: 675, label: 'Landscape 16:9' },
};

const BOOKS = ['Sportsbet', 'TAB', 'Ladbrokes', 'Neds', 'PointsBet'];

function theme(accent: PostSpec['accent']) {
  switch (accent) {
    case 'white':
      return { bg0: '#F1F7F6', bg1: '#E7F0EC', text: '#021B1A', sub: '#42514E', accent: '#0B8A5B',
        chipBg: 'rgba(11,138,91,0.12)', chipText: '#0B8A5B', ctaBg: '#00DF81', ctaText: '#021B1A', foot: '#6B7775', glow: 'rgba(0,223,129,0.18)' };
    case 'dark':
      return { bg0: '#021B1A', bg1: '#04130F', text: '#F1F7F6', sub: '#AACBC4', accent: '#00DF81',
        chipBg: 'rgba(255,255,255,0.06)', chipText: '#AACBC4', ctaBg: '#00DF81', ctaText: '#021B1A', foot: '#707D7D', glow: 'rgba(0,223,129,0.22)' };
    default: // green
      return { bg0: '#0B453A', bg1: '#021B1A', text: '#F1F7F6', sub: '#CDE9E2', accent: '#00DF81',
        chipBg: 'rgba(255,255,255,0.08)', chipText: '#F1F7F6', ctaBg: '#00DF81', ctaText: '#021B1A', foot: '#9FB3AD', glow: 'rgba(0,223,129,0.28)' };
  }
}

const tag = (t: PostSpec['template']) =>
  t === 'odds' ? 'ODDS COMPARISON' : t === 'stat' ? 'COMPARE & WIN' : t === 'announce' ? 'NEW ON BETPAL' : 'BETPAL';

// Horizontal "BetPal" wordmark for social posts. Drop the supplied asset at
// public/logo-wordmark.png and it's used automatically; until then we fall back
// to a drawn two-tone wordmark. The failed lookup is cached so we don't 404 on
// every render.
let _wordmark: HTMLImageElement | null = null;
let _wmTried = false;
function loadWordmark(): Promise<HTMLImageElement | null> {
  if (_wordmark && _wordmark.complete) return Promise.resolve(_wordmark);
  if (_wmTried) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { _wordmark = img; resolve(img); };
    img.onerror = () => { _wmTried = true; resolve(null); };
    img.src = '/logo-wordmark.png';
  });
}

async function ensureFonts() {
  try {
    if ((document as any).fonts) {
      await Promise.all([
        (document as any).fonts.load('800 80px Sora'),
        (document as any).fonts.load('700 48px Sora'),
        (document as any).fonts.load('600 32px Sora'),
        (document as any).fonts.load('500 28px Sora'),
      ]);
      await (document as any).fonts.ready;
    }
  } catch { /* fall back to system font */ }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = (text || '').split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

// Draw the post onto `canvas` at full native resolution for its format, then
// CSS scales it down for display. Returns once drawing (incl. logo) is done.
export async function drawPost(canvas: HTMLCanvasElement, spec: PostSpec): Promise<void> {
  const { w: W, h: H } = FORMATS[spec.format] || FORMATS.square;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const c = theme(spec.accent);
  await ensureFonts();
  const wordmark = await loadWordmark(); // null until the horizontal logo asset is supplied
  const U = W / 1080; // scale unit relative to the square baseline
  const pad = 88 * U;

  // Background
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, c.bg0); g.addColorStop(1, c.bg1);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // Accent glow
  const rg = ctx.createRadialGradient(W * 0.85, H * 0.12, 0, W * 0.85, H * 0.12, W * 0.7);
  rg.addColorStop(0, c.glow); rg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);

  // Brand: clean horizontal BetPal wordmark (NO square badge).
  // If the supplied horizontal logo asset exists, use it; otherwise draw a
  // two-tone "BetPal" wordmark (ink "Bet" + green "Pal").
  ctx.textBaseline = 'alphabetic';
  if (wordmark) {
    const lh = 60 * U;
    ctx.drawImage(wordmark, pad, pad, lh * (wordmark.width / wordmark.height), lh);
  } else {
    const wmSize = 62 * U;
    ctx.font = `800 ${wmSize}px Sora, sans-serif`;
    const betW = ctx.measureText('Bet').width;
    const wmY = pad + wmSize;
    ctx.fillStyle = c.text;
    ctx.fillText('Bet', pad, wmY);
    ctx.fillStyle = c.accent;
    ctx.fillText('Pal', pad + betW, wmY);
    ctx.fillStyle = c.foot;
    ctx.font = `500 ${24 * U}px Sora, sans-serif`;
    ctx.fillText('betpal.app', pad + 2 * U, wmY + 30 * U);
  }

  // Content column
  const cx = pad;
  const contentW = W - pad * 2;
  let y = spec.format === 'landscape' ? H * 0.36 : H * 0.42;

  // Eyebrow tag
  ctx.fillStyle = c.accent;
  ctx.font = `700 ${30 * U}px Sora, sans-serif`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(tag(spec.template).toUpperCase(), cx, y);
  y += 50 * U;

  // Headline (auto-fit a couple of sizes)
  let hSize = spec.format === 'story' ? 118 : spec.format === 'landscape' ? 84 : 104;
  hSize *= U;
  let lines: string[] = [];
  for (let i = 0; i < 6; i++) {
    ctx.font = `800 ${hSize}px Sora, sans-serif`;
    lines = wrap(ctx, spec.headline || '', contentW);
    if (lines.length <= (spec.format === 'landscape' ? 2 : 3)) break;
    hSize *= 0.9;
  }
  ctx.fillStyle = c.text;
  ctx.font = `800 ${hSize}px Sora, sans-serif`;
  const lineH = hSize * 1.08;
  y += hSize;
  for (const ln of lines) { ctx.fillText(ln, cx, y); y += lineH; }

  // Subtext
  if (spec.subtext) {
    y += 14 * U;
    ctx.fillStyle = c.sub;
    const sSize = (spec.format === 'landscape' ? 34 : 40) * U;
    ctx.font = `500 ${sSize}px Sora, sans-serif`;
    for (const ln of wrap(ctx, spec.subtext, contentW)) { y += sSize; ctx.fillText(ln, cx, y); y += sSize * 0.4; }
  }

  // Odds template: a row of real bookmaker chips (names only — never odds)
  if (spec.template === 'odds') {
    y += 40 * U;
    ctx.font = `600 ${28 * U}px Sora, sans-serif`;
    let chipX = cx;
    const chipH = 64 * U, chipPad = 26 * U, gap = 16 * U;
    for (const b of BOOKS) {
      const tw = ctx.measureText(b).width;
      const cw = tw + chipPad * 2;
      if (chipX + cw > cx + contentW) break;
      ctx.fillStyle = c.chipBg;
      roundRect(ctx, chipX, y, cw, chipH, chipH / 2); ctx.fill();
      ctx.fillStyle = c.chipText;
      ctx.textBaseline = 'middle';
      ctx.fillText(b, chipX + chipPad, y + chipH / 2);
      ctx.textBaseline = 'alphabetic';
      chipX += cw + gap;
    }
    y += chipH;
  }

  // CTA pill (anchored toward the bottom)
  const cta = (spec.cta || 'Download free').trim();
  ctx.font = `700 ${36 * U}px Sora, sans-serif`;
  const ctaTw = ctx.measureText(cta).width;
  const ctaW = ctaTw + 76 * U, ctaH = 92 * U;
  const ctaY = H - pad - ctaH - 56 * U;
  ctx.fillStyle = c.ctaBg;
  roundRect(ctx, cx, ctaY, ctaW, ctaH, ctaH / 2); ctx.fill();
  ctx.fillStyle = c.ctaText;
  ctx.textBaseline = 'middle';
  ctx.fillText(cta, cx + 38 * U, ctaY + ctaH / 2);
  ctx.textBaseline = 'alphabetic';

  // Responsible-gambling footer (always present)
  ctx.fillStyle = c.foot;
  ctx.font = `500 ${26 * U}px Sora, sans-serif`;
  ctx.fillText('18+  ·  Gamble Responsibly  ·  Real odds, never tips', cx, H - pad + 8 * U);
}

export async function downloadPost(spec: PostSpec, filename: string): Promise<void> {
  const canvas = document.createElement('canvas');
  await drawPost(canvas, spec);
  await new Promise<void>((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) return resolve();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      resolve();
    }, 'image/png');
  });
}
