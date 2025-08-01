/**
 * Security Monitor
 * Detects and responds to security threats and suspicious activities
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import { analyticsManager } from './analyticsManager';
import { cacheManager } from './caching';

export interface SecurityEvent {
  id?: string;
  eventType: 'suspicious_login' | 'rate_limit_exceeded' | 'malicious_content' | 'data_breach_attempt' | 'unauthorized_access' | 'spam_detected';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata: Record<string, any>;
  timestamp: string;
  resolved: boolean;
  actionTaken?: string;
}

export interface ThreatPattern {
  id: string;
  name: string;
  pattern: RegExp | string;
  type: 'content' | 'behavior' | 'network';
  severity: SecurityEvent['severity'];
  enabled: boolean;
  description: string;
}

export interface SecurityMetrics {
  totalThreats: number;
  threatsBlocked: number;
  suspiciousActivities: number;
  falsePositives: number;
  lastThreatDetected?: string;
  systemStatus: 'secure' | 'monitoring' | 'under_attack' | 'compromised';
}

class SecurityMonitor {
  private threatPatterns: Map<string, ThreatPattern> = new Map();
  private suspiciousActivities: Map<string, number> = new Map();
  private blockedIPs: Set<string> = new Set();
  private rateLimitTracking: Map<string, { count: number; lastReset: number }> = new Map();
  private isInitialized = false;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializePatterns();
    this.initialize();
  }

  /**
   * Initialize security monitor
   */
  async initialize(): Promise<void> {
    try {
      console.log('[Security] Initializing security monitor...');

      // Load configuration
      await this.loadConfiguration();

      // Load blocked IPs and suspicious activities
      await this.loadSecurityData();

      // Start monitoring
      this.startMonitoring();

      this.isInitialized = true;
      console.log('[Security] Security monitor initialized');
    } catch (error) {
      console.error('[Security] Failed to initialize security monitor:', error);
    }
  }

  /**
   * Initialize threat detection patterns
   */
  private initializePatterns(): void {
    const patterns: ThreatPattern[] = [
      {
        id: 'sql_injection',
        name: 'SQL Injection Attempt',
        pattern: /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b.*\b(from|where|into|values)\b)|(\b(or|and)\b.*=.*\b(or|and)\b)|('.*'.*=.*'.*')/i,
        type: 'content',
        severity: 'high',
        enabled: true,
        description: 'Detects potential SQL injection attempts in user input'
      },
      {
        id: 'xss_attempt',
        name: 'Cross-Site Scripting (XSS)',
        pattern: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        type: 'content',
        severity: 'high',
        enabled: true,
        description: 'Detects potential XSS attacks in user content'
      },
      {
        id: 'spam_content',
        name: 'Spam Content',
        pattern: /(viagra|casino|lottery|winner|congratulations.*prize|click.*here.*now|make.*money.*fast)/i,
        type: 'content',
        severity: 'medium',
        enabled: true,
        description: 'Detects common spam patterns in content'
      },
      {
        id: 'excessive_requests',
        name: 'Excessive API Requests',
        pattern: 'behavioral',
        type: 'behavior',
        severity: 'medium',
        enabled: true,
        description: 'Detects users making excessive API requests'
      },
      {
        id: 'suspicious_login',
        name: 'Suspicious Login Pattern',
        pattern: 'behavioral',
        type: 'behavior',
        severity: 'high',
        enabled: true,
        description: 'Detects suspicious login attempts from unusual locations or devices'
      },
      {
        id: 'data_scraping',
        name: 'Data Scraping Attempt',
        pattern: 'behavioral',
        type: 'behavior',
        severity: 'high',
        enabled: true,
        description: 'Detects automated data scraping attempts'
      }
    ];

    patterns.forEach(pattern => {
      this.threatPatterns.set(pattern.id, pattern);
    });
  }

  /**
   * Analyze content for security threats
   */
  async analyzeContent(
    content: string,
    contentType: 'message' | 'story' | 'comment' | 'profile',
    userId?: string
  ): Promise<{
    isSafe: boolean;
    threats: string[];
    severity: SecurityEvent['severity'];
    actionRecommended: 'allow' | 'flag' | 'block';
  }> {
    try {
      const threats: string[] = [];
      let maxSeverity: SecurityEvent['severity'] = 'low';

      // Check content against threat patterns
      for (const [patternId, pattern] of this.threatPatterns) {
        if (!pattern.enabled || pattern.type !== 'content') continue;

        const regex = pattern.pattern as RegExp;
        if (regex.test && regex.test(content)) {
          threats.push(pattern.name);
          
          // Update max severity
          if (this.getSeverityLevel(pattern.severity) > this.getSeverityLevel(maxSeverity)) {
            maxSeverity = pattern.severity;
          }

          // Log security event
          await this.logSecurityEvent({
            eventType: 'malicious_content',
            severity: pattern.severity,
            description: `${pattern.name} detected in ${contentType}`,
            userId,
            metadata: {
              pattern_id: patternId,
              content_type: contentType,
              content_length: content.length,
              threat_pattern: pattern.name
            },
            timestamp: new Date().toISOString(),
            resolved: false
          });
        }
      }

      // Additional content analysis
      const additionalChecks = await this.performAdditionalContentChecks(content, contentType, userId);
      threats.push(...additionalChecks.threats);

      // Determine action
      let actionRecommended: 'allow' | 'flag' | 'block' = 'allow';
      if (threats.length > 0) {
        if (maxSeverity === 'critical' || maxSeverity === 'high') {
          actionRecommended = 'block';
        } else if (maxSeverity === 'medium') {
          actionRecommended = 'flag';
        }
      }

      return {
        isSafe: threats.length === 0,
        threats,
        severity: maxSeverity,
        actionRecommended
      };
    } catch (error) {
      console.error('[Security] Error analyzing content:', error);
      return {
        isSafe: false,
        threats: ['Analysis error'],
        severity: 'medium',
        actionRecommended: 'flag'
      };
    }
  }

  /**
   * Monitor user behavior for suspicious activities
   */
  async monitorUserBehavior(
    userId: string,
    action: string,
    metadata: Record<string, any> = {}
  ): Promise<{
    isSuspicious: boolean;
    riskLevel: 'low' | 'medium' | 'high';
    actionTaken?: string;
  }> {
    try {
      const userKey = `user_${userId}`;
      const currentTime = Date.now();
      
      // Track user activity
      const activityKey = `${userKey}_${action}`;
      const currentCount = this.suspiciousActivities.get(activityKey) || 0;
      this.suspiciousActivities.set(activityKey, currentCount + 1);

      // Check for suspicious patterns
      const suspiciousChecks = [
        this.checkRapidActions(userId, action, currentCount),
        this.checkUnusualPatterns(userId, action, metadata),
        this.checkLocationAnomalies(userId, metadata),
        this.checkDeviceAnomalies(userId, metadata)
      ];

      const suspiciousResults = await Promise.all(suspiciousChecks);
      const isSuspicious = suspiciousResults.some(result => result.isSuspicious);
      const maxRiskLevel = suspiciousResults.reduce((max, result) => 
        this.getRiskLevel(result.riskLevel) > this.getRiskLevel(max) ? result.riskLevel : max, 
        'low' as const
      );

      if (isSuspicious) {
        // Log security event
        await this.logSecurityEvent({
          eventType: 'suspicious_login',
          severity: maxRiskLevel === 'high' ? 'high' : 'medium',
          description: `Suspicious behavior detected: ${action}`,
          userId,
          metadata: {
            action,
            activity_count: currentCount,
            ...metadata
          },
          timestamp: new Date().toISOString(),
          resolved: false
        });

        // Take action based on risk level
        let actionTaken: string | undefined;
        if (maxRiskLevel === 'high') {
          actionTaken = await this.takeSecurityAction(userId, 'temporary_restriction');
        } else if (maxRiskLevel === 'medium') {
          actionTaken = await this.takeSecurityAction(userId, 'increased_monitoring');
        }

        return {
          isSuspicious: true,
          riskLevel: maxRiskLevel,
          actionTaken
        };
      }

      return {
        isSuspicious: false,
        riskLevel: 'low'
      };
    } catch (error) {
      console.error('[Security] Error monitoring user behavior:', error);
      return {
        isSuspicious: false,
        riskLevel: 'low'
      };
    }
  }

  /**
   * Check for rapid actions (potential bot behavior)
   */
  private async checkRapidActions(
    userId: string,
    action: string,
    currentCount: number
  ): Promise<{ isSuspicious: boolean; riskLevel: 'low' | 'medium' | 'high' }> {
    const thresholds = {
      message: { medium: 20, high: 50 },
      story_create: { medium: 5, high: 10 },
      like: { medium: 100, high: 200 },
      comment: { medium: 30, high: 60 }
    };

    const threshold = thresholds[action as keyof typeof thresholds];
    if (!threshold) return { isSuspicious: false, riskLevel: 'low' };

    if (currentCount >= threshold.high) {
      return { isSuspicious: true, riskLevel: 'high' };
    } else if (currentCount >= threshold.medium) {
      return { isSuspicious: true, riskLevel: 'medium' };
    }

    return { isSuspicious: false, riskLevel: 'low' };
  }

  /**
   * Check for unusual patterns
   */
  private async checkUnusualPatterns(
    userId: string,
    action: string,
    metadata: Record<string, any>
  ): Promise<{ isSuspicious: boolean; riskLevel: 'low' | 'medium' | 'high' }> {
    try {
      // Get user's historical behavior
      const historicalData = await cacheManager.get(`user_behavior_${userId}`, 'security');
      
      if (!historicalData) {
        // First time user, not suspicious
        return { isSuspicious: false, riskLevel: 'low' };
      }

      // Check for unusual timing patterns
      const currentHour = new Date().getHours();
      const usualHours = historicalData.active_hours || [];
      
      if (usualHours.length > 0 && !usualHours.includes(currentHour)) {
        return { isSuspicious: true, riskLevel: 'medium' };
      }

      return { isSuspicious: false, riskLevel: 'low' };
    } catch (error) {
      console.error('[Security] Error checking unusual patterns:', error);
      return { isSuspicious: false, riskLevel: 'low' };
    }
  }

  /**
   * Check for location anomalies
   */
  private async checkLocationAnomalies(
    userId: string,
    metadata: Record<string, any>
  ): Promise<{ isSuspicious: boolean; riskLevel: 'low' | 'medium' | 'high' }> {
    try {
      const currentIP = metadata.ip_address;
      if (!currentIP) return { isSuspicious: false, riskLevel: 'low' };

      // Check if IP is in blocked list
      if (this.blockedIPs.has(currentIP)) {
        return { isSuspicious: true, riskLevel: 'high' };
      }

      // Get user's usual locations
      const userLocations = await cacheManager.get(`user_locations_${userId}`, 'security');
      
      if (userLocations && Array.isArray(userLocations)) {
        // Simple check - in production, use proper geolocation
        const isKnownLocation = userLocations.some(loc => loc.ip === currentIP);
        
        if (!isKnownLocation && userLocations.length > 0) {
          return { isSuspicious: true, riskLevel: 'medium' };
        }
      }

      return { isSuspicious: false, riskLevel: 'low' };
    } catch (error) {
      console.error('[Security] Error checking location anomalies:', error);
      return { isSuspicious: false, riskLevel: 'low' };
    }
  }

  /**
   * Check for device anomalies
   */
  private async checkDeviceAnomalies(
    userId: string,
    metadata: Record<string, any>
  ): Promise<{ isSuspicious: boolean; riskLevel: 'low' | 'medium' | 'high' }> {
    try {
      const userAgent = metadata.user_agent;
      if (!userAgent) return { isSuspicious: false, riskLevel: 'low' };

      // Check for bot-like user agents
      const botPatterns = [
        /bot/i, /crawler/i, /spider/i, /scraper/i,
        /curl/i, /wget/i, /python/i, /java/i
      ];

      const isBot = botPatterns.some(pattern => pattern.test(userAgent));
      if (isBot) {
        return { isSuspicious: true, riskLevel: 'high' };
      }

      return { isSuspicious: false, riskLevel: 'low' };
    } catch (error) {
      console.error('[Security] Error checking device anomalies:', error);
      return { isSuspicious: false, riskLevel: 'low' };
    }
  }

  /**
   * Perform additional content checks
   */
  private async performAdditionalContentChecks(
    content: string,
    contentType: string,
    userId?: string
  ): Promise<{ threats: string[] }> {
    const threats: string[] = [];

    try {
      // Check content length (potential DoS)
      if (content.length > 10000) {
        threats.push('Excessive content length');
      }

      // Check for repeated characters (potential spam)
      const repeatedPattern = /(.)\1{20,}/;
      if (repeatedPattern.test(content)) {
        threats.push('Repeated character pattern');
      }

      // Check for excessive URLs
      const urlPattern = /https?:\/\/[^\s]+/g;
      const urls = content.match(urlPattern) || [];
      if (urls.length > 5) {
        threats.push('Excessive URL count');
      }

      // Check for suspicious file extensions in URLs
      const suspiciousExtensions = /\.(exe|bat|cmd|scr|pif|com|jar)$/i;
      const hasSuspiciousFiles = urls.some(url => suspiciousExtensions.test(url));
      if (hasSuspiciousFiles) {
        threats.push('Suspicious file links');
      }

      return { threats };
    } catch (error) {
      console.error('[Security] Error in additional content checks:', error);
      return { threats: [] };
    }
  }

  /**
   * Take security action
   */
  private async takeSecurityAction(
    userId: string,
    actionType: 'warning' | 'temporary_restriction' | 'account_suspension' | 'increased_monitoring'
  ): Promise<string> {
    try {
      switch (actionType) {
        case 'warning':
          // Send warning notification
          await this.sendSecurityNotification(userId, 'warning', 'Suspicious activity detected on your account');
          return 'Warning sent to user';

        case 'temporary_restriction':
          // Implement temporary restrictions (e.g., rate limiting)
          await this.applyTemporaryRestriction(userId);
          return 'Temporary restrictions applied';

        case 'account_suspension':
          // Suspend account
          await this.suspendAccount(userId);
          return 'Account suspended';

        case 'increased_monitoring':
          // Increase monitoring for this user
          await this.increaseMonitoring(userId);
          return 'Increased monitoring activated';

        default:
          return 'No action taken';
      }
    } catch (error) {
      console.error('[Security] Error taking security action:', error);
      return 'Action failed';
    }
  }

  /**
   * Apply temporary restriction
   */
  private async applyTemporaryRestriction(userId: string): Promise<void> {
    try {
      const restriction = {
        user_id: userId,
        restriction_type: 'rate_limit',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        reason: 'Suspicious activity detected'
      };

      await supabase.from('user_restrictions').insert(restriction);
      
      // Cache the restriction
      await cacheManager.set(`restriction_${userId}`, restriction, 'security', 24 * 60 * 60 * 1000);
    } catch (error) {
      console.error('[Security] Error applying temporary restriction:', error);
    }
  }

  /**
   * Suspend account
   */
  private async suspendAccount(userId: string): Promise<void> {
    try {
      await supabase
        .from('users')
        .update({ 
          is_suspended: true,
          suspended_at: new Date().toISOString(),
          suspension_reason: 'Security violation'
        })
        .eq('id', userId);
    } catch (error) {
      console.error('[Security] Error suspending account:', error);
    }
  }

  /**
   * Increase monitoring
   */
  private async increaseMonitoring(userId: string): Promise<void> {
    try {
      const monitoring = {
        user_id: userId,
        monitoring_level: 'high',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        reason: 'Suspicious behavior pattern'
      };

      await cacheManager.set(`monitoring_${userId}`, monitoring, 'security', 7 * 24 * 60 * 60 * 1000);
    } catch (error) {
      console.error('[Security] Error increasing monitoring:', error);
    }
  }

  /**
   * Send security notification
   */
  private async sendSecurityNotification(
    userId: string,
    type: 'warning' | 'alert' | 'info',
    message: string
  ): Promise<void> {
    try {
      await supabase.rpc('create_notification', {
        p_user_id: userId,
        p_type: 'system',
        p_title: 'Security Alert',
        p_body: message,
        p_data: { security_type: type }
      });
    } catch (error) {
      console.error('[Security] Error sending security notification:', error);
    }
  }

  /**
   * Log security event
   */
  private async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      // Store in database
      await supabase.from('security_events').insert({
        event_type: event.eventType,
        severity: event.severity,
        description: event.description,
        user_id: event.userId,
        ip_address: event.ipAddress,
        user_agent: event.userAgent,
        metadata: event.metadata,
        resolved: event.resolved,
        action_taken: event.actionTaken
      });

      // Track in analytics
      await analyticsManager.trackEvent('security_event', 'system_event', {
        event_type: event.eventType,
        severity: event.severity,
        user_id: event.userId
      });

      // Cache for quick access
      await cacheManager.set(
        `security_event_${Date.now()}`,
        event,
        'security',
        24 * 60 * 60 * 1000 // 24 hours
      );

      console.log(`[Security] Security event logged: ${event.eventType} (${event.severity})`);
    } catch (error) {
      console.error('[Security] Error logging security event:', error);
    }
  }

  /**
   * Get security metrics
   */
  async getSecurityMetrics(): Promise<SecurityMetrics> {
    try {
      const { data: events, error } = await supabase
        .from('security_events')
        .select('*')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const totalThreats = events?.length || 0;
      const threatsBlocked = events?.filter(e => e.action_taken?.includes('block')).length || 0;
      const suspiciousActivities = events?.filter(e => e.event_type === 'suspicious_login').length || 0;
      const falsePositives = events?.filter(e => e.resolved && e.metadata?.false_positive).length || 0;
      const lastThreatDetected = events?.[0]?.created_at;

      let systemStatus: SecurityMetrics['systemStatus'] = 'secure';
      if (totalThreats > 100) {
        systemStatus = 'under_attack';
      } else if (totalThreats > 20) {
        systemStatus = 'monitoring';
      }

      return {
        totalThreats,
        threatsBlocked,
        suspiciousActivities,
        falsePositives,
        lastThreatDetected,
        systemStatus
      };
    } catch (error) {
      console.error('[Security] Error getting security metrics:', error);
      return {
        totalThreats: 0,
        threatsBlocked: 0,
        suspiciousActivities: 0,
        falsePositives: 0,
        systemStatus: 'secure'
      };
    }
  }

  /**
   * Start monitoring
   */
  private startMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(async () => {
      try {
        // Clean up old tracking data
        this.cleanupTrackingData();
        
        // Check for system-wide threats
        await this.checkSystemThreats();
        
        // Update security metrics
        const metrics = await this.getSecurityMetrics();
        await cacheManager.set('security_metrics', metrics, 'security', 5 * 60 * 1000);
      } catch (error) {
        console.error('[Security] Error in monitoring interval:', error);
      }
    }, 60000); // Every minute
  }

  /**
   * Clean up old tracking data
   */
  private cleanupTrackingData(): void {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    // Clean up rate limit tracking
    for (const [key, data] of this.rateLimitTracking) {
      if (now - data.lastReset > oneHour) {
        this.rateLimitTracking.delete(key);
      }
    }

    // Clean up suspicious activities (keep for 24 hours)
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    for (const [key] of this.suspiciousActivities) {
      // This is simplified - in production, track timestamps
      if (Math.random() < 0.1) { // Randomly clean up 10% each time
        this.suspiciousActivities.delete(key);
      }
    }
  }

  /**
   * Check for system-wide threats
   */
  private async checkSystemThreats(): Promise<void> {
    try {
      // Check for coordinated attacks
      const recentEvents = await supabase
        .from('security_events')
        .select('*')
        .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString()) // Last 10 minutes
        .order('created_at', { ascending: false });

      if (recentEvents.data && recentEvents.data.length > 50) {
        await this.logSecurityEvent({
          eventType: 'data_breach_attempt',
          severity: 'critical',
          description: 'Potential coordinated attack detected',
          metadata: {
            event_count: recentEvents.data.length,
            time_window: '10_minutes'
          },
          timestamp: new Date().toISOString(),
          resolved: false
        });
      }
    } catch (error) {
      console.error('[Security] Error checking system threats:', error);
    }
  }

  /**
   * Load configuration
   */
  private async loadConfiguration(): Promise<void> {
    try {
      const config = await AsyncStorage.getItem('security_config');
      if (config) {
        const parsedConfig = JSON.parse(config);
        // Apply configuration
        console.log('[Security] Configuration loaded:', parsedConfig);
      }
    } catch (error) {
      console.error('[Security] Error loading configuration:', error);
    }
  }

  /**
   * Load security data
   */
  private async loadSecurityData(): Promise<void> {
    try {
      // Load blocked IPs
      const blockedIPs = await AsyncStorage.getItem('blocked_ips');
      if (blockedIPs) {
        const ips = JSON.parse(blockedIPs);
        this.blockedIPs = new Set(ips);
      }

      // Load suspicious activities from cache
      const activities = await cacheManager.get('suspicious_activities', 'security');
      if (activities) {
        this.suspiciousActivities = new Map(Object.entries(activities));
      }
    } catch (error) {
      console.error('[Security] Error loading security data:', error);
    }
  }

  /**
   * Helper functions
   */
  private getSeverityLevel(severity: SecurityEvent['severity']): number {
    const levels = { low: 1, medium: 2, high: 3, critical: 4 };
    return levels[severity] || 1;
  }

  private getRiskLevel(risk: 'low' | 'medium' | 'high'): number {
    const levels = { low: 1, medium: 2, high: 3 };
    return levels[risk] || 1;
  }

  /**
   * Get security status
   */
  getSecurityStatus(): {
    isInitialized: boolean;
    activePatterns: number;
    blockedIPs: number;
    suspiciousActivities: number;
    monitoringActive: boolean;
  } {
    return {
      isInitialized: this.isInitialized,
      activePatterns: Array.from(this.threatPatterns.values()).filter(p => p.enabled).length,
      blockedIPs: this.blockedIPs.size,
      suspiciousActivities: this.suspiciousActivities.size,
      monitoringActive: this.monitoringInterval !== null
    };
  }

  /**
   * Cleanup and destroy
   */
  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.suspiciousActivities.clear();
    this.rateLimitTracking.clear();
    
    console.log('[Security] Security monitor destroyed');
  }
}

// Create singleton instance
export const securityMonitor = new SecurityMonitor();

export default securityMonitor;