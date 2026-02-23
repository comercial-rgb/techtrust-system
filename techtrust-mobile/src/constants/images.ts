/**
 * TechTrust AutoSolutions LLC - Brand Images
 * Updated brand assets — "Driven by Technology. Trusted by You."
 */

// Logo variations
export const logos = {
  // Logo with text horizontal (name beside icon)
  fullColor: require('../../assets/images/logo_horizontal.png'),

  // Logo with text vertical (name below icon)
  withText: require('../../assets/images/logo_vertical.png'),

  // Logo embossed / 3D effect
  emboss: require('../../assets/images/logo_emboss.png'),

  // Icon only — blue (primary, default)
  noText: require('../../assets/images/logo_icon_blue.png'),

  // Icon only — white (for dark backgrounds)
  iconWhite: require('../../assets/images/logo_icon_white.png'),

  // Icon only — red (accent variant)
  iconRed: require('../../assets/images/logo_icon_red.png'),

  // Icon only — red variant 2
  iconRed2: require('../../assets/images/logo_icon_red2.png'),

  // Icon only — red variant 3
  iconRed3: require('../../assets/images/logo_icon_red3.png'),

  // ── Legacy aliases (kept for backward compatibility) ──
  horizontalWhite: require('../../assets/images/logo_icon_white.png'),
  horizontalWhiteNoText: require('../../assets/images/logo_icon_white.png'),
  blackNoText: require('../../assets/images/logo_icon_blue.png'),
};

// Default logo to use
export const logo = logos.fullColor;
export const logoWhite = logos.iconWhite;
export const logoBlack = logos.noText;

// Placeholder images
export const placeholders = {
  avatar: null, // Use icon instead
  vehicle: null, // Use icon instead
  provider: null, // Use icon instead
};

export default {
  logos,
  logo,
  logoWhite,
  logoBlack,
  placeholders,
};
