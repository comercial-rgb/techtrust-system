/**
 * TechTrust Brand Images
 * All brand assets and images
 */

// Logo variations
export const logos = {
  // High resolution logo with text
  fullColor: require('../../assets/images/logo_altareso_comtexto.jpg'),
  
  // Logo with text (smaller/optimized)
  withText: require('../../assets/images/logo_altareso_comtexto_menor.png'),
  
  // Horizontal white logo with text
  horizontalWhite: require('../../assets/images/logo_deitada_branco_comtexto.jpg'),
  
  // Horizontal white logo without text
  horizontalWhiteNoText: require('../../assets/images/Logo_deitado_branco.jpg'),
  
  // Black logo without text
  blackNoText: require('../../assets/images/logo_preto_sem texto.jpg'),
  
  // Logo without text (default)
  noText: require('../../assets/images/logo_semtexto.jpg'),
};

// Default logo to use
export const logo = logos.fullColor;
export const logoWhite = logos.horizontalWhite;
export const logoBlack = logos.blackNoText;

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
