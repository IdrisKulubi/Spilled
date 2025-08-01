/**
 * Supabase Configuration for TeaKE  
 * Now uses SecureStore for credential management
 */

import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Database } from '../types/database';
import { secureConfig } from './secureConfig';

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

// Initialize secure configuration
let supabaseClient: ReturnType<typeof createClient<Database>> | null = null;

/**
 * Get or create Supabase client with secure credentials
 */
export const getSupabaseClient = async () => {
  if (supabaseClient) {
    return supabaseClient;
  }

  try {
    // Initialize secure config if not already done
    await secureConfig.initialize();
    
    const supabaseUrl = await secureConfig.getSupabaseUrl();
    const supabaseAnonKey = await secureConfig.getSupabaseAnonKey();

    console.log('🔧 [Supabase] Initializing with secure credentials');
    console.log('🔧 [Supabase] URL configured:', supabaseUrl.substring(0, 30) + '...');

    supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        // Enable automatic session refresh
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        // Use SecureStore for session persistence
        storage: ExpoSecureStoreAdapter,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });

    return supabaseClient;
  } catch (error) {
    console.error('🚨 [Supabase] Failed to initialize with secure credentials:', error);
    throw new Error('Failed to initialize Supabase client. Please check your credentials.');
  }
};

// For backward compatibility, create a proxy that initializes on first use
export const supabase = new Proxy({} as ReturnType<typeof createClient<Database>>, {
  get(target, prop) {
    if (!supabaseClient) {
      throw new Error('Supabase client not initialized. Call getSupabaseClient() first or use initializeSupabase().');
    }
    return (supabaseClient as any)[prop];
  }
});

/**
 * Initialize Supabase client (call this in your app startup)
 */
export const initializeSupabase = async () => {
  try {
    const client = await getSupabaseClient();
    // Copy all properties to the proxy target
    Object.setPrototypeOf(supabase, client);
    Object.assign(supabase, client);
    console.log('✅ [Supabase] Client initialized successfully');
    return client;
  } catch (error) {
    console.error('🚨 [Supabase] Initialization failed:', error);
    throw error;
  }
};

/**
 * Helper function to check if Supabase is properly configured
 */
export const isSupabaseConfigured = async (): Promise<boolean> => {
  try {
    return await secureConfig.isConfigured();
  } catch {
    return false;
  }
};

/**
 * Helper function for error handling
 */
export const handleSupabaseError = (error: any): string => {
  if (error?.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

/**
 * Helper function to check if user is admin
 */
export const isUserAdmin = async (userEmail?: string): Promise<boolean> => {
  if (!userEmail) return false;
  
  try {
    const adminEmail = await secureConfig.getAdminEmail();
    return adminEmail ? userEmail.toLowerCase() === adminEmail.toLowerCase() : false;
  } catch {
    return false;
  }
};

/**
 * Get admin email from secure storage
 */
export const getAdminEmail = async (): Promise<string | null> => {
  try {
    return await secureConfig.getAdminEmail();
  } catch {
    return null;
  }
};