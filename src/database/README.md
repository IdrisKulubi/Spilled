# Database Setup

This directory contains the Drizzle ORM configuration and schema for the Neon PostgreSQL database.

## Setup Instructions

1. **Create a Neon Database**
   - Go to [Neon Console](https://console.neon.tech/)
   - Create a new project
   - Copy the connection string

2. **Update Environment Variables**
   - Add your Neon database URL to `.env.local`:
   ```
   EXPO_PUBLIC_DATABASE_URL=postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/dbname
   ```

3. **Test Connection**
   ```bash
   npx ts-node src/database/test-connection.ts
   ```

4. **Generate and Run Migrations**
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

## Available Scripts

- `npm run db:generate` - Generate migration files from schema
- `npm run db:migrate` - Run migrations against the database
- `npm run db:push` - Push schema changes directly (development only)
- `npm run db:studio` - Open Drizzle Studio for database management

## Files

- `connection.ts` - Database connection configuration
- `schema.ts` - Database schema definitions
- `utils.ts` - Database utilities and error handling
- `test-connection.ts` - Connection test script
- `migrations/` - Generated migration files (created after running db:generate)

## Verification Scripts

- `node src/database/test-connection.js` - Test database connection
- `node src/database/verify-schema.js` - Verify schema was created correctly

## Setup Status

✅ **COMPLETED**: 
- Neon database instance created and connected
- Database schema deployed successfully
- All tables and enums created: users, guys, stories, comments, messages
- Connection verified and working

## Next Steps

The database setup is complete! You can now:
1. Proceed to task 2 to implement data access layer
2. Start migrating data from Supabase
3. Update application code to use the new database connection