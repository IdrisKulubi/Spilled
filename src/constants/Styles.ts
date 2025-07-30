/**
 * TeaKE Design System
 * Shared styles and design tokens for consistent UI
 */

import { StyleSheet } from 'react-native';
import { Colors } from '../../constants/Colors';

export const TeaKEStyles = StyleSheet.create({
  // Card styles
  card: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    shadowColor: Colors.light.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  // Button styles
  primaryButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  secondaryButton: {
    backgroundColor: Colors.light.accent,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.light.primary,
  },

  // Text styles
  heading1: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 8,
  },
  
  heading2: {
    fontSize: 22,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 6,
  },
  
  body: {
    fontSize: 16,
    color: Colors.light.text,
    lineHeight: 24,
  },
  
  caption: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
  },

  // Status tag styles
  redFlagTag: {
    backgroundColor: Colors.light.redFlag,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  
  successTag: {
    backgroundColor: Colors.light.success,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  
  unsureTag: {
    backgroundColor: Colors.light.unsure,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },

  // Layout styles
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
    paddingHorizontal: 16,
  },
  
  safeContainer: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },

  // Input styles
  textInput: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.light.text,
    backgroundColor: Colors.light.cardBackground,
  },

  // Spacing utilities
  marginSmall: { margin: 8 },
  marginMedium: { margin: 16 },
  marginLarge: { margin: 24 },
  
  paddingSmall: { padding: 8 },
  paddingMedium: { padding: 16 },
  paddingLarge: { padding: 24 },
});

// Animation presets for gentle hover effects
export const TeaKEAnimations = {
  gentleScale: {
    pressed: { scale: 0.98 },
    unpressed: { scale: 1.0 },
  },
  
  fadeIn: {
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
};

// Common spacing values
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Border radius values
export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  round: 999,
};