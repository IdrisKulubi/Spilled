/**
 * Real-time Communication Manager
 * Handles WebSocket connections, message encryption, and real-time updates
 */

import { RealtimeChannel, RealtimeClient } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';
import { cacheManager } from './caching';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RealTimeMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  messageType: 'text' | 'image' | 'system';
  timestamp: string;
  isEncrypted: boolean;
  readAt?: string;
  editedAt?: string;
}

export interface RealTimeNotification {
  id: string;
  userId: string;
  type: 'message' | 'story_like' | 'comment' | 'verification' | 'system';
  title: string;
  body: string;
  data?: any;
  timestamp: string;
  read: boolean;
}

export interface ConnectionStatus {
  isConnected: boolean;
  lastConnected?: string;
  reconnectAttempts: number;
  latency?: number;
}

class RealTimeManager {
  private channels: Map<string, RealtimeChannel> = new Map();
  private messageHandlers: Map<string, (message: RealTimeMessage) => void> = new Map();
  private notificationHandlers: Map<string, (notification: RealTimeNotification) => void> = new Map();
  private connectionStatus: ConnectionStatus = {
    isConnected: false,
    reconnectAttempts: 0
  };
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second

  constructor() {
    this.setupConnectionMonitoring();
  }

  /**
   * Initialize real-time connections for a user
   */
  async initialize(userId: string): Promise<void> {
    try {
      console.log('[RealTime] Initializing real-time manager for user:', userId);
      
      // Subscribe to user's private channel for messages
      await this.subscribeToMessages(userId);
      
      // Subscribe to notifications
      await this.subscribeToNotifications(userId);
      
      // Subscribe to story updates
      await this.subscribeToStoryUpdates();
      
      // Start heartbeat
      this.startHeartbeat();
      
      console.log('[RealTime] Real-time manager initialized successfully');
    } catch (error) {
      console.error('[RealTime] Failed to initialize real-time manager:', error);
      throw error;
    }
  }

  /**
   * Subscribe to private messages
   */
  private async subscribeToMessages(userId: string): Promise<void> {
    const channelName = `messages:${userId}`;
    
    if (this.channels.has(channelName)) {
      console.log('[RealTime] Already subscribed to messages channel');
      return;
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${userId}`
        },
        async (payload) => {
          console.log('[RealTime] New message received:', payload.new);
          await this.handleNewMessage(payload.new as RealTimeMessage);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${userId}`
        },
        async (payload) => {
          console.log('[RealTime] Message updated:', payload.new);
          await this.handleMessageUpdate(payload.new as RealTimeMessage);
        }
      )
      .subscribe((status) => {
        console.log('[RealTime] Messages subscription status:', status);
        this.updateConnectionStatus(status === 'SUBSCRIBED');
      });

