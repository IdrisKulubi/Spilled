/**
 * Analytics Manager
 * Privacy-compliant analytics and monitoring system
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import { cacheManager } from './caching';

export interface AnalyticsEvent {
  id?: string;
  eventName: string;
  eventType: 'user_action' | 'system_event' | 'performance' | 'error';
  properties: Record<string, any>;
  userId?: string;
  sessionId: string;
  timestamp: string;
  appVersion: string;
  platform: string;
}

export interface PerformanceMetric {
  id?: string;
  metricName: string;
  value: number;
  unit: string;
  context: Record<string, any>;
  timestamp: string;
  sessionId: string;
}

export interface ErrorEvent {
  id?: string;
  errorType: string;
  errorMessage: string;
  stackTrace?: string;
  context: Record<string, any>;
  userId?: string;
  sessionId: string;
  timestamp: string;
  resolved: boolean;
}

export interface AnalyticsConfig {
  enabled: boolean;
  collectPersonalData: boolean;
  batchSize: number;
  flushInterval: number; // milliseconds
  maxRetries: number;
  debugMode: boolean;
}

class AnalyticsManager {
  private config: AnalyticsConfig;
  private sessionId: string;
  private eventQueue: AnalyticsEvent[] = [];
  private performanceQueue: PerformanceMetric[] = [];
  private errorQueue: ErrorEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private appVersion: string = '1.0.0';
  private platform: string = 'mobile';

  constructor() {
    this.config = {
      enabled: true,
      collectPersonalData: false, // GDPR compliant by default
      batchSize: 20,
      flushInterval: 30000, // 30 seconds
      maxRetries: 3,
      debugMode: __DEV__
    };
    
    this.sessionId = this.generateSessionId();
    this.initialize();
  }

  /**
   * Initialize analytics system
   */
  async initialize(): Promise<void> {
    try {
      console.log('[Analytics] Initializing analytics manager...');

      // Load configuration
      await this.loadConfig();

      // Load app version and platform info
      await this.loadAppInfo();

      // Start flush timer if enabled
      if (this.config.enabled) {
        this.startFlushTimer();
      }

      // Track session start
      await this.trackEvent('session_start', 'system_event', {
        session_id: this.sessionId,
        app_version: this.appVersion,
        platform: this.platform
      });

      this.isInitialized = true;
      console.log('[Analytics] Analytics manager initialized');
    } catch (error) {
      console.error('[Analytics] Failed to initialize analytics:', error);
    }
  }

  /**
   * Track user event
   */
  async trackEvent(
    eventName: string,
    eventType: AnalyticsEvent['eventType'] = 'user_action',
    properties: Record<string, any> = {},
    userId?: string
  ): Promise<void> {
    if (!this.config.enabled) return;

    try {
      const event: AnalyticsEvent = {
        eventName,
        eventType,
        properties: this.sanitizeProperties(properties),
        userId: this.config.collectPersonalData ? userId : undefined,
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
        appVersion: this.appVersion,
        platform: this.platform
      };

      this.eventQueue.push(event);

      if (this.config.debugMode) {
        console.log('[Analytics] Event tracked:', eventName, properties);
      }

      // Flush immediately for critical events
      if (eventType === 'error' || this.eventQueue.length >= this.config.batchSize) {
        await this.flush();
      }
    } catch (error) {
      console.error('[Analytics] Error tracking event:', error);
    }
  }

  /**
   * Track performance metric
   */
  async trackPerformance(
    metricName: string,
    value: number,
    unit: string = 'ms',
    context: Record<string, any> = {}
  ): Promise<void> {
    if (!this.config.enabled) return;

    try {
      const metric: PerformanceMetric = {
        metricName,
        value,
        unit,
        context: this.sanitizeProperties(context),
        timestamp: new Date().toISOString(),
        sessionId: this.sessionId
      };

      this.performanceQueue.push(metric);

      if (this.config.debugMode) {
        console.log('[Analytics] Performance tracked:', metricName, value, unit);
      }

      // Flush if queue is full
      if (this.performanceQueue.length >= this.config.batchSize) {
        await this.flush();
      }
    } catch (error) {
      console.error('[Analytics] Error tracking performance:', error);
    }
  }

  /**
   * Track error event
   */
  async trackError(
    errorType: string,
    errorMessage: string,
    stackTrace?: string,
    context: Record<string, any> = {},
    userId?: string
  ): Promise<void> {
    if (!this.config.enabled) return;

    try {
      const errorEvent: ErrorEvent = {
        errorType,
        errorMessage,
        stackTrace,
        context: this.sanitizeProperties(context),
        userId: this.config.collectPersonalData ? userId : undefined,
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
        resolved: false
      };

      this.errorQueue.push(errorEvent);

      if (this.config.debugMode) {
        console.log('[Analytics] Error tracked:', errorType, errorMessage);
      }

      // Flush errors immediately
      await this.flush();
    } catch (error) {
      console.error('[Analytics] Error tracking error:', error);
    }
  }

  /**
   * Track screen view
   */
  async trackScreenView(screenName: string, properties: Record<string, any> = {}): Promise<void> {
    await this.trackEvent('screen_view', 'user_action', {
      screen_name: screenName,
      ...properties
    });
  }

  /**
   * Track user action
   */
  async trackUserAction(
    action: string,
    category: string = 'general',
    properties: Record<string, any> = {}
  ): Promise<void> {
    await this.trackEvent('user_action', 'user_action', {
      action,
      category,
      ...properties
    });
  }

  /**
   * Track app lifecycle events
   */
  async trackAppState(state: 'active' | 'background' | 'inactive'): Promise<void> {
    await this.trackEvent('app_state_change', 'system_event', {
      state,
      previous_state: await this.getPreviousAppState(),
      session_duration: this.getSessionDuration()
    });

    await this.setPreviousAppState(state);
  }

  /**
   * Track timing events
   */
  async trackTiming(
    category: string,
    variable: string,
    value: number,
    label?: string
  ): Promise<void> {
    await this.trackPerformance(`${category}_${variable}`, value, 'ms', {
      category,
      variable,
      label
    });
  }

  /**
   * Start timing measurement
   */
  startTiming(name: string): () => Promise<void> {
    const startTime = Date.now();
    
    return async () => {
      const duration = Date.now() - startTime;
      await this.trackPerformance(name, duration, 'ms');
    };
  }

  /**
   * Flush queued events to server
   */
  async flush(): Promise<void> {
    if (!this.isInitialized || (!this.eventQueue.length && !this.performanceQueue.length && !this.errorQueue.length)) {
      return;
    }

    try {
      const batch = {
        events: [...this.eventQueue],
        performance: [...this.performanceQueue],
        errors: [...this.errorQueue],
        session_id: this.sessionId,
        timestamp: new Date().toISOString()
      };

      // Clear queues
      this.eventQueue = [];
      this.performanceQueue = [];
      this.errorQueue = [];

      // Send to server
      await this.sendBatch(batch);

      if (this.config.debugMode) {
        console.log('[Analytics] Batch flushed:', batch);
      }
    } catch (error) {
      console.error('[Analytics] Error flushing batch:', error);
      // Re-queue events on failure (with retry limit)
      // Implementation would depend on retry strategy
    }
  }

  /**
   * Send batch to server
   */
  private async sendBatch(batch: any): Promise<void> {
    try {
      // Store locally first for offline support
      await this.storeBatchLocally(batch);

      // Try to send to server
      const { error } = await supabase.rpc('log_analytics_batch', {
        batch_data: batch
      });

      if (error) {
        console.error('[Analytics] Server error:', error);
        // Keep in local storage for retry
        return;
      }

      // Remove from local storage on success
      await this.removeBatchFromLocal(batch.session_id, batch.timestamp);
    } catch (error) {
      console.error('[Analytics] Error sending batch:', error);
    }
  }

  /**
   * Store batch locally for offline support
   */
  private async storeBatchLocally(batch: any): Promise<void> {
    try {
      const key = `analytics_batch_${batch.session_id}_${Date.now()}`;
      await AsyncStorage.setItem(key, JSON.stringify(batch));
    } catch (error) {
      console.error('[Analytics] Error storing batch locally:', error);
    }
  }

  /**
   * Remove batch from local storage
   */
  private async removeBatchFromLocal(sessionId: string, timestamp: string): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const batchKeys = keys.filter(key => 
        key.startsWith('analytics_batch_') && key.includes(sessionId)
      );
      
      if (batchKeys.length > 0) {
        await AsyncStorage.multiRemove(batchKeys);
      }
    } catch (error) {
      console.error('[Analytics] Error removing batch from local storage:', error);
    }
  }

  /**
   * Retry failed batches
   */
  async retryFailedBatches(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const batchKeys = keys.filter(key => key.startsWith('analytics_batch_'));

      for (const key of batchKeys) {
        try {
          const batchData = await AsyncStorage.getItem(key);
          if (batchData) {
            const batch = JSON.parse(batchData);
            await this.sendBatch(batch);
          }
        } catch (error) {
          console.error('[Analytics] Error retrying batch:', error);
        }
      }
    } catch (error) {
      console.error('[Analytics] Error retrying failed batches:', error);
    }
  }

  /**
   * Sanitize properties to remove PII
   */
  private sanitizeProperties(properties: Record<string, any>): Record<string, any> {
    if (this.config.collectPersonalData) {
      return properties;
    }

    const sanitized = { ...properties };
    
    // Remove common PII fields
    const piiFields = ['email', 'phone', 'name', 'address', 'ip', 'device_id'];
    piiFields.forEach(field => {
      if (sanitized[field]) {
        delete sanitized[field];
      }
    });

    // Hash user IDs if present
    if (sanitized.user_id) {
      sanitized.user_id = this.hashValue(sanitized.user_id);
    }

    return sanitized;
  }

  /**
   * Hash sensitive values
   */
  private hashValue(value: string): string {
    // Simple hash for demo - use proper hashing in production
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      const char = value.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start flush timer
   */
  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  /**
   * Load configuration
   */
  private async loadConfig(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('analytics_config');
      if (stored) {
        const config = JSON.parse(stored);
        this.config = { ...this.config, ...config };
      }
    } catch (error) {
      console.error('[Analytics] Error loading config:', error);
    }
  }

  /**
   * Save configuration
   */
  async updateConfig(updates: Partial<AnalyticsConfig>): Promise<void> {
    try {
      this.config = { ...this.config, ...updates };
      await AsyncStorage.setItem('analytics_config', JSON.stringify(this.config));

      // Restart timer if flush interval changed
      if (updates.flushInterval && this.config.enabled) {
        this.startFlushTimer();
      }

      console.log('[Analytics] Configuration updated:', updates);
    } catch (error) {
      console.error('[Analytics] Error updating config:', error);
    }
  }

  /**
   * Load app information
   */
  private async loadAppInfo(): Promise<void> {
    try {
      // This would typically come from app.json or build config
      this.appVersion = '1.0.0'; // Replace with actual version
      this.platform = 'react-native';
    } catch (error) {
      console.error('[Analytics] Error loading app info:', error);
    }
  }

  /**
   * Get previous app state
   */
  private async getPreviousAppState(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('previous_app_state');
    } catch (error) {
      return null;
    }
  }

  /**
   * Set previous app state
   */
  private async setPreviousAppState(state: string): Promise<void> {
    try {
      await AsyncStorage.setItem('previous_app_state', state);
    } catch (error) {
      console.error('[Analytics] Error setting previous app state:', error);
    }
  }

  /**
   * Get session duration
   */
  private getSessionDuration(): number {
    const sessionStart = parseInt(this.sessionId.split('_')[1]);
    return Date.now() - sessionStart;
  }

  /**
   * Get analytics statistics
   */
  getStats(): {
    sessionId: string;
    queuedEvents: number;
    queuedPerformance: number;
    queuedErrors: number;
    config: AnalyticsConfig;
    sessionDuration: number;
  } {
    return {
      sessionId: this.sessionId,
      queuedEvents: this.eventQueue.length,
      queuedPerformance: this.performanceQueue.length,
      queuedErrors: this.errorQueue.length,
      config: this.config,
      sessionDuration: this.getSessionDuration()
    };
  }

  /**
   * Enable/disable analytics
   */
  async setEnabled(enabled: boolean): Promise<void> {
    await this.updateConfig({ enabled });
    
    if (enabled) {
      this.startFlushTimer();
      await this.trackEvent('analytics_enabled', 'system_event');
    } else {
      if (this.flushTimer) {
        clearInterval(this.flushTimer);
        this.flushTimer = null;
      }
      // Flush remaining events before disabling
      await this.flush();
    }
  }

  /**
   * Set GDPR compliance mode
   */
  async setGDPRCompliance(collectPersonalData: boolean): Promise<void> {
    await this.updateConfig({ collectPersonalData });
    await this.trackEvent('gdpr_compliance_updated', 'system_event', {
      collect_personal_data: collectPersonalData
    });
  }

  /**
   * Clear all analytics data
   */
  async clearAllData(): Promise<void> {
    try {
      // Clear queues
      this.eventQueue = [];
      this.performanceQueue = [];
      this.errorQueue = [];

      // Clear local storage
      const keys = await AsyncStorage.getAllKeys();
      const analyticsKeys = keys.filter(key => 
        key.startsWith('analytics_') || key.startsWith('previous_app_state')
      );
      
      if (analyticsKeys.length > 0) {
        await AsyncStorage.multiRemove(analyticsKeys);
      }

      // Clear cache
      await cacheManager.clear('analytics');

      console.log('[Analytics] All analytics data cleared');
    } catch (error) {
      console.error('[Analytics] Error clearing analytics data:', error);
    }
  }

  /**
   * Cleanup and destroy
   */
  async destroy(): Promise<void> {
    try {
      // Track session end
      await this.trackEvent('session_end', 'system_event', {
        session_duration: this.getSessionDuration()
      });

      // Flush remaining events
      await this.flush();

      // Clear timer
      if (this.flushTimer) {
        clearInterval(this.flushTimer);
        this.flushTimer = null;
      }

      console.log('[Analytics] Analytics manager destroyed');
    } catch (error) {
      console.error('[Analytics] Error destroying analytics manager:', error);
    }
  }
}

// Create singleton instance
export const analyticsManager = new AnalyticsManager();

// Convenience functions for common tracking
export const analytics = {
  // Screen tracking
  screen: (screenName: string, properties?: Record<string, any>) => 
    analyticsManager.trackScreenView(screenName, properties),

  // User actions
  action: (action: string, category?: string, properties?: Record<string, any>) => 
    analyticsManager.trackUserAction(action, category, properties),

  // Performance
  performance: (name: string, value: number, unit?: string, context?: Record<string, any>) => 
    analyticsManager.trackPerformance(name, value, unit, context),

  // Errors
  error: (type: string, message: string, stackTrace?: string, context?: Record<string, any>) => 
    analyticsManager.trackError(type, message, stackTrace, context),

  // Timing
  time: (name: string) => analyticsManager.startTiming(name),

  // Custom events
  event: (name: string, properties?: Record<string, any>) => 
    analyticsManager.trackEvent(name, 'user_action', properties),

  // System events
  system: (name: string, properties?: Record<string, any>) => 
    analyticsManager.trackEvent(name, 'system_event', properties)
};

export default analyticsManager;