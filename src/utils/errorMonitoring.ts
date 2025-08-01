/**
 * Error Monitoring and Logging System
 * Comprehensive error tracking, performance monitoring, and crash reporting
 */

import { supabase } from '../config/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { cacheManager } from './caching';

export interface ErrorReport {
  id?: string;
  error_type: 'javascript' | 'network' | 'database' | 'authentication' | 'performance' | 'crash';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  stack_trace?: string;
  user_id?: string;
  session_id?: string;
  context: Record<string, any>;
  device_info: Record<string, any>;
  app_version: string;
  timestamp: string;
  resolved?: boolean;
  tags?: string[];
}

export interface PerformanceMetric {
  id?: string;
  metric_type: 'app_start' | 'screen_load' | 'api_call' | 'image_load' | 'database_query';
  metric_name: string;
  value: number;
  unit: 'ms' | 'seconds' | 'bytes' | 'count';
  user_id?: string;
  session_id?: string;
  context: Record<string, any>;
  timestamp: string;
}

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  category: string;
  context?: Record<string, any>;
  timestamp: string;
  user_id?: string;
  session_id?: string;
}

class ErrorMonitor {
  private errorQueue: ErrorReport[] = [];
  private performanceQueue: PerformanceMetric[] = [];
  private logQueue: LogEntry[] = [];
  private isOnline: boolean = true;
  private deviceInfo: Record<string, any> = {};
  private sessionId: string | null = null;
  private userId: string | null = null;
  private appVersion: string = '1.0.0';
  private performanceObserver: any = null;

  constructor() {
    this.initializeDeviceInfo();
    this.setupGlobalErrorHandler();
    this.setupPerformanceMonitoring();
    this.startQueueFlushInterval();
  }

  /**
   * Initialize device and app information
   */
  private async initializeDeviceInfo(): Promise<void> {
    try {
      this.deviceInfo = {
        platform: Platform.OS,
        platform_version: Platform.Version,
        device_name: Device.deviceName,
        device_type: Device.deviceType,
        brand: Device.brand,
        model_name: Device.modelName,
        os_name: Device.osName,
        os_version: Device.osVersion,
        is_device: Device.isDevice,
        memory: Device.totalMemory,
        screen_dimensions: {
          // These would be set from Dimensions API
          width: 0,
          height: 0
        }
      };

      // Get app version from package.json or app.json
      try {
        const appInfo = await AsyncStorage.getItem('app_info');
        if (appInfo) {
          const parsed = JSON.parse(appInfo);
          this.appVersion = parsed.version || '1.0.0';
        }
      } catch {
        // Use default version
      }

      console.log('[ErrorMonitor] Device info initialized');
    } catch (error) {
      console.error('[ErrorMonitor] Failed to initialize device info:', error);
    }
  }

  /**
   * Set up global error handler
   */
  private setupGlobalErrorHandler(): void {
    // Handle JavaScript errors
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      this.reportError({
        error_type: 'javascript',
        severity: 'medium',
        message: args.join(' '),
        context: { source: 'console.error' },
        tags: ['console', 'javascript']
      });
      originalConsoleError.apply(console, args);
    };

