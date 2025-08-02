#!/usr/bin/env node

/**
 * Android Build Script for TeaKE
 * Helps automate the build process for Google Play Store
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 TeaKE Android Build Script');
console.log('================================');

// Check if EAS CLI is installed
try {
  execSync('eas --version', { stdio: 'ignore' });
  console.log('✅ EAS CLI is installed');
} catch (error) {
  console.log('❌ EAS CLI not found. Installing...');
  execSync('npm install -g @expo/eas-cli', { stdio: 'inherit' });
}

// Check if user is logged in
try {
  execSync('eas whoami', { stdio: 'ignore' });
  console.log('✅ Logged in to Expo');
} catch (error) {
  console.log('❌ Not logged in to Expo. Please run: eas login');
  process.exit(1);
}

// Check if project is initialized
if (!fs.existsSync(path.join(__dirname, '..', 'eas.json'))) {
  console.log('❌ EAS not initialized. Please run: eas init');
  process.exit(1);
}

console.log('✅ EAS project configured');

// Build options
const buildType = process.argv[2] || 'preview';

console.log(`\n🔨 Building Android app (${buildType} profile)...`);

try {
  if (buildType === 'production') {
    console.log('Building AAB for Google Play Store...');
    execSync('eas build --platform android --profile production', { stdio: 'inherit' });
  } else {
    console.log('Building APK for testing...');
    execSync('eas build --platform android --profile preview', { stdio: 'inherit' });
  }
  
  console.log('\n✅ Build completed successfully!');
  console.log('\n📱 Next steps:');
  
  if (buildType === 'production') {
    console.log('1. Download the AAB file from the build URL');
    console.log('2. Upload to Google Play Console');
    console.log('3. Complete store listing information');
    console.log('4. Submit for review');
  } else {
    console.log('1. Download the APK file from the build URL');
    console.log('2. Install on test devices');
    console.log('3. Test thoroughly before production build');
  }
  
} catch (error) {
  console.log('\n❌ Build failed. Please check the error messages above.');
  process.exit(1);
}