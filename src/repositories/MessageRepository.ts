import {
  eq,
  and,
  or,
  ilike,
  sql,
  inArray,
  desc,
  lt,
  gt,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { BaseRepository } from "./BaseRepository";
import {
  messages,
  users,
  Message,
  InsertMessage,
  User,
} from "../database/schema";
import {
  ErrorHandler,
  ValidationError,
} from "./utils/ErrorHandler";
import {
  QueryBuilder,
  TextSearchFilter,
  DateRangeFilter,
  PaginatedResult,
  createPaginatedResult,
} from "./utils/QueryBuilder";
import { db } from "../database/connection";

/**
 * Message with sender and receiver information
 */
export interface MessageWithUsers extends Message {
  sender: User;
  receiver: User;
}

/**
 * Conversation summary interface
 */
export interface ConversationSummary {
  otherUserId: string;
  otherUser: {
    id: string;
    nickname: string | null;
  };
  lastMessage: {
    id: string;
    content: string;
    createdAt: Date;
    isFromCurrentUser: boolean;
  };
  unreadCount: number;
  totalMessages: number;
}

/**
 * Message filter interface
 */
export interface MessageFilter extends TextSearchFilter, DateRangeFilter {
  senderId?: string;
  receiverId?: string;
  conversationWith?: string; // For filtering messages in a specific conversation
  includeExpired?: boolean; // Whether to include expired messages
}

/**
 * Repository for message-related database operations
 */
export class MessageRepository extends BaseRepository<Message, InsertMessage> {
  protected table = messages;
  protected idColumn = messages.id;

  /**
   * Send a message with validation and expiration
   */
  async sendMessage(messageData: InsertMessage): Promise<Message> {
    try {
      // Validate required fields
      ErrorHandler.validateRequired(messageData, [
        "text",
        "senderId",
        "receiverId",
      ]);

      // Validate that sender and receiver are different
      if (messageData.senderId === messageData.receiverId) {
        throw new ValidationError(
          "Cannot send message to yourself",
          "receiverId"
        );
      }

      // Validate that the sender exists
      if (messageData.senderId) {
        ErrorHandler.validateUUID(messageData.senderId);

        const senderExists = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.id, messageData.senderId))
          .limit(1);

        if (!senderExists.length) {
          throw new ValidationError("Sender does not exist", "senderId");
        }
      }

      // Validate that the receiver exists
      if (messageData.receiverId) {
        ErrorHandler.validateUUID(messageData.receiverId);

        const receiverExists = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.id, messageData.receiverId))
          .limit(1);

        if (!receiverExists.length) {
          throw new ValidationError("Receiver does not exist", "receiverId");
        }
      }

      // Validate text length
      if (messageData.text && messageData.text.length > 1000) {
        throw new ValidationError(
          "Message text cannot exceed 1000 characters",
          "text"
        );
      }

      if (messageData.text && messageData.text.trim().length === 0) {
        throw new ValidationError("Message text cannot be empty", "text");
      }

      // Set expiration time if not provided (7 days from now to match original behavior)
      if (!messageData.expiresAt) {
        const expirationTime = new Date();
        expirationTime.setDate(expirationTime.getDate() + 7);
        messageData.expiresAt = expirationTime;
      }

      return await super.create(messageData);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw ErrorHandler.handleDatabaseError(
        error,
        "MessageRepository.sendMessage"
      );
    }
  }

  /**
   * Fetch chat history between two users
   */
  async fetchChatHistory(
    userId1: string,
    userId2: string,
    filter: MessageFilter = {}
  ): Promise<PaginatedResult<MessageWithUsers>> {
    try {
      ErrorHandler.validateUUID(userId1);
      ErrorHandler.validateUUID(userId2);

      const {
        page = 1,
        limit = 50,
        includeExpired = false,
        startDate,
        endDate,
      } = filter;
      const { limit: validLimit, offset } = QueryBuilder.pagination(
        page,
        limit
      );

      // Build where conditions for conversation between two users
      const conversationCondition = or(
        and(eq(messages.senderId, userId1), eq(messages.receiverId, userId2)),
        and(eq(messages.senderId, userId2), eq(messages.receiverId, userId1))
      );

      const conditions: any[] = [conversationCondition];

      // Filter out expired messages unless explicitly requested
      if (!includeExpired) {
        conditions.push(
          or(
            sql`${messages.expiresAt} is null`,
            gt(messages.expiresAt, new Date())
          )
        );
      }

      // Add date range filter if provided
      if (startDate || endDate) {
        const dateCondition = QueryBuilder.dateRange(
          messages.createdAt,
          startDate,
          endDate
        );
        if (dateCondition) {
          conditions.push(dateCondition);
        }
      }

      const whereCondition = and(...conditions);

      // Create table aliases
      const sender = alias(users, "sender");
      const receiver = alias(users, "receiver");

      // Get total count
      const totalResult = await db
        .select({ count: sql`count(*)` })
        .from(messages)
        .innerJoin(sender, eq(messages.senderId, sender.id))
        .innerJoin(receiver, eq(messages.receiverId, receiver.id))
        .where(whereCondition);

      const total = Number(totalResult[0]?.count || 0);

      // Get paginated results with joins (ordered by creation time, newest first)
      const result = await db
        .select({
          // Message fields
          id: messages.id,
          text: messages.text,
          senderId: messages.senderId,
          receiverId: messages.receiverId,
          expiresAt: messages.expiresAt,
          createdAt: messages.createdAt,
          // Sender fields
          sender: {
            id: sender.id,
            phone: sender.phone,
            email: sender.email,
            nickname: sender.nickname,
            verified: sender.verified,
            verificationStatus: sender.verificationStatus,
            idImageUrl: sender.idImageUrl,
            idType: sender.idType,
            rejectionReason: sender.rejectionReason,
            verifiedAt: sender.verifiedAt,
            createdAt: sender.createdAt,
          },
          // Receiver fields
          receiver: {
            id: receiver.id,
            phone: receiver.phone,
            email: receiver.email,
            nickname: receiver.nickname,
            verified: receiver.verified,
            verificationStatus: receiver.verificationStatus,
            idImageUrl: receiver.idImageUrl,
            idType: receiver.idType,
            rejectionReason: receiver.rejectionReason,
            verifiedAt: receiver.verifiedAt,
            createdAt: receiver.createdAt,
          },
        })
        .from(messages)
        .innerJoin(sender, eq(messages.senderId, sender.id))
        .innerJoin(receiver, eq(messages.receiverId, receiver.id))
        .where(whereCondition)
        .limit(validLimit)
        .offset(offset)
        .orderBy(desc(messages.createdAt));

      // Transform the result to match MessageWithUsers interface
      const transformedResult: MessageWithUsers[] = result.map((row) => ({
        id: row.id,
        text: row.text,
        senderId: row.senderId,
        receiverId: row.receiverId,
        expiresAt: row.expiresAt,
        createdAt: row.createdAt,
        sender: row.sender as User,
        receiver: row.receiver as User,
      }));

      return createPaginatedResult(transformedResult, total, page, validLimit);
    } catch (error) {
      throw ErrorHandler.handleDatabaseError(
        error,
        "MessageRepository.fetchChatHistory"
      );
    }
  }

  /**
   * Fetch conversations for a user (list of people they've messaged with)
   */
  async fetchConversations(
    userId: string,
    filter: TextSearchFilter = {}
  ): Promise<PaginatedResult<ConversationSummary>> {
    try {
      ErrorHandler.validateUUID(userId);

      const { page = 1, limit = 20, search } = filter;
      const { limit: validLimit, offset } = QueryBuilder.pagination(
        page,
        limit
      );

      // Build a query to get unique conversation partners
      let conversationQuery = db
        .select({
          otherUserId: sql<string>`
            CASE 
              WHEN ${messages.senderId} = ${userId} THEN ${messages.receiverId}
              ELSE ${messages.senderId}
            END
          `,
        })
        .from(messages)
        .where(
          and(
            or(eq(messages.senderId, userId), eq(messages.receiverId, userId)),
            or(
              sql`${messages.expiresAt} is null`,
              gt(messages.expiresAt, new Date())
            )
          )
        ).groupBy(sql`
          CASE 
            WHEN ${messages.senderId} = ${userId} THEN ${messages.receiverId}
            ELSE ${messages.senderId}
          END
        `);

      // Get unique conversation partners
      const conversationPartners = await conversationQuery;

      if (conversationPartners.length === 0) {
        return createPaginatedResult([], 0, page, validLimit);
      }

      const partnerIds = conversationPartners.map((p) => p.otherUserId);

      // Filter by search if provided
      let filteredPartnerIds = partnerIds;
      if (search) {
        const searchResults = await db
          .select({ id: users.id })
          .from(users)
          .where(
            and(
              inArray(users.id, partnerIds),
              ilike(users.nickname, `%${search}%`)
            )
          );

        filteredPartnerIds = searchResults.map((u) => u.id);
      }

      const total = filteredPartnerIds.length;
      const paginatedPartnerIds = filteredPartnerIds.slice(
        offset,
        offset + validLimit
      );

      if (paginatedPartnerIds.length === 0) {
        return createPaginatedResult([], total, page, validLimit);
      }

      // Get conversation summaries for paginated partners
      const conversationSummaries: ConversationSummary[] = [];

      for (const partnerId of paginatedPartnerIds) {
        // Get other user info
        const otherUser = await db
          .select({
            id: users.id,
            nickname: users.nickname,
          })
          .from(users)
          .where(eq(users.id, partnerId))
          .limit(1);

        if (!otherUser.length) continue;

        // Get last message in conversation
        const lastMessageResult = await db
          .select({
            id: messages.id,
            text: messages.text,
            createdAt: messages.createdAt,
            senderId: messages.senderId,
          })
          .from(messages)
          .where(
            and(
              or(
                and(
                  eq(messages.senderId, userId),
                  eq(messages.receiverId, partnerId)
                ),
                and(
                  eq(messages.senderId, partnerId),
                  eq(messages.receiverId, userId)
                )
              ),
              or(
                sql`${messages.expiresAt} is null`,
                gt(messages.expiresAt, new Date())
              )
            )
          )
          .orderBy(desc(messages.createdAt))
          .limit(1);

        if (!lastMessageResult.length) continue;

        const lastMessage = lastMessageResult[0];

        // Get total message count in conversation
        const totalCountResult = await db
          .select({ count: sql`count(*)` })
          .from(messages)
          .where(
            and(
              or(
                and(
                  eq(messages.senderId, userId),
                  eq(messages.receiverId, partnerId)
                ),
                and(
                  eq(messages.senderId, partnerId),
                  eq(messages.receiverId, userId)
                )
              ),
              or(
                sql`${messages.expiresAt} is null`,
                gt(messages.expiresAt, new Date())
              )
            )
          );

        // Get unread count (messages from partner to current user)
        const unreadCountResult = await db
          .select({ count: sql`count(*)` })
          .from(messages)
          .where(
            and(
              eq(messages.senderId, partnerId),
              eq(messages.receiverId, userId),
              or(
                sql`${messages.expiresAt} is null`,
                gt(messages.expiresAt, new Date())
              )
            )
          );

        conversationSummaries.push({
          otherUserId: partnerId,
          otherUser: {
            id: otherUser[0].id,
            nickname: otherUser[0].nickname,
          },
          lastMessage: {
            id: lastMessage.id,
            content: lastMessage.text || "",
            createdAt: lastMessage.createdAt || new Date(),
            isFromCurrentUser: lastMessage.senderId === userId,
          },
          unreadCount: Number(unreadCountResult[0]?.count || 0),
          totalMessages: Number(totalCountResult[0]?.count || 0),
        });
      }

      // Sort by last message time (most recent first)
      conversationSummaries.sort(
        (a, b) =>
          new Date(b.lastMessage.createdAt).getTime() -
          new Date(a.lastMessage.createdAt).getTime()
      );

      return createPaginatedResult(
        conversationSummaries,
        total,
        page,
        validLimit
      );
    } catch (error) {
      throw ErrorHandler.handleDatabaseError(
        error,
        "MessageRepository.fetchConversations"
      );
    }
  }

  /**
   * Delete a message (only by sender)
   */
  async deleteMessage(messageId: string, userId: string): Promise<boolean> {
    try {
      ErrorHandler.validateUUID(messageId);
      ErrorHandler.validateUUID(userId);

      // Only allow sender to delete their own messages
      const result = await db
        .delete(messages)
        .where(and(eq(messages.id, messageId), eq(messages.senderId, userId)))
        .returning();

      return result.length > 0;
    } catch (error) {
      throw ErrorHandler.handleDatabaseError(
        error,
        "MessageRepository.deleteMessage"
      );
    }
  }

  /**
   * Clean up expired messages
   */
  async cleanupExpiredMessages(): Promise<number> {
    try {
      const now = new Date();

      const result = await db
        .delete(messages)
        .where(
          and(
            sql`${messages.expiresAt} is not null`,
            lt(messages.expiresAt, now)
          )
        )
        .returning();

      return result.length;
    } catch (error) {
      throw ErrorHandler.handleDatabaseError(
        error,
        "MessageRepository.cleanupExpiredMessages"
      );
    }
  }

  /**
   * Get message statistics
   */
  async getMessageStats(): Promise<{
    total: number;
    todayCount: number;
    activeConversations: number;
    expiredMessages: number;
    averageMessagesPerConversation: number;
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const now = new Date();

      const [
        totalResult,
        todayResult,
        activeConversationsResult,
        expiredResult,
        avgResult,
      ] = await Promise.all([
        // Total messages
        db.select({ count: sql`count(*)` }).from(messages),

        // Today's messages
        db
          .select({ count: sql`count(*)` })
          .from(messages)
          .where(sql`${messages.createdAt} >= ${today.toISOString()}`),

        // Active conversations (unique sender-receiver pairs with non-expired messages)
        db
          .select({
            count: sql`count(distinct concat(least(${messages.senderId}, ${messages.receiverId}), ':', greatest(${messages.senderId}, ${messages.receiverId})))`,
          })
          .from(messages)
          .where(
            or(sql`${messages.expiresAt} is null`, gt(messages.expiresAt, now))
          ),

        // Expired messages
        db
          .select({ count: sql`count(*)` })
          .from(messages)
          .where(
            and(
              sql`${messages.expiresAt} is not null`,
              lt(messages.expiresAt, now)
            )
          ),

        // Average messages per conversation
        db.select({ avg: sql`avg(message_count)` }).from(
          db
            .select({ message_count: sql`count(*)` })
            .from(messages)
            .groupBy(
              sql`concat(least(${messages.senderId}, ${messages.receiverId}), ':', greatest(${messages.senderId}, ${messages.receiverId}))`
            )
            .as("conversation_counts")
        ),
      ]);

      return {
        total: Number(totalResult[0]?.count || 0),
        todayCount: Number(todayResult[0]?.count || 0),
        activeConversations: Number(activeConversationsResult[0]?.count || 0),
        expiredMessages: Number(expiredResult[0]?.count || 0),
        averageMessagesPerConversation: Number(avgResult[0]?.avg || 0),
      };
    } catch (error) {
      throw ErrorHandler.handleDatabaseError(
        error,
        "MessageRepository.getMessageStats"
      );
    }
  }

  /**
   * Check if user is part of the message (sender or receiver)
   */
  async isParticipant(messageId: string, userId: string): Promise<boolean> {
    try {
      ErrorHandler.validateUUID(messageId);
      ErrorHandler.validateUUID(userId);

      const result = await db
        .select({ id: messages.id })
        .from(messages)
        .where(
          and(
            eq(messages.id, messageId),
            or(eq(messages.senderId, userId), eq(messages.receiverId, userId))
          )
        )
        .limit(1);

      return result.length > 0;
    } catch (error) {
      throw ErrorHandler.handleDatabaseError(
        error,
        "MessageRepository.isParticipant"
      );
    }
  }

  /**
   * Mark messages as read (for future implementation of read receipts)
   */
  async markConversationAsRead(
    userId: string,
    otherUserId: string
  ): Promise<number> {
    try {
      ErrorHandler.validateUUID(userId);
      ErrorHandler.validateUUID(otherUserId);

      // For now, this is a placeholder since we don't have a read status field
      // In the future, you might add a 'readAt' field to the messages table
      // and update messages from otherUserId to userId as read

      const unreadMessages = await db
        .select({ count: sql`count(*)` })
        .from(messages)
        .where(
          and(
            eq(messages.senderId, otherUserId),
            eq(messages.receiverId, userId),
            or(
              sql`${messages.expiresAt} is null`,
              gt(messages.expiresAt, new Date())
            )
          )
        );

      return Number(unreadMessages[0]?.count || 0);
    } catch (error) {
      throw ErrorHandler.handleDatabaseError(
        error,
        "MessageRepository.markConversationAsRead"
      );
    }
  }

  /**
   * Get unread message count for a user
   */
  async getUnreadMessageCount(userId: string): Promise<number> {
    try {
      ErrorHandler.validateUUID(userId);

      const result = await db
        .select({ count: sql`count(*)` })
        .from(messages)
        .where(
          and(
            eq(messages.receiverId, userId),
            or(
              sql`${messages.expiresAt} is null`,
              gt(messages.expiresAt, new Date())
            )
          )
        );

      return Number(result[0]?.count || 0);
    } catch (error) {
      throw ErrorHandler.handleDatabaseError(
        error,
        "MessageRepository.getUnreadMessageCount"
      );
    }
  }
}