    // Handle unhandled promise rejections
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (event) => {
        this.reportError({
          error_type: 'javascript',
          severity: 'high',
          message: `Unhandled Promise Rejection: ${event.reason}`,
          stack_trace: event.reason?.stack,
          context: { 
            source: 'unhandledrejection',
            promise: event.promise 
          },
          tags: ['promise', 'unhandled']
        });
      });
    }

    // React Native specific error handling
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      // Set up React Native error handler
      const ErrorUtils = require('ErrorUtils');
      const originalHandler = ErrorUtils.getGlobalHandler();
      
      ErrorUtils.setGlobalHandler((error: Error, isFatal: boolean) => {
        this.reportError({
          error_type: 'crash',
          severity: isFatal ? 'critical' : 'high',
          message: error.message,
          stack_trace: error.stack,
          context: { 
            is_fatal: isFatal,
            source: 'react_native_global_handler'
          },
          tags: ['crash', 'react-native']
        });

        // Call original handler
        if (originalHandler) {
          originalHandler(error, isFatal);
        }
      });
    }
  }

  /**
   * Set up performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    // Monitor app startup time
    const startTime = Date.now();
    
    // This would be called when app is fully loaded
    setTimeout(() => {
      this.recordPerformanceMetric({
        metric_type: 'app_start',
        metric_name: 'app_startup_time',
        value: Date.now() - startTime,
        unit: 'ms',
        context: { 
          cold_start: true,
          device_info: this.deviceInfo 
        }
      });
    }, 100);

    // Monitor memory usage periodically
    setInterval(() => {
      if (global.performance && global.performance.memory) {
        this.recordPerformanceMetric({
          metric_type: 'performance',
          metric_name: 'memory_usage',
          value: global.performance.memory.usedJSHeapSize,
          unit: 'bytes',
          context: {
            total_heap: global.performance.memory.totalJSHeapSize,
            heap_limit: global.performance.memory.jsHeapSizeLimit
          }
        });
      }
    }, 60000); // Every minute
  }

  /**
   * Set user context for error reporting
   */
  setUserContext(userId: string, sessionId?: string): void {
    this.userId = userId;
    this.sessionId = sessionId;
    console.log('[ErrorMonitor] User context set:', { userId, sessionId });
  }

  /**
   * Clear user context (on logout)
   */
  clearUserContext(): void {
    this.userId = null;
    this.sessionId = null;
    console.log('[ErrorMonitor] User context cleared');
  }

  /**
   * Report an error
   */
  async reportError(errorData: Partial<ErrorReport>): Promise<void> {
    try {
      const errorReport: ErrorReport = {
        error_type: errorData.error_type || 'javascript',
        severity: errorData.severity || 'medium',
        message: errorData.message || 'Unknown error',
        stack_trace: errorData.stack_trace,
        user_id: errorData.user_id || this.userId || undefined,
        session_id: errorData.session_id || this.sessionId || undefined,
        context: {
          ...errorData.context,
          url: typeof window !== 'undefined' ? window.location?.href : undefined,
          user_agent: this.getUserAgent()
        },
        device_info: this.deviceInfo,
        app_version: this.appVersion,
        timestamp: new Date().toISOString(),
        tags: errorData.tags || []
      };

      // Add to queue
      this.errorQueue.push(errorReport);

      // Try to send immediately if online
      if (this.isOnline && this.errorQueue.length === 1) {
        await this.flushErrorQueue();
      }

      // Log locally for debugging
      console.error('[ErrorMonitor] Error reported:', {
        type: errorReport.error_type,
        severity: errorReport.severity,
        message: errorReport.message
      });

      // Cache critical errors locally
      if (errorReport.severity === 'critical') {
        await this.cacheErrorLocally(errorReport);
      }
    } catch (error) {
      console.error('[ErrorMonitor] Failed to report error:', error);
    }
  }

  /**
   * Record performance metric
   */
  async recordPerformanceMetric(metricData: Partial<PerformanceMetric>): Promise<void> {
    try {
      const metric: PerformanceMetric = {
        metric_type: metricData.metric_type || 'performance',
        metric_name: metricData.metric_name || 'unknown_metric',
        value: metricData.value || 0,
        unit: metricData.unit || 'ms',
        user_id: metricData.user_id || this.userId || undefined,
        session_id: metricData.session_id || this.sessionId || undefined,
        context: metricData.context || {},
        timestamp: new Date().toISOString()
      };

      // Add to queue
      this.performanceQueue.push(metric);

      // Log for debugging
      console.log('[ErrorMonitor] Performance metric recorded:', {
        name: metric.metric_name,
        value: metric.value,
        unit: metric.unit
      });
    } catch (error) {
      console.error('[ErrorMonitor] Failed to record performance metric:', error);
    }
  }

  /**
   * Log application event
   */
  async log(
    level: LogEntry['level'],
    message: string,
    category: string,
    context?: Record<string, any>
  ): Promise<void> {
    try {
      const logEntry: LogEntry = {
        level,
        message,
        category,
        context: context || {},
        timestamp: new Date().toISOString(),
        user_id: this.userId || undefined,
        session_id: this.sessionId || undefined
      };

      // Add to queue
      this.logQueue.push(logEntry);

      // Console log based on level
      const consoleMethod = level === 'debug' ? 'debug' :
                           level === 'info' ? 'info' :
                           level === 'warn' ? 'warn' :
                           'error';
      
      console[consoleMethod](`[${category}] ${message}`, context);
    } catch (error) {
      console.error('[ErrorMonitor] Failed to log:', error);
    }
  }

  /**
   * Monitor API call performance
   */
  async monitorApiCall<T>(
    apiName: string,
    apiCall: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    const startTime = Date.now();
    let success = false;
    let error: Error | null = null;

    try {
      const result = await apiCall();
      success = true;
      return result;
    } catch (err) {
      error = err as Error;
      
      // Report API error
      await this.reportError({
        error_type: 'network',
        severity: 'medium',
        message: `API call failed: ${apiName}`,
        stack_trace: error.stack,
        context: {
          api_name: apiName,
          ...context
        },
        tags: ['api', 'network']
      });
      
      throw err;
    } finally {
      const duration = Date.now() - startTime;
      
      // Record performance metric
      await this.recordPerformanceMetric({
        metric_type: 'api_call',
        metric_name: apiName,
        value: duration,
        unit: 'ms',
        context: {
          success,
          error_message: error?.message,
          ...context
        }
      });
    }
  }

  /**
   * Monitor screen load performance
   */
  async monitorScreenLoad(screenName: string, loadFunction: () => Promise<void>): Promise<void> {
    const startTime = Date.now();
    
    try {
      await loadFunction();
      
      const loadTime = Date.now() - startTime;
      
      await this.recordPerformanceMetric({
        metric_type: 'screen_load',
        metric_name: screenName,
        value: loadTime,
        unit: 'ms',
        context: {
          screen_name: screenName,
          success: true
        }
      });

      await this.log('info', `Screen loaded: ${screenName}`, 'navigation', {
        load_time: loadTime,
        screen_name: screenName
      });
    } catch (error) {
      await this.reportError({
        error_type: 'performance',
        severity: 'medium',
        message: `Screen load failed: ${screenName}`,
        stack_trace: (error as Error).stack,
        context: {
          screen_name: screenName,
          load_time: Date.now() - startTime
        },
        tags: ['screen-load', 'performance']
      });
      
      throw error;
    }
  }

  /**
   * Flush error queue to server
   */
  private async flushErrorQueue(): Promise<void> {
    if (this.errorQueue.length === 0) return;

    try {
      const errors = [...this.errorQueue];
      this.errorQueue = [];

      const { error } = await supabase
        .from('error_reports')
        .insert(errors);

      if (error) {
        console.error('[ErrorMonitor] Failed to flush error queue:', error);
        // Put errors back in queue
        this.errorQueue.unshift(...errors);
      } else {
        console.log(`[ErrorMonitor] Flushed ${errors.length} errors to server`);
      }
    } catch (error) {
      console.error('[ErrorMonitor] Error flushing error queue:', error);
    }
  }

  /**
   * Flush performance queue to server
   */
  private async flushPerformanceQueue(): Promise<void> {
    if (this.performanceQueue.length === 0) return;

    try {
      const metrics = [...this.performanceQueue];
      this.performanceQueue = [];

      const { error } = await supabase
        .from('performance_metrics')
        .insert(metrics);

      if (error) {
        console.error('[ErrorMonitor] Failed to flush performance queue:', error);
        // Put metrics back in queue
        this.performanceQueue.unshift(...metrics);
      } else {
        console.log(`[ErrorMonitor] Flushed ${metrics.length} performance metrics to server`);
      }
    } catch (error) {
      console.error('[ErrorMonitor] Error flushing performance queue:', error);
    }
  }

  /**
   * Flush log queue to server
   */
  private async flushLogQueue(): Promise<void> {
    if (this.logQueue.length === 0) return;

    try {
      const logs = [...this.logQueue];
      this.logQueue = [];

      const { error } = await supabase
        .from('application_logs')
        .insert(logs);

      if (error) {
        console.error('[ErrorMonitor] Failed to flush log queue:', error);
        // Put logs back in queue
        this.logQueue.unshift(...logs);
      } else {
        console.log(`[ErrorMonitor] Flushed ${logs.length} logs to server`);
      }
    } catch (error) {
      console.error('[ErrorMonitor] Error flushing log queue:', error);
    }
  }

  /**
   * Start interval to flush queues
   */
  private startQueueFlushInterval(): void {
    setInterval(async () => {
      if (this.isOnline) {
        await Promise.all([
          this.flushErrorQueue(),
          this.flushPerformanceQueue(),
          this.flushLogQueue()
        ]);
      }
    }, 30000); // Flush every 30 seconds
  }

  /**
   * Cache critical errors locally
   */
  private async cacheErrorLocally(error: ErrorReport): Promise<void> {
    try {
      await cacheManager.set(
        `critical_error_${Date.now()}`,
        error,
        'errors',
        24 * 60 * 60 * 1000 // 24 hours
      );
    } catch (err) {
      console.error('[ErrorMonitor] Failed to cache error locally:', err);
    }
  }

  /**
   * Get user agent string
   */
  private getUserAgent(): string {
    return `TeaKE-Mobile/${this.appVersion} (${Platform.OS} ${Platform.Version})`;
  }

  /**
   * Set online status
   */
  setOnlineStatus(isOnline: boolean): void {
    this.isOnline = isOnline;
    
    if (isOnline) {
      // Flush queues when back online
      setTimeout(() => {
        this.flushErrorQueue();
        this.flushPerformanceQueue();
        this.flushLogQueue();
      }, 1000);
    }
  }

  /**
   * Get error statistics
   */
  getStats(): {
    errorQueueSize: number;
    performanceQueueSize: number;
    logQueueSize: number;
    totalMemoryUsage: number;
  } {
    return {
      errorQueueSize: this.errorQueue.length,
      performanceQueueSize: this.performanceQueue.length,
      logQueueSize: this.logQueue.length,
      totalMemoryUsage: JSON.stringify({
        errors: this.errorQueue,
        performance: this.performanceQueue,
        logs: this.logQueue
      }).length
    };
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    // Flush remaining queues
    this.flushErrorQueue();
    this.flushPerformanceQueue();
    this.flushLogQueue();
    
    // Clear queues
    this.errorQueue = [];
    this.performanceQueue = [];
    this.logQueue = [];
  }
}

