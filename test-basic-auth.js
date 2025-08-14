/**
 * Basic test to verify authentication setup
 */

console.log('Testing basic authentication setup...');

try {
  // Test if we can import the auth client
  const { authClient } = require('./src/lib/auth-client.ts');
  console.log('✅ Auth client imported successfully');

  // Test if we can import the auth utilities
  const { authUtils } = require('./src/utils/auth.ts');
  console.log('✅ Auth utilities imported successfully');

  // Test if we can import the AuthContext
  const { AuthProvider } = require('./src/contexts/AuthContext.tsx');
  console.log('✅ AuthContext imported successfully');

  console.log('\n🎉 Basic authentication setup is working!');
  console.log('Note: Full functionality testing requires a running app environment.');

} catch (error) {
  console.error('❌ Error in authentication setup:', error.message);
  process.exit(1);
}