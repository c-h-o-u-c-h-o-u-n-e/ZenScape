const MEDICATION_FORMATS = [
  'Capsule',
  'Comprimé',
  'Crème',
  'Gel',
  'Gouttes',
  'Inhalateur',
  'Injection',
  'Patch',
  'Pommade',
  'Sirop',
  'Suppositoire',
  'Suspension orale',
] as const;

function resolveCssVarColor(color: string): string {
  if (typeof window === 'undefined') return color;
  const match = color.match(/^var\((--[^)]+)\)$/);
  if (!match) return color;
  const resolved = getComputedStyle(document.documentElement).getPropertyValue(match[1]).trim();
  return resolved || color;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  h /= 6;
  return { h: h * 360, s, l };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const hn = ((h % 360) + 360) % 360 / 360;
  if (s === 0) {
    const gray = l * 255;
    return { r: gray, g: gray, b: gray };
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: hue2rgb(p, q, hn + 1 / 3) * 255,
    g: hue2rgb(p, q, hn) * 255,
    b: hue2rgb(p, q, hn - 1 / 3) * 255,
  };
}

function mixHex(a: string, b: string, weightB = 0.3): string {
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  const wA = 1 - weightB;
  return rgbToHex(ar * wA + br * weightB, ag * wA + bg * weightB, ab * wA + bb * weightB);
}

function getThemeAwareMedicationPalette(): Record<string, string> {
  if (typeof window === 'undefined') {
    return Object.fromEntries(MEDICATION_FORMATS.map((format) => [format, '#F2F2F2']));
  }

  const rootStyles = getComputedStyle(document.documentElement);
  const cta = resolveCssVarColor(rootStyles.getPropertyValue('--theme-cta').trim() || '#7D848C');
  const background = resolveCssVarColor(rootStyles.getPropertyValue('--theme-background').trim() || '#E6E8EA');
  const accent = resolveCssVarColor(rootStyles.getPropertyValue('--theme-accent').trim() || '#C8D4DE');

  const base = rgbToHsl(...Object.values(hexToRgb(cta)) as [number, number, number]);
  const accentHsl = rgbToHsl(...Object.values(hexToRgb(accent)) as [number, number, number]);
  const hueStart = (base.h + accentHsl.h * 0.18) % 360;

  const palette: Record<string, string> = {};
  MEDICATION_FORMATS.forEach((format, index) => {
    const hue = (hueStart + index * 30) % 360;
    const sat = Math.max(0.42, Math.min(0.72, base.s + 0.1));
    const light = 0.74 + (index % 3) * 0.035;
    const rgb = hslToRgb(hue, sat, light);
    const vivid = rgbToHex(rgb.r, rgb.g, rgb.b);
    palette[format] = mixHex(vivid, background, 0.28);
  });

  return palette;
}

export function getMedicationFormatColor(format: string): string {
  const colorMap = getThemeAwareMedicationPalette();
  return colorMap[format] || '#F2F2F2';
}

export function getMedicationMenuBgFromCardColor(cardBg: string): string {
  const resolved = resolveCssVarColor(cardBg);
  if (!resolved.startsWith('#')) {
    return 'color-mix(in srgb, var(--theme-background) 68%, white 32%)';
  }
  return `color-mix(in srgb, ${resolved} 58%, white 42%)`;
}

export function shouldUseDarkText(color: string): boolean {
  // Avec la palette pastel actuelle, le texte sombre est toujours à privilégier.
  void color;
  return true;
}
