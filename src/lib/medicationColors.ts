export function getMedicationFormatColor(format: string): string {
  const colorMap: Record<string, string> = {
    // Palette pastel (texte noir lisible)
    'Capsule': '#FFD6D6',
    'Comprimé': '#D9F2E6',
    'Crème': '#FFF4CC',
    'Gel': '#D6F5F2',
    'Gouttes': '#DDEBFF',
    'Inhalateur': '#E2F7D9',
    'Injection': '#FFDDE8',
    'Patch': '#E9DDFF',
    'Pommade': '#FFE6F0',
    'Sirop': '#FFE8D1',
    'Suppositoire': '#F3DFFF',
    'Suspension orale': '#DFF4FF',
  };
  return colorMap[format] || '#F2F2F2';
}

export function shouldUseDarkText(color: string): boolean {
  // Avec la palette pastel actuelle, le texte sombre est toujours à privilégier.
  void color;
  return true;
}
