# TeaKE Production Deployment Guide

## Overview
This guide covers deploying your TeaKE app to production with proper authentication configuration.

## Prerequisites
✅ Neon database is already configured and working
✅ Google OAuth client is set up
✅ App works in development

## Deployment Platforms (Choose One)

### Option 1: Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
npx vercel

# Follow prompts to connect your GitHub repo
```

### Option 2: Netlify
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build and deploy
npm run build
netlify deploy --prod --dir=dist
```

### Option 3: Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway deploy
```

## Configuration Steps

### 1. Update Production Environment Variables

Create a `.env.production.local` file (or set environment variables in your hosting platform):

```env
# Replace 'yourdomain.com' with your actual production domain
EXPO_PUBLIC_AUTH_BASE_URL=https://yourdomain.com/api/auth
EXPO_PUBLIC_GOOGLE_CLIENT_ID=445150503853-2iv13uvpmn25sodofd8sp4t7maq2ov04.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_CLIENT_SECRET=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

# Keep your existing database URL (already production-ready)
EXPO_PUBLIC_DATABASE_URL='postgresql://neondb_owner:npg_oegT8UIfG5Kp@ep-damp-fog-ae43kx5a-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require'

# Keep your existing R2 configuration
EXPO_PUBLIC_R2_ACCOUNT_ID="023fc4c0a641a20720a0f76d4b58b57f"
EXPO_PUBLIC_R2_ACCESS_KEY_ID="4ab51d9e43d0233e44e397bf5ba234cb"
EXPO_PUBLIC_R2_SECRET_ACCESS_KEY="f249c5bf4a6da2ff625a1019be0155a19bf561aba4bd2389f32afe3b44584138"
EXPO_PUBLIC_R2_BUCKET_NAME="genzjob"
EXPO_PUBLIC_R2_ENDPOINT="https://023fc4c0a641a20720a0f76d4b58b57f.r2.cloudflarestorage.com"
EXPO_PUBLIC_R2_PUBLIC_URL="https://pub-bc40211372a8488d898a472d44e9f9a5.r2.dev"

# Production settings
EXPO_PUBLIC_DEV_MODE=false
EXPO_PUBLIC_ADMIN_EMAIL=kulubiidris@gmail.com
```

### 2. Update Google Cloud Console

1. **Go to**: https://console.cloud.google.com/apis/credentials
2. **Select your project**: (the one with your current OAuth client)
3. **Click on your OAuth 2.0 Client ID**
4. **Add Authorized Redirect URIs**:
   ```
   https://yourdomain.com/api/auth/google/callback
   spilled://redirect
   ```
5. **Save changes**

### 3. Update Mobile App Configuration

For the mobile app to work with your production server:

1. **Publish a new build** with updated environment variables
2. **Submit to app stores** (iOS App Store, Google Play Store)

## Build Commands

### For Web Deployment
```bash
# Build for production
npm run build

# Preview locally (optional)
npm run preview
```

### For Mobile App Updates
```bash
# Create production build
npx eas build --platform all --profile production

# Submit to stores
npx eas submit --platform all
```

## Verification Steps

### 1. Test Production Web App
1. Visit `https://yourdomain.com`
2. Try Google sign-in
3. Verify database connections work
4. Test all key features

### 2. Test Mobile App
1. Update the app on test devices
2. Verify authentication works with production server
3. Test offline/online functionality

## Security Considerations

### Environment Variables Security
- ✅ Never commit `.env` files to Git
- ✅ Use your hosting platform's environment variable settings
- ✅ Consider using separate Google OAuth clients for production

### HTTPS Requirements
- ✅ Production must use HTTPS
- ✅ Google OAuth requires HTTPS callbacks
- ✅ Most hosting platforms provide free SSL certificates

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure `trustedOrigins` in `src/lib/auth.ts` includes your production domain

2. **OAuth Callback Errors**
   - Verify redirect URIs in Google Cloud Console match exactly
   - Check that HTTPS is being used

3. **Database Connection Issues**
   - Verify Neon database URL is correct
   - Check database connection limits

4. **Environment Variable Issues**
   - Ensure all `EXPO_PUBLIC_` variables are set in production
   - Variables without this prefix won't be available in the client

## Monitoring

### Set up monitoring for:
- Database performance (Neon dashboard)
- Authentication success rates
- Error logging
- User analytics

## Domain Setup

### Custom Domain (Optional)
1. **Purchase domain** from your preferred registrar
2. **Set up DNS** to point to your hosting platform
3. **Update environment variables** with new domain
4. **Update Google OAuth** redirect URIs
5. **Update mobile app** configuration

## Mobile App Store Submission

### iOS App Store
1. **Create App Store Connect account**
2. **Build with Expo Application Services (EAS)**
3. **Submit for review**

### Google Play Store
1. **Create Google Play Console account**
2. **Build with EAS**
3. **Submit for review**

---

## Quick Deployment Checklist

- [ ] Choose hosting platform (Vercel recommended)
- [ ] Set up production environment variables
- [ ] Update Google OAuth redirect URIs
- [ ] Deploy web application
- [ ] Test authentication in production
- [ ] Build and submit mobile apps
- [ ] Monitor and verify everything works

## Next Steps After Deployment

1. **Set up analytics** (Google Analytics, Mixpanel, etc.)
2. **Configure error monitoring** (Sentry, LogRocket)
3. **Set up automated backups** for your database
4. **Plan update strategy** for mobile apps
5. **Monitor performance** and user feedback

---

**Need help?** Check the deployment platform's documentation or reach out for support!
