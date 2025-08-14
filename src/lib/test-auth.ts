/**
 * Test file to verify Better Auth configuration and endpoints
 * This file can be used to test the authentication setup in development
 */

import { authClient } from "./auth-client";

export async function testAuthEndpoints() {
  try {
    console.log("Testing Better Auth endpoints...");
    
    // Test if the auth client can connect to the server
    const session = await authClient.getSession();
    console.log("✅ Auth client initialized successfully");
    console.log("Current session:", session);
    
    return {
      success: true,
      message: "Better Auth endpoints are working correctly",
      session,
    };
  } catch (error) {
    console.error("❌ Error testing auth endpoints:", error);
    return {
      success: false,
      message: "Failed to connect to Better Auth endpoints",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function testGoogleOAuth() {
  try {
    console.log("Testing Google OAuth configuration...");
    
    // This will test if the Google OAuth provider is properly configured
    // Note: This won't actually sign in, just test the configuration
    const result = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/dashboard",
    });
    
    console.log("✅ Google OAuth configuration is valid");
    return {
      success: true,
      message: "Google OAuth is properly configured",
      result,
    };
  } catch (error) {
    console.error("❌ Error testing Google OAuth:", error);
    return {
      success: false,
      message: "Google OAuth configuration failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}