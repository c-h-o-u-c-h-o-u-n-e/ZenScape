export interface GoalColor {
  bg: string;
  fg: string;
}

const NEUTRAL: GoalColor = { bg: '#ffffff', fg: '#1a1a1a' };
const THEME_GOAL_COLOR_COUNT = 32;

function resolveCssVarColor(color: string): string {
  if (typeof window === 'undefined') return color;
  const match = color.match(/^var\((--[^)]+)\)$/);
  if (!match) return color;
  const resolved = getComputedStyle(document.documentElement).getPropertyValue(match[1]).trim();
  return resolved || color;
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function luminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function fgForBg(bg: string): string {
  void bg;
  // Palette des catégories volontairement claire: texte noir constant pour cohérence.
  return '#1a1a1a';
}

export function getMenuBgFromCardColor(bg: string): string {
  const resolved = resolveCssVarColor(bg);
  if (!resolved.startsWith('#')) {
    return 'color-mix(in srgb, var(--theme-background) 68%, white 32%)';
  }
  // Fond de menu lié à la couleur de la carte, mais plus pâle / moins intense.
  return `color-mix(in srgb, ${resolved} 58%, white 42%)`;
}

export function getGoalColor(goalId: string | null | undefined, goalColor?: string | null): GoalColor {
  if (goalColor) return { bg: goalColor, fg: fgForBg(goalColor) };
  if (!goalId) return NEUTRAL;
  const index = (hashString(goalId) % THEME_GOAL_COLOR_COUNT) + 1;
  const bg = `var(--goal-color-${index})`;
  return { bg, fg: fgForBg(bg) };
}
