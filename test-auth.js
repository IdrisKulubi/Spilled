/**
 * Simple test runner for authentication flows
 */

const { testAuthenticationFlows } = require('./src/utils/test-auth-flows.ts');

async function runTests() {
  try {
    console.log('Running authentication flow tests...');
    const results = await testAuthenticationFlows();
    
    const passed = results.filter(r => r.success).length;
    const total = results.length;
    
    console.log(`\nTest Results: ${passed}/${total} passed`);
    
    if (passed !== total) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Error running tests:', error);
    process.exit(1);
  }
}

runTests();