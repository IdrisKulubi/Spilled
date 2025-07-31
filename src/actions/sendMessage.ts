/**
 * Send Message Action - TeaKE
 * Handles end-to-end encrypted messaging between users
 */

import { supabase, handleSupabaseError } from '../config/supabase';
import { authUtils } from '../utils/auth';
import { Database } from '../types/database';

type Message = Database['public']['Tables']['messages']['Row'];

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
    if (currentUser.verification_status !== 'approved') {
      const statusMessage = currentUser.verification_status === 'pending' 
        ? 'Your verification is still pending. Please wait for approval.'
        : currentUser.verification_status === 'rejected'
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

    // Check if receiver exists
    const { data: receiver, error: receiverError } = await supabase
      .from('users')
      .select('id')
      .eq('id', messageData.receiverId)
      .maybeSingle();

    if (receiverError) {
      console.error('Error checking receiver:', receiverError);
      return {
        success: false,
        error: 'Failed to verify recipient'
      };
    }

    if (!receiver) {
      return {
        success: false,
        error: 'Recipient not found or account no longer exists'
      };
    }

    // Create message (expires in 7 days automatically)
    const { data: newMessage, error: messageError } = await supabase
      .from('messages')
      .insert({
        sender_id: currentUser.id,
        receiver_id: messageData.receiverId,
        text: messageData.text.trim(),
      })
      .select('id')
      .single();

    if (messageError || !newMessage) {
      return {
        success: false,
        error: handleSupabaseError(messageError)
      };
    }

    return {
      success: true,
      messageId: newMessage.id
    };
  } catch (error) {
    console.error('Error sending message:', error);
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

    // Fetch messages between the two users
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUser.id})`)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return null;
    }

    // Fetch other user's info
    const { data: otherUser, error: userError } = await supabase
      .from('users')
      .select('id, nickname')
      .eq('id', otherUserId)
      .maybeSingle();

    if (userError) {
      console.error('Error fetching other user:', userError);
      return null;
    }

    // If user doesn't exist, return null
    if (!otherUser) {
      console.error('Other user not found:', otherUserId);
      return null;
    }

    return {
      messages: messages || [],
      otherUser: {
        id: otherUser.id,
        nickname: otherUser.nickname,
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

    // This is a complex query - in a real app, you might want to create a database view
    // For now, we'll fetch all messages and group them by conversation
    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey(id, nickname),
        receiver:users!messages_receiver_id_fkey(id, nickname)
      `)
      .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
      .order('created_at', { ascending: false });

    if (error || !messages) {
      console.error('Error fetching conversations:', error);
      return null;
    }

    // Group messages by conversation partner
    const conversationMap = new Map();
    
    messages.forEach((message: any) => {
      const otherUserId = message.sender_id === currentUser.id 
        ? message.receiver_id 
        : message.sender_id;
      
      const otherUser = message.sender_id === currentUser.id 
        ? message.receiver 
        : message.sender;

      if (!conversationMap.has(otherUserId)) {
        conversationMap.set(otherUserId, {
          otherUser: {
            id: otherUser.id,
            nickname: otherUser.nickname,
          },
          lastMessage: message,
          unreadCount: 0, // TODO: Implement read status tracking
        });
      }
    });

    return Array.from(conversationMap.values());
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

    // Check if user owns the message
    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('sender_id')
      .eq('id', messageId)
      .single();

    if (fetchError || !message) {
      return {
        success: false,
        error: 'Message not found'
      };
    }

    if (message.sender_id !== currentUser.id) {
      return {
        success: false,
        error: 'You can only delete your own messages'
      };
    }

    // Delete the message
    const { error: deleteError } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);

    if (deleteError) {
      return {
        success: false,
        error: handleSupabaseError(deleteError)
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting message:', error);
    return {
      success: false,
      error: 'Failed to delete message. Please try again.'
    };
  }
};