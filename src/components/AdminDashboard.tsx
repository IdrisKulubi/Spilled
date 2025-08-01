/**
 * Admin Dashboard Component
 * Comprehensive monitoring and management interface
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { securityMonitor, SecurityDashboard } from '../utils/securityMonitoring';
import { errorMonitor } from '../utils/errorMonitoring';
import { cacheManager } from '../utils/caching';
import { fileStorageManager } from '../utils/fileStorage';
import { supabase } from '../config/supabase';

interface ErrorDashboard {
  total_errors: number;
  critical_errors: number;
  high_errors: number;
  medium_errors: number;
  low_errors: number;
  error_rate_per_hour: number;
  top_error_types: Array<{ error_type: string; count: number; severity: string }>;
  recent_critical_errors: Array<{
    id: string;
    error_type: string;
    message: string;
    created_at: string;
    user_id?: string;
    app_version: string;
    tags: string[];
  }>;
  performance_summary: {
    avg_api_response_time: number;
    avg_screen_load_time: number;
    total_performance_metrics: number;
    slow_operations: number;
  };
}

interface BackupDashboard {
  total_backups: number;
  successful_backups: number;
  failed_backups: number;
  last_successful_backup: string;
  total_backup_size: number;
  active_configurations: number;
  recent_executions: Array<{
    id: string;
    backup_name: string;
    status: string;
    start_time: string;
    duration_seconds: number;
    backup_size_bytes: number;
  }>;
  storage_usage: {
    total_archived_records: number;
    total_archives: number;
    total_archive_size: number;
  };
}

const { width } = Dimensions.get('window');

export const AdminDashboard: React.FC = () => {
  const [securityData, setSecurityData] = useState<SecurityDashboard | null>(null);
  const [errorData, setErrorData] = useState<ErrorDashboard | null>(null);
  const [backupData, setBackupData] = useState<BackupDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState(24);

  const loadDashboardData = useCallback(async () => {
    try {
      console.log('[AdminDashboard] Loading dashboard data...');
      
      // Load security dashboard
      const securityResult = await securityMonitor.getSecurityDashboard(selectedTimeRange);
      if (securityResult.success && securityResult.data) {
        setSecurityData(securityResult.data);
      }

      // Load error dashboard
      const { data: errorResult, error: errorError } = await supabase.rpc('get_error_dashboard', {
        p_hours: selectedTimeRange
      });
      
      if (errorError) {
        console.error('[AdminDashboard] Error loading error dashboard:', errorError);
      } else if (errorResult && errorResult.length > 0) {
        setErrorData(errorResult[0]);
      }

      // Load backup dashboard
      const { data: backupResult, error: backupError } = await supabase.rpc('get_backup_dashboard');
      
      if (backupError) {
        console.error('[AdminDashboard] Error loading backup dashboard:', backupError);
      } else if (backupResult && backupResult.length > 0) {
        setBackupData(backupResult[0]);
      }

      console.log('[AdminDashboard] Dashboard data loaded successfully');
    } catch (error) {
      console.error('[AdminDashboard] Failed to load dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [selectedTimeRange]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboardData();
  }, [loadDashboardData]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#d97706';
      case 'low': return '#65a30d';
      default: return '#6b7280';
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed': return '#16a34a';
      case 'failed': return '#dc2626';
      case 'running': return '#2563eb';
      default: return '#6b7280';
    }
  };

  const handleClearCache = async () => {
    Alert.alert(
      'Clear Cache',
      'Are you sure you want to clear all cached data?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await cacheManager.clear();
              Alert.alert('Success', 'Cache cleared successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear cache');
            }
          }
        }
      ]
    );
  };

  const handleCleanupFiles = async () => {
    Alert.alert(
      'Cleanup Files',
      'This will remove orphaned files and optimize storage. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Cleanup',
          onPress: async () => {
            try {
              const result = await fileStorageManager.cleanupOrphanedFiles();
              if (result.success) {
                Alert.alert('Success', `Cleaned up ${result.cleanedCount} files`);
              } else {
                Alert.alert('Error', result.error || 'Cleanup failed');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to cleanup files');
            }
          }
        }
      ]
    );
  };

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    subtitle?: string;
    color?: string;
    onPress?: () => void;
  }> = ({ title, value, subtitle, color = '#3b82f6', onPress }) => (
    <TouchableOpacity
      style={[styles.statCard, onPress && styles.statCardPressable]}
      onPress={onPress}
      disabled={!onPress}
    >
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </TouchableOpacity>
  );

  const TimeRangeSelector: React.FC = () => (
    <View style={styles.timeRangeContainer}>
      <Text style={styles.sectionTitle}>Time Range:</Text>
      <View style={styles.timeRangeButtons}>
        {[1, 6, 24, 168].map((hours) => (
          <TouchableOpacity
            key={hours}
            style={[
              styles.timeRangeButton,
              selectedTimeRange === hours && styles.timeRangeButtonActive
            ]}
            onPress={() => setSelectedTimeRange(hours)}
          >
            <Text style={[
              styles.timeRangeButtonText,
              selectedTimeRange === hours && styles.timeRangeButtonTextActive
            ]}>
              {hours === 1 ? '1h' : hours === 6 ? '6h' : hours === 24 ? '24h' : '7d'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <Text style={styles.headerSubtitle}>System monitoring and management</Text>
      </View>

      <TimeRangeSelector />

      {/* Security Overview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security Overview</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="Total Events"
            value={securityData?.total_events || 0}
            color="#6b7280"
          />
          <StatCard
            title="Critical"
            value={securityData?.critical_events || 0}
            color={getSeverityColor('critical')}
          />
          <StatCard
            title="High Priority"
            value={securityData?.high_events || 0}
            color={getSeverityColor('high')}
          />
          <StatCard
            title="Active Sessions"
            value={securityData?.active_sessions || 0}
            color="#16a34a"
          />
        </View>
      </View>

      {/* Error Monitoring */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Error Monitoring</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="Total Errors"
            value={errorData?.total_errors || 0}
            color="#6b7280"
          />
          <StatCard
            title="Critical Errors"
            value={errorData?.critical_errors || 0}
            color={getSeverityColor('critical')}
          />
          <StatCard
            title="Error Rate"
            value={`${(errorData?.error_rate_per_hour || 0).toFixed(1)}/hr`}
            color="#ea580c"
          />
          <StatCard
            title="Avg API Time"
            value={`${(errorData?.performance_summary?.avg_api_response_time || 0).toFixed(0)}ms`}
            color="#2563eb"
          />
        </View>
      </View>

      {/* Backup Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Backup Status</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="Total Backups"
            value={backupData?.total_backups || 0}
            color="#6b7280"
          />
          <StatCard
            title="Successful"
            value={backupData?.successful_backups || 0}
            color="#16a34a"
          />
          <StatCard
            title="Failed"
            value={backupData?.failed_backups || 0}
            color="#dc2626"
          />
          <StatCard
            title="Storage Used"
            value={formatBytes(backupData?.total_backup_size || 0)}
            color="#2563eb"
          />
        </View>
      </View>

      {/* Recent Critical Errors */}
      {errorData?.recent_critical_errors && errorData.recent_critical_errors.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Critical Errors</Text>
          {errorData.recent_critical_errors.slice(0, 5).map((error) => (
            <View key={error.id} style={styles.errorItem}>
              <View style={styles.errorHeader}>
                <Text style={styles.errorType}>{error.error_type}</Text>
                <Text style={styles.errorTime}>
                  {new Date(error.created_at).toLocaleString()}
                </Text>
              </View>
              <Text style={styles.errorMessage} numberOfLines={2}>
                {error.message}
              </Text>
              {error.tags && error.tags.length > 0 && (
                <View style={styles.errorTags}>
                  {error.tags.slice(0, 3).map((tag, index) => (
                    <Text key={index} style={styles.errorTag}>
                      {tag}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Recent Backups */}
      {backupData?.recent_executions && backupData.recent_executions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Backups</Text>
          {backupData.recent_executions.slice(0, 5).map((backup) => (
            <View key={backup.id} style={styles.backupItem}>
              <View style={styles.backupHeader}>
                <Text style={styles.backupName}>{backup.backup_name}</Text>
                <Text style={[styles.backupStatus, { color: getStatusColor(backup.status) }]}>
                  {backup.status}
                </Text>
              </View>
              <View style={styles.backupDetails}>
                <Text style={styles.backupDetail}>
                  Duration: {formatDuration(backup.duration_seconds)}
                </Text>
                <Text style={styles.backupDetail}>
                  Size: {formatBytes(backup.backup_size_bytes)}
                </Text>
              </View>
              <Text style={styles.backupTime}>
                {new Date(backup.start_time).toLocaleString()}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* System Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>System Actions</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={handleClearCache}>
            <Text style={styles.actionButtonText}>Clear Cache</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleCleanupFiles}>
            <Text style={styles.actionButtonText}>Cleanup Files</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* System Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>System Statistics</Text>
        <View style={styles.systemStats}>
          <Text style={styles.systemStat}>
            Cache Items: {cacheManager.getStats().memoryItems}
          </Text>
          <Text style={styles.systemStat}>
            Cache Memory: {formatBytes(cacheManager.getStats().totalMemorySize)}
          </Text>
          <Text style={styles.systemStat}>
            Upload Queue: {fileStorageManager.getStats().uploadQueueSize}
          </Text>
          <Text style={styles.systemStat}>
            Error Queue: {errorMonitor.getStats().errorQueueSize}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  timeRangeContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
    marginBottom: 8,
  },
  timeRangeButtons: {
    flexDirection: 'row',
    marginTop: 8,
  },
  timeRangeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  timeRangeButtonActive: {
    backgroundColor: '#3b82f6',
  },
  timeRangeButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  timeRangeButtonTextActive: {
    color: '#ffffff',
  },
  section: {
    backgroundColor: '#ffffff',
    marginBottom: 8,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  statCard: {
    width: (width - 48) / 2,
    backgroundColor: '#f8fafc',
    padding: 16,
    margin: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statCardPressable: {
    opacity: 0.8,
  },
  statTitle: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statSubtitle: {
    fontSize: 10,
    color: '#9ca3af',
  },
  errorItem: {
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
  },
  errorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  errorType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
  },
  errorTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  errorMessage: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 8,
  },
  errorTags: {
    flexDirection: 'row',
  },
  errorTag: {
    fontSize: 10,
    color: '#7c2d12',
    backgroundColor: '#fed7aa',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 4,
  },
  backupItem: {
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  backupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  backupName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
  },
  backupStatus: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  backupDetails: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  backupDetail: {
    fontSize: 12,
    color: '#6b7280',
    marginRight: 16,
  },
  backupTime: {
    fontSize: 11,
    color: '#9ca3af',
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  actionButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  systemStats: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
  },
  systemStat: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 4,
  },
});

export default AdminDashboard;