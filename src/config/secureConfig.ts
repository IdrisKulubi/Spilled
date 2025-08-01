/**
 * Secure Configuration Management
 * Uses Expo SecureStore for sensitive credentials
 */

import * as SecureStore from 'expo-secure-store';

export interface AppCredentials {
  supabaseUrl: string;
  supabaseAnonKey: string;
  adminEmail?: string;
}

class SecureConfigManager {
  private static instance: SecureConfigManager;
  private credentialsCache: AppCredentials | null = null;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): SecureConfigManager {
    if (!SecureConfigManager.instance) {
      SecureConfigManager.instance = new SecureConfigManager();
    }
    return SecureConfigManager.instance;
  }

  /**
   * Initialize secure configuration
   * This should be called once when the app starts
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('[SecureConfig] Initializing secure configuration...');
      
      // Check if credentials exist in SecureStore
      const storedUrl = await SecureStore.getItemAsync('SUPABASE_URL');
      const storedKey = await SecureStore.getItemAsync('SUPABASE_ANON_KEY');
      
      if (storedUrl && storedKey) {
        // Use stored credentials
        this.credentialsCache = {
          supabaseUrl: storedUrl,
          supabaseAnonKey: storedKey,
          adminEmail: await SecureStore.getItemAsync('ADMIN_EMAIL') || undefined
        };
        console.log('[SecureConfig] Loaded credentials from SecureStore');
      } else {
        // Migrate from environment variables if they exist
        await this.migrateFromEnvVars();
      }
      
      this.isInitialized = true;
      console.log('[SecureConfig] Initialization complete');
    } catch (error) {
      console.error('[SecureConfig] Initialization failed:', error);
      throw new Error('Failed to initialize secure configuration');
    }
  }

  /**
   * Migrate credentials from environment variables to SecureStore
   */
  private async migrateFromEnvVars(): Promise<void> {
    const envUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const envKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    const envAdminEmail = process.env.EXPO_PUBLIC_ADMIN_EMAIL;

    if (envUrl && envKey && envUrl !== 'YOUR_SUPABASE_URL' && envKey !== 'YOUR_SUPABASE_ANON_KEY') {
      console.log('[SecureConfig] Migrating credentials from environment variables...');
      
      await this.setCredentials({
        supabaseUrl: envUrl,
        supabaseAnonKey: envKey,
        adminEmail: envAdminEmail
      });
      
      console.log('[SecureConfig] Migration complete - credentials now stored securely');
      console.warn('[SecureConfig] IMPORTANT: Remove credentials from .env files and environment variables');
    } else {
      throw new Error('No valid credentials found in environment variables or SecureStore');
    }
  }

  /**
   * Get Supabase URL
   */
  async getSupabaseUrl(): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    if (this.credentialsCache?.supabaseUrl) {
      return this.credentialsCache.supabaseUrl;
    }
    
    const url = await SecureStore.getItemAsync('SUPABASE_URL');
    if (!url) {
      throw new Error('Supabase URL not found in secure storage');
    }
    
    return url;
  }

  /**
   * Get Supabase Anonymous Key
   */
  async getSupabaseAnonKey(): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    if (this.credentialsCache?.supabaseAnonKey) {
      return this.credentialsCache.supabaseAnonKey;
    }
    
    const key = await SecureStore.getItemAsync('SUPABASE_ANON_KEY');
    if (!key) {
      throw new Error('Supabase Anonymous Key not found in secure storage');
    }
    
    return key;
  }

  /**
   * Get Admin Email
   */
  async getAdminEmail(): Promise<string | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    if (this.credentialsCache?.adminEmail) {
      return this.credentialsCache.adminEmail;
    }
    
    return await SecureStore.getItemAsync('ADMIN_EMAIL');
  }

  /**
   * Set credentials securely
   */
  async setCredentials(credentials: AppCredentials): Promise<void> {
    try {
      console.log('[SecureConfig] Storing credentials securely...');
      
      await SecureStore.setItemAsync('SUPABASE_URL', credentials.supabaseUrl);
      await SecureStore.setItemAsync('SUPABASE_ANON_KEY', credentials.supabaseAnonKey);
      
      if (credentials.adminEmail) {
        await SecureStore.setItemAsync('ADMIN_EMAIL', credentials.adminEmail);
      }
      
      // Update cache
      this.credentialsCache = credentials;
      
      console.log('[SecureConfig] Credentials stored successfully');
    } catch (error) {
      console.error('[SecureConfig] Failed to store credentials:', error);
      throw new Error('Failed to store credentials securely');
    }
  }

  /**
   * Update specific credential
   */
  async updateCredential(key: keyof AppCredentials, value: string): Promise<void> {
    try {
      const storeKey = key === 'supabaseUrl' ? 'SUPABASE_URL' :
                      key === 'supabaseAnonKey' ? 'SUPABASE_ANON_KEY' :
                      key === 'adminEmail' ? 'ADMIN_EMAIL' : null;
      
      if (!storeKey) {
        throw new Error(`Invalid credential key: ${key}`);
      }
      
      await SecureStore.setItemAsync(storeKey, value);
      
      // Update cache
      if (this.credentialsCache) {
        this.credentialsCache[key] = value;
      }
      
      console.log(`[SecureConfig] Updated ${key} successfully`);
    } catch (error) {
      console.error(`[SecureConfig] Failed to update ${key}:`, error);
      throw error;
    }
  }

  /**
   * Check if credentials are configured
   */
  async isConfigured(): Promise<boolean> {
    try {
      const url = await this.getSupabaseUrl();
      const key = await this.getSupabaseAnonKey();
      
      return url !== 'YOUR_SUPABASE_URL' && 
             key !== 'YOUR_SUPABASE_ANON_KEY' &&
             url.length > 0 && 
             key.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Clear all stored credentials (for logout/reset)
   */
  async clearCredentials(): Promise<void> {
    try {
      console.log('[SecureConfig] Clearing stored credentials...');
      
      await SecureStore.deleteItemAsync('SUPABASE_URL');
      await SecureStore.deleteItemAsync('SUPABASE_ANON_KEY');
      await SecureStore.deleteItemAsync('ADMIN_EMAIL');
      
      this.credentialsCache = null;
      this.isInitialized = false;
      
      console.log('[SecureConfig] Credentials cleared successfully');
    } catch (error) {
      console.error('[SecureConfig] Failed to clear credentials:', error);
      throw error;
    }
  }

  /**
   * Get all credentials (for debugging - use carefully)
   */
  async getAllCredentials(): Promise<AppCredentials | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    return this.credentialsCache;
  }

  /**
   * Validate credential format
   */
  validateCredentials(credentials: Partial<AppCredentials>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (credentials.supabaseUrl) {
      if (!credentials.supabaseUrl.startsWith('https://')) {
        errors.push('Supabase URL must start with https://');
      }
      if (!credentials.supabaseUrl.includes('supabase.co')) {
        errors.push('Supabase URL must be a valid Supabase project URL');
      }
    }
    
    if (credentials.supabaseAnonKey) {
      if (credentials.supabaseAnonKey.length < 100) {
        errors.push('Supabase Anonymous Key appears to be invalid (too short)');
      }
    }
    
    if (credentials.adminEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(credentials.adminEmail)) {
        errors.push('Admin email must be a valid email address');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const secureConfig = SecureConfigManager.getInstance();

// Export convenience functions for backward compatibility
export const getSupabaseUrl = () => secureConfig.getSupabaseUrl();
export const getSupabaseAnonKey = () => secureConfig.getSupabaseAnonKey();
export const getAdminEmail = () => secureConfig.getAdminEmail();
export const setCredentials = (credentials: AppCredentials) => secureConfig.setCredentials(credentials);
export const isConfigured = () => secureConfig.isConfigured();

export default secureConfig;