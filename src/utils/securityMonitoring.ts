/**
 * Client-Side Security Monitoring
 * Handles session management, threat detection, and security event reporting
 */

import { supabase } from '../config/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Network from 'expo-network';
import { Platform } from 'react-native';

export interface SecurityEvent {
  id?: string;
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  metadata?: Record<string, any>;
  created_at?: string;
}

export interface SessionInfo {
  session_token: string;
  expires_at: string;
  user_id: string;
  device_info: Record<string, any>;
}

export interface SecurityDashboard {
  total_events: number;
  critical_events: number;
  high_events: number;
  medium_events: number;
  low_events: number;
  active_sessions: number;
  unique_users_active: number;
  top_event_types: Array<{ event_type: string; count: number }>;
  recent_critical_events: SecurityEvent[];
}

class SecurityMonitor {
  private sessionToken: string | null = null;
  private sessionCheckInterval: NodeJS.Timeout | null = null;
  private securityEventQueue: SecurityEvent[] = [];
  private isOnline: boolean = true;
  private deviceInfo: Record<string, any> = {};

  constructor() {
    this.initializeDeviceInfo();
    this.startSessionMonitoring();
    this.setupNetworkListener();
  }

  /**
   * Initialize device information for security tracking
   */
  private async initializeDeviceInfo(): Promise<void> {
    try {
      this.deviceInfo = {
        platform: Platform.OS,
        version: Platform.Version,
        device_name: Device.deviceName,
        device_type: Device.deviceType,
        brand: Device.brand,
        model_name: Device.modelName,
        os_name: Device.osName,
        os_version: Device.osVersion,
        is_device: Device.isDevice,
        timestamp: new Date().toISOString()
      };

      console.log('[Security] Device info initialized:', this.deviceInfo);
    } catch (error) {
      console.error('[Security] Failed to initialize device info:', error);
      this.deviceInfo = {
        platform: Platform.OS,
        error: 'Failed to get device info',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Set up network state monitoring
   */
  private setupNetworkListener(): void {
    Network.getNetworkStateAsync().then(state => {
      this.isOnline = state.isConnected || false;
    });

    // Monitor network changes
    const networkSubscription = Network.addNetworkStateListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected || false;

      if (wasOffline && this.isOnline) {
        // Back online - flush queued security events
        this.flushSecurityEventQueue();
      }
    });
  }

  /**
   * Create a new user session with security tracking
   */
  async createSession(
    userId: string,
    expiresHours: number = 24
  ): Promise<{ success: boolean; session?: SessionInfo; error?: string }> {
    try {
      console.log('[Security] Creating new session for user:', userId);

      const { data, error } = await supabase.rpc('create_user_session', {
        p_user_id: userId,
        p_device_info: this.deviceInfo,
        p_ip_address: null, // Will be set server-side
        p_user_agent: this.getUserAgent(),
        p_expires_hours: expiresHours
      });

      if (error) {
        console.error('[Security] Session creation error:', error);
        await this.logSecurityEvent({
          event_type: 'session_creation_failed',
          severity: 'medium',
          description: `Failed to create session: ${error.message}`,
          metadata: { user_id: userId, error: error.message }
        });
        return { success: false, error: error.message };
      }

      if (data && data.length > 0) {
        const sessionData = data[0];
        this.sessionToken = sessionData.session_token;

        // Store session securely
        await AsyncStorage.setItem('secure_session_token', this.sessionToken);
        await AsyncStorage.setItem('session_expires_at', sessionData.expires_at);

        const sessionInfo: SessionInfo = {
          session_token: this.sessionToken,
          expires_at: sessionData.expires_at,
          user_id: userId,
          device_info: this.deviceInfo
        };

        console.log('[Security] Session created successfully');
        return { success: true, session: sessionInfo };
      }

      return { success: false, error: 'No session data returned' };
    } catch (error) {
      console.error('[Security] Session creation error:', error);
      await this.logSecurityEvent({
        event_type: 'session_creation_error',
        severity: 'high',
        description: `Session creation failed with error: ${error}`,
        metadata: { user_id: userId, error: String(error) }
      });
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Validate current session
   */
  async validateSession(): Promise<{
    isValid: boolean;
    userId?: string;
    expiresAt?: string;
    error?: string;
  }> {
    try {
      if (!this.sessionToken) {
        // Try to load from storage
        this.sessionToken = await AsyncStorage.getItem('secure_session_token');
        if (!this.sessionToken) {
          return { isValid: false, error: 'No session token found' };
        }
      }

      const { data, error } = await supabase.rpc('validate_session', {
        p_session_token: this.sessionToken
      });

      if (error) {
        console.error('[Security] Session validation error:', error);
        await this.logSecurityEvent({
          event_type: 'session_validation_failed',
          severity: 'medium',
          description: `Session validation failed: ${error.message}`,
          metadata: { error: error.message }
        });
        return { isValid: false, error: error.message };
      }

      if (data && data.length > 0) {
        const sessionData = data[0];
        
        if (sessionData.is_valid) {
          return {
            isValid: true,
            userId: sessionData.user_id,
            expiresAt: sessionData.expires_at
          };
        } else {
          // Session is invalid - clean up
          await this.terminateSession();
          return { isValid: false, error: 'Session expired or invalid' };
        }
      }

      return { isValid: false, error: 'No session data returned' };
    } catch (error) {
      console.error('[Security] Session validation error:', error);
      return { 
        isValid: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Terminate current session
   */
  async terminateSession(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.sessionToken) {
        this.sessionToken = await AsyncStorage.getItem('secure_session_token');
      }

      if (this.sessionToken) {
        const { data, error } = await supabase.rpc('terminate_session', {
          p_session_token: this.sessionToken
        });

        if (error) {
          console.error('[Security] Session termination error:', error);
        }
      }

      // Clean up local storage regardless of server response
      await AsyncStorage.multiRemove([
        'secure_session_token',
        'session_expires_at'
      ]);

      this.sessionToken = null;

      console.log('[Security] Session terminated successfully');
      return { success: true };
    } catch (error) {
      console.error('[Security] Session termination error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Log security event
   */
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      const securityEvent = {
        ...event,
        metadata: {
          ...event.metadata,
          device_info: this.deviceInfo,
          user_agent: this.getUserAgent(),
          timestamp: new Date().toISOString()
        }
      };

      if (this.isOnline) {
        // Send immediately if online
        const { error } = await supabase
          .from('security_events')
          .insert([securityEvent]);

        if (error) {
          console.error('[Security] Failed to log security event:', error);
          // Queue for later if insert fails
          this.securityEventQueue.push(securityEvent);
        } else {
          console.log(`[Security] Security event logged: ${event.event_type}`);
        }
      } else {
        // Queue for later if offline
        this.securityEventQueue.push(securityEvent);
        console.log(`[Security] Security event queued (offline): ${event.event_type}`);
      }
    } catch (error) {
      console.error('[Security] Error logging security event:', error);
      // Queue the event for retry
      this.securityEventQueue.push(event);
    }
  }

  /**
   * Flush queued security events when back online
   */
  private async flushSecurityEventQueue(): Promise<void> {
    if (this.securityEventQueue.length === 0) return;

    try {
      console.log(`[Security] Flushing ${this.securityEventQueue.length} queued security events`);

      const { error } = await supabase
        .from('security_events')
        .insert(this.securityEventQueue);

      if (error) {
        console.error('[Security] Failed to flush security event queue:', error);
      } else {
        console.log('[Security] Security event queue flushed successfully');
        this.securityEventQueue = [];
      }
    } catch (error) {
      console.error('[Security] Error flushing security event queue:', error);
    }
  }

  /**
   * Start automatic session monitoring
   */
  private startSessionMonitoring(): void {
    // Check session validity every 5 minutes
    this.sessionCheckInterval = setInterval(async () => {
      if (this.sessionToken) {
        const validation = await this.validateSession();
        if (!validation.isValid) {
          console.log('[Security] Session invalid during monitoring check');
          await this.logSecurityEvent({
            event_type: 'session_expired_monitoring',
            severity: 'low',
            description: 'Session expired during routine monitoring check'
          });
        }
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Stop session monitoring
   */
  stopSessionMonitoring(): void {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
    }
  }

  /**
   * Get security dashboard data (admin only)
   */
  async getSecurityDashboard(hours: number = 24): Promise<{
    success: boolean;
    data?: SecurityDashboard;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.rpc('get_security_dashboard', {
        p_hours: hours
      });

      if (error) {
        console.error('[Security] Failed to get security dashboard:', error);
        return { success: false, error: error.message };
      }

      if (data && data.length > 0) {
        return { success: true, data: data[0] };
      }

      return { success: false, error: 'No dashboard data returned' };
    } catch (error) {
      console.error('[Security] Security dashboard error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get user's own security events
   */
  async getUserSecurityEvents(limit: number = 50): Promise<{
    success: boolean;
    events?: SecurityEvent[];
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('user_security_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[Security] Failed to get user security events:', error);
        return { success: false, error: error.message };
      }

      return { success: true, events: data || [] };
    } catch (error) {
      console.error('[Security] User security events error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Report suspicious activity
   */
  async reportSuspiciousActivity(
    activityType: string,
    description: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    await this.logSecurityEvent({
      event_type: 'user_reported_suspicious_activity',
      severity: 'medium',
      description: `User reported suspicious activity: ${description}`,
      metadata: {
        activity_type: activityType,
        user_description: description,
        ...metadata
      }
    });
  }

  /**
   * Get user agent string
   */
  private getUserAgent(): string {
    return `TeaKE-Mobile/${Platform.OS}-${Platform.Version}`;
  }

  /**
   * Subscribe to real-time security alerts (admin only)
   */
  subscribeToSecurityAlerts(
    callback: (event: SecurityEvent) => void
  ): { unsubscribe: () => void } {
    const channel = supabase
      .channel('security_alerts')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'security_events',
        filter: 'severity=in.(critical,high)'
      }, (payload) => {
        console.log('[Security] Real-time security alert:', payload);
        callback(payload.new as SecurityEvent);
      })
      .subscribe();

    return {
      unsubscribe: () => {
        supabase.removeChannel(channel);
      }
    };
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopSessionMonitoring();
    this.securityEventQueue = [];
    this.sessionToken = null;
  }
}

// Create singleton instance
export const securityMonitor = new SecurityMonitor();

/**
 * Security utility functions
 */
export const securityUtils = {
  /**
   * Check if user has admin privileges
   */
  isAdmin: async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('check_user_role', {
        required_role: 'admin'
      });
      return !error && data === true;
    } catch {
      return false;
    }
  },

  /**
   * Log authentication attempt
   */
  logAuthAttempt: async (
    success: boolean,
    method: string,
    error?: string
  ): Promise<void> => {
    await securityMonitor.logSecurityEvent({
      event_type: success ? 'auth_success' : 'auth_failure',
      severity: success ? 'low' : 'medium',
      description: `Authentication ${success ? 'successful' : 'failed'} using ${method}`,
      metadata: {
        auth_method: method,
        success,
        error: error || null
      }
    });
  },

  /**
   * Log suspicious user behavior
   */
  logSuspiciousBehavior: async (
    behaviorType: string,
    details: Record<string, any>
  ): Promise<void> => {
    await securityMonitor.logSecurityEvent({
      event_type: 'suspicious_behavior',
      severity: 'medium',
      description: `Suspicious behavior detected: ${behaviorType}`,
      metadata: {
        behavior_type: behaviorType,
        ...details
      }
    });
  },

  /**
   * Validate session before sensitive operations
   */
  validateBeforeSensitiveOperation: async (): Promise<boolean> => {
    const validation = await securityMonitor.validateSession();
    if (!validation.isValid) {
      await securityMonitor.logSecurityEvent({
        event_type: 'unauthorized_sensitive_operation',
        severity: 'high',
        description: 'Attempted sensitive operation with invalid session'
      });
      return false;
    }
    return true;
  }
};

export default securityMonitor;