import React from 'react';
import { View, Text, SafeAreaView } from 'react-native';
import { TeaKEStyles } from '../constants/Styles';

export const SearchScreen: React.FC = () => {
  return (
    <SafeAreaView style={TeaKEStyles.safeContainer}>
      <View style={TeaKEStyles.container}>
        <Text style={TeaKEStyles.heading1}>Search for a Guy</Text>
        <Text style={TeaKEStyles.body}>
          Enter name, nickname, phone, or social handle to find existing profiles
        </Text>
        {/* TODO: Add search form and results */}
      </View>
    </SafeAreaView>
  );
};