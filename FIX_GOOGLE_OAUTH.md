# Fix Google OAuth - Complete Solution

## The Problem
Google is rejecting the OAuth request with `v3/signin/rejected`. This happens when:
1. The redirect URI isn't registered in Google Cloud Console
2. The OAuth client configuration is incorrect
3. The app domain isn't properly configured

## Step-by-Step Fix

### 1. Check Your Google Cloud Console Configuration

Go to: https://console.cloud.google.com/apis/credentials

Select your OAuth 2.0 Client ID (the one matching: `445150503853-2iv13uvpmn25sodofd8sp4t7maq2ov04.apps.googleusercontent.com`)

### 2. Required Authorized JavaScript Origins

Add ALL of these (if not already present):
```
https://spilled-kappa.vercel.app
http://localhost:8081
http://localhost:19006
exp://localhost:8081
```

### 3. Required Authorized Redirect URIs

Add ALL of these (if not already present):
```
https://spilled-kappa.vercel.app/api/auth/callback/google
https://spilled-kappa.vercel.app/api/auth/google/callback
http://localhost:8081/api/auth/callback/google
http://localhost:19006/api/auth/callback/google
spilled://auth/callback
spilled://redirect
exp://localhost:8081/--/auth/callback
```

### 4. OAuth Consent Screen Settings

Go to: OAuth consent screen tab

Check that:
- App name is set
- User support email is configured
- Application home page: `https://spilled-kappa.vercel.app`
- Application privacy policy link: (can be same as home page)
- Application terms of service link: (can be same as home page)
- Authorized domains: `spilled-kappa.vercel.app`

### 5. Test Users (if in testing mode)

If your app is in "Testing" mode:
- Add your test email addresses to the "Test users" list
- Or publish the app to "Production" (requires review for sensitive scopes)

### 6. Environment Variables Check

Ensure these are set in Vercel:
```
GOOGLE_CLIENT_ID=445150503853-2iv13uvpmn25sodofd8sp4t7maq2ov04.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<your-secret>
EXPO_PUBLIC_GOOGLE_CLIENT_ID=445150503853-2iv13uvpmn25sodofd8sp4t7maq2ov04.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_CLIENT_SECRET=<your-secret>
BETTER_AUTH_SECRET=<your-32-char-secret>
AUTH_SECRET=<same-as-BETTER_AUTH_SECRET>
```

### 7. Deploy the Latest Code

```bash
git add .
git commit -m "Fix Google OAuth configuration"
git push
```

Or with Vercel CLI:
```bash
vercel --prod
```

### 8. Clear Browser Cache

The Google OAuth screen may cache old configurations. Clear your browser cache or use incognito mode.

## Testing

1. Open your app
2. Click "Continue with Google"
3. You should see the Google sign-in screen
4. After signing in, you should be redirected back to the app

## Debugging

If it still doesn't work:

1. Check Vercel Function Logs:
   - Go to Vercel Dashboard > Functions
   - Look for `/api/auth/index` logs

2. Check browser console when clicking sign-in

3. Check the exact redirect URI in the OAuth URL:
   - Look for `redirect_uri=` in the URL
   - Make sure this EXACT URL is in Google Console

## Common Issues

| Issue | Solution |
|-------|----------|
| "Error 400: redirect_uri_mismatch" | The exact redirect URI isn't in Google Console |
| "v3/signin/rejected" | App domain or redirect URI not authorized |
| "Access blocked" | App is in testing mode and user isn't in test users list |
| No redirect back to app | Deep link scheme not configured properly |

## The Fix We Applied

1. Removed hardcoded callback URL from Better Auth config
2. Let Better Auth generate the proper callback URL
3. Added comprehensive logging to debug the flow
4. Created this guide for Google Console configuration
