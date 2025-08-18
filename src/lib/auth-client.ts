import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import Constants from 'expo-constants';

// Intelligent URL detection for development
function getAuthBaseURL() {
  const envUrl = process.env.EXPO_PUBLIC_AUTH_BASE_URL;

  // Helper: derive base from Expo host (tunnel/LAN)
  const deriveFromExpoHost = () => {
    const hostUri = (Constants as any)?.expoConfig?.hostUri || (Constants as any)?.manifest2?.extra?.expoGo?.developer?.host;
    if (!hostUri) return null;
    // hostUri examples:
    // - x-xxxx-username-8081.exp.direct:8081
    // - 192.168.1.10:8081
    const [host, port] = hostUri.split(':');
    if (host.includes('exp.direct') || host.endsWith('.expo.dev')) {
      // Use HTTPS without explicit port for exp.direct
      return `https://${host}/api/auth`;
    }
    // Use HTTP for LAN/IP hosts
    return `http://${host}${port ? ':' + port : ''}/api/auth`;
  };

  // Prefer explicit env if set and not localhost on device
  if (envUrl) {
    const isLocalhost = envUrl.includes('localhost');
    const isNative = typeof window === 'undefined';
    if (isLocalhost && isNative) {
      const derived = deriveFromExpoHost();
      if (derived) {
        console.log('[Auth Client] Overriding localhost with Expo host:', derived);
        return derived;
      }
    }
    return envUrl;
  }

  // No env provided: try to derive from Expo host
  const derived = deriveFromExpoHost();
  if (derived) return derived;

  // Fallback to default
  return 'http://localhost:8081/api/auth';
}

// Log the auth configuration for debugging
const authBaseURL = getAuthBaseURL();
console.log("[Auth Client] Initializing with base URL:", authBaseURL);
console.log("[Auth Client] App scheme: spilled");
console.log("[Auth Client] Device:", Constants.deviceName || 'Unknown');

export const authClient = createAuthClient({
  baseURL: authBaseURL,
  plugins: [
    expoClient({
      scheme: "spilled", // App scheme from app.json
      storagePrefix: "spilled",
      storage: SecureStore,
    }),
  ],
});

// Log when auth client is ready
console.log("[Auth Client] Initialized successfully");

export type Session = typeof authClient.$Infer.Session;
// Use our database User type instead of Better Auth User type
export type { User } from '../database/schema';