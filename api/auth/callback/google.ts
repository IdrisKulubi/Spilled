import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Custom OAuth callback handler for Google
 * This intercepts the OAuth callback and redirects to the mobile app
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[OAuth Callback] Google callback received:', {
    query: req.query,
    url: req.url,
  });

  // Extract the authorization code and state from the query parameters
  const { code, state, error } = req.query;

  if (error) {
    console.error('[OAuth Callback] Error from Google:', error);
    // Redirect to app with error
    res.redirect(`spilled://auth/callback?error=${error}`);
    return;
  }

  if (!code) {
    console.error('[OAuth Callback] No authorization code received');
    res.redirect('spilled://auth/callback?error=no_code');
    return;
  }

  // Pass the authorization to the Better Auth handler
  // First, redirect to the standard Better Auth callback to process the OAuth
  const betterAuthCallbackUrl = `https://spilled-kappa.vercel.app/api/auth/callback/google?code=${code}&state=${state}`;
  
  console.log('[OAuth Callback] Processing with Better Auth:', betterAuthCallbackUrl);
  
  // Instead of redirecting to Better Auth, we need to handle it here
  // and then redirect to the app
  try {
    // Make a request to Better Auth to handle the OAuth callback
    const response = await fetch(betterAuthCallbackUrl, {
      method: 'GET',
      headers: {
        'Cookie': req.headers.cookie || '',
      },
    });

    console.log('[OAuth Callback] Better Auth response:', response.status);

    // Get cookies from the response to forward to the client
    const setCookieHeaders = response.headers.get('set-cookie');
    if (setCookieHeaders) {
      res.setHeader('Set-Cookie', setCookieHeaders);
    }

    // After Better Auth processes the OAuth, redirect to the mobile app
    console.log('[OAuth Callback] Redirecting to mobile app');
    res.redirect('spilled://auth/callback?success=true');
  } catch (error) {
    console.error('[OAuth Callback] Error processing OAuth:', error);
    res.redirect('spilled://auth/callback?error=processing_failed');
  }
}
