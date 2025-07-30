import React from 'react';
import { View, Text, SafeAreaView } from 'react-native';
import { TeaKEStyles } from '../constants/Styles';
import { TeaKEButton } from '../components/ui';

export const AddPostScreen: React.FC = () => {
  const handlePost = () => {
    // TODO: Implement post creation
    console.log('Creating post...');
  };

  return (
    <SafeAreaView style={TeaKEStyles.safeContainer}>
      <View style={TeaKEStyles.container}>
        <Text style={TeaKEStyles.heading1}>Share Your Story</Text>
        <Text style={TeaKEStyles.body}>
          Help other women by sharing your experience anonymously
        </Text>
        
        {/* TODO: Add form fields for guy details, story, tags, etc. */}
        
        <TeaKEButton
          title="Post Anonymously"
          onPress={handlePost}
          style={{ marginTop: 24 }}
        />
      </View>
    </SafeAreaView>
  );
};