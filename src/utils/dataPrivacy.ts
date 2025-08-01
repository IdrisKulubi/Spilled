/**
 * Data Privacy and GDPR Compliance Utilities
 */

import { supabase } from '../config/supabase';
import { Alert } from 'react-native';

export interface DataExportResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface DataDeletionResult {
  success: boolean;
  error?: string;
}

export interface PrivacySettings {
  allowDataCollection: boolean;
  allowAnalytics: boolean;
  allowMarketing: boolean;
  dataRetentionDays: number;
}

/**
 * Export user's personal data (GDPR Article 20)
 */
export const exportUserData = async (userId: string): Promise<DataExportResult> => {
  try {
    console.log('[DataPrivacy] Exporting user data for:', userId);

    const { data, error } = await supabase.rpc('export_user_data', {
      p_user_id: userId
    });

    if (error) {
      console.error('[DataPrivacy] Export error:', error);
      return {
        success: false,
        error: error.message || 'Failed to export user data'
      };
    }

    console.log('[DataPrivacy] Data export completed successfully');
    return {
      success: true,
      data: data
    };
  } catch (error: any) {
    console.error('[DataPrivacy] Export error:', error);
    return {
      success: false,
      error: error.message || 'Failed to export user data'
    };
  }
};

/**
 * Securely delete user's personal data (GDPR Article 17 - Right to be forgotten)
 */
export const deleteUserData = async (userId: string): Promise<DataDeletionResult> => {
  try {
    console.log('[DataPrivacy] Initiating secure data deletion for:', userId);

    // Show confirmation dialog
    return new Promise((resolve) => {
      Alert.alert(
        'Delete All Data',
        'This will permanently delete all your personal data including:\n\n• Your profile information\n• Your messages\n• Your verification data\n\nYour stories and comments will be anonymized to preserve community discussions.\n\nThis action cannot be undone.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve({ success: false, error: 'User cancelled deletion' })
          },
          {
            text: 'Delete My Data',
            style: 'destructive',
            onPress: async () => {
              try {
                const { error } = await supabase.rpc('secure_delete_user_data', {
                  p_user_id: userId
                });

                if (error) {
                  console.error('[DataPrivacy] Deletion error:', error);
                  resolve({
                    success: false,
                    error: error.message || 'Failed to delete user data'
                  });
                  return;
                }

                console.log('[DataPrivacy] User data deleted successfully');
                resolve({ success: true });
              } catch (error: any) {
                console.error('[DataPrivacy] Deletion error:', error);
                resolve({
                  success: false,
                  error: error.message || 'Failed to delete user data'
                });
              }
            }
          }
        ]
      );
    });
  } catch (error: any) {
    console.error('[DataPrivacy] Deletion error:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete user data'
    };
  }
};

/**
 * Get user's privacy settings
 */
export const getPrivacySettings = async (userId: string): Promise<PrivacySettings | null> => {
  try {
    const { data, error } = await supabase
      .from('user_privacy_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('[DataPrivacy] Error fetching privacy settings:', error);
      return null;
    }

    // Return default settings if none exist
    if (!data) {
      return {
        allowDataCollection: true,
        allowAnalytics: false,
        allowMarketing: false,
        dataRetentionDays: 365
      };
    }

    return {
      allowDataCollection: data.allow_data_collection ?? true,
      allowAnalytics: data.allow_analytics ?? false,
      allowMarketing: data.allow_marketing ?? false,
      dataRetentionDays: data.data_retention_days ?? 365
    };
  } catch (error) {
    console.error('[DataPrivacy] Error getting privacy settings:', error);
    return null;
  }
};

/**
 * Update user's privacy settings
 */
