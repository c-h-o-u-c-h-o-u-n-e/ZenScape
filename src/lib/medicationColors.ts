export function getMedicationFormatColor(format: string): string {
  const colorMap: Record<string, string> = {
    'Capsule': '#FF6B6B',
    'Comprimé': '#4ECDC4',
    'Crème': '#FFE66D',
    'Gel': '#95E1D3',
    'Gouttes': '#88D8FB',
    'Inhalateur': '#A8E6CF',
    'Injection': '#FF8B94',
    'Patch': '#C7CEEA',
    'Pommade': '#FFC0CB',
    'Sirop': '#FFCCCC',
    'Suppositoire': '#DDA0DD',
    'Suspension orale': '#B0E0E6',
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
