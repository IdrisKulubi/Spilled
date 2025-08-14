/**
 * Send Message Action - TeaKE
 * Handles messaging between users using Drizzle ORM
 */

import { authUtils } from '../utils/auth';
import { MessageRepository } from '../repositories/MessageRepository';
import { UserRepository } from '../repositories/UserRepository';
import { Message } from '../database/schema';

// Initialize repositories
const messageRepository = new MessageRepository();
const userRepository = new UserRepository();

export interface SendMessageData {
  receiverId: string;
  text: string;
}

export interface MessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface ChatHistory {
  messages: Message[];
  otherUser: {
    id: string;
    nickname?: string;
  };
}

export const sendMessage = async (messageData: SendMessageData): Promise<MessageResponse> => {
  try {
    const currentUser = await authUtils.getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: 'You must be logged in to send messages'
      };
    }

    // Check if user is verified
    if (currentUser.verificationStatus !== 'approved') {
      const statusMessage = currentUser.verificationStatus === 'pending' 
        ? 'Your verification is still pending. Please wait for approval.'
        : currentUser.verificationStatus === 'rejected'
        ? 'Your verification was rejected. Please re-upload your ID.'
        : 'Please verify your identity by uploading your ID to send messages.';
      
      return {
        success: false,
        error: statusMessage
      };
    }

    // Validation
    if (!messageData.text.trim()) {
      return {
        success: false,
        error: 'Message text is required'
      };
    }

    if (messageData.receiverId === currentUser.id) {
      return {
        success: false,
        error: 'You cannot send a message to yourself'
      };
    }

    // Check if receiver exists using UserRepository
    const receiverValidation = await authUtils.validateUserExists(messageData.receiverId);
    if (!receiverValidation.exists) {
      return {
        success: false,
        error: receiverValidation.error || 'Recipient not found or account no longer exists'
      };
    }

    // Create message using MessageRepository (expires in 7 days automatically)
    const newMessage = await messageRepository.sendMessage({
      senderId: currentUser.id,
      receiverId: messageData.receiverId,
      text: messageData.text.trim(),
    });

    return {
      success: true,
      messageId: newMessage.id
    };
  } catch (error) {
    console.error('Error sending message:', error);
    
    // Handle validation errors from repository
    if (error instanceof Error && error.message.includes('ValidationError')) {
      return {
        success: false,
        error: error.message
      };
    }
    
    return {
      success: false,
      error: 'Failed to send message. Please try again.'
    };
  }
};

// Fetch chat history between current user and another user
export const fetchChatHistory = async (otherUserId: string): Promise<ChatHistory | null> => {
  try {
    const currentUser = await authUtils.getCurrentUser();
    if (!currentUser) {
      console.error('No authenticated user found');
      return null;
    }

    // Validate other user exists
    const otherUserValidation = await authUtils.validateUserExists(otherUserId);
    if (!otherUserValidation.exists || !otherUserValidation.user) {
      console.error('Other user not found:', otherUserId);
      return null;
    }

    // Fetch messages between the two users using MessageRepository
    const chatHistoryResult = await messageRepository.fetchChatHistory(
      currentUser.id, 
      otherUserId,
      { 
        page: 1, 
        limit: 100, // Get last 100 messages
        includeExpired: false 
      }
    );

    // Transform MessageWithUsers[] to Message[] for compatibility
    const messages: Message[] = chatHistoryResult.data.map(messageWithUsers => ({
      id: messageWithUsers.id,
      senderId: messageWithUsers.senderId,
      receiverId: messageWithUsers.receiverId,
      text: messageWithUsers.text,
      expiresAt: messageWithUsers.expiresAt,
      createdAt: messageWithUsers.createdAt,
    }));

    return {
      messages: messages,
      otherUser: {
        id: otherUserValidation.user.id,
        nickname: otherUserValidation.user.nickname || undefined,
      },
    };
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return null;
  }
};

// Get all conversations for the current user
export const fetchConversations = async (): Promise<Array<{
  otherUser: { id: string; nickname?: string };
  lastMessage: Message;
  unreadCount: number;
}> | null> => {
  try {
    const currentUser = await authUtils.getCurrentUser();
    if (!currentUser) {
      return null;
    }

    // Fetch conversations using MessageRepository
    const conversationsResult = await messageRepository.fetchConversations(
      currentUser.id,
      { page: 1, limit: 50 }
    );

    // Transform ConversationSummary[] to the expected format
    const conversations = conversationsResult.data.map(conversation => ({
      otherUser: {
        id: conversation.otherUser.id,
        nickname: conversation.otherUser.nickname || undefined,
      },
      lastMessage: {
        id: conversation.lastMessage.id,
        senderId: conversation.lastMessage.isFromCurrentUser ? currentUser.id : conversation.otherUserId,
        receiverId: conversation.lastMessage.isFromCurrentUser ? conversation.otherUserId : currentUser.id,
        text: conversation.lastMessage.content,
        expiresAt: null, // Not needed for display
        createdAt: conversation.lastMessage.createdAt,
      } as Message,
      unreadCount: conversation.unreadCount,
    }));

    return conversations;
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return null;
  }
};

// Delete a message (only sender can delete)
export const deleteMessage = async (messageId: string): Promise<MessageResponse> => {
  try {
    const currentUser = await authUtils.getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: 'You must be logged in to delete messages'
      };
    }

    // Delete the message using MessageRepository (it handles ownership validation)
    const deleted = await messageRepository.deleteMessage(messageId, currentUser.id);

    if (!deleted) {
      return {
        success: false,
        error: 'Message not found or you can only delete your own messages'
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting message:', error);
    
    // Handle validation errors from repository
    if (error instanceof Error && error.message.includes('ValidationError')) {
      return {
        success: false,
        error: error.message
      };
    }
    
    return {
      success: false,
      error: 'Failed to delete message. Please try again.'
    };
  }
};