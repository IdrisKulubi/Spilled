# Google Play Store Submission Guide for Spilled

## Current Status ✅
- ✅ EAS CLI installed and configured
- ✅ Expo account set up (vehem23)
- ✅ Android keystore configured
- ✅ Package name: `com.vehem23.spilled`
- ✅ App.json configured for Play Store
- ✅ EAS.json updated with correct environment variables

## Current Issue 🔧
The production build failed with a JavaScript bundling error. Here are the steps to fix and proceed:

### 1. Fix Build Issues

**Check the build logs**: https://expo.dev/accounts/vehem23/projects/spilled/builds/aa997d72-60c3-4265-a0f4-9a13afa6759d

**Common solutions:**
```bash
# 1. Clear all caches and reinstall dependencies
npm run reset-project
npm install

# 2. Fix any TypeScript errors
npx tsc --noEmit

# 3. Try building locally first
npx expo export

# 4. Check for environment variable issues
cat .env.production.local
```

### 2. Deploy Your Backend First (IMPORTANT)

Before submitting to Play Store, you MUST deploy your backend:

**Option 1: Deploy to Vercel (Recommended)**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy your backend
vercel

# Get your production URL (e.g., https://spilled-app.vercel.app)
```

**Option 2: Deploy to Netlify**
```bash
npm install -g netlify-cli
npm run build
netlify deploy --prod --dir=dist
```

### 3. Update Production Environment Variables

Once you have your production backend URL, update `.env.production.local`:

```env
# Replace with your actual production domain
EXPO_PUBLIC_AUTH_BASE_URL=https://your-actual-domain.vercel.app/api/auth
```

### 4. Update Google OAuth Settings

1. Go to: https://console.cloud.google.com/apis/credentials
2. Find your OAuth 2.0 Client ID
3. Add authorized redirect URIs:
   ```
   https://your-actual-domain.vercel.app/api/auth/google/callback
   spilled://redirect
   ```

### 5. Build Production App (Try Again)

```bash
# Build for production
eas build --platform android --profile production

# If that fails, try preview first
eas build --platform android --profile preview
```

### 6. Google Play Console Setup

1. **Create Developer Account**
   - Go to: https://play.google.com/console
   - Pay $25 one-time registration fee
   - Complete account verification

2. **Create New App**
   - Click "Create app"
   - App name: "Spilled"
   - Default language: English
   - App category: Social
   - Content rating: Mature 17+

3. **Complete App Information**
   - Short description (80 chars max)
   - Full description (4000 chars max)
   - App icon (512x512 PNG)
   - Feature graphic (1024x500 PNG)
   - Screenshots (at least 2, up to 8)

### 7. Required Play Store Assets

Create these assets (save in `assets/play-store/`):

**App Icon**
- Size: 512x512 pixels
- Format: PNG (no alpha channel)
- File size: Less than 1MB

**Feature Graphic**
- Size: 1024x500 pixels
- Format: PNG or JPEG
- No text overlay

**Screenshots**
- At least 2 screenshots
- Size: 320dp to 3840dp
- Aspect ratio: 16:9 or 9:16

**Privacy Policy** (Required)
- Create privacy policy
- Host it online
- Add URL to Play Console

### 8. App Content Rating

Your app will need content rating for:
- Violence
- Sexual content  
- Substance use
- Social features
- Data collection

Given your app's nature (reporting concerning behavior), expect a mature rating.

### 9. Data Safety Form

Complete the data safety section:
- What data you collect
- How you use it
- If you share it with third parties
- Security practices

### 10. Release Configuration

**App Signing**
- Use Play App Signing (recommended)
- Upload your signed AAB file

**Release Tracks**
- Internal testing (for your team)
- Closed testing (beta testers)
- Open testing (public beta)
- Production (public release)

Start with "Internal testing" first.

### 11. Testing Strategy

**Before Production Release:**

1. **Internal Testing**
   ```bash
   # Build and upload to internal track
   eas build --platform android --profile production
   eas submit --platform android --track internal
   ```

2. **Add Test Users**
   - Add email addresses of testers
   - Share the internal testing link
   - Gather feedback

3. **Beta Testing**
   - Move to closed testing track
   - Get more user feedback
   - Fix any critical issues

4. **Production Release**
   - Submit for production
   - App review process (1-3 days)
   - Monitor for crashes/issues

### 12. Pre-Submission Checklist

- [ ] Backend deployed to production
- [ ] Environment variables updated
- [ ] Google OAuth configured for production
- [ ] App builds successfully
- [ ] All required Play Store assets created
- [ ] Privacy policy written and hosted
- [ ] Content rating completed
- [ ] Data safety form filled out
- [ ] Internal testing completed
- [ ] No crashes or critical bugs

### 13. App Store Optimization (ASO)

**Title**: "Spilled - Women's Safety Network"
**Short Description**: "Share experiences, warn others, stay safe. A platform for women to report concerning behavior."
**Keywords**: women safety, social network, community, reporting, security

### 14. After Submission

**Monitor**:
- Google Play Console for reviews
- Crash reports
- User feedback
- Performance metrics

**Update Strategy**:
- Plan regular updates
- Fix bugs quickly
- Add new features based on feedback

### 15. Troubleshooting Common Issues

**Build Failures**:
- Check TypeScript errors
- Verify environment variables
- Clear caches and rebuild

**Upload Failures**:
- Ensure AAB is signed correctly
- Check version code is incremented
- Verify package name matches

**Review Rejections**:
- Content policy violations
- Privacy policy issues
- Technical problems
- Metadata problems

### 16. Important Notes

**Sensitive Content**: Your app deals with reporting concerning behavior from men. This may require:
- Clear content warnings
- Robust moderation system
- User verification
- Legal disclaimers

**Legal Considerations**:
- Terms of service
- Privacy policy compliance (GDPR, CCPA)
- Content moderation policies
- User safety measures

---

## Quick Commands Reference

```bash
# Build production app
eas build --platform android --profile production

# Submit to Play Store
eas submit --platform android

# Check build status
eas build:list

# Download build
eas build:download [BUILD_ID]

# Update app version
# Edit app.json version and android.versionCode
```

## Support Resources

- **EAS Build Docs**: https://docs.expo.dev/build/introduction/
- **Play Console Help**: https://support.google.com/googleplay/android-developer/
- **App Review Guidelines**: https://play.google.com/about/developer-content-policy/

---

**Next Steps**: 
1. Fix the build issue
2. Deploy your backend
3. Update environment variables
4. Try the build again
5. Create Play Store developer account
