import React from 'react';
import { View, Text, SafeAreaView, ScrollView } from 'react-native';
import { TeaKEStyles } from '../constants/Styles';
import { TeaKECard, StatusTag } from '../components/ui';

export const GuyProfileScreen: React.FC = () => {
  return (
    <SafeAreaView style={TeaKEStyles.safeContainer}>
      <ScrollView style={TeaKEStyles.container}>
        <Text style={TeaKEStyles.heading1}>Guy&apos;s Profile</Text>
        
        {/* Sample story card */}
        <TeaKECard style={{ marginTop: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <StatusTag type="red_flag" />
            <Text style={[TeaKEStyles.caption, { marginLeft: 8 }]}>2 days ago</Text>
          </View>
          <Text style={TeaKEStyles.body}>
            This is a sample story about the guy. Users can share their experiences here.
          </Text>
        </TeaKECard>
        
        {/* TODO: Add guy details, stories list, comments */}
      </ScrollView>
    </SafeAreaView>
  );
};