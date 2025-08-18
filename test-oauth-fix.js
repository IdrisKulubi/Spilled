#!/usr/bin/env node

/**
 * OAuth Fix and Debug Script
 * This script helps diagnose and fix Google OAuth issues
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

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
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

// Store issues found
const issues = [];
const fixes = [];

async function checkEnvironmentVariables() {
  log('\n🔍 Checking Environment Variables...', 'cyan');
  
  const requiredVars = {
    'EXPO_PUBLIC_AUTH_BASE_URL': process.env.EXPO_PUBLIC_AUTH_BASE_URL,
    'EXPO_PUBLIC_GOOGLE_CLIENT_ID': process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    'EXPO_PUBLIC_GOOGLE_CLIENT_SECRET': process.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET,
  };

  for (const [key, value] of Object.entries(requiredVars)) {
    if (value) {
      log(`  ✅ ${key}: ${value.substring(0, 30)}...`, 'green');
    } else {
      log(`  ❌ ${key}: MISSING`, 'red');
      issues.push(`Missing ${key}`);
      fixes.push(`Add ${key} to your .env.local file`);
    }
  }
  
  return Object.values(requiredVars).every(v => v);
}

async function checkAuthServerRunning() {
  log('\n🌐 Checking Auth Server...', 'cyan');
  
  const baseUrl = process.env.EXPO_PUBLIC_AUTH_BASE_URL || 'http://localhost:8081/api/auth';
  
  try {
    log(`  Testing: ${baseUrl}/session`, 'blue');
    
    const response = await fetch(`${baseUrl}/session`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 5000,
    });
    
    if (response.status === 401 || response.ok) {
      log(`  ✅ Auth server is running (status: ${response.status})`, 'green');
      return true;
    } else {
      log(`  ⚠️ Auth server returned unexpected status: ${response.status}`, 'yellow');
      issues.push('Auth server returned unexpected status');
      return false;
    }
  } catch (error) {
    log(`  ❌ Cannot reach auth server: ${error.message}`, 'red');
    issues.push('Cannot reach auth server');
    fixes.push('Make sure your Expo dev server is running: npm start');
    
    if (baseUrl.includes('localhost')) {
      fixes.push('If testing on a physical device, use your computer\'s IP address instead of localhost');
    }
    
    return false;
  }
}

async function checkAuthApiRoute() {
  log('\n📁 Checking Auth API Route...', 'cyan');
  
  const apiRoutePath = path.join(__dirname, 'app', 'api', 'auth', '[...auth]+api.ts');
  
  if (fs.existsSync(apiRoutePath)) {
    log(`  ✅ Auth API route exists`, 'green');
    
    // Check if it's properly configured
    const content = fs.readFileSync(apiRoutePath, 'utf8');
    if (content.includes('handler as GET') && content.includes('handler as POST')) {
      log(`  ✅ API route exports GET and POST handlers`, 'green');
      return true;
    } else {
      log(`  ⚠️ API route may not be properly configured`, 'yellow');
      issues.push('API route configuration may be incorrect');
      return false;
    }
  } else {
    log(`  ❌ Auth API route not found at: ${apiRoutePath}`, 'red');
    issues.push('Auth API route file is missing');
    fixes.push('Ensure app/api/auth/[...auth]+api.ts exists and exports GET and POST handlers');
    return false;
  }
}

async function checkGoogleOAuthEndpoint() {
  log('\n🔑 Testing Google OAuth Endpoint...', 'cyan');
  
  const baseUrl = process.env.EXPO_PUBLIC_AUTH_BASE_URL || 'http://localhost:8081/api/auth';
  
  try {
    const oauthUrl = `${baseUrl}/google/authorize`;
    log(`  Testing: ${oauthUrl}`, 'blue');
    
    const response = await fetch(oauthUrl, {
      method: 'GET',
      redirect: 'manual',
      timeout: 5000,
    });
    
    if (response.status === 302 || response.status === 307) {
      log(`  ✅ Google OAuth endpoint is working (redirects to Google)`, 'green');
      return true;
    } else if (response.status === 404) {
      log(`  ❌ Google OAuth endpoint not found (404)`, 'red');
      issues.push('Google OAuth endpoint not found');
      fixes.push('Check that Better Auth is properly configured with Google provider');
      return false;
    } else {
      log(`  ⚠️ Unexpected response: ${response.status}`, 'yellow');
      return false;
    }
  } catch (error) {
    log(`  ❌ Failed to test OAuth endpoint: ${error.message}`, 'red');
    return false;
  }
}

async function checkExpoScheme() {
  log('\n📱 Checking Expo App Configuration...', 'cyan');
  
  const appJsonPath = path.join(__dirname, 'app.json');
  
  if (fs.existsSync(appJsonPath)) {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    const scheme = appJson.expo?.scheme;
    
    if (scheme === 'spilled') {
      log(`  ✅ App scheme is correctly configured: ${scheme}://`, 'green');
      return true;
    } else if (scheme) {
      log(`  ⚠️ App scheme is ${scheme}, expected 'spilled'`, 'yellow');
      issues.push('App scheme mismatch');
      fixes.push('Update app.json to use "scheme": "spilled"');
      return false;
    } else {
      log(`  ❌ App scheme not configured`, 'red');
      issues.push('App scheme not configured');
      fixes.push('Add "scheme": "spilled" to expo section in app.json');
      return false;
    }
  } else {
    log(`  ❌ app.json not found`, 'red');
    return false;
  }
}

async function suggestFixes() {
  if (fixes.length === 0) return;
  
  log('\n🔧 Suggested Fixes:', 'magenta');
  fixes.forEach((fix, index) => {
    log(`  ${index + 1}. ${fix}`, 'yellow');
  });
  
  log('\n📝 Additional Steps:', 'cyan');
  log('  1. Ensure your Google OAuth credentials are configured correctly:', 'blue');
  log('     - Visit https://console.cloud.google.com/apis/credentials', 'blue');
  log('     - Add these authorized redirect URIs:', 'blue');
  log('       • http://localhost:8081/api/auth/google/callback', 'blue');
  log('       • spilled://redirect', 'blue');
  log('       • exp://localhost:8081', 'blue');
  
  log('\n  2. For physical device testing:', 'blue');
  log('     - Replace localhost with your computer\'s IP address', 'blue');
  log('     - Example: http://192.168.1.100:8081/api/auth', 'blue');
  
  log('\n  3. Common troubleshooting:', 'blue');
  log('     - Restart Expo: npx expo start -c', 'blue');
  log('     - Clear app cache on your device', 'blue');
  log('     - Check firewall settings if using physical device', 'blue');
}

async function runDiagnostics() {
  log('🚀 OAuth Diagnostics and Fix Tool', 'magenta');
  log('=' .repeat(50), 'cyan');
  
  const results = {
    envVars: await checkEnvironmentVariables(),
    apiRoute: await checkAuthApiRoute(),
    expoScheme: await checkExpoScheme(),
    authServer: await checkAuthServerRunning(),
    googleOAuth: false,
  };
  
  // Only test Google OAuth if auth server is running
  if (results.authServer) {
    results.googleOAuth = await checkGoogleOAuthEndpoint();
  }
  
  log('\n📊 Diagnostics Summary:', 'cyan');
  log('=' .repeat(50), 'cyan');
  
  const checks = [
    { name: 'Environment Variables', passed: results.envVars },
    { name: 'API Route Configuration', passed: results.apiRoute },
    { name: 'Expo App Scheme', passed: results.expoScheme },
    { name: 'Auth Server Running', passed: results.authServer },
    { name: 'Google OAuth Endpoint', passed: results.googleOAuth },
  ];
  
  checks.forEach(check => {
    const status = check.passed ? '✅' : '❌';
    const color = check.passed ? 'green' : 'red';
    log(`  ${status} ${check.name}`, color);
  });
  
  const allPassed = Object.values(results).every(r => r);
  
  if (allPassed) {
    log('\n✨ All checks passed! Google OAuth should be working.', 'green');
    log('\nNext step: Test the sign-in button in your app', 'blue');
  } else {
    log(`\n⚠️ Found ${issues.length} issue(s) that need attention`, 'yellow');
    await suggestFixes();
  }
  
  log('\n💡 Quick Test:', 'cyan');
  log('  1. Run: npm start', 'blue');
  log('  2. Press the Google sign-in button in your app', 'blue');
  log('  3. Check the console for detailed error logs', 'blue');
  
  return allPassed ? 0 : 1;
}

// Run diagnostics
runDiagnostics()
  .then(exitCode => process.exit(exitCode))
  .catch(error => {
    log(`\n💥 Fatal error: ${error.message}`, 'red');
    process.exit(1);
  });
