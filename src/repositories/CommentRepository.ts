import { eq, and, or, ilike, sql, inArray, desc, asc } from "drizzle-orm";
import { BaseRepository } from "./BaseRepository";
import { comments, stories, users, Comment, InsertComment, Story, User } from "../database/schema";
import { ErrorHandler, NotFoundError, ValidationError } from "./utils/ErrorHandler";
import { QueryBuilder, TextSearchFilter, DateRangeFilter, PaginatedResult, createPaginatedResult } from "./utils/QueryBuilder";
import { db } from "../database/connection";

/**
 * Comment with user and story information
 */
export interface CommentWithDetails extends Comment {
  user: User;
  story: Story;
}

/**
 * Comment filter interface
 */
export interface CommentFilter extends TextSearchFilter, DateRangeFilter {
  storyId?: string;
  userId?: string;
}

/**
 * Repository for comment-related database operations
 */
export class CommentRepository extends BaseRepository<Comment, InsertComment> {
  protected table = comments;
  protected idColumn = comments.id;

  /**
   * Create a new comment with validation
   */
  async create(commentData: InsertComment): Promise<Comment> {
    try {
      // Validate required fields
      ErrorHandler.validateRequired(commentData, ['text', 'storyId', 'userId']);
      
      // Validate that the story exists
      if (commentData.storyId) {
        ErrorHandler.validateUUID(commentData.storyId);
        
        const storyExists = await db
          .select({ id: stories.id })
          .from(stories)
          .where(eq(stories.id, commentData.storyId))
          .limit(1);
        
        if (!storyExists.length) {
          throw new ValidationError("Story does not exist", "storyId");
        }
      }
      
      // Validate that the creating user exists
      if (commentData.userId) {
        ErrorHandler.validateUUID(commentData.userId);
        
        const userExists = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.id, commentData.userId))
          .limit(1);
        
        if (!userExists.length) {
          throw new ValidationError("Creating user does not exist", "userId");
        }
      }
      
      // Validate content length
      if (commentData.text && commentData.text.length > 500) {
        throw new ValidationError("Comment content cannot exceed 500 characters", "text");
      }
      
      if (commentData.text && commentData.text.trim().length === 0) {
        throw new ValidationError("Comment content cannot be empty", "text");
      }
      
