import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../../constants/Colors';
import { TeaKEStyles } from '../../constants/Styles';

export type TagType = 'red_flag' | 'good_vibes' | 'unsure';

interface StatusTagProps {
  type: TagType;
  style?: any;
}

export const StatusTag: React.FC<StatusTagProps> = ({ type, style }) => {
  const getTagConfig = () => {
    switch (type) {
      case 'red_flag':
        return {
          style: TeaKEStyles.redFlagTag,
          emoji: '🚩',
          text: 'Red Flag',
          textColor: Colors.light.textOnPrimary,
        };
      case 'good_vibes':
        return {
          style: TeaKEStyles.successTag,
          emoji: '✅',
          text: 'Good Vibes',
          textColor: Colors.light.textOnPrimary,
        };
      case 'unsure':
        return {
          style: TeaKEStyles.unsureTag,
          emoji: '❓',
          text: 'Unsure',
          textColor: Colors.light.text,
        };
      default:
        return {
          style: TeaKEStyles.unsureTag,
          emoji: '❓',
          text: 'Unknown',
          textColor: Colors.light.text,
        };
    }
  };

  const config = getTagConfig();

  return (
    <View style={[config.style, style]}>
      <Text style={[styles.tagText, { color: config.textColor }]}>
        {config.emoji} {config.text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  tagText: {
    fontSize: 12,
    fontWeight: '600',
  },
});