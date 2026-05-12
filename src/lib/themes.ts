export type ThemePalette = {
  background: string;
  primaryText: string;
  cta: string;
  surface: string;
  accent: string;
};

export type ThemeId =
  | 'ink-wash'
  | 'desert-bloom'
  | 'arctic-glass'
  | 'sage-ritual'
  | 'coastal-fog'
  | 'lavender-smoke'
  | 'terracotta-rain'
  | 'raspberry-silk'
  | 'crimson-harbor'
  | 'mint-frequency'
  | 'soft-linen'
  | 'lavender-mist'
  | 'honey-oat'
  | 'spring-meadow'
  ;

export const THEMES: Record<ThemeId, { name: string; palette: ThemePalette }> = {
  'ink-wash': {
    name: 'Ink Wash',
    palette: {
      background: '#E6E8EA',
      primaryText: '#4A4E52',
      cta: '#7D848C',
      surface: '#B7BCC2',
      accent: '#C8D4DE',
    },
  },
  'desert-bloom': {
    name: 'Desert Bloom',
    palette: {
      background: '#F7E8DC',
      primaryText: '#5E3B2C',
      cta: '#D96B4A',
      surface: '#E8D2C0',
      accent: '#F2B880',
    },
  },
  'arctic-glass': {
    name: 'Arctic Glass',
    palette: {
      background: '#EEF6FA',
      primaryText: '#203040',
      cta: '#4BA3C7',
      surface: '#D9E8EF',
      accent: '#8DE1FF',
    },
  },
  'sage-ritual': {
    name: 'Sage Ritual',
    palette: {
      background: '#EEF2E6',
      primaryText: '#33402F',
      cta: '#6E8B5B',
      surface: '#D7E0CE',
      accent: '#C8A96B',
    },
  },
  'coastal-fog': {
    name: 'Coastal Fog',
    palette: {
      background: '#F4F7F8',
      primaryText: '#3B4A52',
      cta: '#5A8C9E',
      surface: '#DDE7EB',
      accent: '#9ED6E3',
    },
  },
  'lavender-smoke': {
    name: 'Lavender Smoke',
    palette: {
      background: '#F4F0F8',
      primaryText: '#4A4058',
      cta: '#8A5CF6',
      surface: '#DDD4E7',
      accent: '#D6B8FF',
    },
  },
  'terracotta-rain': {
    name: 'Terracotta Rain',
    palette: {
      background: '#FAEEE8',
      primaryText: '#5A3A30',
      cta: '#C96A4B',
      surface: '#E8CFC4',
      accent: '#8AA399',
    },
  },
  'raspberry-silk': {
    name: 'Raspberry Silk',
    palette: {
      background: '#FFF1F5',
      primaryText: '#5A233A',
      cta: '#D6336C',
      surface: '#F4D6E1',
      accent: '#FF9EBB',
    },
  },
  'crimson-harbor': {
    name: 'Crimson Harbor',
    palette: {
      background: '#F8F1F0',
      primaryText: '#4E2C2A',
      cta: '#B33939',
      surface: '#E7D3D0',
      accent: '#5C7AEA',
    },
  },
  'mint-frequency': {
    name: 'Mint Frequency',
    palette: {
      background: '#F2FFFB',
      primaryText: '#1F4037',
      cta: '#00B894',
      surface: '#D7F5EC',
      accent: '#55EFC4',
    },
  },
  'soft-linen': {
    name: 'Soft Linen',
    palette: {
      background: '#FAF7F2',
      primaryText: '#4A4038',
      cta: '#B08968',
      surface: '#EFE6DC',
      accent: '#DDBEA9',
    },
  },
  'lavender-mist': {
    name: 'Lavender Mist',
    palette: {
      background: '#F8F5FC',
      primaryText: '#4C445C',
      cta: '#9A7FD1',
      surface: '#E5DDF2',
      accent: '#CBB7E8',
    },
  },
  'honey-oat': {
    name: 'Honey Oat',
    palette: {
      background: '#FCF8F0',
      primaryText: '#53463A',
      cta: '#C59A52',
      surface: '#EFE2C9',
      accent: '#E9C97B',
    },
  },
  'spring-meadow': {
    name: 'Spring Meadow',
    palette: {
      background: '#F4FAF2',
      primaryText: '#3F4F3B',
      cta: '#72A36D',
      surface: '#DDE9D7',
      accent: '#A8D39E',
    },
  },
};

