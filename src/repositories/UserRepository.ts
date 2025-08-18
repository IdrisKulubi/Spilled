import { eq, and, or, ilike, sql, inArray } from "drizzle-orm";
import { BaseRepository } from "./BaseRepository";
import {
  users,
  User,
  InsertUser,
} from "../database/schema";
import {
  ErrorHandler,
  NotFoundError,
  ValidationError,
} from "./utils/ErrorHandler";
import {
  QueryBuilder,
  TextSearchFilter,
  PaginatedResult,
  createPaginatedResult,
} from "./utils/QueryBuilder";
import { db } from "../database/connection";

/**
 * Repository for user-related database operations
 */
export class UserRepository extends BaseRepository<User, InsertUser> {
  protected table = users;
  protected idColumn = users.id;

  /**
   * Find a user by email address
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      ErrorHandler.validateEmail(email);

      const result = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      return (result[0] as User) || null;
    } catch (error) {
      throw ErrorHandler.handleDatabaseError(
        error,
        "UserRepository.findByEmail"
      );
    }
  }

  /**
   * Find a user by phone number
   */
  async findByPhone(phone: string): Promise<User | null> {
    try {
      ErrorHandler.validatePhone(phone);

      const result = await db
        .select()
        .from(users)
        .where(eq(users.phone, phone))
        .limit(1);

      return (result[0] as User) || null;
    } catch (error) {
      throw ErrorHandler.handleDatabaseError(
        error,
        "UserRepository.findByPhone"
      );
    }
  }

  /**
   * Create a new user with validation
   */
  async create(userData: InsertUser): Promise<User> {
    try {
      // Validate required fields
      ErrorHandler.validateRequired(userData, ["id"]);

      // Validate email if provided
      if (userData.email) {
        ErrorHandler.validateEmail(userData.email);

        // Check if email already exists
        const existingUser = await this.findByEmail(userData.email);
        if (existingUser) {
          throw new ValidationError(
            "User with this email already exists",
            "email"
          );
        }
      }

      // Validate phone if provided
      if (userData.phone) {
        ErrorHandler.validatePhone(userData.phone);

        // Check if phone already exists
        const existingUser = await this.findByPhone(userData.phone);
        if (existingUser) {
          throw new ValidationError(
            "User with this phone number already exists",
            "phone"
          );
        }
      }

      return await super.create(userData);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw ErrorHandler.handleDatabaseError(error, "UserRepository.create");
    }
  }

  /**
   * Update user profile with validation
   */
  async updateProfile(
    id: string,
    updates: Partial<InsertUser>
  ): Promise<User | null> {
    try {
      ErrorHandler.validateUUID(id);

      // Validate email if being updated
      if (updates.email) {
        ErrorHandler.validateEmail(updates.email);

        // Check if email already exists for another user
        const existingUser = await this.findByEmail(updates.email);
        if (existingUser && existingUser.id !== id) {
          throw new ValidationError(
            "User with this email already exists",
            "email"
          );
        }
      }

      // Validate phone if being updated
      if (updates.phone) {
        ErrorHandler.validatePhone(updates.phone);

        // Check if phone already exists for another user
        const existingUser = await this.findByPhone(updates.phone);
        if (existingUser && existingUser.id !== id) {
          throw new ValidationError(
            "User with this phone number already exists",
            "phone"
          );
        }
      }

      const result = await this.update(id, updates);
      if (!result) {
        throw new NotFoundError("User", id);
      }

      return result;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      throw ErrorHandler.handleDatabaseError(
        error,
        "UserRepository.updateProfile"
      );
    }
  }

  /**
   * Update user verification status
   */
  async updateVerificationStatus(
    id: string,
    status: "pending" | "approved" | "rejected",
    rejectionReason?: string
  ): Promise<User | null> {
    try {
      ErrorHandler.validateUUID(id);

      const updates: Partial<InsertUser> = {
        verificationStatus: status,
        verified: status === "approved",
        verifiedAt: status === "approved" ? new Date() : null,
        rejectionReason: status === "rejected" ? rejectionReason : null,
      };

      const result = await this.update(id, updates);
      if (!result) {
        throw new NotFoundError("User", id);
      }

      return result;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw ErrorHandler.handleDatabaseError(
        error,
        "UserRepository.updateVerificationStatus"
      );
    }
  }

