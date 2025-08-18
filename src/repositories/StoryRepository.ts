import { eq, and, or, ilike, sql, inArray, desc, asc } from "drizzle-orm";
import { BaseRepository } from "./BaseRepository";
import { stories, guys, users, comments, Story, InsertStory, Guy, User, Comment } from "../database/schema";
import { ErrorHandler, NotFoundError, ValidationError } from "./utils/ErrorHandler";
import { QueryBuilder, TextSearchFilter, DateRangeFilter, PaginatedResult, createPaginatedResult } from "./utils/QueryBuilder";
import { db } from "../database/connection";

/**
 * Story feed item interface for complex queries
 */
export interface StoryFeedItem extends Story {
  guy: Guy;
  user: User;
  commentCount: number;
}

/**
 * Story filter interface
 */
export interface StoryFilter extends TextSearchFilter, DateRangeFilter {
  tagType?: "red_flag" | "good_vibes" | "unsure";
  guyId?: string;
  userId?: string;
}

/**
 * Repository for story-related database operations
 */
export class StoryRepository extends BaseRepository<Story, InsertStory> {
  protected table = stories;
  protected idColumn = stories.id;

  /**
   * Create a new story with validation
   */
  async create(storyData: InsertStory): Promise<Story> {
    try {
      // Validate required fields
      ErrorHandler.validateRequired(storyData, ['text', 'guyId', 'userId']);
      
      // Validate that the guy exists
      if (storyData.guyId) {
        ErrorHandler.validateUUID(storyData.guyId);
        
        const guyExists = await db
          .select({ id: guys.id })
          .from(guys)
          .where(eq(guys.id, storyData.guyId))
          .limit(1);
        
        if (!guyExists.length) {
          throw new ValidationError("Guy does not exist", "guyId");
        }
      }
      
      // Validate that the creating user exists
      if (storyData.userId) {
        ErrorHandler.validateUUID(storyData.userId);
        
        const userExists = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.id, storyData.userId))
          .limit(1);
        
        if (!userExists.length) {
          throw new ValidationError("Creating user does not exist", "userId");
        }
      }
      
      // Validate text length
      if (storyData.text && storyData.text.length > 1000) {
        throw new ValidationError("Story text cannot exceed 1000 characters", "text");
      }
      
