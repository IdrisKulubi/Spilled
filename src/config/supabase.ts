/**
 * Supabase Configuration for TeaKE
 */

import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

// TODO: Replace with your actual Supabase project URL and anon key
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Enable automatic session refresh
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
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