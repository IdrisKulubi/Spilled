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
