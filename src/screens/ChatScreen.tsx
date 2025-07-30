import React from 'react';
import { View, Text, SafeAreaView } from 'react-native';
import { TeaKEStyles } from '../constants/Styles';

export const ChatScreen: React.FC = () => {
  return (
    <SafeAreaView style={TeaKEStyles.safeContainer}>
      <View style={TeaKEStyles.container}>
        <Text style={TeaKEStyles.heading1}>Private Chat</Text>
        <Text style={TeaKEStyles.body}>
          End-to-end encrypted messages that auto-delete after 7 days
        </Text>
        {/* TODO: Add chat interface with message bubbles */}
      </View>
    </SafeAreaView>
  );
};