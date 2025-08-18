/**
 * Main App Entry Point - No Bottom Tabs
 * Shows HomeHubScreen directly for verified users, handles auth flow
 */

import React from 'react';
import { useAuth } from '../src/contexts/AuthContext';
import { HomeHubScreen } from '../src/screens/HomeHubScreen';
import { VerificationScreen } from '../src/screens/VerificationScreen';
import { VerificationPendingScreen } from '../src/screens/VerificationPendingScreen';
import { SignInScreen } from '../src/screens/SignInScreen';
import { ProfileCreationScreen } from '../src/screens/ProfileCreationScreen';

export default function MainApp() {
  const { user, loading } = useAuth();
  
  // Debug environment variables and user state
  React.useEffect(() => {
    console.log('🔍 Environment Variables Debug:');
    console.log('DEV_MODE:', process.env.EXPO_PUBLIC_DEV_MODE);
    
    // Debug user object
    if (user) {
      console.log('👤 User object:', {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        created_at: user.createdAt,
        verified: user.verified,
        verificationStatus: user.verificationStatus || user.verificationStatus,
      });
    }
  }, [user]);

  // If not logged in, show sign in screen
  if (!user) {
    return <SignInScreen />;
  }

  // If user session exists but no complete database profile, create it
  // Check if user has a createdAt timestamp which confirms DB record exists
  const isDatabaseConfirmed = !!user.createdAt || !!user.createdAt;
  if (!isDatabaseConfirmed) {
    return <ProfileCreationScreen />;
  }

  // If user is not verified, show verification screens
  if (user && !user.verified) {
    
    if (user.verificationStatus === 'pending') {
      // Check if user has uploaded an ID
      const hasUploadedId = user.idImageUrl && typeof user.idImageUrl === 'string' && user.idImageUrl.trim() !== '';
      
      if (hasUploadedId) {
        // Show pending screen
        return <VerificationPendingScreen user={{
          nickname: user.nickname || 'User',
          verification_status: user.verificationStatus,
          id_image_url: user.idImageUrl || undefined,
          id_type: user.idType || undefined
        }} />;
      } else {
        // Show verification upload screen
        return <VerificationScreen />;
      }
    } else if (user.verificationStatus === 'rejected') {
      // Show verification screen for rejected users
      return <VerificationScreen />;
    } else {
      // Default case - show verification screen
      return <VerificationScreen />;
    }
  }

  // Show main HomeHub screen for verified users (no bottom tabs)
  return <HomeHubScreen />;
}