export const DEFAULT_THEME: ThemeId = 'ink-wash';
export const THEME_STORAGE_KEY = 'zenscape-theme';

function mixHex(a: string, b: string, weightB = 0.35): string {
  const ah = a.replace('#', '');
  const bh = b.replace('#', '');
  const ar = parseInt(ah.slice(0, 2), 16);
  const ag = parseInt(ah.slice(2, 4), 16);
  const ab = parseInt(ah.slice(4, 6), 16);
  const br = parseInt(bh.slice(0, 2), 16);
  const bg = parseInt(bh.slice(2, 4), 16);
  const bb = parseInt(bh.slice(4, 6), 16);
  const wA = 1 - weightB;
  const r = Math.round(ar * wA + br * weightB);
  const g = Math.round(ag * wA + bg * weightB);
  const bMix = Math.round(ab * wA + bb * weightB);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bMix.toString(16).padStart(2, '0')}`;
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

function generateThemeGoalPalette(themeId: ThemeId, palette: ThemePalette): string[] {
  const { r, g, b } = hexToRgb(palette.cta);
  const base = rgbToHsl(r, g, b);
  const themeOffset = (Object.keys(THEMES).indexOf(themeId) * 11) % 360;
  // Palette claire pour assurer un contraste solide avec texte noir.
  const satBase = Math.min(0.72, Math.max(0.42, base.s + 0.06));
  // 4 niveaux d'intensité (du plus intense au plus doux), répétés sur 8 familles de teintes.
  const lightSteps = [0.68, 0.74, 0.79, 0.84];
  const bgMixByLight = [0.24, 0.3, 0.36, 0.42];
  const colors: string[] = [];

  for (let i = 0; i < 8; i++) {
    const hue = (base.h + themeOffset + i * 45) % 360;
    for (let j = 0; j < lightSteps.length; j++) {
      const l = lightSteps[j];
      const sat = Math.max(0.38, Math.min(0.75, satBase - (l - 0.7) * 0.28));
      const rgb = hslToRgb(hue, sat, l);
      const vivid = rgbToHex(rgb.r, rgb.g, rgb.b);
      colors.push(mixHex(vivid, palette.background, bgMixByLight[j]));
    }
  }

  return colors;
}

export function applyTheme(themeId: ThemeId) {
  const theme = THEMES[themeId];
  if (!theme) return;

  const root = document.documentElement;
  root.style.setProperty('--theme-background', theme.palette.background);
  root.style.setProperty('--theme-primary-text', theme.palette.primaryText);
  root.style.setProperty('--theme-cta', theme.palette.cta);
  root.style.setProperty('--theme-surface', theme.palette.surface);
  root.style.setProperty('--theme-accent', theme.palette.accent);

  const low = mixHex('#4caf50', theme.palette.background, 0.35);
  const medium = mixHex('#457b9d', theme.palette.background, 0.35);
  const high = mixHex('#ff9800', theme.palette.background, 0.3);
  const urgent = mixHex('#e63946', theme.palette.background, 0.35);

  root.style.setProperty('--priority-low-bg', low);
  root.style.setProperty('--priority-medium-bg', medium);
  root.style.setProperty('--priority-high-bg', high);
  root.style.setProperty('--priority-urgent-bg', urgent);
  root.style.setProperty('--priority-low-text', theme.palette.background);
  root.style.setProperty('--priority-medium-text', theme.palette.background);
  root.style.setProperty('--priority-high-text', theme.palette.primaryText);
  root.style.setProperty('--priority-urgent-text', theme.palette.background);

  const goalPalette = generateThemeGoalPalette(themeId, theme.palette);
  goalPalette.forEach((goalColor, i) => {
    root.style.setProperty(`--goal-color-${i + 1}`, goalColor);
  });
}
