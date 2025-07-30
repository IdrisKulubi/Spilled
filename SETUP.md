# TeaKE Setup Guide

This guide will walk you through setting up the TeaKE app from scratch.

## 📋 Prerequisites

- [Node.js 18+](https://nodejs.org/)
- [Expo CLI](https://docs.expo.dev/get-started/installation/): `npm install -g @expo/cli`
- [Supabase account](https://supabase.com)
- Code editor (VS Code recommended)

## 🗄️ Step 1: Supabase Setup

### 1.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/sign in
2. Click "New project"
3. Choose your organization
4. Fill in project details:
   - **Name**: `teake-app` (or your preferred name)
   - **Database Password**: Create a strong password
   - **Region**: Choose closest to Kenya (Europe West recommended)
5. Click "Create new project"
6. Wait for the project to be ready (2-3 minutes)

### 1.2 Run Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy the entire contents of `database/schema.sql` from this project
4. Paste it into the SQL editor
5. Click "Run" to execute the schema
6. You should see "Success. No rows returned" - this is normal

### 1.3 Configure Authentication

1. Go to **Authentication** > **Settings**
2. Enable **Phone Auth**:
   - Toggle "Enable phone signup" ON
   - Set phone confirmation to ON
3. Configure SMS Provider (choose one):

   **Option A: Twilio (Recommended for Kenya)**
   - Sign up at [twilio.com](https://twilio.com)
   - Get your Account SID and Auth Token
   - Buy a phone number with SMS capabilities
   - In Supabase: Select "Twilio" and enter your credentials

   **Option B: Messagebird**
   - Similar process to Twilio
   - Good alternative if Twilio doesn't work

4. **SMS Template** (optional but recommended):
   ```
   Your TeaKE verification code is: {{ .Token }}
   
   This code expires in 10 minutes.
   ```

### 1.4 Set Up Storage (for images)

1. Go to **Storage**
2. Create a new bucket called `story-images`
3. Set bucket to **Public** 
4. In **Policies**, create a policy:
   - Policy name: "Users can upload story images"
   - Target roles: `authenticated`
   - Allowed operations: `INSERT`, `SELECT`

### 1.5 Get API Keys

1. Go to **Settings** > **API**
2. Copy these values (you'll need them for the app):
   - **Project URL** 
   - **anon public** key

## 📱 Step 2: App Setup

### 2.1 Install Dependencies

```bash
# Navigate to the TeaKE directory
cd TeaKE

# Install all dependencies
npm install
```

### 2.2 Environment Configuration

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your Supabase credentials:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   EXPO_PUBLIC_DEV_MODE=true
   ```

### 2.3 Test the Connection

1. Start the development server:
   ```bash
   npm start
   ```

2. The Expo development server should start
3. You can test on:
   - **iOS Simulator**: Press `i`
   - **Android Emulator**: Press `a` 
   - **Physical Device**: Scan QR code with Expo Go app
   - **Web Browser**: Press `w`

## 🧪 Step 3: Testing

### 3.1 Test Authentication

1. Open the app
2. Try to sign up with a Kenyan phone number (e.g., `0712345678`)
3. You should receive an SMS with a verification code
4. Enter the code to complete signup

### 3.2 Test Database Operations

1. Once logged in, try creating a post
2. Search for guys by name or phone
3. Test the commenting system

### 3.3 Test Messaging

1. Create multiple test accounts
2. Try sending messages between accounts
3. Verify messages appear correctly

## 🔧 Step 4: Customization

### 4.1 App Branding

- **App Icon**: Replace files in `assets/images/`
- **App Name**: Update in `app.json`
- **Colors**: Modify `src/constants/Colors.ts`

### 4.2 SMS Templates

In Supabase Auth settings, customize SMS templates:

```
Welcome to TeaKE! 

Your verification code is: {{ .Token }}

This code expires in 10 minutes. Keep your dating life transparent and safe! 💕
```

### 4.3 Content Moderation

1. In Supabase, go to **Authentication** > **Users**
2. You can manually manage users and ban accounts if needed
3. Consider setting up database triggers for automatic moderation

## 🚀 Step 5: Production Deployment

### 5.1 Environment Setup

1. Create production environment file:
   ```bash
   cp .env .env.production
   ```

2. Update production values:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your-production-supabase-url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
   EXPO_PUBLIC_DEV_MODE=false
   ```

### 5.2 Build Configuration

1. Update `app.json` for production:
   ```json
   {
     "expo": {
       "name": "TeaKE",
       "slug": "teake-app",
       "version": "1.0.0",
       "privacy": "public"
     }
   }
   ```

### 5.3 App Store Preparation

1. **Icons & Screenshots**: Prepare app store assets
2. **Privacy Policy**: Create privacy policy (required)
3. **Terms of Service**: Create terms of service
4. **App Description**: Write compelling app store description

## 🛠️ Troubleshooting

### Common Issues

**Issue**: "Supabase URL not configured"
- **Solution**: Check your `.env` file and restart Expo

**Issue**: SMS not received
- **Solution**: 
  - Verify Twilio/SMS provider configuration
  - Check phone number format (+254...)
  - Ensure SMS provider has sufficient balance

**Issue**: Database connection errors
- **Solution**: 
  - Verify API keys are correct
  - Check network connection
  - Ensure Row Level Security policies are set up

**Issue**: App crashes on startup
- **Solution**:
  - Check console for error messages
  - Verify all dependencies are installed
  - Clear Expo cache: `expo start -c`

### Getting Help

1. **Check logs**: Look at console output for error messages
2. **Supabase logs**: Check logs in Supabase dashboard
3. **Community**: Join Expo and Supabase Discord communities
4. **Documentation**: 
   - [Expo Docs](https://docs.expo.dev/)
   - [Supabase Docs](https://supabase.com/docs)

## 📈 Monitoring & Analytics

### Optional Integrations

1. **Sentry** for error tracking
2. **Expo Analytics** for usage metrics  
3. **Supabase Analytics** for database insights

### Performance Monitoring

Monitor these metrics:
- Authentication success rate
- Message delivery rate
- App crash rate
- User retention

## 🔒 Security Checklist

Before going live:

- [ ] Enable RLS on all tables
- [ ] Test SMS authentication thoroughly
- [ ] Verify message encryption works
- [ ] Set up proper error handling
- [ ] Implement rate limiting
- [ ] Create content moderation guidelines
- [ ] Set up user reporting system
- [ ] Test privacy features

## 🎉 You're Ready!

Your TeaKE app should now be fully functional. Users can:

✅ Sign up with phone numbers  
✅ Search for guys  
✅ Post anonymous stories  
✅ Comment on posts  
✅ Send encrypted messages  
✅ Report inappropriate content  

Remember to monitor your app closely after launch and be prepared to moderate content to maintain a safe community environment.