import { db } from "./connection";

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    // Simple query to test connection
    await db.execute("SELECT 1");
    return true;
  } catch (error) {
    console.error("Database connection failed:", error);
    return false;
  }
}

/**
 * Database error handler
 */
export class DatabaseError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = "DatabaseError";
  }
}

/**
 * Handle Drizzle/PostgreSQL errors
 */
export function handleDatabaseError(error: any): string {
  if (error.code === "23505") {
    return "This record already exists";
  }
  if (error.code === "23503") {
    return "Referenced record not found";
  }
  if (error.code === "23502") {
    return "Required field is missing";
  }
  if (error.code === "42P01") {
    return "Table does not exist";
  }
  return "Database operation failed";
}
