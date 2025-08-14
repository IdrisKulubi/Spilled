#!/usr/bin/env node

/**
 * Dependency Verification Script
 * Verifies that all required dependencies for the new stack are properly installed
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Dependencies for New Stack...\n');

// Read package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Required dependencies for the new stack
const requiredDependencies = {
  // Database & ORM
  'drizzle-orm': 'Database ORM',
  '@neondatabase/serverless': 'Neon PostgreSQL client',
  
  // Authentication
  'better-auth': 'Authentication framework',
  '@better-auth/expo': 'Better Auth Expo adapter',
  
  // File Storage (S3-compatible for R2)
  '@aws-sdk/client-s3': 'S3 client for R2 storage',
  '@aws-sdk/s3-request-presigner': 'S3 presigned URLs for R2',
  
  // Utilities
  'zod': 'Schema validation',
  'expo-secure-store': 'Secure token storage',
  'expo-crypto': 'Cryptographic functions'
};

const requiredDevDependencies = {
  'drizzle-kit': 'Database migrations and introspection',
  'dotenv': 'Environment variable loading',
  'typescript': 'TypeScript support'
};

// Dependencies that should NOT exist (removed Supabase)
const forbiddenDependencies = [
  '@supabase/supabase-js'
];

let allPassed = true;

// Check required dependencies
console.log('✅ Required Dependencies:');
Object.entries(requiredDependencies).forEach(([dep, description]) => {
  const version = packageJson.dependencies?.[dep];
  if (version) {
    console.log(`  ✓ ${dep}@${version} - ${description}`);
  } else {
    console.log(`  ❌ ${dep} - MISSING (${description})`);
    allPassed = false;
  }
});

console.log('\n✅ Required Dev Dependencies:');
Object.entries(requiredDevDependencies).forEach(([dep, description]) => {
  const version = packageJson.devDependencies?.[dep];
  if (version) {
    console.log(`  ✓ ${dep}@${version} - ${description}`);
  } else {
    console.log(`  ❌ ${dep} - MISSING (${description})`);
    allPassed = false;
  }
});

console.log('\n🚫 Forbidden Dependencies (should not exist):');
forbiddenDependencies.forEach(dep => {
  const inDeps = packageJson.dependencies?.[dep];
  const inDevDeps = packageJson.devDependencies?.[dep];
  
  if (inDeps || inDevDeps) {
    console.log(`  ❌ ${dep} - STILL EXISTS (should be removed)`);
    allPassed = false;
  } else {
    console.log(`  ✓ ${dep} - Properly removed`);
  }
});

console.log('\n📊 Stack Summary:');
console.log(`  Database: ${packageJson.dependencies['drizzle-orm'] ? 'Drizzle ORM + Neon PostgreSQL' : 'NOT CONFIGURED'}`);
console.log(`  Auth: ${packageJson.dependencies['better-auth'] ? 'Better Auth' : 'NOT CONFIGURED'}`);
console.log(`  Storage: ${packageJson.dependencies['@aws-sdk/client-s3'] ? 'Cloudflare R2 (S3-compatible)' : 'NOT CONFIGURED'}`);

if (allPassed) {
  console.log('\n🎉 All dependencies are properly configured for the new stack!');
  process.exit(0);
} else {
  console.log('\n❌ Some dependencies need attention.');
  console.log('\nTo fix missing dependencies, run:');
  console.log('npm install <missing-package>');
  process.exit(1);
}