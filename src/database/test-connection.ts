import { testConnection } from "./utils.js";

/**
 * Test script to verify database connection
 * Run this after setting up your Neon database URL
 */
async function main() {
  console.log("Testing database connection...");
  
  const isConnected = await testConnection();
  
  if (isConnected) {
    console.log("✅ Database connection successful!");
  } else {
    console.log("❌ Database connection failed!");
    console.log("Make sure EXPO_PUBLIC_DATABASE_URL is set correctly in your .env.local file");
  }
}

main().catch(console.error);