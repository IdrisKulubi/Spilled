/**
 * Supabase Configuration for TeaKE  
 */

import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Database } from '../types/database';

// Configure SecureStore for session persistence
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    SecureStore.deleteItemAsync(key);
  },
};

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

// Debug logging (remove in production)
if (__DEV__) {
  console.log('Supabase URL:', supabaseUrl);
  console.log('Supabase Key exists:', !!supabaseAnonKey);
}

// Admin configuration
export const ADMIN_EMAIL = process.env.EXPO_PUBLIC_ADMIN_EMAIL || 'kulubiidris@gmail.com';


export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    storage: ExpoSecureStoreAdapter,
  },
});

// Helper function to check if Supabase is properly configured
export const isSupabaseConfigured = (): boolean => {
  return supabaseUrl !== 'YOUR_SUPABASE_URL' && supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY';
};

// Helper function for error handling
export const handleSupabaseError = (error: any): string => {
  if (error?.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

// Helper function to check if user is admin
export const isUserAdmin = (userEmail?: string): boolean => {
  if (!userEmail) return false;
  return userEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase();
};