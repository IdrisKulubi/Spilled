/**
 * Profile Screen - View and edit user information
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity
} from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { TeaKEStyles, Spacing } from '@/src/constants/Styles';
import { TeaKEButton, TeaKECard } from '@/src/components/ui';
import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

export const ProfileScreen: React.FC = () => {
  const { user, updateProfile, signOut, isAdmin } = useAuth();
  const router = useRouter();

  const [nickname, setNickname] = useState(user?.nickname || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!user) {
    return null; // Should be handled by navigation logic
  }

  const handleUpdate = async () => {
    if (!nickname.trim()) {
      Alert.alert('Nickname required', 'Please enter a nickname.');
      return;
    }

    setIsSaving(true);
    const { success, error } = await updateProfile({ nickname, phone });
    setIsSaving(false);

    if (success) {
      Alert.alert('Profile Updated', 'Your information has been saved.');
      setIsEditing(false);
    } else {
      Alert.alert('Update Failed', error || 'Could not update your profile.');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/');
  };

  const handleAdminAccess = () => {
    router.push('/admin');
  };

  return (
    <SafeAreaView style={TeaKEStyles.safeContainer}>
      <ScrollView
        style={TeaKEStyles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={TeaKEStyles.heading1}>Your Profile</Text>
          <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
            <MaterialIcons 
              name={isEditing ? 'close' : 'edit'} 
              size={24} 
              color={Colors.light.primary} 
            />
          </TouchableOpacity>
        </View>

        <TeaKECard>
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{user.email}</Text>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Nickname</Text>
            {isEditing ? (
              <TextInput
                style={[TeaKEStyles.textInput, styles.input]}
                value={nickname}
                onChangeText={setNickname}
                placeholder="Your public nickname"
              />
            ) : (
              <Text style={styles.value}>{nickname || 'Not set'}</Text>
            )}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Phone Number</Text>
            {isEditing ? (
              <TextInput
                style={[TeaKEStyles.textInput, styles.input]}
                value={phone}
                onChangeText={setPhone}
                placeholder="Optional phone number"
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.value}>{phone || 'Not set'}</Text>
            )}
          </View>
        </TeaKECard>

        {isEditing && (
          <TeaKEButton
            title={isSaving ? 'Saving...' : 'Save Changes'}
            onPress={handleUpdate}
            disabled={isSaving}
            style={{ marginTop: Spacing.lg }}
          />
        )}

        <View style={{ flex: 1 }} />

        {/* Admin Access Button - Only visible for admin users */}
        {isAdmin && (
          <TeaKECard style={styles.adminCard}>
            <View style={styles.adminHeader}>
              <MaterialIcons name="admin-panel-settings" size={24} color={Colors.light.primary} />
              <Text style={styles.adminTitle}>Admin Access</Text>
            </View>
            <Text style={styles.adminDescription}>
              Manage user verifications and app administration
            </Text>
            <TeaKEButton
              title="Open Admin Dashboard"
              onPress={handleAdminAccess}
              variant="primary"
              style={styles.adminButton}
            />
          </TeaKECard>
        )}

        <TeaKEButton
          title="Sign Out"
          onPress={handleSignOut}
          variant="danger"
          style={{ marginTop: Spacing.xl, marginBottom: Spacing.md }}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingTop: 16,
  },
  fieldContainer: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 8,
  },
  value: {
    fontSize: 16,
    color: Colors.light.text,
  },
  input: {
    fontSize: 16,
  },
  adminCard: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.light.accent,
  },
  adminHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  adminTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.primary,
    marginLeft: Spacing.sm,
  },
  adminDescription: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  adminButton: {
    backgroundColor: Colors.light.primary,
  },
});
