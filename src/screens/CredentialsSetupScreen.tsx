/**
 * Credentials Setup Screen
 * Allows secure configuration of Supabase credentials
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { secureConfig, AppCredentials } from '../config/secureConfig';
import { initializeSupabase } from '../config/supabase';

interface CredentialsSetupScreenProps {
  onComplete: () => void;
  onCancel?: () => void;
}

export const CredentialsSetupScreen: React.FC<CredentialsSetupScreenProps> = ({
  onComplete,
  onCancel
}) => {
  const [credentials, setCredentials] = useState<AppCredentials>({
    supabaseUrl: '',
    supabaseAnonKey: '',
    adminEmail: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateCredentials = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!credentials.supabaseUrl.trim()) {
      newErrors.supabaseUrl = 'Supabase URL is required';
    } else if (!credentials.supabaseUrl.startsWith('https://')) {
      newErrors.supabaseUrl = 'URL must start with https://';
    } else if (!credentials.supabaseUrl.includes('supabase.co')) {
      newErrors.supabaseUrl = 'Must be a valid Supabase project URL';
    }

    if (!credentials.supabaseAnonKey.trim()) {
      newErrors.supabaseAnonKey = 'Anonymous Key is required';
    } else if (credentials.supabaseAnonKey.length < 100) {
      newErrors.supabaseAnonKey = 'Key appears to be invalid (too short)';
    }

    if (credentials.adminEmail && credentials.adminEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(credentials.adminEmail)) {
        newErrors.adminEmail = 'Please enter a valid email address';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateCredentials()) {
      return;
    }

    setIsLoading(true);

    try {
      console.log('[CredentialsSetup] Saving credentials...');

      // Validate credentials format
      const validation = secureConfig.validateCredentials(credentials);
      if (!validation.valid) {
        Alert.alert('Invalid Credentials', validation.errors.join('\n'));
        setIsLoading(false);
        return;
      }

      // Save credentials securely
      await secureConfig.setCredentials(credentials);

      // Test the connection
      console.log('[CredentialsSetup] Testing connection...');
      await initializeSupabase();

      // Success
      Alert.alert(
        'Success',
        'Credentials saved successfully! The app will now restart.',
        [
          {
            text: 'OK',
            onPress: onComplete
          }
        ]
      );

    } catch (error) {
      console.error('[CredentialsSetup] Failed to save credentials:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      Alert.alert(
        'Setup Failed',
        `Failed to configure credentials: ${errorMessage}\n\nPlease check your credentials and try again.`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!validateCredentials()) {
      return;
    }

    setIsLoading(true);

    try {
      console.log('[CredentialsSetup] Testing connection...');

      // Temporarily set credentials for testing
      await secureConfig.setCredentials(credentials);
      
      // Try to initialize Supabase
      await initializeSupabase();

      Alert.alert('Success', 'Connection test successful! You can now save these credentials.');
    } catch (error) {
      console.error('[CredentialsSetup] Connection test failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      
      Alert.alert(
        'Connection Failed',
        `Unable to connect to Supabase: ${errorMessage}\n\nPlease check your credentials.`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <Text style={styles.title}>Setup Credentials</Text>
          <Text style={styles.subtitle}>
            Configure your Supabase credentials to get started with TeaKE
          </Text>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Supabase Project URL *</Text>
              <TextInput
                style={[styles.input, errors.supabaseUrl && styles.inputError]}
                value={credentials.supabaseUrl}
                onChangeText={(text) => setCredentials(prev => ({ ...prev, supabaseUrl: text.trim() }))}
                placeholder="https://your-project.supabase.co"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                editable={!isLoading}
              />
              {errors.supabaseUrl && (
                <Text style={styles.errorText}>{errors.supabaseUrl}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Supabase Anonymous Key *</Text>
              <TextInput
                style={[styles.input, styles.multilineInput, errors.supabaseAnonKey && styles.inputError]}
                value={credentials.supabaseAnonKey}
                onChangeText={(text) => setCredentials(prev => ({ ...prev, supabaseAnonKey: text.trim() }))}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              {errors.supabaseAnonKey && (
                <Text style={styles.errorText}>{errors.supabaseAnonKey}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Admin Email (Optional)</Text>
              <TextInput
                style={[styles.input, errors.adminEmail && styles.inputError]}
                value={credentials.adminEmail}
                onChangeText={(text) => setCredentials(prev => ({ ...prev, adminEmail: text.trim() }))}
                placeholder="admin@example.com"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                editable={!isLoading}
              />
              {errors.adminEmail && (
                <Text style={styles.errorText}>{errors.adminEmail}</Text>
              )}
              <Text style={styles.helpText}>
                This email will have admin privileges in the app
              </Text>
            </View>
          </View>

          <View style={styles.instructions}>
            <Text style={styles.instructionsTitle}>How to get your credentials:</Text>
            <Text style={styles.instructionStep}>
              1. Go to your Supabase project dashboard
            </Text>
            <Text style={styles.instructionStep}>
              2. Navigate to Settings → API
            </Text>
            <Text style={styles.instructionStep}>
              3. Copy the Project URL and anon/public key
            </Text>
          </View>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.testButton]}
              onPress={handleTestConnection}
              disabled={isLoading}
            >
              <Text style={styles.testButtonText}>
                {isLoading ? 'Testing...' : 'Test Connection'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}
              disabled={isLoading}
            >
              <Text style={styles.saveButtonText}>
                {isLoading ? 'Saving...' : 'Save & Continue'}
              </Text>
            </TouchableOpacity>

            {onCancel && (
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onCancel}
                disabled={isLoading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  form: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#dc2626',
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
    marginTop: 4,
  },
  helpText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  instructions: {
    backgroundColor: '#f0f9ff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 8,
  },
  instructionStep: {
    fontSize: 14,
    color: '#1e40af',
    marginBottom: 4,
  },
  buttons: {
    gap: 12,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  saveButton: {
    backgroundColor: '#3b82f6',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  cancelButton: {
    backgroundColor: 'transparent',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
});

export default CredentialsSetupScreen;