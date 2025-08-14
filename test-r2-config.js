/**
 * Simple R2 configuration test
 */

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function testR2Configuration() {
  console.log('🧪 Testing R2 Configuration...\n');

  // Check environment variables
  const requiredVars = [
    'EXPO_PUBLIC_R2_ACCOUNT_ID',
    'EXPO_PUBLIC_R2_ACCESS_KEY_ID',
    'EXPO_PUBLIC_R2_SECRET_ACCESS_KEY',
    'EXPO_PUBLIC_R2_BUCKET_NAME',
    'EXPO_PUBLIC_R2_PUBLIC_URL',
  ];

  console.log('1. Checking environment variables...');
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.log('❌ Missing required environment variables:', missingVars);
    return false;
  }
  
  console.log('✅ All required environment variables are set');
  
  // Log configuration (without secrets)
  console.log('\nR2 Configuration:');
  console.log('- Account ID:', process.env.EXPO_PUBLIC_R2_ACCOUNT_ID);
  console.log('- Bucket Name:', process.env.EXPO_PUBLIC_R2_BUCKET_NAME);
  console.log('- Public URL:', process.env.EXPO_PUBLIC_R2_PUBLIC_URL);
  console.log('- Access Key ID:', process.env.EXPO_PUBLIC_R2_ACCESS_KEY_ID?.substring(0, 8) + '...');

  // Create S3 client for R2
  console.log('\n2. Creating R2 client...');
  const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.EXPO_PUBLIC_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.EXPO_PUBLIC_R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.EXPO_PUBLIC_R2_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
  });

  console.log('✅ R2 client created successfully');

  // Test presigned URL generation
  console.log('\n3. Testing presigned URL generation...');
  try {
    const key = `test/verification_test_${Date.now()}.jpg`;
    
    const command = new PutObjectCommand({
      Bucket: process.env.EXPO_PUBLIC_R2_BUCKET_NAME,
      Key: key,
      ContentType: 'image/jpeg',
    });

    const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 300 });
    const publicUrl = `${process.env.EXPO_PUBLIC_R2_PUBLIC_URL}/${key}`;

    console.log('✅ Presigned URL generated successfully');
    console.log('- Upload URL:', uploadUrl.substring(0, 100) + '...');
    console.log('- Public URL:', publicUrl);

    return true;
  } catch (error) {
    console.log('❌ Failed to generate presigned URL:', error.message);
    return false;
  }
}

async function main() {
  try {
    const success = await testR2Configuration();
    
    if (success) {
      console.log('\n🎉 R2 Configuration Test: PASSED');
      console.log('Your R2 setup is working correctly!');
    } else {
      console.log('\n💥 R2 Configuration Test: FAILED');
      console.log('Please check your R2 configuration and try again.');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n💥 Test failed with error:', error);
    process.exit(1);
  }
}

main();