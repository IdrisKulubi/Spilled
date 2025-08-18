import { eq, and, or, ilike, sql, inArray, desc } from "drizzle-orm";
import { BaseRepository } from "./BaseRepository";
import { guys, stories, users, Guy, InsertGuy, Story } from "../database/schema";
import { ErrorHandler, NotFoundError, ValidationError } from "./utils/ErrorHandler";
import { QueryBuilder, TextSearchFilter, PaginatedResult, createPaginatedResult } from "./utils/QueryBuilder";
import { db } from "../database/connection";

/**
 * Repository for guy-related database operations
 */
export class GuyRepository extends BaseRepository<Guy, InsertGuy> {
  protected table = guys;
  protected idColumn = guys.id;

  /**
   * Create a new guy with validation
   */
  async create(guyData: InsertGuy): Promise<Guy> {
    try {
      // Validate required fields
      ErrorHandler.validateRequired(guyData, ['name', 'createdByUserId']);
      
      // Validate phone if provided
      if (guyData.phone) {
        ErrorHandler.validatePhone(guyData.phone);
      }
      
      // Validate age if provided
      if (guyData.age !== undefined && guyData.age !== null) {
        if (guyData.age < 0 || guyData.age > 150) {
          throw new ValidationError("Age must be between 0 and 150", "age");
        }
      }
      
      // Validate that the creating user exists
      if (guyData.createdByUserId) {
        ErrorHandler.validateUUID(guyData.createdByUserId);
        
        const userExists = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.id, guyData.createdByUserId))
          .limit(1);
        
        if (!userExists.length) {
          throw new ValidationError("Creating user does not exist", "createdByUserId");
        }
      }
      
