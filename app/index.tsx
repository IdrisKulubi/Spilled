/**
 * Main App Entry Point - No Bottom Tabs
 * Shows HomeHubScreen directly for verified users, handles auth flow
 */

import React from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { HomeHubScreen } from '@/src/screens/HomeHubScreen';
import { VerificationScreen } from '@/src/screens/VerificationScreen';
import { VerificationPendingScreen } from '@/src/screens/VerificationPendingScreen';
import { SignInScreen } from '@/src/screens/SignInScreen';
import { ProfileCreationScreen } from '@/src/screens/ProfileCreationScreen';

export default function MainApp() {
  const { user, loading } = useAuth();

  // If not logged in, show sign in screen
  if (!user) {
    console.log('[MainApp] No user - showing SignInScreen');
    return <SignInScreen />;
  }

  // If user session exists but no complete database profile, create it
  const isDatabaseConfirmed = !!user.created_at;
  if (!isDatabaseConfirmed) {
    console.log('[MainApp] User missing DB profile - showing ProfileCreationScreen');
    return <ProfileCreationScreen />;
  }

  // If user is not verified, show verification screens
  if (user && !user.verified) {
    console.log(`[MainApp] User not verified - status: "${user.verification_status}", id_image_url: "${user.id_image_url}"`);
    
    if (user.verification_status === 'pending') {
      // Check if user has uploaded an ID
      const hasUploadedId = user.id_image_url && typeof user.id_image_url === 'string' && user.id_image_url.trim() !== '';
      
      if (hasUploadedId) {
        // Show pending screen
        console.log('[MainApp] -> Showing VerificationPendingScreen');
        return <VerificationPendingScreen user={{
          nickname: user.nickname || 'User',
          verification_status: user.verification_status,
          id_image_url: user.id_image_url || undefined,
          id_type: user.id_type || undefined
        }} />;
      } else {
        // Show verification upload screen
        console.log('[MainApp] -> Showing VerificationScreen');
        return <VerificationScreen />;
      }
    } else if (user.verification_status === 'rejected') {
      // Show verification screen for rejected users
      console.log('[MainApp] -> Showing VerificationScreen for rejected user');
      return <VerificationScreen />;
    } else {
      // Default case - show verification screen
      console.log('[MainApp] -> Showing VerificationScreen default case');
      return <VerificationScreen />;
    }
  }

  // Show main HomeHub screen for verified users (no bottom tabs)
  console.log('[MainApp] -> Showing HomeHubScreen for verified user');
  return <HomeHubScreen />;
}