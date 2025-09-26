export const colors = {
  background: '#06070a', // very dark base
  panel: 'rgba(255,255,255,0.04)',
  neonPrimary: '#00ffd5',
  neonAccent: '#7a00ff',
  neonWarn: '#ff6b6b',
  glass: 'rgba(255,255,255,0.04)',
  text: '#e6f7ff',
  muted: '#9aa7b2',
  surfaceElevated: 'rgba(10,14,18,0.6)',
  outline: 'rgba(255,255,255,0.06)',
};

export const spacing = { xs: 6, sm: 12, md: 20, lg: 28 };

// iOS / Cupertino tokens
export const ios = {
  // For native, use system font; for web use fontStack
  fontFamilyNative: 'System',
  fontStackWeb: '-apple-system, "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
  cornerRadius: 12,
  pillRadius: 22,
  blurAlpha: 0.6,
  iosPrimary: '#007AFF',
  iosSecondary: '#5856D6',
  iosBackground: 'rgba(255,255,255,0.04)',
};

export const getContrastText = (hex: string) => {
  // tiny contrast helper: returns '#000' or '#fff' depending on luminance
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0,2), 16);
  const g = parseInt(c.substring(2,4), 16);
  const b = parseInt(c.substring(4,6), 16);
  const lum = 0.2126*r + 0.7152*g + 0.0722*b;
  return lum > 160 ? '#000' : '#fff';
};

export default {
  colors,
  spacing,
  ios,
  getContrastText,
};