  /**
   * Get users by verification status
   */
  async findByVerificationStatus(
    status: "pending" | "approved" | "rejected",
    filter: TextSearchFilter = {}
  ): Promise<PaginatedResult<User>> {
    try {
      const { page = 1, limit = 10, search } = filter;
      const { limit: validLimit, offset } = QueryBuilder.pagination(
        page,
        limit
      );

      // Build where conditions
      const conditions: any[] = [eq(users.verificationStatus, status)];

      if (search) {
        const searchCondition = or(
          ilike(users.nickname, `%${search}%`),
          ilike(users.email, `%${search}%`),
          ilike(users.phone, `%${search}%`)
        );
        conditions.push(searchCondition);
      }

      const whereCondition =
        conditions.length > 1 ? and(...conditions) : conditions[0];

      // Get total count
      const totalResult = await db
        .select({ count: sql`count(*)` })
        .from(users)
        .where(whereCondition);

      const total = Number(totalResult[0]?.count || 0);

      // Get paginated results
      const result = await db
        .select()
        .from(users)
        .where(whereCondition)
        .limit(validLimit)
        .offset(offset)
        .orderBy(users.createdAt);

      return createPaginatedResult(result as User[], total, page, validLimit);
    } catch (error) {
      throw ErrorHandler.handleDatabaseError(
        error,
        "UserRepository.findByVerificationStatus"
      );
    }
  }

  /**
   * Get all verified users
   */
  async findVerifiedUsers(
    filter: TextSearchFilter = {}
  ): Promise<PaginatedResult<User>> {
    return this.findByVerificationStatus("approved", filter);
  }

  /**
   * Get all pending verification users
   */
  async findPendingVerificationUsers(
    filter: TextSearchFilter = {}
  ): Promise<PaginatedResult<User>> {
    return this.findByVerificationStatus("pending", filter);
  }

  /**
   * Search users by nickname, email, or phone
   */
  async searchUsers(
    searchTerm: string,
    filter: TextSearchFilter = {}
  ): Promise<PaginatedResult<User>> {
    try {
      const { page = 1, limit = 10 } = filter;
      const { limit: validLimit, offset } = QueryBuilder.pagination(
        page,
        limit
      );

      const searchCondition = or(
        ilike(users.nickname, `%${searchTerm}%`),
        ilike(users.email, `%${searchTerm}%`),
        ilike(users.phone, `%${searchTerm}%`)
      );

      // Get total count
      const totalResult = await db
        .select({ count: sql`count(*)` })
        .from(users)
        .where(searchCondition);

      const total = Number(totalResult[0]?.count || 0);

      // Get paginated results
      const result = await db
        .select()
        .from(users)
        .where(searchCondition)
        .limit(validLimit)
        .offset(offset)
        .orderBy(users.createdAt);

      return createPaginatedResult(result as User[], total, page, validLimit);
    } catch (error) {
      throw ErrorHandler.handleDatabaseError(
        error,
        "UserRepository.searchUsers"
      );
    }
  }

  /**
   * Check if user is admin (based on email)
   */
  async isAdmin(userId: string): Promise<boolean> {
    try {
      const user = await this.findById(userId);
      if (!user) {
        return false;
      }

      // Check against admin email from environment
      const adminEmail = process.env.EXPO_PUBLIC_ADMIN_EMAIL;
      return user.email === adminEmail;
    } catch (error) {
      throw ErrorHandler.handleDatabaseError(error, "UserRepository.isAdmin");
    }
  }

  /**
   * Get user statistics for admin dashboard
   */
  async getUserStats(): Promise<{
    total: number;
    verified: number;
    pending: number;
    rejected: number;
  }> {
    try {
      const [totalResult, verifiedResult, pendingResult, rejectedResult] =
        await Promise.all([
          db.select({ count: sql`count(*)` }).from(users),
          db
            .select({ count: sql`count(*)` })
            .from(users)
            .where(eq(users.verificationStatus, "approved")),
          db
            .select({ count: sql`count(*)` })
            .from(users)
            .where(eq(users.verificationStatus, "pending")),
          db
            .select({ count: sql`count(*)` })
            .from(users)
            .where(eq(users.verificationStatus, "rejected")),
        ]);

      return {
        total: Number(totalResult[0]?.count || 0),
        verified: Number(verifiedResult[0]?.count || 0),
        pending: Number(pendingResult[0]?.count || 0),
        rejected: Number(rejectedResult[0]?.count || 0),
      };
    } catch (error) {
      throw ErrorHandler.handleDatabaseError(
        error,
        "UserRepository.getUserStats"
      );
    }
  }

  /**
   * Bulk update verification status for multiple users
   */
  async bulkUpdateVerificationStatus(
    userIds: string[],
    status: "pending" | "approved" | "rejected",
    rejectionReason?: string
  ): Promise<User[]> {
    try {
      // Validate all user IDs
      userIds.forEach((id) => ErrorHandler.validateUUID(id));

      const updates: Partial<InsertUser> = {
        verificationStatus: status,
        verified: status === "approved",
        verifiedAt: status === "approved" ? new Date() : null,
        rejectionReason: status === "rejected" ? rejectionReason : null,
      };

      const result = await db
        .update(users)
        .set(updates as any)
        .where(inArray(users.id, userIds))
        .returning();

      return result as User[];
    } catch (error) {
      throw ErrorHandler.handleDatabaseError(
        error,
        "UserRepository.bulkUpdateVerificationStatus"
      );
    }
  }
}
