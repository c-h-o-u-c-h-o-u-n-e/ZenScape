export function getMedicationFormatColor(format: string): string {
  const colorMap: Record<string, string> = {
    'Capsule': '#FF3333',
    'Comprimé': '#00D9A3',
    'Crème': '#FFD700',
    'Gel': '#00D9A3',
    'Gouttes': '#0099FF',
    'Inhalateur': '#00CC66',
    'Injection': '#FF0066',
    'Patch': '#9933FF',
    'Pommade': '#FF6699',
    'Sirop': '#FF9933',
    'Suppositoire': '#DD00FF',
    'Suspension orale': '#00CCFF',
  };
  return colorMap[format] || '#E8E8E8';
}

export function shouldUseDarkText(color: string): boolean {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}
