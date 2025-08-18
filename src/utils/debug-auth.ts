/**
 * Debug utility for Google OAuth authentication
 * This helps diagnose issues with the authentication flow
 */

import { authClient } from '../lib/auth-client';

export interface AuthDebugInfo {
  environment: {
    authBaseUrl: string | undefined;
    googleClientId: string | undefined;
    hasGoogleSecret: boolean;
    isDevelopment: boolean;
  };
  connectivity: {
    canReachAuthServer: boolean;
    authServerError?: string;
  };
  session: {
    hasActiveSession: boolean;
    userId?: string;
    userEmail?: string;
  };
}

export class AuthDebugger {
  /**
   * Run comprehensive authentication diagnostics
   */
  static async runDiagnostics(): Promise<AuthDebugInfo> {
    console.log('🔍 Running Authentication Diagnostics...');
    console.log('=' .repeat(50));

    const debugInfo: AuthDebugInfo = {
      environment: {
        authBaseUrl: process.env.EXPO_PUBLIC_AUTH_BASE_URL,
        googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
        hasGoogleSecret: !!process.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET,
        isDevelopment: process.env.EXPO_PUBLIC_DEV_MODE === 'true',
      },
      connectivity: {
        canReachAuthServer: false,
      },
      session: {
        hasActiveSession: false,
      },
    };

    // Log environment configuration
    console.log('\n📋 Environment Configuration:');
    console.log('  Auth Base URL:', debugInfo.environment.authBaseUrl);
    console.log('  Google Client ID:', debugInfo.environment.googleClientId?.substring(0, 20) + '...');
    console.log('  Has Google Secret:', debugInfo.environment.hasGoogleSecret);
    console.log('  Is Development:', debugInfo.environment.isDevelopment);

    // Test auth server connectivity
    console.log('\n🌐 Testing Auth Server Connectivity...');
    try {
      const response = await fetch(`${debugInfo.environment.authBaseUrl}/session`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      debugInfo.connectivity.canReachAuthServer = response.ok || response.status === 401; // 401 is expected if no session
      
      if (!debugInfo.connectivity.canReachAuthServer) {
        debugInfo.connectivity.authServerError = `Server returned ${response.status}: ${response.statusText}`;
        console.log('  ❌ Cannot reach auth server:', debugInfo.connectivity.authServerError);
      } else {
        console.log('  ✅ Auth server is reachable');
      }
    } catch (error) {
      debugInfo.connectivity.canReachAuthServer = false;
      debugInfo.connectivity.authServerError = error instanceof Error ? error.message : String(error);
      console.log('  ❌ Auth server connection failed:', debugInfo.connectivity.authServerError);
    }

    // Check current session
    console.log('\n🔐 Checking Current Session...');
    try {
      const session = await authClient.getSession();
      
      if (session?.data?.user) {
        debugInfo.session.hasActiveSession = true;
        debugInfo.session.userId = session.data.user.id;
        debugInfo.session.userEmail = session.data.user.email;
        console.log('  ✅ Active session found');
        console.log('    User ID:', debugInfo.session.userId);
        console.log('    Email:', debugInfo.session.userEmail);
      } else {
        console.log('  ℹ️ No active session');
      }
    } catch (error) {
      console.log('  ❌ Session check failed:', error instanceof Error ? error.message : String(error));
    }

    // Provide recommendations
    console.log('\n💡 Recommendations:');
    
    if (!debugInfo.environment.authBaseUrl) {
      console.log('  ⚠️ AUTH_BASE_URL is not set. Add EXPO_PUBLIC_AUTH_BASE_URL to your .env file');
    }
    
    if (!debugInfo.environment.googleClientId) {
      console.log('  ⚠️ Google Client ID is missing. Add EXPO_PUBLIC_GOOGLE_CLIENT_ID to your .env file');
    }
    
    if (!debugInfo.environment.hasGoogleSecret) {
      console.log('  ⚠️ Google Client Secret is missing. Add EXPO_PUBLIC_GOOGLE_CLIENT_SECRET to your .env file');
    }
    
    if (!debugInfo.connectivity.canReachAuthServer) {
      console.log('  ⚠️ Cannot reach auth server. Make sure:');
      console.log('     1. Your Expo dev server is running (npm start)');
      console.log('     2. The AUTH_BASE_URL is correct (currently:', debugInfo.environment.authBaseUrl, ')');
      console.log('     3. Your device/emulator can reach localhost:8081');
      
      if (debugInfo.environment.authBaseUrl?.includes('localhost')) {
        console.log('  ℹ️ Tip: If testing on a physical device, use your computer\'s IP address instead of localhost');
        console.log('     Example: http://192.168.1.100:8081/api/auth');
      }
    }

    console.log('\n' + '=' .repeat(50));
    return debugInfo;
  }

  /**
   * Test Google OAuth flow (without actually signing in)
   */
  static async testGoogleOAuthFlow(): Promise<void> {
    console.log('\n🔧 Testing Google OAuth Flow...');
    
    try {
      // Check if we can create an OAuth URL
      const authBaseUrl = process.env.EXPO_PUBLIC_AUTH_BASE_URL;
      const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
      
      if (!authBaseUrl || !googleClientId) {
        console.log('  ❌ Missing required configuration');
        return;
      }

      // Try to fetch the OAuth authorization endpoint
      const oauthUrl = `${authBaseUrl}/google/authorize`;
      console.log('  Testing OAuth endpoint:', oauthUrl);
      
      const response = await fetch(oauthUrl, {
        method: 'GET',
        redirect: 'manual', // Don't follow redirects
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 302 || response.status === 307) {
        console.log('  ✅ OAuth endpoint is configured correctly (returns redirect)');
        const location = response.headers.get('location');
        if (location) {
          console.log('  OAuth URL preview:', location.substring(0, 100) + '...');
        }
      } else {
        console.log('  ⚠️ OAuth endpoint returned unexpected status:', response.status);
      }
    } catch (error) {
      console.log('  ❌ OAuth flow test failed:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Clear authentication session (for testing)
   */
  static async clearSession(): Promise<void> {
    console.log('\n🧹 Clearing authentication session...');
    
    try {
      const result = await authClient.signOut();
      
      if (result.error) {
        console.log('  ❌ Failed to clear session:', result.error);
      } else {
        console.log('  ✅ Session cleared successfully');
      }
    } catch (error) {
      console.log('  ❌ Error clearing session:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Log detailed error information
   */
  static logError(error: any, context: string = 'Unknown'): void {
    console.error(`\n❌ Error in ${context}:`);
    console.error('=' .repeat(50));
    
    if (error?.status === 0) {
      console.error('Status Code: 0 (Network Error)');
      console.error('This usually means:');
      console.error('  - The server is not running');
      console.error('  - The URL is incorrect');
      console.error('  - CORS is blocking the request');
      console.error('  - Network connectivity issues');
    } else if (error?.status) {
      console.error('Status Code:', error.status);
      console.error('Status Text:', error.statusText || 'Unknown');
    }
    
    if (error?.message) {
      console.error('Error Message:', error.message);
    }
    
    if (error?.stack) {
      console.error('Stack Trace:', error.stack);
    }
    
    console.error('Full Error Object:', JSON.stringify(error, null, 2));
    console.error('=' .repeat(50));
  }
}

// Export a convenience function for quick debugging
export async function debugAuth(): Promise<void> {
  const debugInfo = await AuthDebugger.runDiagnostics();
  await AuthDebugger.testGoogleOAuthFlow();
  
  // Return summary
  const issues = [];
  
  if (!debugInfo.environment.authBaseUrl || !debugInfo.environment.googleClientId || !debugInfo.environment.hasGoogleSecret) {
    issues.push('Missing environment variables');
  }
  
  if (!debugInfo.connectivity.canReachAuthServer) {
    issues.push('Cannot reach auth server');
  }
  
  if (issues.length > 0) {
    console.log('\n⚠️ Issues found:', issues.join(', '));
  } else {
    console.log('\n✅ Authentication system appears to be configured correctly');
  }
}