// Create singleton instance
export const errorMonitor = new ErrorMonitor();

/**
 * Utility functions for common error monitoring tasks
 */
export const errorUtils = {
  /**
   * Wrap async function with error monitoring
   */
  withErrorMonitoring: <T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    context?: Record<string, any>
  ) => {
    return async (...args: T): Promise<R> => {
      try {
        return await fn(...args);
      } catch (error) {
        await errorMonitor.reportError({
          error_type: 'javascript',
          severity: 'medium',
          message: (error as Error).message,
          stack_trace: (error as Error).stack,
          context: {
            function_name: fn.name,
            arguments: args,
            ...context
          },
          tags: ['wrapped-function']
        });
        throw error;
      }
    };
  },

  /**
   * Report user action for analytics
   */
  trackUserAction: async (
    action: string,
    category: string,
    context?: Record<string, any>
  ): Promise<void> => {
    await errorMonitor.log('info', `User action: ${action}`, category, {
      action,
      ...context
    });
  },

  /**
   * Report performance issue
   */
  reportPerformanceIssue: async (
    issue: string,
    metrics: Record<string, number>,
    context?: Record<string, any>
  ): Promise<void> => {
    await errorMonitor.reportError({
      error_type: 'performance',
      severity: 'medium',
      message: `Performance issue: ${issue}`,
      context: {
        metrics,
        ...context
      },
      tags: ['performance', 'slow']
    });
  }
};

export default errorMonitor;