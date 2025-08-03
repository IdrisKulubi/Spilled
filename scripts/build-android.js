#!/usr/bin/env node

/**
 * Android Build Script for TeaKE
 * Helps automate the build process for Google Play Store
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');



// Check if EAS CLI is installed
try {
  execSync('eas --version', { stdio: 'ignore' });
} catch (error) {
  execSync('npm install -g @expo/eas-cli', { stdio: 'inherit' });
}

// Check if user is logged in
try {
  execSync('eas whoami', { stdio: 'ignore' });
} catch (error) {
  process.exit(1);
}

// Check if project is initialized
if (!fs.existsSync(path.join(__dirname, '..', 'eas.json'))) {
  process.exit(1);
}


// Build options
const buildType = process.argv[2] || 'preview';


