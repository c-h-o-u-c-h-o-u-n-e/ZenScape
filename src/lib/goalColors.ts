export interface GoalColor {
  bg: string;
  fg: string;
}

export const PALETTE: GoalColor[] = [
  { bg: '#FF4D4D', fg: '#f4e8d1' },
  { bg: '#CC0000', fg: '#f4e8d1' },
  { bg: '#660000', fg: '#f4e8d1' },
  { bg: '#FF944D', fg: '#1a1a1a' },
  { bg: '#CC5200', fg: '#f4e8d1' },
  { bg: '#663300', fg: '#f4e8d1' },
  { bg: '#FFFF66', fg: '#1a1a1a' },
  { bg: '#CCCC00', fg: '#1a1a1a' },
  { bg: '#666600', fg: '#f4e8d1' },
  { bg: '#B3FF66', fg: '#1a1a1a' },
  { bg: '#66CC00', fg: '#1a1a1a' },
  { bg: '#336600', fg: '#f4e8d1' },
  { bg: '#66FF66', fg: '#1a1a1a' },
  { bg: '#00CC00', fg: '#1a1a1a' },
  { bg: '#006600', fg: '#f4e8d1' },
  { bg: '#66FFB3', fg: '#1a1a1a' },
  { bg: '#00CC66', fg: '#1a1a1a' },
  { bg: '#006633', fg: '#f4e8d1' },
  { bg: '#66FFFF', fg: '#1a1a1a' },
  { bg: '#00CCCC', fg: '#1a1a1a' },
  { bg: '#006666', fg: '#f4e8d1' },
  { bg: '#66B3FF', fg: '#1a1a1a' },
  { bg: '#0066CC', fg: '#f4e8d1' },
  { bg: '#003366', fg: '#f4e8d1' },
  { bg: '#6666FF', fg: '#f4e8d1' },
  { bg: '#0000CC', fg: '#f4e8d1' },
  { bg: '#000066', fg: '#f4e8d1' },
  { bg: '#B366FF', fg: '#f4e8d1' },
  { bg: '#6600CC', fg: '#f4e8d1' },
  { bg: '#330066', fg: '#f4e8d1' },
  { bg: '#FF66FF', fg: '#f4e8d1' },
  { bg: '#CC00CC', fg: '#f4e8d1' },
  { bg: '#660066', fg: '#f4e8d1' },
  { bg: '#FF66B3', fg: '#f4e8d1' },
  { bg: '#CC0066', fg: '#f4e8d1' },
  { bg: '#660033', fg: '#f4e8d1' },
];

const NEUTRAL: GoalColor = { bg: '#ffffff', fg: '#1a1a1a' };

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
  try {
    return luminance(bg) > 0.35 ? '#1a1a1a' : '#f4e8d1';
  } catch {
    return '#1a1a1a';
  }
}

export function getGoalColor(goalId: string | null | undefined, goalColor?: string | null): GoalColor {
  if (goalColor) return { bg: goalColor, fg: fgForBg(goalColor) };
  if (!goalId) return NEUTRAL;
  return PALETTE[hashString(goalId) % PALETTE.length];
}
