# Google OAuth - FINAL FIX

## ⚠️ THE CRITICAL ISSUE
Google is **rejecting** your OAuth request with: `v3/signin/rejected?app_domain=https://spilled-kappa.vercel.app`

This means Google doesn't recognize `https://spilled-kappa.vercel.app` as an authorized domain for your OAuth client.

## 🔥 IMMEDIATE FIX (Follow EXACTLY)

### Step 1: Open Google Cloud Console
Go to: https://console.cloud.google.com/apis/credentials

### Step 2: Find Your OAuth Client
Look for the OAuth 2.0 Client ID that matches:
`445150503853-2iv13uvpmn25sodofd8sp4t7maq2ov04.apps.googleusercontent.com`

Click on it to edit.

### Step 3: Update Authorized JavaScript Origins
**DELETE all existing entries** and add these EXACT URLs:
```
https://spilled-kappa.vercel.app
http://localhost:8081
http://localhost:19006
http://localhost:3000
```

### Step 4: Update Authorized Redirect URIs  
**DELETE all existing entries** and add these EXACT URLs:
```
https://spilled-kappa.vercel.app/api/auth/callback/google
http://localhost:8081/api/auth/callback/google
http://localhost:19006/api/auth/callback/google
http://localhost:3000/api/auth/callback/google
```

### Step 5: Save Changes
Click "SAVE" at the bottom of the page.

### Step 6: OAuth Consent Screen
Go to "OAuth consent screen" in the left sidebar.

Ensure these are set:
- **Application type**: External
- **Application name**: Spilled (or your app name)
- **User support email**: Your email
- **Application home page**: `https://spilled-kappa.vercel.app`
- **Authorized domains**: Click "ADD DOMAIN" and add: `spilled-kappa.vercel.app`
- **Developer contact information**: Your email

### Step 7: Publishing Status
Check the publishing status at the top of the OAuth consent screen:

**If it says "Testing":**
1. Scroll down to "Test users"
2. Click "ADD USERS"
3. Add the email addresses that will be testing
4. OR click "PUBLISH APP" to make it available to everyone

### Step 8: Clear ALL Caches
1. Close the browser in your phone completely
2. Clear the app cache:
   - iOS: Settings > General > iPhone Storage > Your App > Offload App
   - Android: Settings > Apps > Your App > Clear Cache

### Step 9: Wait for Propagation
**IMPORTANT**: Google changes can take 5-10 minutes to propagate. Wait at least 5 minutes.

## 🧪 Test After Fix

1. Completely close your app
2. Reopen the app
3. Click "Continue with Google"
4. You should now see the Google sign-in screen without rejection

## 🔍 How to Verify It's Working

When you click sign-in, the URL should redirect to:
- Google sign-in page (not rejected page)
- After sign-in: `https://spilled-kappa.vercel.app/api/auth/callback/google?code=...`
- Then redirect to: `spilled://auth/callback`

## 🚨 If Still Not Working

### Option A: Create New OAuth Client
1. Go to Google Cloud Console
2. Click "CREATE CREDENTIALS" > "OAuth client ID"
3. Application type: "Web application"
4. Name: "Spilled Web"
5. Add the JavaScript origins and redirect URIs from above
6. Copy the new Client ID and Client Secret
7. Update your Vercel environment variables with the new credentials

### Option B: Check Domain Verification
1. Go to: https://search.google.com/search-console
2. Add and verify `https://spilled-kappa.vercel.app`
3. This helps Google trust your domain

### Option C: Use Different OAuth Approach
Instead of Better Auth's built-in OAuth, use expo-auth-session directly (requires code refactor).

## 📝 Environment Variables to Check

In Vercel Dashboard, ensure these are set:
```
GOOGLE_CLIENT_ID=445150503853-2iv13uvpmn25sodofd8sp4t7maq2ov04.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=[your-secret-here]
EXPO_PUBLIC_GOOGLE_CLIENT_ID=445150503853-2iv13uvpmn25sodofd8sp4t7maq2ov04.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_CLIENT_SECRET=[your-secret-here]
BETTER_AUTH_SECRET=[32-character-string]
AUTH_SECRET=[same-as-BETTER_AUTH_SECRET]
```

## 🎯 The Core Problem

Google is seeing `app_domain=https://spilled-kappa.vercel.app` and saying "I don't trust this domain for this OAuth client". This is 100% a Google Console configuration issue, not a code issue.

## ✅ Success Indicators

You'll know it's fixed when:
1. No more `v3/signin/rejected` in the URL
2. You see Google's actual sign-in page
3. After signing in, you're redirected back to your app
4. The app shows your user as logged in

---

**IMPORTANT**: This is a Google configuration issue. No amount of code changes will fix it until the Google Cloud Console is properly configured.
