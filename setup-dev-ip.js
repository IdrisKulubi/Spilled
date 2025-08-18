#!/usr/bin/env node

/**
 * Automatically detect and set the correct IP address for development
 * This is helpful when your IP address changes or when switching networks
 */

const os = require('os');
const fs = require('fs');
const path = require('path');

function getLocalIPAddress() {
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (localhost) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  
  return 'localhost'; // Fallback to localhost
}

function updateEnvFile() {
  const envPath = path.join(__dirname, '.env.local');
  
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local file not found');
    return false;
  }
  
  const ipAddress = getLocalIPAddress();
  console.log(`🌐 Detected IP address: ${ipAddress}`);
  
  // Read the current env file
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Update the AUTH_BASE_URL with the correct IP
  const oldPattern = /EXPO_PUBLIC_AUTH_BASE_URL=.*/;
  const newUrl = `EXPO_PUBLIC_AUTH_BASE_URL=http://${ipAddress}:8081/api/auth`;
  
  if (envContent.match(oldPattern)) {
    envContent = envContent.replace(oldPattern, newUrl);
    console.log(`✅ Updated AUTH_BASE_URL to: ${newUrl}`);
  } else {
    // If the line doesn't exist, add it
    envContent += `\n${newUrl}\n`;
    console.log(`✅ Added AUTH_BASE_URL: ${newUrl}`);
  }
  
  // Write the updated content back
  fs.writeFileSync(envPath, envContent);
  
  console.log('\n📝 Next steps:');
  console.log('  1. Restart your Expo dev server: npx expo start -c');
  console.log('  2. Reload your app');
  console.log('  3. Try the Google sign-in button again');
  
  return true;
}

// Run the update
console.log('🔧 Setting up development IP address...\n');

if (updateEnvFile()) {
  console.log('\n✨ Successfully updated .env.local with your local IP address');
} else {
  console.log('\n❌ Failed to update .env.local');
}
