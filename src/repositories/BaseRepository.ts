import { PgTable } from "drizzle-orm/pg-core";
import { eq, SQL, sql } from "drizzle-orm";
import { db } from "../database/connection";

/**
 * Base repository interface defining common CRUD operations
 */
export interface IBaseRepository<TSelect extends Record<string, any>, TInsert extends Record<string, any>> {
  findById(id: string): Promise<TSelect | null>;
  create(data: TInsert): Promise<TSelect>;
  update(id: string, data: Partial<TInsert>): Promise<TSelect | null>;
  delete(id: string): Promise<boolean>;
  findMany(where?: SQL): Promise<TSelect[]>;
  count(where?: SQL): Promise<number>;
}

/**
 * Abstract base repository class with common CRUD operations
 */
export abstract class BaseRepository<TSelect extends Record<string, any>, TInsert extends Record<string, any>> implements IBaseRepository<TSelect, TInsert> {
  protected abstract table: PgTable;
  protected abstract idColumn: any;

  /**
   * Find a record by ID
   */
  async findById(id: string): Promise<TSelect | null> {
    try {
      const result = await db
        .select()
        .from(this.table)
        .where(eq(this.idColumn, id))
        .limit(1);
      
      return (result[0] as TSelect) || null;
    } catch (error) {
      throw this.handleError(error, `Failed to find record with id: ${id}`);
    }
  }

  /**
   * Create a new record
   */
  async create(data: TInsert): Promise<TSelect> {
    try {
      const result = await db
        .insert(this.table)
        .values(data as any)
        .returning();
      
      return result[0] as TSelect;
    } catch (error) {
      throw this.handleError(error, "Failed to create record");
    }
  }

  /**
   * Update a record by ID
   */
  async update(id: string, data: Partial<TInsert>): Promise<TSelect | null> {
    try {
      const result = await db
        .update(this.table)
        .set(data as any)
        .where(eq(this.idColumn, id))
        .returning();
      
      return (result[0] as TSelect) || null;
    } catch (error) {
      throw this.handleError(error, `Failed to update record with id: ${id}`);
    }
  }

  /**
   * Delete a record by ID
   */
  async delete(id: string): Promise<boolean> {
    try {
      const result = await db
        .delete(this.table)
        .where(eq(this.idColumn, id))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      throw this.handleError(error, `Failed to delete record with id: ${id}`);
    }
  }

  /**
   * Find multiple records with optional where clause
   */
  async findMany(where?: SQL): Promise<TSelect[]> {
    try {
      const query = db.select().from(this.table);
      
      if (where) {
        query.where(where);
      }
      
      return (await query) as TSelect[];
    } catch (error) {
      throw this.handleError(error, "Failed to find records");
    }
  }

  /**
   * Count records with optional where clause
   */
  async count(where?: SQL): Promise<number> {
    try {
      const query = db.select({ count: sql`count(*)` }).from(this.table);
      
      if (where) {
        query.where(where);
      }
      
      const result = await query;
      return Number(result[0]?.count || 0);
    } catch (error) {
      throw this.handleError(error, "Failed to count records");
    }
  }

  /**
   * Handle database errors and provide meaningful error messages
   */
  protected handleError(error: any, message: string): Error {
    console.error(`Repository Error: ${message}`, error);
    
    // Handle specific PostgreSQL error codes
    if (error.code) {
      switch (error.code) {
        case "23505": // Unique violation
          return new Error("Record already exists");
        case "23503": // Foreign key violation
          return new Error("Referenced record not found");
        case "23502": // Not null violation
          return new Error("Required field is missing");
        case "23514": // Check violation
          return new Error("Invalid data provided");
        default:
          return new Error(`Database error: ${error.message || message}`);
      }
    }
    
    return new Error(message);
  }
}