      return await super.create(storyData);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw ErrorHandler.handleDatabaseError(error, "StoryRepository.create");
    }
  }

  /**
   * Update story with validation
   */
  async updateStory(id: string, updates: Partial<InsertStory>): Promise<Story | null> {
    try {
      ErrorHandler.validateUUID(id);
      
      // Validate text length if being updated
      if (updates.text && updates.text.length > 1000) {
        throw new ValidationError("Story text cannot exceed 1000 characters", "text");
      }
      
      const result = await this.update(id, updates);
      if (!result) {
        throw new NotFoundError("Story", id);
      }
      
      return result;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      throw ErrorHandler.handleDatabaseError(error, "StoryRepository.updateStory");
    }
  }

  /**
   * Fetch stories feed with complex filtering and pagination
   */
  async fetchStoriesFeed(filter: StoryFilter = {}): Promise<PaginatedResult<StoryFeedItem>> {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search, 
        tagType, 
        guyId, 
        userId,
        startDate,
        endDate,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = filter;
      
      const { limit: validLimit, offset } = QueryBuilder.pagination(page, limit);
      
      // Build where conditions
      const conditions: any[] = [];
      
      if (search) {
        conditions.push(
          or(
            ilike(stories.text, `%${search}%`),
            ilike(guys.name, `%${search}%`),
            ilike(users.nickname, `%${search}%`)
          )
        );
      }
      
      if (tagType) {
        // For array field, we need to check if the tag is in the array
        conditions.push(sql`${tagType} = ANY(${stories.tags})`);
      }
      
      if (guyId) {
        ErrorHandler.validateUUID(guyId);
        conditions.push(eq(stories.guyId, guyId));
      }
      
      if (userId) {
        ErrorHandler.validateUUID(userId);
        conditions.push(eq(stories.userId, userId));
      }
      
      if (startDate || endDate) {
        const dateCondition = QueryBuilder.dateRange(stories.createdAt, startDate, endDate);
        if (dateCondition) {
          conditions.push(dateCondition);
        }
      }
      
      const whereCondition = conditions.length > 0 ? and(...conditions) : sql`1=1`;
      
      // Get total count
      const totalResult = await db
        .select({ count: sql`count(*)` })
        .from(stories)
        .innerJoin(guys, eq(stories.guyId, guys.id))
        .innerJoin(users, eq(stories.userId, users.id))
        .where(whereCondition);
      
      const total = Number(totalResult[0]?.count || 0);
      
      // Build order by
      const orderColumn = sortBy === 'createdAt' ? stories.createdAt : stories.createdAt;
      const orderDirection = sortOrder === 'desc' ? desc(orderColumn) : asc(orderColumn);
      
      // Get paginated results with joins
      const result = await db
        .select({
          // Story fields
          id: stories.id,
          guyId: stories.guyId,
          userId: stories.userId,
          text: stories.text,
          tags: stories.tags,
          imageUrl: stories.imageUrl,
          anonymous: stories.anonymous,
          nickname: stories.nickname,
          createdAt: stories.createdAt,
          // Guy fields
          guy: {
            id: guys.id,
            name: guys.name,
            phone: guys.phone,
            socials: guys.socials,
            location: guys.location,
            age: guys.age,
            createdByUserId: guys.createdByUserId,
            createdAt: guys.createdAt,
          },
          // User fields
          user: {
            id: users.id,
            phone: users.phone,
            email: users.email,
            nickname: users.nickname,
            verified: users.verified,
            verificationStatus: users.verificationStatus,
            idImageUrl: users.idImageUrl,
            idType: users.idType,
            rejectionReason: users.rejectionReason,
            verifiedAt: users.verifiedAt,
            createdAt: users.createdAt,
          },
          // Comment count
          commentCount: sql<number>`(
            SELECT count(*) 
            FROM ${comments} 
            WHERE ${comments.storyId} = ${stories.id}
          )`,
        })
        .from(stories)
        .innerJoin(guys, eq(stories.guyId, guys.id))
        .innerJoin(users, eq(stories.userId, users.id))
        .where(whereCondition)
        .limit(validLimit)
        .offset(offset)
        .orderBy(orderDirection);
      
      // Transform the result to match StoryFeedItem interface
      const transformedResult: StoryFeedItem[] = result.map(row => ({
        id: row.id,
        guyId: row.guyId,
        userId: row.userId,
        text: row.text,
        tags: row.tags,
        imageUrl: row.imageUrl,
        anonymous: row.anonymous,
        nickname: row.nickname,
        createdAt: row.createdAt,
        guy: row.guy as Guy,
        user: row.user as User,
        commentCount: row.commentCount,
      }));
      
      return createPaginatedResult(transformedResult, total, page, validLimit);
    } catch (error) {
      throw ErrorHandler.handleDatabaseError(error, "StoryRepository.fetchStoriesFeed");
    }
  }

  /**
   * Find stories by guy ID
   */
  async findByGuyId(guyId: string, filter: TextSearchFilter = {}): Promise<PaginatedResult<Story>> {
    try {
      ErrorHandler.validateUUID(guyId);
      
      const { page = 1, limit = 10, search } = filter;
      const { limit: validLimit, offset } = QueryBuilder.pagination(page, limit);
      
      // Build where conditions
      let whereCondition: any = eq(stories.guyId, guyId);
      
      if (search) {
        const searchCondition = ilike(stories.text, `%${search}%`);
        whereCondition = and(whereCondition, searchCondition);
      }
      
      // Get total count
      const totalResult = await db
        .select({ count: sql`count(*)` })
        .from(stories)
        .where(whereCondition);
      
      const total = Number(totalResult[0]?.count || 0);
      
      // Get paginated results
      const result = await db
        .select()
        .from(stories)
        .where(whereCondition)
        .limit(validLimit)
        .offset(offset)
        .orderBy(desc(stories.createdAt));
      
      return createPaginatedResult(result as Story[], total, page, validLimit);
    } catch (error) {
      throw ErrorHandler.handleDatabaseError(error, "StoryRepository.findByGuyId");
    }
  }

  /**
   * Find stories by user ID
   */
  async findByUserId(userId: string, filter: TextSearchFilter = {}): Promise<PaginatedResult<Story>> {
    try {
      ErrorHandler.validateUUID(userId);
      
      const { page = 1, limit = 10, search } = filter;
      const { limit: validLimit, offset } = QueryBuilder.pagination(page, limit);
      
      // Build where conditions
      let whereCondition: any = eq(stories.userId, userId);
      
      if (search) {
        const searchCondition = ilike(stories.text, `%${search}%`);
        whereCondition = and(whereCondition, searchCondition);
      }
      
      // Get total count
      const totalResult = await db
        .select({ count: sql`count(*)` })
        .from(stories)
        .where(whereCondition);
      
      const total = Number(totalResult[0]?.count || 0);
      
      // Get paginated results
      const result = await db
        .select()
        .from(stories)
        .where(whereCondition)
        .limit(validLimit)
        .offset(offset)
        .orderBy(desc(stories.createdAt));
      
      return createPaginatedResult(result as Story[], total, page, validLimit);
    } catch (error) {
      throw ErrorHandler.handleDatabaseError(error, "StoryRepository.findByUserId");
    }
  }

  /**
   * Find stories by tag type
   */
  async findByTagType(
    tagType: "red_flag" | "good_vibes" | "unsure", 
    filter: TextSearchFilter = {}
  ): Promise<PaginatedResult<Story>> {
    try {
      const { page = 1, limit = 10, search } = filter;
      const { limit: validLimit, offset } = QueryBuilder.pagination(page, limit);
      
      // Build where conditions - check if tag is in the array
      let whereCondition: any = sql`${tagType} = ANY(${stories.tags})`;
      
      if (search) {
        const searchCondition = ilike(stories.text, `%${search}%`);
        whereCondition = and(whereCondition, searchCondition);
      }
      
      // Get total count
      const totalResult = await db
        .select({ count: sql`count(*)` })
        .from(stories)
        .where(whereCondition);
      
      const total = Number(totalResult[0]?.count || 0);
      
      // Get paginated results
      const result = await db
        .select()
        .from(stories)
        .where(whereCondition)
        .limit(validLimit)
        .offset(offset)
        .orderBy(desc(stories.createdAt));
      
      return createPaginatedResult(result as Story[], total, page, validLimit);
    } catch (error) {
      throw ErrorHandler.handleDatabaseError(error, "StoryRepository.findByTagType");
    }
  }

  /**
   * Get trending stories (stories with most comments in the last 7 days)
   */
  async getTrendingStories(limit: number = 10): Promise<(Story & { commentCount: number })[]> {
    try {
      const validLimit = Math.min(Math.max(limit, 1), 50); // Between 1 and 50
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const result = await db
        .select({
          id: stories.id,
          guyId: stories.guyId,
          userId: stories.userId,
          text: stories.text,
          tags: stories.tags,
          imageUrl: stories.imageUrl,
          anonymous: stories.anonymous,
          nickname: stories.nickname,
          createdAt: stories.createdAt,
          commentCount: sql<number>`count(${comments.id})`,
        })
        .from(stories)
        .leftJoin(comments, eq(stories.id, comments.storyId))
        .where(sql`${stories.createdAt} >= ${sevenDaysAgo.toISOString()}`)
        .groupBy(stories.id)
        .orderBy(desc(sql`count(${comments.id})`))
        .limit(validLimit);
      
      return result as (Story & { commentCount: number })[];
    } catch (error) {
      throw ErrorHandler.handleDatabaseError(error, "StoryRepository.getTrendingStories");
    }
  }

  /**
   * Get story statistics
   */
  async getStoryStats(): Promise<{
    total: number;
    positive: number;
    negative: number;
    neutral: number;
    withImages: number;
    averageCommentsPerStory: number;
  }> {
    try {
      const [
        totalResult,
        positiveResult,
        negativeResult,
        neutralResult,
        withImagesResult,
        avgCommentsResult,
      ] = await Promise.all([
        // Total stories
        db.select({ count: sql`count(*)` }).from(stories),
        
        // Good vibes stories
        db.select({ count: sql`count(*)` }).from(stories).where(sql`'good_vibes' = ANY(${stories.tags})`),
        
        // Red flag stories
        db.select({ count: sql`count(*)` }).from(stories).where(sql`'red_flag' = ANY(${stories.tags})`),
        
        // Unsure stories
        db.select({ count: sql`count(*)` }).from(stories).where(sql`'unsure' = ANY(${stories.tags})`),
        
        // Stories with images
        db.select({ count: sql`count(*)` }).from(stories).where(sql`${stories.imageUrl} is not null`),
        
        // Average comments per story
        db.select({ avg: sql`avg(comment_count)` }).from(
          db
            .select({ comment_count: sql`count(${comments.id})` })
            .from(stories)
            .leftJoin(comments, eq(stories.id, comments.storyId))
            .groupBy(stories.id)
            .as('story_comments')
        ),
      ]);
      
      return {
        total: Number(totalResult[0]?.count || 0),
        positive: Number(positiveResult[0]?.count || 0),
        negative: Number(negativeResult[0]?.count || 0),
        neutral: Number(neutralResult[0]?.count || 0),
        withImages: Number(withImagesResult[0]?.count || 0),
        averageCommentsPerStory: Number(avgCommentsResult[0]?.avg || 0),
      };
    } catch (error) {
      throw ErrorHandler.handleDatabaseError(error, "StoryRepository.getStoryStats");
    }
  }

  /**
   * Delete story and all associated comments
   */
  async deleteWithComments(id: string): Promise<boolean> {
    try {
      ErrorHandler.validateUUID(id);
      
      return await db.transaction(async (tx) => {
        // First delete all comments associated with this story
        await tx.delete(comments).where(eq(comments.storyId, id));
        
        // Then delete the story
        const result = await tx.delete(stories).where(eq(stories.id, id)).returning();
        
        return result.length > 0;
      });
    } catch (error) {
      throw ErrorHandler.handleDatabaseError(error, "StoryRepository.deleteWithComments");
    }
  }

  /**
   * Check if user owns the story
   */
  async isOwner(storyId: string, userId: string): Promise<boolean> {
    try {
      ErrorHandler.validateUUID(storyId);
      ErrorHandler.validateUUID(userId);
      
      const result = await db
        .select({ id: stories.id })
        .from(stories)
        .where(and(eq(stories.id, storyId), eq(stories.userId, userId)))
        .limit(1);
      
      return result.length > 0;
    } catch (error) {
      throw ErrorHandler.handleDatabaseError(error, "StoryRepository.isOwner");
    }
  }

  /**
   * Bulk delete stories by IDs
   */
  async bulkDelete(storyIds: string[]): Promise<number> {
    try {
      // Validate all story IDs
      storyIds.forEach(id => ErrorHandler.validateUUID(id));
      
      return await db.transaction(async (tx) => {
        // First delete all comments associated with these stories
        await tx.delete(comments).where(inArray(comments.storyId, storyIds));
        
        // Then delete the stories
        const result = await tx.delete(stories).where(inArray(stories.id, storyIds)).returning();
        
        return result.length;
      });
    } catch (error) {
      throw ErrorHandler.handleDatabaseError(error, "StoryRepository.bulkDelete");
    }
  }
}