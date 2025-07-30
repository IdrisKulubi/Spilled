# Google OAuth Setup Guide for TeaKE

This guide will help you set up Google OAuth authentication for the TeaKE app.

## 🔧 Prerequisites

- Supabase project already set up
- Google Cloud Console account
- TeaKE app dependencies installed

## 📋 Step 1: Google Cloud Console Setup

### 1.1 Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. If prompted, configure the **OAuth consent screen** first:
   - Choose **External** (unless you have a G Suite/Google Workspace)
   - Fill in required fields:
     - **App name**: TeaKE
     - **User support email**: Your email
     - **Developer contact information**: Your email
   - Add scopes: `email`, `profile`, `openid`
   - Save and continue

### 1.2 Configure OAuth Client ID

1. **Application type**: Web application
2. **Name**: TeaKE Web Client
3. **Authorized redirect URIs**: 
   - Add your Supabase project's auth callback URL:
   - `https://your-project-id.supabase.co/auth/v1/callback`
   - Replace `your-project-id` with your actual Supabase project ID

4. Click **Create**
5. **Save the Client ID and Client Secret** - you'll need these for Supabase

## 🗄️ Step 2: Supabase Configuration

### 2.1 Enable Google OAuth Provider

1. Go to your Supabase dashboard
2. Navigate to **Authentication** > **Settings**
3. Scroll down to **Auth Providers**
4. Find **Google** and toggle it **ON**
5. Enter your Google OAuth credentials:
   - **Client ID**: From Google Cloud Console
   - **Client Secret**: From Google Cloud Console
6. Click **Save**

### 2.2 Configure Additional Settings

1. In **Site URL**, make sure it's set to your app's URL:
   - For development: `exp://127.0.0.1:19000` (Expo default)
   - For production: Your actual app URL
2. In **Redirect URLs**, add:
   - `teake://` (for mobile app)
   - Your web app URL if applicable

## 📱 Step 3: Mobile App Configuration (Optional)

If you plan to publish to app stores, you'll need additional OAuth client IDs:

### 3.1 Android OAuth Client

1. In Google Cloud Console, create another **OAuth client ID**
2. **Application type**: Android
3. **Package name**: From your `app.json` (usually `com.yourname.teake`)
4. **SHA-1 certificate fingerprint**: 
   - For development: Get from Expo
   - For production: Get from your signing key

### 3.2 iOS OAuth Client

1. Create another **OAuth client ID**
2. **Application type**: iOS
3. **Bundle ID**: From your `app.json`

## 🧪 Step 4: Test the Integration

### 4.1 Test Authentication Flow

1. Start your Expo development server:
   ```bash
   cd TeaKE
   npm start
   ```

2. Open the app and try the Google OAuth sign-in
3. You should be redirected to Google's consent screen
4. After approval, you should be signed into the app

### 4.2 Verify User Data

1. Check your Supabase **Authentication** > **Users** tab
2. Verify that users created via Google OAuth have:
   - Correct email address
   - Display name from Google
   - `provider` set to `google`

## 🔒 Security Notes

1. **Never commit OAuth secrets** to version control
2. Use different OAuth clients for development and production
3. Regularly rotate OAuth secrets
4. Monitor OAuth usage in Google Cloud Console
5. Set up proper CORS policies in Supabase

## 🛠️ Troubleshooting

### Common Issues:

1. **"Invalid redirect_uri"**:
   - Double-check the redirect URI in Google Cloud Console
   - Ensure it matches exactly: `https://your-project-id.supabase.co/auth/v1/callback`

2. **"OAuth consent screen not configured"**:
   - Complete the OAuth consent screen setup in Google Cloud Console

3. **"App not verified"**:
   - For development, click "Advanced" > "Go to TeaKE (unsafe)"
   - For production, submit your app for verification

4. **Mobile app not working**:
   - Ensure you have the correct package name/bundle ID in Google OAuth settings
   - Check that your app scheme is configured correctly (`teake://`)

## 📚 Additional Resources

- [Supabase Auth with Google](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google OAuth 2.0 Setup](https://developers.google.com/identity/protocols/oauth2)
- [Expo AuthSession Documentation](https://docs.expo.dev/versions/latest/sdk/auth-session/)

## 🎉 You're Done!

Your TeaKE app now uses Google OAuth for authentication, making it easier for users to sign in securely with their Google accounts!