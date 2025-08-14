/**
 * Custom error classes for repository operations
 */
export class RepositoryError extends Error {
  constructor(
    message: string,
    public code?: string,
    public originalError?: any
  ) {
    super(message);
    this.name = "RepositoryError";
  }
}

export class ValidationError extends RepositoryError {
  constructor(message: string, public field?: string) {
    super(message, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

export class NotFoundError extends RepositoryError {
  constructor(resource: string, id?: string) {
    const message = id 
      ? `${resource} with id '${id}' not found`
      : `${resource} not found`;
    super(message, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class DuplicateError extends RepositoryError {
  constructor(resource: string, field?: string) {
    const message = field
      ? `${resource} with this ${field} already exists`
      : `${resource} already exists`;
    super(message, "DUPLICATE_ERROR");
    this.name = "DuplicateError";
  }
}

export class ForeignKeyError extends RepositoryError {
  constructor(resource: string, referencedResource: string) {
    super(
      `Cannot create/update ${resource}: referenced ${referencedResource} does not exist`,
      "FOREIGN_KEY_ERROR"
    );
    this.name = "ForeignKeyError";
  }
}

/**
 * Error handler utility for consistent error processing
 */
export class ErrorHandler {
  /**
   * Handle database errors and convert them to appropriate custom errors
   */
  static handleDatabaseError(error: any, context: string): RepositoryError {
    console.error(`Database error in ${context}:`, error);

    // Handle PostgreSQL specific error codes
    if (error.code) {
      switch (error.code) {
        case "23505": // Unique violation
          return new DuplicateError(context);
        case "23503": // Foreign key violation
          return new ForeignKeyError(context, "referenced record");
        case "23502": // Not null violation
          return new ValidationError("Required field is missing");
        case "23514": // Check violation
          return new ValidationError("Invalid data provided");
        case "42P01": // Undefined table
          return new RepositoryError(`Table does not exist in ${context}`, "TABLE_NOT_FOUND", error);
        case "42703": // Undefined column
          return new RepositoryError(`Column does not exist in ${context}`, "COLUMN_NOT_FOUND", error);
        default:
          return new RepositoryError(
            `Database operation failed in ${context}: ${error.message}`,
            error.code,
            error
          );
      }
    }

    // Handle connection errors
    if (error.message?.includes("connection") || error.message?.includes("timeout")) {
      return new RepositoryError(
        `Database connection failed in ${context}`,
        "CONNECTION_ERROR",
        error
      );
    }

    // Generic error
    return new RepositoryError(
      `Operation failed in ${context}: ${error.message || "Unknown error"}`,
      "UNKNOWN_ERROR",
      error
    );
  }

  /**
   * Validate required fields
   */
  static validateRequired(data: Record<string, any>, requiredFields: string[]): void {
    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null || data[field] === "") {
        throw new ValidationError(`${field} is required`, field);
      }
    }
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError("Invalid email format", "email");
    }
  }

  /**
   * Validate phone number format (basic validation)
   */
  static validatePhone(phone: string): void {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    if (!phoneRegex.test(phone)) {
      throw new ValidationError("Invalid phone number format", "phone");
    }
  }

  /**
   * Validate UUID format
   */
  static validateUUID(uuid: string, fieldName: string = "id"): void {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(uuid)) {
      throw new ValidationError(`Invalid UUID format for ${fieldName}`, fieldName);
    }
  }
}