/**
 * Notification Manager
 * Handles push notifications, local notifications, and notification preferences
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import { cacheManager } from './caching';

export interface NotificationPreferences {
  pushEnabled: boolean;
  messageNotifications: boolean;
  storyNotifications: boolean;
  commentNotifications: boolean;
  likeNotifications: boolean;
  verificationNotifications: boolean;
  systemNotifications: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // HH:MM format
  quietHoursEnd: string; // HH:MM format
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export interface NotificationData {
  id: string;
  type: 'message' | 'story_like' | 'comment' | 'verification' | 'system';
  title: string;
  body: string;
  data?: any;
  userId: string;
  read: boolean;
  createdAt: string;
}

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const preferences = await notificationManager.getPreferences();
    
    // Check if notifications are enabled
    if (!preferences.pushEnabled) {
      return {
        shouldShowAlert: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
      };
    }

    // Check quiet hours
    if (preferences.quietHoursEnabled && notificationManager.isQuietHours(preferences)) {
      return {
        shouldShowAlert: false,
        shouldPlaySound: false,
        shouldSetBadge: true,
      };
    }

    // Check notification type preferences
    const notificationType = notification.request.content.data?.type;
    const shouldShow = notificationManager.shouldShowNotification(notificationType, preferences);

    return {
      shouldShowAlert: shouldShow,
      shouldPlaySound: shouldShow && preferences.soundEnabled,
      shouldSetBadge: shouldShow,
    };
  },
});

class NotificationManager {
  private expoPushToken: string | null = null;
  private notificationListener: any = null;
  private responseListener: any = null;
  private preferences: NotificationPreferences | null = null;

  constructor() {
    this.initializeNotifications();
  }

  /**
   * Initialize notification system
   */
  async initializeNotifications(): Promise<void> {
    try {
      console.log('[Notifications] Initializing notification system...');

      // Load preferences
      await this.loadPreferences();

      // Register for push notifications
      await this.registerForPushNotifications();

      // Set up notification listeners
      this.setupNotificationListeners();

      console.log('[Notifications] Notification system initialized');
    } catch (error) {
      console.error('[Notifications] Failed to initialize notifications:', error);
    }
  }

  /**
   * Register for push notifications
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        console.warn('[Notifications] Push notifications only work on physical devices');
        return null;
      }

      // Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permissions if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('[Notifications] Push notification permissions not granted');
        return null;
      }

      // Get push token
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: 'your-expo-project-id', // Replace with your actual project ID
      });

      this.expoPushToken = token.data;
      console.log('[Notifications] Push token obtained:', this.expoPushToken);

      // Save token to database
      await this.savePushTokenToDatabase(this.expoPushToken);

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await this.setupAndroidChannels();
      }

      return this.expoPushToken;
    } catch (error) {
      console.error('[Notifications] Error registering for push notifications:', error);
      return null;
    }
  }

  /**
   * Setup Android notification channels
   */
  private async setupAndroidChannels(): Promise<void> {
    try {
      // Messages channel
      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Messages',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });

      // Stories channel
      await Notifications.setNotificationChannelAsync('stories', {
        name: 'Stories & Interactions',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });

      // System channel
      await Notifications.setNotificationChannelAsync('system', {
        name: 'System Notifications',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
        showBadge: false,
      });

      console.log('[Notifications] Android channels configured');
    } catch (error) {
      console.error('[Notifications] Error setting up Android channels:', error);
    }
  }

  /**
   * Setup notification listeners
   */
  private setupNotificationListeners(): void {
    // Listener for notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('[Notifications] Notification received:', notification);
        this.handleNotificationReceived(notification);
      }
    );

    // Listener for when user taps on notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('[Notifications] Notification response:', response);
        this.handleNotificationResponse(response);
      }
    );
  }

  /**
   * Handle notification received while app is active
   */
  private async handleNotificationReceived(notification: Notifications.Notification): Promise<void> {
    try {
      const notificationData = notification.request.content.data as any;
      
      // Cache the notification
      await cacheManager.set(
        `notification_${notification.request.identifier}`,
        {
          id: notification.request.identifier,
          title: notification.request.content.title,
          body: notification.request.content.body,
          data: notificationData,
          createdAt: new Date().toISOString(),
          read: false
        },
        'notifications',
        24 * 60 * 60 * 1000 // 24 hours
      );

      // Update badge count
      await this.updateBadgeCount();
    } catch (error) {
      console.error('[Notifications] Error handling received notification:', error);
    }
  }

  /**
   * Handle notification tap response
   */
  private async handleNotificationResponse(response: Notifications.NotificationResponse): Promise<void> {
    try {
      const notificationData = response.notification.request.content.data as any;
      
      // Mark notification as read
      await this.markNotificationAsRead(response.notification.request.identifier);

      // Handle different notification types
      switch (notificationData?.type) {
        case 'message':
          // Navigate to chat screen
          console.log('[Notifications] Opening chat for user:', notificationData.senderId);
          break;
        
        case 'story_like':
        case 'comment':
          // Navigate to story
          console.log('[Notifications] Opening story:', notificationData.storyId);
          break;
        
        case 'verification':
          // Navigate to verification screen
          console.log('[Notifications] Opening verification screen');
          break;
        
        default:
          console.log('[Notifications] Unknown notification type:', notificationData?.type);
      }
    } catch (error) {
      console.error('[Notifications] Error handling notification response:', error);
    }
  }

  /**
   * Send local notification
   */
  async sendLocalNotification(
    title: string,
    body: string,
    data?: any,
    channelId: string = 'default'
  ): Promise<string> {
    try {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
        },
        trigger: null, // Send immediately
      });

      console.log('[Notifications] Local notification sent:', identifier);
      return identifier;
    } catch (error) {
      console.error('[Notifications] Error sending local notification:', error);
      throw error;
    }
  }

  /**
   * Schedule notification for later
   */
  async scheduleNotification(
    title: string,
    body: string,
    trigger: Date | number,
    data?: any,
    channelId: string = 'default'
  ): Promise<string> {
    try {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
        },
        trigger: trigger instanceof Date ? trigger : { seconds: trigger },
      });

      console.log('[Notifications] Notification scheduled:', identifier);
      return identifier;
    } catch (error) {
      console.error('[Notifications] Error scheduling notification:', error);
      throw error;
    }
  }

  /**
   * Cancel scheduled notification
   */
  async cancelNotification(identifier: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
      console.log('[Notifications] Notification cancelled:', identifier);
    } catch (error) {
      console.error('[Notifications] Error cancelling notification:', error);
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('[Notifications] All notifications cancelled');
    } catch (error) {
      console.error('[Notifications] Error cancelling all notifications:', error);
    }
  }

  /**
   * Get notification preferences
   */
  async getPreferences(): Promise<NotificationPreferences> {
    if (this.preferences) {
      return this.preferences;
    }

    try {
      const stored = await AsyncStorage.getItem('notification_preferences');
      if (stored) {
        this.preferences = JSON.parse(stored);
      } else {
        // Default preferences
        this.preferences = {
          pushEnabled: true,
          messageNotifications: true,
          storyNotifications: true,
          commentNotifications: true,
          likeNotifications: true,
          verificationNotifications: true,
          systemNotifications: true,
          quietHoursEnabled: false,
          quietHoursStart: '22:00',
          quietHoursEnd: '08:00',
          soundEnabled: true,
          vibrationEnabled: true,
        };
        await this.savePreferences(this.preferences);
      }

      return this.preferences;
    } catch (error) {
      console.error('[Notifications] Error loading preferences:', error);
      // Return default preferences on error
      return {
        pushEnabled: true,
        messageNotifications: true,
        storyNotifications: true,
        commentNotifications: true,
        likeNotifications: true,
        verificationNotifications: true,
        systemNotifications: true,
        quietHoursEnabled: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        soundEnabled: true,
        vibrationEnabled: true,
      };
    }
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(updates: Partial<NotificationPreferences>): Promise<void> {
    try {
      const currentPreferences = await this.getPreferences();
      const newPreferences = { ...currentPreferences, ...updates };
      
      await this.savePreferences(newPreferences);
      this.preferences = newPreferences;

      console.log('[Notifications] Preferences updated:', updates);
    } catch (error) {
      console.error('[Notifications] Error updating preferences:', error);
      throw error;
    }
  }

  /**
   * Save preferences to storage
   */
  private async savePreferences(preferences: NotificationPreferences): Promise<void> {
    try {
      await AsyncStorage.setItem('notification_preferences', JSON.stringify(preferences));
    } catch (error) {
      console.error('[Notifications] Error saving preferences:', error);
      throw error;
    }
  }

  /**
   * Load preferences from storage
   */
  private async loadPreferences(): Promise<void> {
    await this.getPreferences(); // This will load and cache preferences
  }

  /**
   * Check if current time is within quiet hours
   */
  isQuietHours(preferences: NotificationPreferences): boolean {
    if (!preferences.quietHoursEnabled) {
      return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = preferences.quietHoursStart.split(':').map(Number);
    const [endHour, endMin] = preferences.quietHoursEnd.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      return currentTime >= startTime && currentTime <= endTime;
    }
  }

  /**
   * Check if notification should be shown based on type and preferences
   */
  shouldShowNotification(type: string, preferences: NotificationPreferences): boolean {
    switch (type) {
      case 'message':
        return preferences.messageNotifications;
      case 'story_like':
        return preferences.likeNotifications;
      case 'comment':
        return preferences.commentNotifications;
      case 'story':
        return preferences.storyNotifications;
      case 'verification':
        return preferences.verificationNotifications;
      case 'system':
        return preferences.systemNotifications;
      default:
        return true;
    }
  }

  /**
   * Save push token to database
   */
  private async savePushTokenToDatabase(token: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('[Notifications] No user found, cannot save push token');
        return;
      }

      const { error } = await supabase
        .from('user_push_tokens')
        .upsert({
          user_id: user.id,
          push_token: token,
          platform: Platform.OS,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('[Notifications] Error saving push token:', error);
      } else {
        console.log('[Notifications] Push token saved to database');
      }
    } catch (error) {
      console.error('[Notifications] Error saving push token to database:', error);
    }
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      // Update in cache
      const cached = await cacheManager.get(`notification_${notificationId}`, 'notifications');
      if (cached) {
        cached.read = true;
        await cacheManager.set(`notification_${notificationId}`, cached, 'notifications');
      }

      // Update in database
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) {
        console.error('[Notifications] Error marking notification as read:', error);
      }

      // Update badge count
      await this.updateBadgeCount();
    } catch (error) {
      console.error('[Notifications] Error marking notification as read:', error);
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) {
        console.error('[Notifications] Error getting unread count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('[Notifications] Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Update app badge count
   */
  async updateBadgeCount(): Promise<void> {
    try {
      const unreadCount = await this.getUnreadCount();
      await Notifications.setBadgeCountAsync(unreadCount);
      console.log('[Notifications] Badge count updated:', unreadCount);
    } catch (error) {
      console.error('[Notifications] Error updating badge count:', error);
    }
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications(): Promise<void> {
    try {
      await Notifications.dismissAllNotificationsAsync();
      await Notifications.setBadgeCountAsync(0);
      console.log('[Notifications] All notifications cleared');
    } catch (error) {
      console.error('[Notifications] Error clearing notifications:', error);
    }
  }

  /**
   * Get notification history
   */
  async getNotificationHistory(limit: number = 50, offset: number = 0): Promise<NotificationData[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const cacheKey = `notification_history_${user.id}_${limit}_${offset}`;
      
      return await cacheManager.getOrSet(
        cacheKey,
        async () => {
          const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(limit)
            .range(offset, offset + limit - 1);

          if (error) throw error;
          return data || [];
        },
        'notifications',
        5 * 60 * 1000 // 5 minutes cache
      );
    } catch (error) {
      console.error('[Notifications] Error getting notification history:', error);
      return [];
    }
  }

  /**
   * Test notification (for debugging)
   */
  async testNotification(): Promise<void> {
    try {
      await this.sendLocalNotification(
        'Test Notification',
        'This is a test notification from TeaKE',
        { type: 'test', timestamp: new Date().toISOString() }
      );
    } catch (error) {
      console.error('[Notifications] Error sending test notification:', error);
    }
  }

  /**
   * Get push token
   */
  getPushToken(): string | null {
    return this.expoPushToken;
  }

  /**
   * Cleanup notification manager
   */
  cleanup(): void {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
      this.notificationListener = null;
    }

    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
      this.responseListener = null;
    }

    console.log('[Notifications] Notification manager cleaned up');
  }

  /**
   * Get notification statistics
   */
  getStats(): {
    pushToken: string | null;
    hasPermissions: boolean;
    unreadCount: number;
  } {
    return {
      pushToken: this.expoPushToken,
      hasPermissions: this.expoPushToken !== null,
      unreadCount: 0 // This would be updated by updateBadgeCount
    };
  }
}

// Create singleton instance
export const notificationManager = new NotificationManager();

export default notificationManager;