      return await super.create(commentData);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw ErrorHandler.handleDatabaseError(error, "CommentRepository.create");
    }
  }

  /**
   * Update comment with validation
   */
  async updateComment(id: string, updates: Partial<InsertComment>): Promise<Comment | null> {
    try {
      ErrorHandler.validateUUID(id);
      
      // Validate content length if being updated
      if (updates.text) {
        if (updates.text.length > 500) {
          throw new ValidationError("Comment content cannot exceed 500 characters", "text");
        }
        
        if (updates.text.trim().length === 0) {
          throw new ValidationError("Comment content cannot be empty", "text");
        }
      }
      
      const result = await this.update(id, updates);
      if (!result) {
        throw new NotFoundError("Comment", id);
      }
      
      return result;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      throw ErrorHandler.handleDatabaseError(error, "CommentRepository.updateComment");
    }
  }

  /**
   * Find comments by story ID with pagination
   */
  async findByStoryId(storyId: string, filter: TextSearchFilter = {}): Promise<PaginatedResult<CommentWithDetails>> {
    try {
      ErrorHandler.validateUUID(storyId);
      
      const { page = 1, limit = 20, search, sortOrder = 'asc' } = filter;
      const { limit: validLimit, offset } = QueryBuilder.pagination(page, limit);
      
      // Build where conditions
      let whereCondition = eq(comments.storyId, storyId);
      
      if (search) {
        const searchCondition = or(
          ilike(comments.text, `%${search}%`),
          ilike(users.nickname, `%${search}%`)
        );
        const combined = and(whereCondition, searchCondition);
        if (combined) {
          whereCondition = combined;
        }
      }
      
      // Get total count
      const totalResult = await db
        .select({ count: sql`count(*)` })
        .from(comments)
        .innerJoin(users, eq(comments.userId, users.id))
        .innerJoin(stories, eq(comments.storyId, stories.id))
        .where(whereCondition);
      
      const total = Number(totalResult[0]?.count || 0);
      
      // Build order by (comments are usually shown chronologically)
      const orderDirection = sortOrder === 'desc' ? desc(comments.createdAt) : asc(comments.createdAt);
      
      // Get paginated results with joins
      const result = await db
        .select({
          // Comment fields
          id: comments.id,
          text: comments.text,
          storyId: comments.storyId,
          userId: comments.userId,
          anonymous: comments.anonymous,
          nickname: comments.nickname,
          createdAt: comments.createdAt,
          // User fields
          user: {
            id: users.id,
            name: users.name,
            phone: users.phone,
            email: users.email,
            emailVerified: users.emailVerified,
            image: users.image,
            nickname: users.nickname,
            verified: users.verified,
            verificationStatus: users.verificationStatus,
            idImageUrl: users.idImageUrl,
            idType: users.idType,
            rejectionReason: users.rejectionReason,
            verifiedAt: users.verifiedAt,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
          },
          // Story fields
          story: {
            id: stories.id,
            guyId: stories.guyId,
            userId: stories.userId,
            text: stories.text,
            tags: stories.tags,
            imageUrl: stories.imageUrl,
            anonymous: stories.anonymous,
            nickname: stories.nickname,
            createdAt: stories.createdAt,
          },
        })
        .from(comments)
        .innerJoin(users, eq(comments.userId, users.id))
        .innerJoin(stories, eq(comments.storyId, stories.id))
        .where(whereCondition)
        .limit(validLimit)
        .offset(offset)
        .orderBy(orderDirection);
      
      // Transform the result to match CommentWithDetails interface
      const transformedResult: CommentWithDetails[] = result.map(row => ({
        id: row.id,
        text: row.text,
        storyId: row.storyId,
        userId: row.userId,
        anonymous: row.anonymous,
        nickname: row.nickname,
        createdAt: row.createdAt,
        user: row.user as User,
        story: row.story as Story,
      }));
      
      return createPaginatedResult(transformedResult, total, page, validLimit);
    } catch (error) {
      throw ErrorHandler.handleDatabaseError(error, "CommentRepository.findByStoryId");
    }
  }

  /**
   * Find comments by user ID
   */
  async findByUserId(userId: string, filter: CommentFilter = {}): Promise<PaginatedResult<CommentWithDetails>> {
    try {
      ErrorHandler.validateUUID(userId);
      
      const { page = 1, limit = 10, search, startDate, endDate } = filter;
      const { limit: validLimit, offset } = QueryBuilder.pagination(page, limit);
      
      // Build where conditions
      const conditions: any[] = [eq(comments.userId, userId)];
      
      if (search) {
        conditions.push(ilike(comments.text, `%${search}%`));
      }
      
      if (startDate || endDate) {
        const dateCondition = QueryBuilder.dateRange(comments.createdAt, startDate, endDate);
        if (dateCondition) {
          conditions.push(dateCondition);
        }
      }
      
      const whereCondition = and(...conditions);
      
      // Get total count
      const totalResult = await db
        .select({ count: sql`count(*)` })
        .from(comments)
        .innerJoin(users, eq(comments.userId, users.id))
        .innerJoin(stories, eq(comments.storyId, stories.id))
        .where(whereCondition);
      
      const total = Number(totalResult[0]?.count || 0);
      
      // Get paginated results with joins
      const result = await db
        .select({
          // Comment fields
          id: comments.id,
          text: comments.text,
          storyId: comments.storyId,
          userId: comments.userId,
          anonymous: comments.anonymous,
          nickname: comments.nickname,
          createdAt: comments.createdAt,
          // User fields
          user: {
            id: users.id,
            name: users.name,
            phone: users.phone,
            email: users.email,
            emailVerified: users.emailVerified,
            image: users.image,
            nickname: users.nickname,
            verified: users.verified,
            verificationStatus: users.verificationStatus,
            idImageUrl: users.idImageUrl,
            idType: users.idType,
            rejectionReason: users.rejectionReason,
            verifiedAt: users.verifiedAt,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
          },
          // Story fields
          story: {
            id: stories.id,
            guyId: stories.guyId,
            userId: stories.userId,
            text: stories.text,
            tags: stories.tags,
            imageUrl: stories.imageUrl,
            anonymous: stories.anonymous,
            nickname: stories.nickname,
            createdAt: stories.createdAt,
          },
        })
        .from(comments)
        .innerJoin(users, eq(comments.userId, users.id))
        .innerJoin(stories, eq(comments.storyId, stories.id))
        .where(whereCondition)
        .limit(validLimit)
        .offset(offset)
        .orderBy(desc(comments.createdAt));
      
      // Transform the result to match CommentWithDetails interface
      const transformedResult: CommentWithDetails[] = result.map(row => ({
        id: row.id,
        text: row.text,
        storyId: row.storyId,
        userId: row.userId,
        anonymous: row.anonymous,
        nickname: row.nickname,
        createdAt: row.createdAt,
        user: row.user as User,
        story: row.story as Story,
      }));
      
      return createPaginatedResult(transformedResult, total, page, validLimit);
    } catch (error) {
      throw ErrorHandler.handleDatabaseError(error, "CommentRepository.findByUserId");
    }
  }

  /**
   * Get recent comments across all stories
   */
  async getRecentComments(limit: number = 10): Promise<CommentWithDetails[]> {
    try {
      const validLimit = Math.min(Math.max(limit, 1), 50); // Between 1 and 50
      
      const result = await db
        .select({
          // Comment fields
          id: comments.id,
          text: comments.text,
          storyId: comments.storyId,
          userId: comments.userId,
          anonymous: comments.anonymous,
          nickname: comments.nickname,
          createdAt: comments.createdAt,
          // User fields
          user: {
            id: users.id,
            name: users.name,
            phone: users.phone,
            email: users.email,
            emailVerified: users.emailVerified,
            image: users.image,
            nickname: users.nickname,
            verified: users.verified,
            verificationStatus: users.verificationStatus,
            idImageUrl: users.idImageUrl,
            idType: users.idType,
            rejectionReason: users.rejectionReason,
            verifiedAt: users.verifiedAt,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
          },
          // Story fields
          story: {
            id: stories.id,
            guyId: stories.guyId,
            userId: stories.userId,
            text: stories.text,
            tags: stories.tags,
            imageUrl: stories.imageUrl,
            anonymous: stories.anonymous,
            nickname: stories.nickname,
            createdAt: stories.createdAt,
          },
        })
        .from(comments)
        .innerJoin(users, eq(comments.userId, users.id))
        .innerJoin(stories, eq(comments.storyId, stories.id))
        .limit(validLimit)
        .orderBy(desc(comments.createdAt));
      
      // Transform the result to match CommentWithDetails interface
      return result.map(row => ({
        id: row.id,
        text: row.text,
        storyId: row.storyId,
        userId: row.userId,
        anonymous: row.anonymous,
        nickname: row.nickname,
        createdAt: row.createdAt,
        user: row.user as User,
        story: row.story as Story,
      }));
    } catch (error) {
      throw ErrorHandler.handleDatabaseError(error, "CommentRepository.getRecentComments");
    }
  }

  /**
   * Get comment count for a story
   */
  async getCommentCountByStoryId(storyId: string): Promise<number> {
    try {
      ErrorHandler.validateUUID(storyId);
      
      const result = await db
        .select({ count: sql`count(*)` })
        .from(comments)
        .where(eq(comments.storyId, storyId));
      
      return Number(result[0]?.count || 0);
    } catch (error) {
      throw ErrorHandler.handleDatabaseError(error, "CommentRepository.getCommentCountByStoryId");
    }
  }

  /**
   * Get comment counts for multiple stories
   */
  async getCommentCountsByStoryIds(storyIds: string[]): Promise<Record<string, number>> {
    try {
      // Validate all story IDs
      storyIds.forEach(id => ErrorHandler.validateUUID(id));
      
      if (storyIds.length === 0) {
        return {};
      }
      
      const result = await db
        .select({
          storyId: comments.storyId,
          count: sql<number>`count(*)`,
        })
        .from(comments)
        .where(inArray(comments.storyId, storyIds))
        .groupBy(comments.storyId);
      
      // Convert to record format
      const counts: Record<string, number> = {};
      result.forEach(row => {
        if (row.storyId) {
          counts[row.storyId] = row.count;
        }
      });
      
      // Ensure all requested story IDs are in the result (with 0 if no comments)
      storyIds.forEach(id => {
        if (!(id in counts)) {
          counts[id] = 0;
        }
      });
      
      return counts;
    } catch (error) {
      throw ErrorHandler.handleDatabaseError(error, "CommentRepository.getCommentCountsByStoryIds");
    }
  }

  /**
   * Search comments across all stories
   */
  async searchComments(searchTerm: string, filter: CommentFilter = {}): Promise<PaginatedResult<CommentWithDetails>> {
    try {
      const { page = 1, limit = 10, startDate, endDate } = filter;
      const { limit: validLimit, offset } = QueryBuilder.pagination(page, limit);
      
      // Build where conditions
      const conditions: any[] = [
        or(
          ilike(comments.text, `%${searchTerm}%`),
          ilike(users.nickname, `%${searchTerm}%`)
        )
      ];
      
      if (startDate || endDate) {
        const dateCondition = QueryBuilder.dateRange(comments.createdAt, startDate, endDate);
        if (dateCondition) {
          conditions.push(dateCondition);
        }
      }
      
      const whereCondition = and(...conditions);
      
      // Get total count
      const totalResult = await db
        .select({ count: sql`count(*)` })
        .from(comments)
        .innerJoin(users, eq(comments.userId, users.id))
        .innerJoin(stories, eq(comments.storyId, stories.id))
        .where(whereCondition);
      
      const total = Number(totalResult[0]?.count || 0);
      
      // Get paginated results with joins
      const result = await db
        .select({
          // Comment fields
          id: comments.id,
          text: comments.text,
          storyId: comments.storyId,
          userId: comments.userId,
          anonymous: comments.anonymous,
          nickname: comments.nickname,
          createdAt: comments.createdAt,
          // User fields
          user: {
            id: users.id,
            name: users.name,
            phone: users.phone,
            email: users.email,
            emailVerified: users.emailVerified,
            image: users.image,
            nickname: users.nickname,
            verified: users.verified,
            verificationStatus: users.verificationStatus,
            idImageUrl: users.idImageUrl,
            idType: users.idType,
            rejectionReason: users.rejectionReason,
            verifiedAt: users.verifiedAt,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
          },
          // Story fields
          story: {
            id: stories.id,
            guyId: stories.guyId,
            userId: stories.userId,
            text: stories.text,
            tags: stories.tags,
            imageUrl: stories.imageUrl,
            anonymous: stories.anonymous,
            nickname: stories.nickname,
            createdAt: stories.createdAt,
          },
        })
        .from(comments)
        .innerJoin(users, eq(comments.userId, users.id))
        .innerJoin(stories, eq(comments.storyId, stories.id))
        .where(whereCondition)
        .limit(validLimit)
        .offset(offset)
        .orderBy(desc(comments.createdAt));
      
      // Transform the result to match CommentWithDetails interface
      const transformedResult: CommentWithDetails[] = result.map(row => ({
        id: row.id,
        text: row.text,
        storyId: row.storyId,
        userId: row.userId,
        anonymous: row.anonymous,
        nickname: row.nickname,
        createdAt: row.createdAt,
        user: row.user as User,
        story: row.story as Story,
      }));
      
      return createPaginatedResult(transformedResult, total, page, validLimit);
    } catch (error) {
      throw ErrorHandler.handleDatabaseError(error, "CommentRepository.searchComments");
    }
  }

  /**
   * Get comment statistics
   */
  async getCommentStats(): Promise<{
    total: number;
    todayCount: number;
    averagePerStory: number;
    topCommenters: { userId: string; nickname: string | null; commentCount: number }[];
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const [totalResult, todayResult, avgResult, topCommentersResult] = await Promise.all([
        // Total comments
        db.select({ count: sql`count(*)` }).from(comments),
        
        // Today's comments
        db.select({ count: sql`count(*)` }).from(comments)
          .where(sql`${comments.createdAt} >= ${today.toISOString()}`),
        
        // Average comments per story
        db.select({ avg: sql`avg(comment_count)` }).from(
          db
            .select({ comment_count: sql`count(${comments.id})` })
            .from(stories)
            .leftJoin(comments, eq(stories.id, comments.storyId))
            .groupBy(stories.id)
            .as('story_comments')
        ),
        
        // Top commenters
        db
          .select({
            userId: users.id,
            nickname: users.nickname,
            commentCount: sql<number>`count(${comments.id})`,
          })
          .from(comments)
          .innerJoin(users, eq(comments.userId, users.id))
          .groupBy(users.id, users.nickname)
          .orderBy(desc(sql`count(${comments.id})`))
          .limit(5),
      ]);
      
      return {
        total: Number(totalResult[0]?.count || 0),
        todayCount: Number(todayResult[0]?.count || 0),
        averagePerStory: Number(avgResult[0]?.avg || 0),
        topCommenters: topCommentersResult.map(r => ({
          userId: r.userId,
          nickname: r.nickname,
          commentCount: r.commentCount,
        })),
      };
    } catch (error) {
      throw ErrorHandler.handleDatabaseError(error, "CommentRepository.getCommentStats");
    }
  }

  /**
   * Check if user owns the comment
   */
  async isOwner(commentId: string, userId: string): Promise<boolean> {
    try {
      ErrorHandler.validateUUID(commentId);
      ErrorHandler.validateUUID(userId);
      
      const result = await db
        .select({ id: comments.id })
        .from(comments)
        .where(and(eq(comments.id, commentId), eq(comments.userId, userId)))
        .limit(1);
      
      return result.length > 0;
    } catch (error) {
      throw ErrorHandler.handleDatabaseError(error, "CommentRepository.isOwner");
    }
  }

  /**
   * Bulk delete comments by IDs
   */
  async bulkDelete(commentIds: string[]): Promise<number> {
    try {
      // Validate all comment IDs
      commentIds.forEach(id => ErrorHandler.validateUUID(id));
      
      if (commentIds.length === 0) {
        return 0;
      }
      
      const result = await db
        .delete(comments)
        .where(inArray(comments.id, commentIds))
        .returning();
      
      return result.length;
    } catch (error) {
      throw ErrorHandler.handleDatabaseError(error, "CommentRepository.bulkDelete");
    }
  }

  /**
   * Delete all comments for a story (used when deleting a story)
   */
  async deleteByStoryId(storyId: string): Promise<number> {
    try {
      ErrorHandler.validateUUID(storyId);
      
      const result = await db
        .delete(comments)
        .where(eq(comments.storyId, storyId))
        .returning();
      
      return result.length;
    } catch (error) {
      throw ErrorHandler.handleDatabaseError(error, "CommentRepository.deleteByStoryId");
    }
  }
}
