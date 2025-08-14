/**
 * Simple test runner for verification image upload functionality
 */

import { runVerificationUploadTests } from './test-verification-upload.js';

/**
 * Main test runner function
 */
async function main() {
  console.log('🚀 Starting Verification Image Upload Tests...\n');
  
  try {
    // Run the verification upload tests
    await runVerificationUploadTests();
    
    console.log('\n🎉 Test execution completed!');
  } catch (error) {
    console.error('\n❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Run the tests if this file is executed directly
if (require.main === module) {
  main();
}

export { main as runVerificationTests };