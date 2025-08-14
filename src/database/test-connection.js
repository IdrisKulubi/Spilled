const { neon } = require("@neondatabase/serverless");
require('dotenv').config({ path: '.env.local' });

/**
 * Test script to verify database connection
 * Run this after setting up your Neon database URL
 */
async function testConnection() {
  try {
    console.log("Testing database connection...");
    
    if (!process.env.EXPO_PUBLIC_DATABASE_URL) {
      console.log("❌ EXPO_PUBLIC_DATABASE_URL is not set!");
      console.log("Make sure to set it in your .env.local file");
      return false;
    }
    
    console.log("Database URL found, attempting connection...");
    
    const sql = neon(process.env.EXPO_PUBLIC_DATABASE_URL);
    
    // Simple query to test connection
    await sql`SELECT 1 as test`;
    
    console.log("✅ Database connection successful!");
    return true;
  } catch (error) {
    console.log("❌ Database connection failed!");
    console.error("Error:", error.message);
    return false;
  }
}

testConnection().catch(console.error);