      return await super.create(guyData);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw ErrorHandler.handleDatabaseError(error, "GuyRepository.create");
    }
  }

  /**
   * Update guy profile with validation
   */
  async updateProfile(id: string, updates: Partial<InsertGuy>): Promise<Guy | null> {
    try {
      ErrorHandler.validateUUID(id);
      
      // Validate phone if being updated
      if (updates.phone) {
        ErrorHandler.validatePhone(updates.phone);
      }
      
      // Validate age if being updated
      if (updates.age !== undefined && updates.age !== null) {
        if (updates.age < 0 || updates.age > 150) {
          throw new ValidationError("Age must be between 0 and 150", "age");
        }
      }
      
      const result = await this.update(id, updates);
      if (!result) {
        throw new NotFoundError("Guy", id);
      }
      
      return result;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      throw ErrorHandler.handleDatabaseError(error, "GuyRepository.updateProfile");
    }
  }

  /**
   * Search guys by name, phone, location, or socials
   */
  async searchGuys(searchTerm: string, filter: TextSearchFilter = {}): Promise<PaginatedResult<Guy>> {
    try {
      const { page = 1, limit = 10 } = filter;
      const { limit: validLimit, offset } = QueryBuilder.pagination(page, limit);
      
      const searchCondition = or(
        ilike(guys.name, `%${searchTerm}%`),
        ilike(guys.phone, `%${searchTerm}%`),
        ilike(guys.location, `%${searchTerm}%`),
        ilike(guys.socials, `%${searchTerm}%`)
      );
      
      // Get total count
      const totalResult = await db
        .select({ count: sql`count(*)` })
        .from(guys)
        .where(searchCondition);
      
      const total = Number(totalResult[0]?.count || 0);
      
      // Get paginated results
      const result = await db
        .select()
        .from(guys)
        .where(searchCondition)
        .limit(validLimit)
        .offset(offset)
        .orderBy(desc(guys.createdAt));
      
      return createPaginatedResult(result as Guy[], total, page, validLimit);
    } catch (error) {
      throw ErrorHandler.handleDatabaseError(error, "GuyRepository.searchGuys");
    }
  }

  /**
   * Find guys created by a specific user
   */
  async findByCreatedByUserId(userId: string, filter: TextSearchFilter = {}): Promise<PaginatedResult<Guy>> {
    try {
      ErrorHandler.validateUUID(userId);
      
      const { page = 1, limit = 10, search } = filter;
      const { limit: validLimit, offset } = QueryBuilder.pagination(page, limit);
      
      // Build where conditions
      let whereCondition = eq(guys.createdByUserId, userId);
      
      if (search) {
        const searchCondition = or(
          ilike(guys.name, `%${search}%`),
          ilike(guys.phone, `%${search}%`),
          ilike(guys.location, `%${search}%`),
          ilike(guys.socials, `%${search}%`)
        );
        const combined = and(whereCondition, searchCondition);
        whereCondition = combined ?? whereCondition;
      }
      
      // Get total count
      const totalResult = await db
        .select({ count: sql`count(*)` })
        .from(guys)
        .where(whereCondition);
      
      const total = Number(totalResult[0]?.count || 0);
      
      // Get paginated results
      const result = await db
        .select()
        .from(guys)
        .where(whereCondition)
        .limit(validLimit)
        .offset(offset)
        .orderBy(desc(guys.createdAt));
      
      return createPaginatedResult(result as Guy[], total, page, validLimit);
    } catch (error) {
      throw ErrorHandler.handleDatabaseError(error, "GuyRepository.findByCreatedByUserId");
    }
  }

  /**
   * Find guys with their associated stories
   */
  async findWithStories(guyId: string): Promise<{
    guy: Guy;
    stories: Story[];
  } | null> {
    try {
      ErrorHandler.validateUUID(guyId);
      
      // Get the guy
      const guy = await this.findById(guyId);
      if (!guy) {
        return null;
      }
      
      // Get associated stories
      const guyStories = await db
        .select()
        .from(stories)
        .where(eq(stories.guyId, guyId))
        .orderBy(desc(stories.createdAt));
      
      return {
        guy,
        stories: guyStories as Story[],
      };
    } catch (error) {
      throw ErrorHandler.handleDatabaseError(error, "GuyRepository.findWithStories");
    }
  }

  /**
   * Get guys with story counts
   */
  async findGuysWithStoryCounts(filter: TextSearchFilter = {}): Promise<PaginatedResult<Guy & { storyCount: number }>> {
    try {
      const { page = 1, limit = 10, search } = filter;
      const { limit: validLimit, offset } = QueryBuilder.pagination(page, limit);
      
      // Build where conditions for guys
      let whereCondition = sql`1=1`;
      
      if (search) {
        whereCondition = or(
          ilike(guys.name, `%${search}%`),
          ilike(guys.phone, `%${search}%`),
          ilike(guys.location, `%${search}%`),
          ilike(guys.socials, `%${search}%`)
        ) ?? sql`1=1`;
      }
      
      // Get total count
      const totalResult = await db
        .select({ count: sql`count(*)` })
        .from(guys)
        .where(whereCondition);
      
      const total = Number(totalResult[0]?.count || 0);
      
      // Get guys with story counts
      const result = await db
        .select({
          id: guys.id,
          name: guys.name,
          phone: guys.phone,
          socials: guys.socials,
          location: guys.location,
          age: guys.age,
          createdByUserId: guys.createdByUserId,
          createdAt: guys.createdAt,
          storyCount: sql<number>`count(${stories.id})`,
        })
        .from(guys)
        .leftJoin(stories, eq(guys.id, stories.guyId))
        .where(whereCondition)
        .groupBy(guys.id)
        .limit(validLimit)
        .offset(offset)
        .orderBy(desc(guys.createdAt));
      
      return createPaginatedResult(result as (Guy & { storyCount: number })[], total, page, validLimit);
    } catch (error) {
      throw ErrorHandler.handleDatabaseError(error, "GuyRepository.findGuysWithStoryCounts");
    }
  }

  /**
   * Find popular guys (guys with most stories)
   */
  async findPopularGuys(limit: number = 10): Promise<(Guy & { storyCount: number })[]> {
    try {
      const validLimit = Math.min(Math.max(limit, 1), 50); // Between 1 and 50
      
      const result = await db
        .select({
          id: guys.id,
          name: guys.name,
          phone: guys.phone,
          socials: guys.socials,
          location: guys.location,
          age: guys.age,
          createdByUserId: guys.createdByUserId,
          createdAt: guys.createdAt,
          storyCount: sql<number>`count(${stories.id})`,
        })
        .from(guys)
        .leftJoin(stories, eq(guys.id, stories.guyId))
        .groupBy(guys.id)
        .having(sql`count(${stories.id}) > 0`)
        .orderBy(desc(sql`count(${stories.id})`))
        .limit(validLimit);
      
      return result as (Guy & { storyCount: number })[];
    } catch (error) {
      throw ErrorHandler.handleDatabaseError(error, "GuyRepository.findPopularGuys");
    }
  }

  /**
   * Find guys by location
   */
  async findByLocation(location: string, filter: TextSearchFilter = {}): Promise<PaginatedResult<Guy>> {
    try {
      const { page = 1, limit = 10 } = filter;
      const { limit: validLimit, offset } = QueryBuilder.pagination(page, limit);
      
      const whereCondition = ilike(guys.location, `%${location}%`);
      
      // Get total count
      const totalResult = await db
        .select({ count: sql`count(*)` })
        .from(guys)
        .where(whereCondition);
      
      const total = Number(totalResult[0]?.count || 0);
      
      // Get paginated results
      const result = await db
        .select()
        .from(guys)
        .where(whereCondition)
        .limit(validLimit)
        .offset(offset)
        .orderBy(desc(guys.createdAt));
      
      return createPaginatedResult(result as Guy[], total, page, validLimit);
    } catch (error) {
      throw ErrorHandler.handleDatabaseError(error, "GuyRepository.findByLocation");
    }
  }

  /**
   * Find guys by age range
   */
  async findByAgeRange(
    minAge?: number, 
    maxAge?: number, 
    filter: TextSearchFilter = {}
  ): Promise<PaginatedResult<Guy>> {
    try {
      const { page = 1, limit = 10 } = filter;
      const { limit: validLimit, offset } = QueryBuilder.pagination(page, limit);
      
      // Build age range condition
      const ageConditions: any[] = [];
      
      if (minAge !== undefined) {
        ageConditions.push(sql`${guys.age} >= ${minAge}`);
      }
      
      if (maxAge !== undefined) {
        ageConditions.push(sql`${guys.age} <= ${maxAge}`);
      }
      
      const whereCondition = ageConditions.length > 0 
        ? and(...ageConditions)
        : sql`1=1`;
      
      // Get total count
      const totalResult = await db
        .select({ count: sql`count(*)` })
        .from(guys)
        .where(whereCondition);
      
      const total = Number(totalResult[0]?.count || 0);
      
      // Get paginated results
      const result = await db
        .select()
        .from(guys)
        .where(whereCondition)
        .limit(validLimit)
        .offset(offset)
        .orderBy(desc(guys.createdAt));
      
      return createPaginatedResult(result as Guy[], total, page, validLimit);
    } catch (error) {
      throw ErrorHandler.handleDatabaseError(error, "GuyRepository.findByAgeRange");
    }
  }

  /**
   * Get guy statistics
   */
  async getGuyStats(): Promise<{
    total: number;
    withStories: number;
    averageAge: number;
    topLocations: { location: string; count: number }[];
  }> {
    try {
      const [totalResult, withStoriesResult, avgAgeResult, locationsResult] = await Promise.all([
        // Total guys
        db.select({ count: sql`count(*)` }).from(guys),
        
        // Guys with stories
        db
          .select({ count: sql`count(distinct ${guys.id})` })
          .from(guys)
          .innerJoin(stories, eq(guys.id, stories.guyId)),
        
        // Average age
        db.select({ avg: sql`avg(${guys.age})` }).from(guys).where(sql`${guys.age} is not null`),
        
        // Top locations
        db
          .select({
            location: guys.location,
            count: sql<number>`count(*)`,
          })
          .from(guys)
          .where(sql`${guys.location} is not null and ${guys.location} != ''`)
          .groupBy(guys.location)
          .orderBy(desc(sql`count(*)`))
          .limit(5),
      ]);
      
      return {
        total: Number(totalResult[0]?.count || 0),
        withStories: Number(withStoriesResult[0]?.count || 0),
        averageAge: Number(avgAgeResult[0]?.avg || 0),
        topLocations: locationsResult.map(r => ({
          location: r.location || '',
          count: r.count,
        })),
      };
    } catch (error) {
      throw ErrorHandler.handleDatabaseError(error, "GuyRepository.getGuyStats");
    }
  }

  /**
   * Delete guy and all associated stories
   */
  async deleteWithStories(id: string): Promise<boolean> {
    try {
      ErrorHandler.validateUUID(id);
      
      return await db.transaction(async (tx) => {
        // First delete all stories associated with this guy
        await tx.delete(stories).where(eq(stories.guyId, id));
        
        // Then delete the guy
        const result = await tx.delete(guys).where(eq(guys.id, id)).returning();
        
        return result.length > 0;
      });
    } catch (error) {
      throw ErrorHandler.handleDatabaseError(error, "GuyRepository.deleteWithStories");
    }
  }
}