import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAuth } from '@/src/contexts/AuthContext';
import { VerificationScreen } from '@/src/screens/VerificationScreen';
import { VerificationPendingScreen } from '@/src/screens/VerificationPendingScreen';
import { SignInScreen } from '@/src/screens/SignInScreen';
import { ProfileCreationScreen } from '@/src/screens/ProfileCreationScreen';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { user, loading } = useAuth();

  // If not logged in, show sign in screen without tab bar
  if (!user) {
    console.log('[TabLayout] No user - showing SignInScreen (no tabs)');
    return <SignInScreen />;
  }

  // If user session exists but no complete database profile, create it
  const isDatabaseConfirmed = !!user.created_at;
  if (!isDatabaseConfirmed) {
    console.log('[TabLayout] User missing DB profile - showing ProfileCreationScreen (no tabs)');
    return <ProfileCreationScreen />;
  }

  // If user is not verified, show verification screens without tab bar
  if (user && !user.verified) {
    console.log(`[TabLayout] User not verified - status: "${user.verification_status}", id_image_url: "${user.id_image_url}"`);
    
    if (user.verification_status === 'pending') {
      // Check if user has uploaded an ID
      const hasUploadedId = user.id_image_url && typeof user.id_image_url === 'string' && user.id_image_url.trim() !== '';
      
      if (hasUploadedId) {
        // Show pending screen without tabs
        console.log('[TabLayout] -> Showing VerificationPendingScreen (no tabs)');
        return <VerificationPendingScreen user={{
          nickname: user.nickname || 'User',
          verification_status: user.verification_status,
          id_image_url: user.id_image_url || undefined,
          id_type: user.id_type || undefined
        }} />;
      } else {
        // Show verification upload screen without tabs
        console.log('[TabLayout] -> Showing VerificationScreen (no tabs)');
        return <VerificationScreen />;
      }
    } else if (user.verification_status === 'rejected') {
      // Show verification screen for rejected users without tabs
      console.log('[TabLayout] -> Showing VerificationScreen for rejected user (no tabs)');
      return <VerificationScreen />;
    } else {
      // Default case - show verification screen without tabs
      console.log('[TabLayout] -> Showing VerificationScreen default case (no tabs)');
      return <VerificationScreen />;
    }
  }

  // Only show tabs for verified users
  console.log('[TabLayout] -> Showing tabs for verified user');
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            // Use a transparent background on iOS to show the blur effect
            position: 'absolute',
          },
          default: {},
        }),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="magnifyingglass" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="globe" color={color} />,
        }}
      />
    </Tabs>
  );
}
