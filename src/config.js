export const COLOR_OPTIONS = [
  { name: 'Dark Pink', hex: '#c2185b', foreground: '#ffffff' },
  { name: 'Hot Pink', hex: '#e91e63', foreground: '#ffffff' },
  { name: 'Soft Blush', hex: '#f48fb1', foreground: '#351018' },
  { name: 'Rose', hex: '#ff4081', foreground: '#ffffff' },
  { name: 'Burgundy', hex: '#800020', foreground: '#ffffff' },
  { name: 'Purple', hex: '#9c27b0', foreground: '#ffffff' },
  { name: 'Deep Violet', hex: '#4a148c', foreground: '#ffffff' },
  { name: 'Lavender', hex: '#b388ff', foreground: '#241344' },
  { name: 'Plum', hex: '#673ab7', foreground: '#ffffff' },
  { name: 'Sea Green', hex: '#2e8b57', foreground: '#ffffff' },
  { name: 'Mint Green', hex: '#2abb9b', foreground: '#06271f' },
  { name: 'Emerald', hex: '#00897b', foreground: '#ffffff' },
  { name: 'Olive', hex: '#556b2f', foreground: '#ffffff' },
  { name: 'Burnt Orange', hex: '#cc5500', foreground: '#ffffff' },
  { name: 'Coral', hex: '#ff6f61', foreground: '#35100d' },
  { name: 'Peach', hex: '#ff8a65', foreground: '#35150d' },
  { name: 'Mustard Gold', hex: '#e65100', foreground: '#ffffff' },
  { name: 'Royal Blue', hex: '#1565c0', foreground: '#ffffff' },
  { name: 'Sky Blue', hex: '#0288d1', foreground: '#06202c' },
  { name: 'Teal Blue', hex: '#0097a7', foreground: '#ffffff' },
  { name: 'White', hex: '#ffffff', foreground: '#241018' },
  { name: 'Black', hex: '#090909', foreground: '#ffffff' },
];

export const LOCALE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'pidgin', label: 'Nigerian Pidgin' },
];

export const TONE_OPTIONS = [
  { value: 'romantic', label: 'Romantic' },
  { value: 'playful', label: 'Playful' },
  { value: 'simple', label: 'Simple and sweet' },
];

// This is a tiny original browser-generated chime, not a copyrighted song.
export const SOUND_OPTIONS = [
  { value: 'none', label: 'No sound' },
  { value: 'romantic_chime', label: 'Original romantic chime' },
];

export function getForegroundForColor(hex) {
  const knownColor = COLOR_OPTIONS.find((color) => color.hex.toLowerCase() === (hex || '').toLowerCase());
  if (knownColor) return knownColor.foreground;

  const match = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!match) return '#ffffff';
  const red = Number.parseInt(match[1].slice(0, 2), 16);
  const green = Number.parseInt(match[1].slice(2, 4), 16);
  const blue = Number.parseInt(match[1].slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  return luminance > 0.62 ? '#241018' : '#ffffff';
}
