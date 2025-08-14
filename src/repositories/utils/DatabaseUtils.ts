import { db } from "../../database/connection";
import { sql } from "drizzle-orm";

/**
 * Database utility functions for common operations
 */
export class DatabaseUtils {
  /**
   * Test database connection
   */
  static async testConnection(): Promise<boolean> {
    try {
      await db.execute(sql`SELECT 1`);
      return true;
    } catch (error) {
      console.error("Database connection test failed:", error);
      return false;
    }
  }

  /**
   * Execute a transaction with automatic rollback on error
   */
  static async executeTransaction<T>(
    callback: (tx: any) => Promise<T>
  ): Promise<T> {
    return await db.transaction(async (tx) => {
      return await callback(tx);
    });
  }

  /**
   * Generate a UUID (for cases where we need client-side UUID generation)
   */
  static generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Sanitize string input to prevent SQL injection (additional safety)
   */
  static sanitizeString(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }
    return input.replace(/['"\\]/g, '');
  }

  /**
   * Build pagination parameters
   */
  static buildPagination(page: number = 1, limit: number = 10) {
    const offset = (page - 1) * limit;
    return {
      limit: Math.min(limit, 100), // Cap at 100 items per page
      offset: Math.max(offset, 0),
    };
  }

  /**
   * Format timestamp for database operations
   */
  static formatTimestamp(date: Date = new Date()): string {
    return date.toISOString();
  }

  /**
   * Check if a value is a valid UUID
   */
  static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}