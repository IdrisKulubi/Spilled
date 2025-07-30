/**
 * TeaKE App Color Scheme
 * A carefully crafted palette designed for trust, femininity, and community safety
 */

// Primary TeaKE Colors
const primaryColor = '#D96BA0';      // Muted Rose
const backgroundColor = '#FFF8F9';   // Light Blush White
const accentColor = '#FDECEF';       // Soft Blush
const textPrimary = '#3B3B3B';       // Dark text on light backgrounds
const textOnDark = '#FFFFFF';        // White text on dark overlays

// Status Colors
const redFlag = '#F25F5C';           // Warm Coral for warnings
const successGreen = '#76C893';      // Soft Green for good vibes
const unsureYellow = '#FFD23F';      // Gentle yellow for unsure tags

// UI Support Colors
const grayLight = '#F5F5F5';
const grayMedium = '#9E9E9E';
const grayDark = '#424242';

export const Colors = {
  light: {
    // Core colors
    primary: primaryColor,
    background: backgroundColor,
    accent: accentColor,
    
    // Text colors
    text: textPrimary,
    textSecondary: grayMedium,
    textOnPrimary: textOnDark,
    
    // UI elements
    tint: primaryColor,
    icon: grayMedium,
    tabIconDefault: grayMedium,
    tabIconSelected: primaryColor,
    
    // Status colors
    redFlag: redFlag,
    success: successGreen,
    unsure: unsureYellow,
    
    // Card and surface colors
    cardBackground: '#FFFFFF',
    border: accentColor,
    shadow: 'rgba(217, 107, 160, 0.1)',
  },
  dark: {
    // Core colors (dark mode adaptation)
    primary: primaryColor,
    background: '#1A1A1A',
    accent: '#2A1A1F',
    
    // Text colors
    text: textOnDark,
    textSecondary: '#B0B0B0',
    textOnPrimary: textOnDark,
    
    // UI elements
    tint: primaryColor,
    icon: '#B0B0B0',
    tabIconDefault: '#B0B0B0',
    tabIconSelected: primaryColor,
    
    // Status colors
    redFlag: redFlag,
    success: successGreen,
    unsure: unsureYellow,
    
    // Card and surface colors
    cardBackground: '#2D2D2D',
    border: '#3A3A3A',
    shadow: 'rgba(0, 0, 0, 0.3)',
  },
};
