import { SQL, and, or, eq, ne, gt, gte, lt, lte, like, ilike, isNull as drizzleIsNull, isNotNull, inArray, asc, desc } from "drizzle-orm";
import { PgColumn } from "drizzle-orm/pg-core";

/**
 * Query builder utilities for common query patterns
 */
export class QueryBuilder {
  /**
   * Build a WHERE clause for text search (case-insensitive)
   */
  static textSearch(column: PgColumn, searchTerm: string): SQL {
    return ilike(column, `%${searchTerm}%`);
  }

  /**
   * Build a WHERE clause for exact match
   */
  static exactMatch(column: PgColumn, value: any): SQL {
    return eq(column, value);
  }

  /**
   * Build a WHERE clause for range queries
   */
  static range(column: PgColumn, min?: any, max?: any): SQL | undefined {
    const conditions: SQL[] = [];
    
    if (min !== undefined) {
      conditions.push(gte(column, min));
    }
    
    if (max !== undefined) {
      conditions.push(lte(column, max));
    }
    
    if (conditions.length === 0) return undefined;
    if (conditions.length === 1) return conditions[0];
    
    return and(...conditions);
  }

  /**
   * Build a WHERE clause for date range queries
   */
  static dateRange(column: PgColumn, startDate?: Date, endDate?: Date): SQL | undefined {
    const conditions: SQL[] = [];
    
    if (startDate) {
      conditions.push(gte(column, startDate.toISOString()));
    }
    
    if (endDate) {
      conditions.push(lte(column, endDate.toISOString()));
    }
    
    if (conditions.length === 0) return undefined;
    if (conditions.length === 1) return conditions[0];
    
    return and(...conditions);
  }

  /**
   * Build a WHERE clause for IN queries
   */
  static inList(column: PgColumn, values: any[]): SQL | undefined {
    if (!values || values.length === 0) return undefined;
    return inArray(column, values);
  }

  /**
   * Build a WHERE clause for NULL checks
   */
  static nullCheck(column: PgColumn, checkIsNull: boolean): SQL {
    return checkIsNull ? drizzleIsNull(column) : isNotNull(column);
  }

  /**
   * Combine multiple conditions with AND
   */
  static combineAnd(...conditions: (SQL | undefined)[]): SQL | undefined {
    const validConditions = conditions.filter(Boolean) as SQL[];
    if (validConditions.length === 0) return undefined;
    if (validConditions.length === 1) return validConditions[0];
    return and(...validConditions);
  }

  /**
   * Combine multiple conditions with OR
   */
  static combineOr(...conditions: (SQL | undefined)[]): SQL | undefined {
    const validConditions = conditions.filter(Boolean) as SQL[];
    if (validConditions.length === 0) return undefined;
    if (validConditions.length === 1) return validConditions[0];
    return or(...validConditions);
  }

  /**
   * Build pagination with limit and offset
   */
  static pagination(page: number = 1, limit: number = 10) {
    const offset = (page - 1) * limit;
    return {
      limit: Math.min(Math.max(limit, 1), 100), // Between 1 and 100
      offset: Math.max(offset, 0),
    };
  }

  /**
   * Build ordering conditions
   */
  static orderBy(column: PgColumn, direction: 'asc' | 'desc' = 'asc') {
    return direction === 'desc' ? desc(column) : asc(column);
  }
}

/**
 * Common filter interfaces
 */
export interface BaseFilter {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TextSearchFilter extends BaseFilter {
  search?: string;
}

export interface DateRangeFilter extends BaseFilter {
  startDate?: Date;
  endDate?: Date;
}

/**
 * Type utilities for repository operations
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredBy<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Pagination result wrapper
 */
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Utility to create paginated results
 */
export function createPaginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / limit);
  
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}