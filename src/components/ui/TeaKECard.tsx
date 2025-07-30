import React from 'react';
import { View, ViewStyle, TouchableOpacity, GestureResponderEvent } from 'react-native';
import { TeaKEStyles } from '../../constants/Styles';

interface TeaKECardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: (event: GestureResponderEvent) => void;
  pressable?: boolean;
}

export const TeaKECard: React.FC<TeaKECardProps> = ({ 
  children, 
  style, 
  onPress, 
  pressable = false 
}) => {
  const cardStyle = [TeaKEStyles.card, style];

  if (pressable && onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        activeOpacity={0.95}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={cardStyle}>
      {children}
    </View>
  );
};