const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

console.log('🚀 Setting up ngrok tunnel for OAuth development...\n');

// Function to update .env.local with ngrok URL
function updateEnvFile(ngrokUrl) {
  const envPath = path.join(__dirname, '.env.local');
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Update AUTH_BASE_URL with ngrok URL
  envContent = envContent.replace(
    /EXPO_PUBLIC_AUTH_BASE_URL=.*/,
    `EXPO_PUBLIC_AUTH_BASE_URL=${ngrokUrl}/api/auth`
  );
  
  fs.writeFileSync(envPath, envContent);
  console.log(`✅ Updated AUTH_BASE_URL to: ${ngrokUrl}/api/auth`);
}


// Function to get ngrok URL
async function getNgrokUrl(retries = 10) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch('http://localhost:4040/api/tunnels');
      const data = await response.json();
      
      if (data.tunnels && data.tunnels.length > 0) {
        const tunnel = data.tunnels.find(t => t.proto === 'https') || data.tunnels[0];
        return tunnel.public_url;
      }
    } catch (error) {
      // Ngrok might not be ready yet
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  throw new Error('Could not get ngrok URL');
}

// Start ngrok
console.log('Starting ngrok tunnel on port 8081...');
const ngrok = spawn('ngrok', ['http', '8081'], {
  detached: false,
  stdio: 'ignore'
});

// Give ngrok time to start
setTimeout(async () => {
  try {
    const ngrokUrl = await getNgrokUrl();
    console.log(`\n🌐 Ngrok tunnel established: ${ngrokUrl}`);
    
    // Update .env.local
    updateEnvFile(ngrokUrl);
    
    console.log('\n📝 Next steps:');
    console.log('1. Add this redirect URI to Google Cloud Console:');
    console.log(`   ${ngrokUrl}/api/auth/callback/google`);
    console.log('\n2. Restart your Expo dev server:');
    console.log('   npx expo start -c');
    console.log('\n3. The ngrok tunnel will remain active in this terminal');
    console.log('   Press Ctrl+C to stop the tunnel');
    
    console.log('\n⚠️  Important: The ngrok URL changes each time you restart.');
    console.log('   You\'ll need to update Google Cloud Console each time.');
    
  } catch (error) {
    console.error('❌ Error setting up ngrok:', error.message);
    console.log('\nTry running ngrok manually:');
    console.log('  ngrok http 8081');
    ngrok.kill();
    process.exit(1);
  }
}, 3000);

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\nStopping ngrok tunnel...');
  ngrok.kill();
  process.exit(0);
});
