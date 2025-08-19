# TeaKE Backend API Deployment on Vercel

## Issue Resolution

The "no framework detected" message appears because this is an Expo React Native project, not a traditional web backend. I've set up the proper structure for Vercel deployment.

## What's Been Fixed

1. **Created API folder structure** - Vercel requires serverless functions to be in an `/api` directory
2. **Added vercel.json configuration** - Tells Vercel how to handle the API routes
3. **Created example API endpoints**:
   - `/api/health` - Health check endpoint
   - `/api/stories` - Fetches stories feed
4. **Added environment variables template** - `.env.example` shows required variables

## How to Deploy to Vercel

### 1. Install Vercel CLI (if not already installed)
```bash
npm i -g vercel
```

### 2. Set up environment variables on Vercel
Go to your Vercel dashboard and add these environment variables:
- `DATABASE_URL` or `EXPO_PUBLIC_DATABASE_URL` - Your Neon database connection string
- `BETTER_AUTH_SECRET` - Your authentication secret
- Any AWS/S3 credentials if using image uploads

### 3. Deploy to Vercel
```bash
vercel
```

Or push to GitHub and connect to Vercel for automatic deployments.

### 4. Test your API
Once deployed, you can test:
- `https://your-app.vercel.app/api/health` - Should return OK status
- `https://your-app.vercel.app/api/stories` - Should return stories list

## API Structure

```
/api
  ├── health.ts      # Health check endpoint
  ├── stories.ts     # Stories feed endpoint
  └── [add more endpoints as needed]
```

## Important Notes

1. **CORS is enabled** - The API endpoints include CORS headers to allow requests from your mobile app
2. **Database connection** - Uses the same Neon database as your mobile app
3. **Authentication** - You'll need to implement proper authentication for protected endpoints
4. **File imports** - API files can import from your `/src` directory

## Next Steps

1. Add more API endpoints for other actions (guys, messages, etc.)
2. Implement authentication middleware
3. Add rate limiting if needed
4. Set up monitoring and error tracking

## Troubleshooting

If deployment fails:
1. Check that all environment variables are set in Vercel
2. Ensure database connection string is correct
3. Check Vercel function logs for errors
4. Verify that all imported modules are available

## Mobile App Integration

Update your mobile app to use the Vercel API URL:
```typescript
const API_URL = 'https://your-app.vercel.app/api';

// Example fetch
const response = await fetch(`${API_URL}/stories`);
const data = await response.json();
```
