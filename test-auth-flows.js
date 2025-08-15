#!/usr/bin/env node

/**
 * Test runner for authentication flows
 * Task 9.1: Test all user authentication flows
 * 
 * This script tests:
 * - Google OAuth sign-in and sign-up
 * - Session persistence and restoration
 * - Sign-out functionality
 * - User profile management
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.5, 2.6
 */

const { execSync } = require('child_process');
const path = require('path');

// Set up environment
process.env.NODE_ENV = 'test';

// Register ts-node for TypeScript support
require('ts-node/register');

async function runTests() {
  console.log('🚀 Starting Authentication Flow Tests');
  console.log('Task 9.1: Test all user authentication flows');
  console.log('Requirements: 2.1, 2.2, 2.3, 2.5, 2.6');
  console.log('=' .repeat(60));
  console.log();

  try {
    // Load environment variables
    require('dotenv').config({ path: '.env.local' });
    require('dotenv').config({ path: '.env' });

    // Check environment variables
    console.log('🔧 Checking environment configuration...');
    const requiredEnvVars = [
      'EXPO_PUBLIC_DATABASE_URL',
      'EXPO_PUBLIC_AUTH_BASE_URL',
      'EXPO_PUBLIC_GOOGLE_CLIENT_ID'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.warn('⚠️  Missing environment variables:', missingVars.join(', '));
      console.warn('   Some tests may fail due to missing configuration');
    } else {
      console.log('✅ All required environment variables are set');
    }
    console.log();

    // Import and run the authentication flow tests
    const { runAuthenticationFlowTests } = require('./src/tests/auth-flows.test.ts');
    const results = await runAuthenticationFlowTests();
    
    // Generate detailed report
    console.log('\n📋 Detailed Test Report:');
    console.log('=' .repeat(60));
    
    results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      const duration = result.duration ? ` (${result.duration}ms)` : '';
      
      console.log(`${index + 1}. ${status} ${result.testName}${duration}`);
      console.log(`   ${result.message}`);
      
      if (result.error) {
        console.log(`   ❌ Error: ${result.error}`);
      }
      console.log();
    });

    // Final summary
    const passed = results.filter(r => r.success).length;
    const total = results.length;
    const passRate = ((passed / total) * 100).toFixed(1);
    
    console.log('📊 Final Summary:');
    console.log('=' .repeat(30));
    console.log(`Tests Passed: ${passed}/${total} (${passRate}%)`);
    console.log(`Tests Failed: ${total - passed}/${total}`);
    
    // Check specific requirements
    console.log('\n✅ Requirements Verification:');
    console.log('2.1 Better Auth framework: ' + (results.some(r => r.testName.includes('Better Auth') && r.success) ? '✅' : '❌'));
    console.log('2.2 Google OAuth sign-in: ' + (results.some(r => r.testName.includes('Google OAuth') && r.success) ? '✅' : '❌'));
    console.log('2.3 Session management: ' + (results.some(r => r.testName.includes('Session') && r.success) ? '✅' : '❌'));
    console.log('2.5 User profile management: ' + (results.some(r => r.testName.includes('Profile') && r.success) ? '✅' : '❌'));
    console.log('2.6 Session restoration: ' + (results.some(r => r.testName.includes('Persistence') && r.success) ? '✅' : '❌'));

    if (passed === total) {
      console.log('\n🎉 All authentication flow tests passed!');
      console.log('✅ Task 9.1 completed successfully');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some authentication tests failed.');
      console.log('❌ Task 9.1 has issues that need to be addressed');
      process.exit(1);
    }

  } catch (error) {
    console.error('💥 Error running authentication flow tests:', error);
    console.error('❌ Task 9.1 failed due to unexpected error');
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Run the tests
runTests();