import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  GestureResponderEvent,
} from 'react-native';
import { Colors } from '../../../constants/Colors';
import { TeaKEStyles } from '../../constants/Styles';

interface TeaKEButtonProps {
  title: string;
  onPress: (event: GestureResponderEvent) => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const TeaKEButton: React.FC<TeaKEButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  size = 'medium',
  style,
  textStyle,
}) => {
  const getButtonStyle = (): ViewStyle => {
    const baseStyle = variant === 'primary' ? TeaKEStyles.primaryButton : TeaKEStyles.secondaryButton;
    
    let sizeStyle: ViewStyle = {};
    switch (size) {
      case 'small':
        sizeStyle = { paddingVertical: 8, paddingHorizontal: 16 };
        break;
      case 'large':
        sizeStyle = { paddingVertical: 18, paddingHorizontal: 32 };
        break;
      default:
        sizeStyle = {};
    }

    let variantStyle: ViewStyle = {};
    if (variant === 'danger') {
      variantStyle = {
        backgroundColor: Colors.light.redFlag,
      };
    }

    return {
      ...baseStyle,
      ...sizeStyle,
      ...variantStyle,
      opacity: disabled ? 0.6 : 1,
      ...style,
    };
  };

  const getTextStyle = (): TextStyle => {
    const baseTextColor = variant === 'secondary' ? Colors.light.primary : Colors.light.textOnPrimary;
    
    let sizeTextStyle: TextStyle = {};
    switch (size) {
      case 'small':
        sizeTextStyle = { fontSize: 14 };
        break;
      case 'large':
        sizeTextStyle = { fontSize: 18 };
        break;
      default:
        sizeTextStyle = { fontSize: 16 };
    }

    return {
      color: baseTextColor,
      fontWeight: '600',
      ...sizeTextStyle,
      ...textStyle,
    };
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Text style={getTextStyle()}>{title}</Text>
    </TouchableOpacity>
  );
};