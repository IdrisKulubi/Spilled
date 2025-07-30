import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../../constants/Colors';

interface VerificationStatusBadgeProps {
  status: 'pending' | 'approved' | 'rejected';
  size?: 'small' | 'medium' | 'large';
}

export const VerificationStatusBadge: React.FC<VerificationStatusBadgeProps> = ({ 
  status, 
  size = 'medium' 
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'approved':
        return {
          backgroundColor: Colors.light.success,
          emoji: '✅',
          text: 'Verified Girl',
          textColor: Colors.light.textOnPrimary,
        };
      case 'rejected':
        return {
          backgroundColor: Colors.light.redFlag,
          emoji: '❌',
          text: 'Verification Rejected',
          textColor: Colors.light.textOnPrimary,
        };
      case 'pending':
        return {
          backgroundColor: Colors.light.unsure,
          emoji: '⏳',
          text: 'Verification Pending',
          textColor: Colors.light.text,
        };
      default:
        return {
          backgroundColor: Colors.light.border,
          emoji: '❓',
          text: 'Unknown Status',
          textColor: Colors.light.text,
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingHorizontal: 8,
          paddingVertical: 2,
          fontSize: 10,
        };
      case 'large':
        return {
          paddingHorizontal: 16,
          paddingVertical: 8,
          fontSize: 14,
        };
      default:
        return {
          paddingHorizontal: 12,
          paddingVertical: 4,
          fontSize: 12,
        };
    }
  };

  const config = getStatusConfig();
  const sizeStyles = getSizeStyles();

  return (
    <View style={[
      styles.badge, 
      { backgroundColor: config.backgroundColor },
      {
        paddingHorizontal: sizeStyles.paddingHorizontal,
        paddingVertical: sizeStyles.paddingVertical,
      }
    ]}>
      <Text style={[
        styles.badgeText, 
        { color: config.textColor, fontSize: sizeStyles.fontSize }
      ]}>
        {config.emoji} {config.text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontWeight: '600',
  },
});