export const updatePrivacySettings = async (
  userId: string,
  settings: Partial<PrivacySettings>
): Promise<{ success: boolean; error?: string }> => {
  try {
    const updateData = {
      user_id: userId,
      allow_data_collection: settings.allowDataCollection,
      allow_analytics: settings.allowAnalytics,
      allow_marketing: settings.allowMarketing,
      data_retention_days: settings.dataRetentionDays,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('user_privacy_settings')
      .upsert(updateData, { onConflict: 'user_id' });

    if (error) {
      console.error('[DataPrivacy] Error updating privacy settings:', error);
      return {
        success: false,
        error: error.message || 'Failed to update privacy settings'
      };
    }

    console.log('[DataPrivacy] Privacy settings updated successfully');
    return { success: true };
  } catch (error: any) {
    console.error('[DataPrivacy] Error updating privacy settings:', error);
    return {
      success: false,
      error: error.message || 'Failed to update privacy settings'
    };
  }
};

/**
 * Anonymize user data (for partial deletion requests)
 */
export const anonymizeUserData = async (userId: string): Promise<DataDeletionResult> => {
  try {
    console.log('[DataPrivacy] Anonymizing user data for:', userId);

    const { error } = await supabase.rpc('anonymize_user_data', {
      p_user_id: userId
    });

    if (error) {
      console.error('[DataPrivacy] Anonymization error:', error);
      return {
        success: false,
        error: error.message || 'Failed to anonymize user data'
      };
    }

    console.log('[DataPrivacy] User data anonymized successfully');
    return { success: true };
  } catch (error: any) {
    console.error('[DataPrivacy] Anonymization error:', error);
    return {
      success: false,
      error: error.message || 'Failed to anonymize user data'
    };
  }
};

/**
 * Check if user has given consent for data processing
 */
export const hasUserConsent = async (
  userId: string,
  consentType: 'data_collection' | 'analytics' | 'marketing'
): Promise<boolean> => {
  try {
    const settings = await getPrivacySettings(userId);
    if (!settings) return false;

    switch (consentType) {
      case 'data_collection':
        return settings.allowDataCollection;
      case 'analytics':
        return settings.allowAnalytics;
      case 'marketing':
        return settings.allowMarketing;
      default:
        return false;
    }
  } catch (error) {
    console.error('[DataPrivacy] Error checking consent:', error);
    return false;
  }
};

/**
 * Log data processing activity for audit purposes
 */
export const logDataProcessing = async (
  userId: string,
  activity: string,
  purpose: string,
  dataTypes: string[]
): Promise<void> => {
  try {
    await supabase.rpc('log_audit_event', {
      p_user_id: userId,
      p_action: 'DATA_PROCESSING',
      p_resource_type: 'privacy',
      p_resource_id: null,
      p_old_values: null,
      p_new_values: {
        activity,
        purpose,
        data_types: dataTypes,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[DataPrivacy] Error logging data processing:', error);
    // Don't throw error as this is for audit purposes only
  }
};

/**
 * Generate privacy report for user
 */
export const generatePrivacyReport = async (userId: string): Promise<{
  success: boolean;
  report?: any;
  error?: string;
}> => {
  try {
    console.log('[DataPrivacy] Generating privacy report for:', userId);

    // Get user's data export
    const exportResult = await exportUserData(userId);
    if (!exportResult.success) {
      return {
        success: false,
        error: exportResult.error
      };
    }

    // Get privacy settings
    const privacySettings = await getPrivacySettings(userId);

    // Get audit logs related to this user
    const { data: auditLogs, error: auditError } = await supabase
      .from('audit_logs')
      .select('action, resource_type, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (auditError) {
      console.warn('[DataPrivacy] Could not fetch audit logs:', auditError);
    }

    const report = {
      user_data: exportResult.data,
      privacy_settings: privacySettings,
      recent_activity: auditLogs || [],
      report_generated_at: new Date().toISOString(),
      data_retention_info: {
        messages: 'Auto-deleted after 7 days',
        stories: 'Retained indefinitely (can be anonymized)',
        profile: 'Retained until account deletion',
        verification_data: 'Retained for compliance purposes'
      }
    };

    return {
      success: true,
      report
    };
  } catch (error: any) {
    console.error('[DataPrivacy] Error generating privacy report:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate privacy report'
    };
  }
};

/**
 * Validate data retention compliance
 */
export const validateDataRetention = async (): Promise<{
  success: boolean;
  violations?: string[];
  error?: string;
}> => {
  try {
    console.log('[DataPrivacy] Validating data retention compliance');

    const violations: string[] = [];

    // Check for expired messages that should be deleted
    const { data: expiredMessages, error: messageError } = await supabase
      .from('messages')
      .select('id')
      .lt('expires_at', new Date().toISOString())
      .limit(1);

    if (messageError) {
      console.error('[DataPrivacy] Error checking expired messages:', messageError);
    } else if (expiredMessages && expiredMessages.length > 0) {
      violations.push('Expired messages found that should be auto-deleted');
    }

    // Check for users who requested data deletion but still have data
    const { data: deletionRequests, error: deletionError } = await supabase
      .from('audit_logs')
      .select('user_id')
      .eq('action', 'SECURE_DELETE_USER')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

    if (deletionError) {
      console.error('[DataPrivacy] Error checking deletion requests:', deletionError);
    } else if (deletionRequests) {
      for (const request of deletionRequests) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('id', request.user_id)
          .maybeSingle();

        if (!userError && userData) {
          violations.push(`User ${request.user_id} requested deletion but data still exists`);
        }
      }
    }

    return {
      success: true,
      violations: violations.length > 0 ? violations : undefined
    };
  } catch (error: any) {
    console.error('[DataPrivacy] Error validating data retention:', error);
    return {
      success: false,
      error: error.message || 'Failed to validate data retention'
    };
  }
};