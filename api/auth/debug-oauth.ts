import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * OAuth Debug Endpoint
 * Returns the current OAuth configuration for debugging
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const config = {
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
    },
    oauth: {
      google_client_id: process.env.GOOGLE_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || 'NOT_SET',
      google_client_secret: process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT_SET',
      better_auth_secret: process.env.BETTER_AUTH_SECRET ? 'SET' : 'NOT_SET',
      auth_secret: process.env.AUTH_SECRET ? 'SET' : 'NOT_SET',
    },
    urls: {
      better_auth_url: process.env.BETTER_AUTH_URL || 'NOT_SET',
      auth_base_url: process.env.EXPO_PUBLIC_AUTH_BASE_URL || 'NOT_SET',
      expected_callback: 'https://spilled-kappa.vercel.app/api/auth/callback/google',
    },
    database: {
      database_url: process.env.DATABASE_URL ? 'SET' : 'NOT_SET',
      expo_database_url: process.env.EXPO_PUBLIC_DATABASE_URL ? 'SET' : 'NOT_SET',
    },
    instructions: {
      step1: 'Go to https://console.cloud.google.com/apis/credentials',
      step2: `Find OAuth client: ${process.env.GOOGLE_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID}`,
      step3: 'Add https://spilled-kappa.vercel.app to Authorized JavaScript origins',
      step4: 'Add https://spilled-kappa.vercel.app/api/auth/callback/google to Authorized redirect URIs',
      step5: 'Save and wait 5 minutes for propagation',
    },
  };

  res.status(200).json(config);
}
