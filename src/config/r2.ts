import { S3Client } from '@aws-sdk/client-s3';

// Cloudflare R2 configuration
export const r2Config = {
  accountId: process.env.EXPO_PUBLIC_R2_ACCOUNT_ID!,
  accessKeyId: process.env.EXPO_PUBLIC_R2_ACCESS_KEY_ID!,
  secretAccessKey: process.env.EXPO_PUBLIC_R2_SECRET_ACCESS_KEY!,
  bucketName: process.env.EXPO_PUBLIC_R2_BUCKET_NAME!,
  publicUrl: process.env.EXPO_PUBLIC_R2_PUBLIC_URL!, // Custom domain or R2.dev URL
};

// Create S3 client configured for Cloudflare R2
export const r2Client = new S3Client({
  region: 'auto', // Cloudflare R2 uses 'auto' as region
  endpoint: `https://${r2Config.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: r2Config.accessKeyId,
    secretAccessKey: r2Config.secretAccessKey,
  },
  forcePathStyle: true, // Required for R2 compatibility
});

// Validation function to ensure all required environment variables are set
export const validateR2Config = (): boolean => {
  const requiredVars = [
    'EXPO_PUBLIC_R2_ACCOUNT_ID',
    'EXPO_PUBLIC_R2_ACCESS_KEY_ID',
    'EXPO_PUBLIC_R2_SECRET_ACCESS_KEY',
    'EXPO_PUBLIC_R2_BUCKET_NAME',
    'EXPO_PUBLIC_R2_PUBLIC_URL',
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('Missing required R2 environment variables:', missingVars);
    return false;
  }

  return true;
};