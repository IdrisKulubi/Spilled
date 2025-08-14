import { r2Service } from '../services/r2Service';
import { validateR2Config } from './r2';

/**
 * Test R2 configuration and connectivity
 */
export async function testR2Configuration(): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    console.log('Testing R2 configuration...');

    // Test 1: Validate environment variables
    const configValid = validateR2Config();
    if (!configValid) {
      return {
        success: false,
        message: 'R2 configuration validation failed. Please check environment variables.',
      };
    }

    console.log('✓ Environment variables validated');

    // Test 2: Test presigned URL generation
    const presignedResult = await r2Service.getPresignedUploadUrl(
      'test',
      'test-file.txt',
      'text/plain',
      300 // 5 minutes
    );

    if (!presignedResult.success) {
      return {
        success: false,
        message: 'Failed to generate presigned URL',
        details: presignedResult.error,
      };
    }

    console.log('✓ Presigned URL generation successful');

    return {
      success: true,
      message: 'R2 configuration test passed successfully',
      details: {
        configValid: true,
        presignedUrlGeneration: true,
        testUploadUrl: presignedResult.uploadUrl,
        testPublicUrl: presignedResult.publicUrl,
      },
    };

  } catch (error) {
    console.error('R2 configuration test failed:', error);
    return {
      success: false,
      message: 'R2 configuration test failed with error',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Run R2 configuration test and log results
 */
export async function runR2ConfigTest(): Promise<void> {
  const result = await testR2Configuration();
  
  if (result.success) {
    console.log('🟢 R2 Configuration Test: PASSED');
    console.log(result.message);
    if (result.details) {
      console.log('Test Details:', result.details);
    }
  } else {
    console.log('🔴 R2 Configuration Test: FAILED');
    console.log(result.message);
    if (result.details) {
      console.log('Error Details:', result.details);
    }
  }
}