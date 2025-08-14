# Cloudflare R2 Setup Guide

This guide explains how to set up Cloudflare R2 for file storage in the TeaKE application.

## Prerequisites

1. Cloudflare account with R2 enabled
2. R2 bucket created
3. API tokens configured

## Environment Variables

Add the following environment variables to your `.env.local` file:

```env
# Cloudflare R2 Configuration
EXPO_PUBLIC_R2_ACCOUNT_ID=your_r2_account_id_here
EXPO_PUBLIC_R2_ACCESS_KEY_ID=your_r2_access_key_id_here
EXPO_PUBLIC_R2_SECRET_ACCESS_KEY=your_r2_secret_access_key_here
EXPO_PUBLIC_R2_BUCKET_NAME=your_r2_bucket_name_here
EXPO_PUBLIC_R2_PUBLIC_URL=https://your-bucket.your-domain.com
```

## Getting Your R2 Credentials

### 1. Account ID

- Go to Cloudflare Dashboard
- Your Account ID is displayed in the right sidebar

### 2. Create R2 API Token

- Go to "My Profile" > "API Tokens"
- Click "Create Token"
- Use "Custom token" template
- Set permissions:
  - Zone: Zone Settings:Read
  - Account: Cloudflare R2:Edit
- Add account resources: Include your account
- Click "Continue to summary" and "Create Token"
- Copy the token (this is your `R2_ACCESS_KEY_ID`)

### 3. Create R2 Bucket

- Go to R2 Object Storage in your Cloudflare dashboard
- Click "Create bucket"
- Choose a unique bucket name
- Select a location
- Click "Create bucket"

### 4. Set up Custom Domain (Optional but Recommended)

- In your R2 bucket settings, go to "Settings" tab
- Click "Connect Domain"
- Enter your custom domain (e.g., `files.yourdomain.com`)
- Follow DNS setup instructions
- Use this custom domain as your `R2_PUBLIC_URL`

If you don't have a custom domain, you can use the R2.dev URL:
`https://your-bucket-name.your-account-id.r2.cloudflarestorage.com`

## Testing the Configuration

Run the R2 configuration test:

```typescript
import { runR2ConfigTest } from "./src/config/test-r2";

// In your app initialization or debug screen
runR2ConfigTest();
```

## Usage Examples

### Upload an Image

```typescript
import { uploadImageToR2 } from "./src/utils/imageUpload";

const result = await uploadImageToR2(imageUri, {
  prefix: "verification-images",
  fileName: "id-verification.jpg",
});

if (result.success) {
  console.log("Image uploaded:", result.url);
} else {
  console.error("Upload failed:", result.error);
}
```

### Delete an Image

```typescript
import { deleteImageFromR2 } from "./src/utils/imageUpload";

const result = await deleteImageFromR2(imageUrl);
if (result.success) {
  console.log("Image deleted successfully");
}
```

## File Organization

The R2 bucket will be organized as follows:

```
bucket/
├── verification-images/
│   ├── timestamp-randomid.jpg
│   └── timestamp-randomid.png
├── story-images/
│   ├── timestamp-randomid.jpg
│   └── timestamp-randomid.png
└── temp/
    └── test-files...
```

## Security Considerations

1. **API Keys**: Never commit API keys to version control
2. **Bucket Permissions**: Configure appropriate bucket permissions
3. **CORS**: Set up CORS policies if accessing from web
4. **File Validation**: Always validate file types and sizes before upload
5. **Rate Limiting**: Implement rate limiting for upload endpoints

## Troubleshooting

### Common Issues

1. **"Access Denied" Error**

   - Check API token permissions
   - Verify account ID is correct
   - Ensure bucket exists and is accessible

2. **"Invalid Endpoint" Error**

   - Verify account ID in endpoint URL
   - Check if R2 is enabled for your account

3. **Upload Fails**

   - Check file size limits
   - Verify content type is supported
   - Ensure presigned URL hasn't expired

4. **Environment Variables Not Loading**
   - Restart development server after adding variables
   - Check variable names match exactly
   - Ensure `.env.local` is in the correct directory

### Debug Mode

Enable debug logging by setting:

```env
EXPO_PUBLIC_DEBUG_R2=true
```

This will log additional information about R2 operations.

## Migration from Supabase Storage

When migrating from Supabase Storage:

1. Export existing files from Supabase
2. Upload files to R2 using the migration script
3. Update database URLs to point to R2
4. Test all file access functionality
5. Remove Supabase Storage dependencies

## Performance Optimization

1. **Image Optimization**: Use appropriate image formats and compression
2. **CDN**: Leverage Cloudflare's global CDN for fast delivery
3. **Caching**: Implement proper caching headers
4. **Lazy Loading**: Load images on demand in the app

## Cost Considerations

- R2 pricing: $0.015/GB/month for storage
- No egress fees when using Cloudflare CDN
- API requests: $4.50 per million requests
- Monitor usage in Cloudflare dashboard
