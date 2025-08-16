/**
 * Messaging utilities for TeaKE
 */

import { authUtils } from "./auth";
import { db } from '../database/connection';
import { messages } from '../database/schema';
import { and, or, eq, desc } from 'drizzle-orm';

export interface MessageValidation {
  canMessage: boolean;
  error?: string;
}

export const messagingUtils = {
  // Validate if current user can message another user
  validateCanMessage: async (
    targetUserId: string
  ): Promise<MessageValidation> => {
    try {
      // Early validation of targetUserId
      if (
        !targetUserId ||
        targetUserId.trim() === "" ||
        targetUserId === "undefined" ||
        targetUserId === "null"
      ) {
        return {
          canMessage: false,
          error: "Invalid recipient ID",
        };
      }

      const currentUser = await authUtils.getCurrentUser();

      if (!currentUser) {
        return {
          canMessage: false,
          error: "You must be logged in to send messages",
        };
      }

      // Check if user is verified
      if (currentUser.verificationStatus !== "approved") {
        const statusMessage =
          currentUser.verification_status === "pending"
            ? "Your verification is still pending. Please wait for approval."
            : currentUser.verification_status === "rejected"
            ? "Your verification was rejected. Please re-upload your ID."
            : "Please verify your identity by uploading your ID to send messages.";

        return {
          canMessage: false,
          error: statusMessage,
        };
      }

      // Can't message yourself
      if (targetUserId === currentUser.id) {
        return {
          canMessage: false,
          error: "You cannot send a message to yourself",
        };
      }

      // Validate target user exists
      const validation = await authUtils.validateUserExists(targetUserId);

      if (!validation.exists) {
        return {
          canMessage: false,
          error: validation.error || "Recipient not found",
        };
      }

      return {
        canMessage: true,
      };
    } catch (error) {
      console.error("Error validating messaging permissions:", error);
      return {
        canMessage: false,
        error: "Failed to validate messaging permissions",
      };
    }
  },

  // Get conversation preview (last message, unread count, etc.)
  getConversationPreview: async (otherUserId: string) => {
    try {
      const currentUser = await authUtils.getCurrentUser();
      if (!currentUser) return null;

      const lastMessage = await db
        .select()
        .from(messages)
        .where(
          or(
            and(eq(messages.senderId, currentUser.id), eq(messages.receiverId, otherUserId)),
            and(eq(messages.senderId, otherUserId), eq(messages.receiverId, currentUser.id))
          )
        )
        .orderBy(desc(messages.createdAt))
        .limit(1);

      return {
        lastMessage: lastMessage[0],
        hasMessages: lastMessage.length > 0,
      };
    } catch (error) {
      console.error('Error getting conversation preview:', error);
      return null;
    }
  },

  // Check if a conversation exists between two users
  conversationExists: async (otherUserId: string): Promise<boolean> => {
    try {
      const preview = await messagingUtils.getConversationPreview(otherUserId);
      return preview?.hasMessages || false;
    } catch (error) {
      console.error("Error checking if conversation exists:", error);
      return false;
    }
  },
};