    this.channels.set(channelName, channel);
  }

  /**
   * Subscribe to notifications
   */
  private async subscribeToNotifications(userId: string): Promise<void> {
    const channelName = `notifications:${userId}`;
    
    if (this.channels.has(channelName)) {
      console.log('[RealTime] Already subscribed to notifications channel');
      return;
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        async (payload) => {
          console.log('[RealTime] New notification received:', payload.new);
          await this.handleNewNotification(payload.new as RealTimeNotification);
        }
      )
      .subscribe((status) => {
        console.log('[RealTime] Notifications subscription status:', status);
      });

    this.channels.set(channelName, channel);
  }

  /**
   * Subscribe to story updates (likes, comments)
   */
  private async subscribeToStoryUpdates(): Promise<void> {
    const channelName = 'story_updates';
    
    if (this.channels.has(channelName)) {
      console.log('[RealTime] Already subscribed to story updates channel');
      return;
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'story_likes'
        },
        async (payload) => {
          console.log('[RealTime] New story like:', payload.new);
          await this.handleStoryLike(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'story_comments'
        },
        async (payload) => {
          console.log('[RealTime] New story comment:', payload.new);
          await this.handleStoryComment(payload.new);
        }
      )
      .subscribe((status) => {
        console.log('[RealTime] Story updates subscription status:', status);
      });

    this.channels.set(channelName, channel);
  }

  /**
   * Send encrypted message
   */
  async sendMessage(
    receiverId: string,
    content: string,
    messageType: 'text' | 'image' = 'text'
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      console.log('[RealTime] Sending message to:', receiverId);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Encrypt message content
      const encryptedContent = await this.encryptMessage(content);

      // Insert message into database
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          content: encryptedContent,
          message_type: messageType,
          is_encrypted: true,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('[RealTime] Error sending message:', error);
        return { success: false, error: error.message };
      }

      console.log('[RealTime] Message sent successfully:', data.id);
      
      // Cache the message locally
      await cacheManager.set(
        `message_${data.id}`,
        data,
        'messages',
        5 * 60 * 1000 // 5 minutes
      );

      return { success: true, messageId: data.id };
    } catch (error) {
      console.error('[RealTime] Error sending message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send message'
      };
    }
  }

  /**
   * Mark message as read
   */
  async markMessageAsRead(messageId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('id', messageId);

      if (error) {
        console.error('[RealTime] Error marking message as read:', error);
        return;
      }

      console.log('[RealTime] Message marked as read:', messageId);
    } catch (error) {
      console.error('[RealTime] Error marking message as read:', error);
    }
  }

  /**
   * Get conversation history with caching
   */
  async getConversationHistory(
    otherUserId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<RealTimeMessage[]> {
    try {
      const cacheKey = `conversation_${otherUserId}_${limit}_${offset}`;
      
      return await cacheManager.getOrSet(
        cacheKey,
        async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('User not authenticated');

          const { data, error } = await supabase
            .from('messages')
            .select('*')
            .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
            .order('created_at', { ascending: false })
            .limit(limit)
            .range(offset, offset + limit - 1);

          if (error) throw error;

          // Decrypt messages
          const decryptedMessages = await Promise.all(
            data.map(async (msg) => ({
              ...msg,
              content: msg.is_encrypted ? await this.decryptMessage(msg.content) : msg.content
            }))
          );

          return decryptedMessages.reverse(); // Return in chronological order
        },
        'messages',
        2 * 60 * 1000 // 2 minutes cache
      );
    } catch (error) {
      console.error('[RealTime] Error getting conversation history:', error);
      return [];
    }
  }

  /**
   * Register message handler
   */
  onMessage(handlerId: string, handler: (message: RealTimeMessage) => void): void {
    this.messageHandlers.set(handlerId, handler);
    console.log('[RealTime] Message handler registered:', handlerId);
  }

  /**
   * Register notification handler
   */
  onNotification(handlerId: string, handler: (notification: RealTimeNotification) => void): void {
    this.notificationHandlers.set(handlerId, handler);
    console.log('[RealTime] Notification handler registered:', handlerId);
  }

  /**
   * Remove handlers
   */
  removeHandler(handlerId: string): void {
    this.messageHandlers.delete(handlerId);
    this.notificationHandlers.delete(handlerId);
    console.log('[RealTime] Handler removed:', handlerId);
  }

  /**
   * Handle new message
   */
  private async handleNewMessage(message: RealTimeMessage): Promise<void> {
    try {
      // Decrypt message if encrypted
      if (message.isEncrypted) {
        message.content = await this.decryptMessage(message.content);
      }

      // Cache the message
      await cacheManager.set(`message_${message.id}`, message, 'messages');

      // Notify all handlers
      this.messageHandlers.forEach((handler) => {
        try {
          handler(message);
        } catch (error) {
          console.error('[RealTime] Error in message handler:', error);
        }
      });

      // Show local notification if app is in background
      await this.showLocalNotification({
        title: 'New Message',
        body: message.messageType === 'text' ? message.content : 'Image message',
        data: { messageId: message.id, senderId: message.senderId }
      });
    } catch (error) {
      console.error('[RealTime] Error handling new message:', error);
    }
  }

  /**
   * Handle message update
   */
  private async handleMessageUpdate(message: RealTimeMessage): Promise<void> {
    try {
      // Update cache
      await cacheManager.set(`message_${message.id}`, message, 'messages');

      // Notify handlers about the update
      this.messageHandlers.forEach((handler) => {
        try {
          handler(message);
        } catch (error) {
          console.error('[RealTime] Error in message update handler:', error);
        }
      });
    } catch (error) {
      console.error('[RealTime] Error handling message update:', error);
    }
  }

  /**
   * Handle new notification
   */
  private async handleNewNotification(notification: RealTimeNotification): Promise<void> {
    try {
      // Cache the notification
      await cacheManager.set(`notification_${notification.id}`, notification, 'notifications');

      // Notify all handlers
      this.notificationHandlers.forEach((handler) => {
        try {
          handler(notification);
        } catch (error) {
          console.error('[RealTime] Error in notification handler:', error);
        }
      });

      // Show local notification
      await this.showLocalNotification({
        title: notification.title,
        body: notification.body,
        data: notification.data
      });
    } catch (error) {
      console.error('[RealTime] Error handling new notification:', error);
    }
  }

  /**
   * Handle story like
   */
  private async handleStoryLike(likeData: any): Promise<void> {
    try {
      // Invalidate story cache
      await cacheManager.remove(`story_${likeData.story_id}`, 'stories');
      
      // Update story stats in cache if available
      const cachedStory = await cacheManager.get(`story_${likeData.story_id}`, 'stories');
      if (cachedStory) {
        cachedStory.like_count = (cachedStory.like_count || 0) + 1;
        await cacheManager.set(`story_${likeData.story_id}`, cachedStory, 'stories');
      }
    } catch (error) {
      console.error('[RealTime] Error handling story like:', error);
    }
  }

  /**
   * Handle story comment
   */
  private async handleStoryComment(commentData: any): Promise<void> {
    try {
      // Invalidate story cache
      await cacheManager.remove(`story_${commentData.story_id}`, 'stories');
      
      // Update story stats in cache if available
      const cachedStory = await cacheManager.get(`story_${commentData.story_id}`, 'stories');
      if (cachedStory) {
        cachedStory.comment_count = (cachedStory.comment_count || 0) + 1;
        await cacheManager.set(`story_${commentData.story_id}`, cachedStory, 'stories');
      }
    } catch (error) {
      console.error('[RealTime] Error handling story comment:', error);
    }
  }

  /**
   * Encrypt message content
   */
  private async encryptMessage(content: string): Promise<string> {
    try {
      // Simple base64 encoding for now - in production, use proper encryption
      // You should implement AES encryption here
      return btoa(unescape(encodeURIComponent(content)));
    } catch (error) {
      console.error('[RealTime] Error encrypting message:', error);
      return content; // Return original if encryption fails
    }
  }

  /**
   * Decrypt message content
   */
  private async decryptMessage(encryptedContent: string): Promise<string> {
    try {
      // Simple base64 decoding for now - in production, use proper decryption
      return decodeURIComponent(escape(atob(encryptedContent)));
    } catch (error) {
      console.error('[RealTime] Error decrypting message:', error);
      return encryptedContent; // Return encrypted if decryption fails
    }
  }

  /**
   * Show local notification
   */
  private async showLocalNotification(notification: {
    title: string;
    body: string;
    data?: any;
  }): Promise<void> {
    try {
      // This would integrate with Expo Notifications
      // For now, just log the notification
      console.log('[RealTime] Local notification:', notification);
      
      // Store notification for later display
      await AsyncStorage.setItem(
        `local_notification_${Date.now()}`,
        JSON.stringify(notification)
      );
    } catch (error) {
      console.error('[RealTime] Error showing local notification:', error);
    }
  }

  /**
   * Setup connection monitoring
   */
  private setupConnectionMonitoring(): void {
    // Monitor Supabase connection status
    supabase.auth.onAuthStateChange((event, session) => {
      console.log('[RealTime] Auth state changed:', event);
      
      if (event === 'SIGNED_OUT') {
        this.disconnect();
      } else if (event === 'SIGNED_IN' && session?.user) {
        this.handleReconnection();
      }
    });
  }

  /**
   * Start heartbeat to monitor connection
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(async () => {
      try {
        const startTime = Date.now();
        
        // Simple ping to check connection
        const { error } = await supabase.from('users').select('id').limit(1);
        
        if (error) {
          console.warn('[RealTime] Heartbeat failed:', error);
          this.handleConnectionLoss();
        } else {
          const latency = Date.now() - startTime;
          this.connectionStatus.latency = latency;
          this.connectionStatus.isConnected = true;
          this.connectionStatus.lastConnected = new Date().toISOString();
          
          // Reset reconnect attempts on successful heartbeat
          this.connectionStatus.reconnectAttempts = 0;
        }
      } catch (error) {
        console.error('[RealTime] Heartbeat error:', error);
        this.handleConnectionLoss();
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Handle connection loss
   */
  private handleConnectionLoss(): void {
    this.connectionStatus.isConnected = false;
    
    if (this.connectionStatus.reconnectAttempts < this.maxReconnectAttempts) {
      this.scheduleReconnection();
    } else {
      console.error('[RealTime] Max reconnection attempts reached');
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnection(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    const delay = this.reconnectDelay * Math.pow(2, this.connectionStatus.reconnectAttempts);
    
    this.reconnectTimeout = setTimeout(() => {
      this.handleReconnection();
    }, delay);

    console.log(`[RealTime] Reconnection scheduled in ${delay}ms (attempt ${this.connectionStatus.reconnectAttempts + 1})`);
  }

  /**
   * Handle reconnection
   */
  private async handleReconnection(): Promise<void> {
    try {
      this.connectionStatus.reconnectAttempts++;
      
      console.log('[RealTime] Attempting to reconnect...');
      
      // Resubscribe to all channels
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await this.initialize(user.id);
        console.log('[RealTime] Reconnection successful');
      }
    } catch (error) {
      console.error('[RealTime] Reconnection failed:', error);
      this.handleConnectionLoss();
    }
  }

  /**
   * Update connection status
   */
  private updateConnectionStatus(isConnected: boolean): void {
    this.connectionStatus.isConnected = isConnected;
    if (isConnected) {
      this.connectionStatus.lastConnected = new Date().toISOString();
      this.connectionStatus.reconnectAttempts = 0;
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  /**
   * Disconnect all channels
   */
  async disconnect(): Promise<void> {
    try {
      console.log('[RealTime] Disconnecting all channels...');
      
      // Unsubscribe from all channels
      for (const [channelName, channel] of this.channels) {
        await supabase.removeChannel(channel);
        console.log(`[RealTime] Unsubscribed from channel: ${channelName}`);
      }
      
      this.channels.clear();
      this.messageHandlers.clear();
      this.notificationHandlers.clear();
      
      // Clear intervals
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
      
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }
      
      this.connectionStatus.isConnected = false;
      
      console.log('[RealTime] Disconnected successfully');
    } catch (error) {
      console.error('[RealTime] Error during disconnect:', error);
    }
  }

  /**
   * Get real-time statistics
   */
  getStats(): {
    activeChannels: number;
    messageHandlers: number;
    notificationHandlers: number;
    connectionStatus: ConnectionStatus;
  } {
    return {
      activeChannels: this.channels.size,
      messageHandlers: this.messageHandlers.size,
      notificationHandlers: this.notificationHandlers.size,
      connectionStatus: this.getConnectionStatus()
    };
  }
}

// Create singleton instance
export const realTimeManager = new RealTimeManager();

export default realTimeManager;