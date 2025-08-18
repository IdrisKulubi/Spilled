#!/usr/bin/env node

/**
 * Run database migrations for Better Auth tables
 */

const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

async function runMigration() {
  console.log('🚀 Running database migration for Better Auth tables...\n');
  
  const databaseUrl = process.env.EXPO_PUBLIC_DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ EXPO_PUBLIC_DATABASE_URL not found in environment variables');
    process.exit(1);
  }
  
  console.log('📡 Connecting to database...');
  const sql = neon(databaseUrl);
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'src', 'database', 'migrations', 'add-better-auth-tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📝 Running migration...\n');
    
    // Split the migration into individual statements and run them
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.includes('CREATE TABLE')) {
        const tableName = statement.match(/"([^"]+)"/)?.[1];
        console.log(`  Creating table: ${tableName}`);
      } else if (statement.includes('CREATE INDEX')) {
        const indexName = statement.match(/"([^"]+)"/)?.[1];
        console.log(`  Creating index: ${indexName}`);
      }
      
      await sql(statement + ';');
    }
    
    console.log('\n✅ Migration completed successfully!');
    
    // Verify tables were created
    console.log('\n🔍 Verifying tables...');
    const tables = await sql`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN ('session', 'account', 'verification')
    `;
    
    console.log('  Found tables:', tables.map(t => t.tablename).join(', '));
    
    if (tables.length === 3) {
      console.log('✅ All Better Auth tables are present');
    } else {
      console.log('⚠️ Some tables might be missing');
    }
    
    console.log('\n🎉 Database is ready for Better Auth!');
    console.log('\nNext steps:');
    console.log('  1. Restart your Expo dev server: npx expo start -c');
    console.log('  2. Try the Google sign-in button again');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    
    if (error.message.includes('already exists')) {
      console.log('\n💡 It looks like some tables already exist. This is fine!');
      console.log('   The migration uses IF NOT EXISTS so it\'s safe to run multiple times.');
    } else {
      console.error('\nFull error:', error);
    }
    
    process.exit(1);
  }
}

// Run the migration
runMigration().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
