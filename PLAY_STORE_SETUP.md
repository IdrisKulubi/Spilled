# Google Play Store Deployment Guide for TeaKE

## Prerequisites

1. **Install EAS CLI** (if not already installed):
   ```bash
   npm install -g @expo/eas-cli
   ```

2. **Login to Expo**:
   ```bash
   eas login
   ```

3. **Create/Link EAS Project**:
   ```bash
   eas init
   ```

## Step 1: Update Project Configuration

✅ **Already Done:**
- Updated `app.json` with Android package name and permissions
- Created `eas.json` with build configurations

## Step 2: Build for Production

1. **Build Android App Bundle (AAB) for Play Store**:
   ```bash
   eas build --platform android --profile production
   ```

2. **Build APK for testing** (optional):
   ```bash
   eas build --platform android --profile preview
   ```

## Step 3: Google Play Console Setup

### A. Create Google Play Console Account
1. Go to [Google Play Console](https://play.google.com/console)
2. Pay the $25 one-time registration fee
3. Complete developer profile

### B. Create New App
1. Click "Create app"
2. Fill in app details:
   - **App name**: TeaKE
   - **Default language**: English (United States)
   - **App or game**: App
   - **Free or paid**: Free

### C. App Content & Store Listing

#### Store Listing Information:
- **App name**: TeaKE
- **Short description**: A platform for women to share experiences and stay safe
- **Full description**: 
  ```
  TeaKE is a secure platform designed to help women stay safe by sharing experiences about concerning behavior from men they've encountered. 

  Key Features:
  • Anonymous story sharing
  • ID verification for trusted community
  • Search functionality to check profiles
  • Secure messaging system
  • Tag-based categorization (Red Flags, Good Vibes, Unsure)

  Our mission is to create a safer community where women can warn each other about potential red flags while also highlighting positive experiences.

  All users are verified through ID verification to ensure authenticity while maintaining privacy through anonymous posting options.
  ```

#### Required Assets:
You'll need to create these graphics:

1. **App Icon**: 512x512 PNG (already have: `./assets/images/icon.png`)
2. **Feature Graphic**: 1024x500 PNG
3. **Screenshots**: At least 2, up to 8 (1080x1920 for phone)
4. **Privacy Policy URL**: Required for apps that collect user data

#### Content Rating:
- Complete the content rating questionnaire
- Likely rating: Teen (13+) due to user-generated content

#### Target Audience:
- Primary: Ages 18-34
- Secondary: Ages 35-44

## Step 4: App Signing

Google Play App Signing is automatically handled by EAS Build, but you need to:

1. **Upload your first APK/AAB** to Play Console
2. **Opt in to Play App Signing** (recommended)
3. **Download and save** your upload certificate

## Step 5: Privacy Policy & Data Safety

### Privacy Policy Requirements:
Your app collects:
- Personal info (email, phone, ID verification)
- Photos (story images, ID photos)
- User-generated content (stories, comments)

### Data Safety Section:
- **Data collected**: Personal info, Photos, Messages
- **Data shared**: None with third parties
- **Data security**: Encrypted in transit and at rest
- **Data deletion**: Users can request account deletion

## Step 6: Release Management

### Internal Testing (Recommended First):
1. Create internal testing track
2. Add test users (up to 100)
3. Upload AAB file
4. Test thoroughly

### Production Release:
1. Upload final AAB
2. Complete all required sections
3. Submit for review
4. Review typically takes 1-3 days

## Step 7: Required Legal Documents

### Privacy Policy Template:
```
Privacy Policy for TeaKE

Last updated: [DATE]

TeaKE ("we," "our," or "us") operates the TeaKE mobile application (the "Service").

Information We Collect:
- Account information (email, phone number)
- ID verification photos (for user verification)
- User-generated content (stories, comments)
- Usage data and analytics

How We Use Information:
- To provide and maintain our Service
- To verify user identity
- To enable communication between users
- To improve our Service

Data Security:
We implement appropriate security measures to protect your personal information.

Contact Us:
If you have questions about this Privacy Policy, contact us at [YOUR_EMAIL]
```

## Commands Summary:

```bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Login to Expo
eas login

# Initialize EAS project
eas init

# Build for production (Play Store)
eas build --platform android --profile production

# Build preview APK for testing
eas build --platform android --profile preview

# Submit to Play Store (after setting up service account)
eas submit --platform android
```

## Next Steps:

1. ✅ Run `eas init` to set up your project
2. ✅ Run production build
3. ✅ Create Google Play Console account
4. ✅ Create required graphics and screenshots
5. ✅ Write privacy policy
6. ✅ Upload and test your app
7. ✅ Submit for review

## Important Notes:

- **Package name** is set to `com.teake.app` - make sure this is unique
- **Version code** starts at 1 - increment for each release
- **Permissions** are configured for camera, storage, and network access
- **Target SDK** is set to 34 (Android 14) for Play Store requirements
