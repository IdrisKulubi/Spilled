/**
 * Messaging utilities for TeaKE
 */

import { authUtils } from './auth';
import { supabase } from '../config/supabase';

export interface MessageValidation {
  canMessage: boolean;
  error?: string;
}

export const messagingUtils = {
  // Validate if current user can message another user
  validateCanMessage: async (targetUserId: string): Promise<MessageValidation> => {
    try {
      // Early validation of targetUserId
      if (!targetUserId || targetUserId.trim() === '' || targetUserId === 'undefined' || targetUserId === 'null') {
        return {
          canMessage: false,
          error: 'Invalid recipient ID'
        };
      }
      
      const currentUser = await authUtils.getCurrentUser();
      
      if (!currentUser) {
        return {
          canMessage: false,
          error: 'You must be logged in to send messages'
        };
      }

      // Check if user is verified
      if (currentUser.verification_status !== 'approved') {
        const statusMessage = currentUser.verification_status === 'pending' 
          ? 'Your verification is still pending. Please wait for approval.'
          : currentUser.verification_status === 'rejected'
          ? 'Your verification was rejected. Please re-upload your ID.'
          : 'Please verify your identity by uploading your ID to send messages.';
        
        return {
          canMessage: false,
          error: statusMessage
        };
      }

      // Can't message yourself
      if (targetUserId === currentUser.id) {
        return {
          canMessage: false,
          error: 'You cannot send a message to yourself'
        };
      }

      // Validate target user exists
      const validation = await authUtils.validateUserExists(targetUserId);
      
      if (!validation.exists) {
        return {
          canMessage: false,
          error: validation.error || 'Recipient not found'
        };
      }

      return {
        canMessage: true
      };
    } catch (error) {
      console.error('Error validating messaging permissions:', error);
      return {
        canMessage: false,
        error: 'Failed to validate messaging permissions'
      };
    }
  },

  // Get conversation preview (last message, unread count, etc.)
  getConversationPreview: async (otherUserId: string) => {
    try {
      const currentUser = await authUtils.getCurrentUser();
      if (!currentUser) return null;

      // Get last message between users
      const { data: lastMessage, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching conversation preview:', error);
        return null;
      }

      return {
        lastMessage,
        hasMessages: !!lastMessage
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
      console.error('Error checking if conversation exists:', error);
      return false;
    }
  }
};