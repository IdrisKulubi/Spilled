#!/usr/bin/env node

/**
 * OAuth Debug Script
 * Tests Google OAuth configuration and Better Auth endpoints
 */

const fetch = require('node-fetch');

// Load environment variables
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

async function testEnvironmentVariables() {
  log('\n🔧 Checking Environment Variables...', 'cyan');
  
  const requiredVars = {
    'EXPO_PUBLIC_AUTH_BASE_URL': process.env.EXPO_PUBLIC_AUTH_BASE_URL,
    'EXPO_PUBLIC_GOOGLE_CLIENT_ID': process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    'EXPO_PUBLIC_GOOGLE_CLIENT_SECRET': process.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET,
    'EXPO_PUBLIC_DATABASE_URL': process.env.EXPO_PUBLIC_DATABASE_URL,
  };

  let allPresent = true;
  
  for (const [key, value] of Object.entries(requiredVars)) {
    if (value) {
      log(`  ✅ ${key}: ${value.substring(0, 50)}...`, 'green');
    } else {
      log(`  ❌ ${key}: MISSING`, 'red');
      allPresent = false;
    }
  }
  
  return allPresent;
}

async function testAuthEndpoint(endpoint, method = 'GET') {
  const baseUrl = process.env.EXPO_PUBLIC_AUTH_BASE_URL || 'http://localhost:8081/api/auth';
  const url = `${baseUrl}${endpoint}`;
  
  try {
    log(`\n📡 Testing ${method} ${url}...`, 'cyan');
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const statusColor = response.ok ? 'green' : 'yellow';
    log(`  Status: ${response.status} ${response.statusText}`, statusColor);
    
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      log(`  Response: ${JSON.stringify(data, null, 2)}`, 'blue');
    } else {
      const text = await response.text();
      log(`  Response: ${text.substring(0, 200)}`, 'blue');
    }
    
    return response.ok;
  } catch (error) {
    log(`  ❌ Error: ${error.message}`, 'red');
    return false;
  }
}

async function testGoogleOAuthUrl() {
  log('\n🔗 Testing Google OAuth URL Generation...', 'cyan');
  
  const baseUrl = process.env.EXPO_PUBLIC_AUTH_BASE_URL || 'http://localhost:8081/api/auth';
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
  
  if (!clientId) {
    log('  ❌ Cannot test - Google Client ID is missing', 'red');
    return false;
  }
  
  try {
    // Try to get the OAuth authorization URL
    const authUrl = `${baseUrl}/google/authorize`;
    log(`  Testing: ${authUrl}`, 'blue');
    
    const response = await fetch(authUrl, {
      method: 'GET',
      redirect: 'manual', // Don't follow redirects
    });
    
    if (response.status === 302 || response.status === 307) {
      const location = response.headers.get('location');
      if (location) {
        log(`  ✅ OAuth redirect URL generated:`, 'green');
        log(`     ${location.substring(0, 150)}...`, 'blue');
        
        // Check if it includes our client ID
        if (location.includes(clientId)) {
          log(`  ✅ Client ID is included in OAuth URL`, 'green');
        } else {
          log(`  ⚠️  Client ID not found in OAuth URL`, 'yellow');
        }
        
        return true;
      }
    }
    
    log(`  ⚠️  Unexpected response: ${response.status}`, 'yellow');
    const text = await response.text();
    log(`     ${text.substring(0, 200)}`, 'blue');
    
  } catch (error) {
    log(`  ❌ Error: ${error.message}`, 'red');
  }
  
  return false;
}

async function checkExpoConfig() {
  log('\n📱 Checking Expo Configuration...', 'cyan');
  
  try {
    const appJson = require('./app.json');
    const scheme = appJson.expo?.scheme;
    
    if (scheme) {
      log(`  ✅ App scheme configured: ${scheme}://`, 'green');
    } else {
      log(`  ❌ App scheme not configured in app.json`, 'red');
    }
    
    // Check if the scheme matches what's in auth config
    if (scheme === 'spilled') {
      log(`  ✅ Scheme matches expected value`, 'green');
    } else {
      log(`  ⚠️  Scheme doesn't match expected 'spilled'`, 'yellow');
    }
    
    return !!scheme;
  } catch (error) {
    log(`  ❌ Error reading app.json: ${error.message}`, 'red');
    return false;
  }
}

async function testDatabaseConnection() {
  log('\n🗄️  Testing Database Connection...', 'cyan');
  
  const dbUrl = process.env.EXPO_PUBLIC_DATABASE_URL;
  
  if (!dbUrl) {
    log('  ❌ Database URL is missing', 'red');
    return false;
  }
  
  // Just check if it looks valid
  if (dbUrl.includes('postgresql://') && dbUrl.includes('@')) {
    log('  ✅ Database URL format looks valid', 'green');
    log(`     Host: ${dbUrl.split('@')[1].split('/')[0]}`, 'blue');
    return true;
  } else {
    log('  ⚠️  Database URL format might be invalid', 'yellow');
    return false;
  }
}

async function suggestFixes() {
  log('\n💡 Suggested Fixes:', 'cyan');
  
  log('\n1. Make sure the Expo development server is running:', 'yellow');
  log('   npm start', 'blue');
  
  log('\n2. Verify Google OAuth credentials:', 'yellow');
  log('   - Go to https://console.cloud.google.com/apis/credentials', 'blue');
  log('   - Check that your OAuth 2.0 Client ID is active', 'blue');
  log('   - Ensure authorized redirect URIs include:', 'blue');
  log('     • http://localhost:8081/api/auth/google/callback', 'blue');
  log('     • spilled://redirect', 'blue');
  log('     • exp://localhost:8081', 'blue');
  
  log('\n3. For Better Auth with Expo:', 'yellow');
  log('   - The auth server runs as part of Expo API routes', 'blue');
  log('   - Ensure app/api/auth/[...auth]+api.ts exists', 'blue');
  
  log('\n4. Common OAuth issues:', 'yellow');
  log('   - Client secret should not be exposed in mobile apps', 'blue');
  log('   - Consider using server-side OAuth flow', 'blue');
  log('   - Or use expo-auth-session for client-side flow', 'blue');
}

async function runDiagnostics() {
  log('🚀 Starting OAuth Debug Diagnostics', 'cyan');
  log('=' .repeat(50), 'cyan');
  
  const results = {
    envVars: await testEnvironmentVariables(),
    expoConfig: await checkExpoConfig(),
    database: await testDatabaseConnection(),
    sessionEndpoint: await testAuthEndpoint('/session'),
    googleAuth: await testGoogleOAuthUrl(),
  };
  
  log('\n📊 Summary:', 'cyan');
  log('=' .repeat(50), 'cyan');
  
  for (const [test, passed] of Object.entries(results)) {
    const status = passed ? '✅' : '❌';
    const color = passed ? 'green' : 'red';
    log(`  ${status} ${test}`, color);
  }
  
  const allPassed = Object.values(results).every(r => r);
  
  if (!allPassed) {
    await suggestFixes();
  } else {
    log('\n✨ All checks passed! OAuth should be working.', 'green');
  }
  
  log('\n📝 Next Steps:', 'cyan');
  log('  1. Run the app with: npm start', 'blue');
  log('  2. Test sign-in in the app', 'blue');
  log('  3. Check console logs for detailed errors', 'blue');
}

// Run diagnostics
runDiagnostics().catch(error => {
  log(`\n💥 Fatal error: ${error.message}`, 'red');
  process.exit(1);
});
