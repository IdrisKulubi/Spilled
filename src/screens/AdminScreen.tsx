/**
 * AdminScreen - Manage user verification approvals
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  FlatList
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { TeaKEStyles, Spacing } from '../constants/Styles';
import { TeaKEButton, TeaKECard } from '../components/ui';
import { Colors } from '../../constants/Colors';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { 
  fetchPendingVerifications, 
  fetchAdminStats,
  subscribeToVerificationChanges,
  debugStorageFiles,
  PendingVerification,
  AdminStats
} from '../actions/adminActions';
import { UserApprovalModal } from '../components/modals/UserApprovalModal';

export const AdminScreen: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  
  const [pendingUsers, setPendingUsers] = useState<PendingVerification[]>([]);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PendingVerification | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Redirect if not admin
  useEffect(() => {
    if (!isAdmin) {
      Alert.alert('Access Denied', 'You do not have admin privileges.');
      router.back();
      return;
    }
  }, [isAdmin, router]);

  // Load initial data
  useEffect(() => {
    if (isAdmin) {
      loadAdminData();
    }
  }, [isAdmin]);

  // Set up real-time subscription
  useEffect(() => {
    if (!isAdmin) return;

    const subscription = subscribeToVerificationChanges((payload) => {
      loadAdminData();
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [isAdmin]);

  const loadAdminData = async () => {
    try {
      
      // Debug storage files to help troubleshoot
      await debugStorageFiles();
      
      const [verificationResult, statsResult] = await Promise.all([
        fetchPendingVerifications(),
        fetchAdminStats()
      ]);

      if (verificationResult.success) {
        setPendingUsers(verificationResult.data || []);
      } else {
        Alert.alert('Error', verificationResult.error || 'Failed to load pending verifications');
      }

      if (statsResult.success) {
        setAdminStats(statsResult.data || null);
      }

    } catch (error) {
      console.error('[AdminScreen] Error loading data:', error);
      Alert.alert('Error', 'Failed to load admin data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAdminData();
  }, []);

  const handleUserPress = (user: PendingVerification) => {
    setSelectedUser(user);
    setModalVisible(true);
  };

  const handleApprovalComplete = () => {
    setModalVisible(false);
    setSelectedUser(null);
    loadAdminData(); // Refresh the data
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  const renderPendingUser = ({ item }: { item: PendingVerification }) => (
    <TouchableOpacity onPress={() => handleUserPress(item)} style={styles.userItem}>
      <TeaKECard style={styles.userCard}>
        <View style={styles.userInfo}>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{item.nickname || 'Anonymous User'}</Text>
            <Text style={styles.userEmail}>{item.email}</Text>
            {item.phone && (
              <Text style={styles.userPhone}>📱 {item.phone}</Text>
            )}
            <View style={styles.idTypeContainer}>
              <MaterialIcons 
                name={item.id_type === 'school_id' ? 'school' : 'credit-card'}
                size={16}
                color={Colors.light.primary}
              />
              <Text style={styles.idType}>
                {item.id_type === 'school_id' ? 'School ID' : 'National ID'}
              </Text>
            </View>
          </View>
          <View style={styles.waitingInfo}>
            <Text style={styles.waitingTime}>{formatTimeAgo(item.created_at)}</Text>
            <Text style={styles.waitingDays}>{item.days_waiting} days</Text>
            <MaterialIcons name="chevron-right" size={24} color={Colors.light.textSecondary} />
          </View>
        </View>
      </TeaKECard>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="verified-user" size={64} color={Colors.light.textSecondary} />
      <Text style={styles.emptyStateTitle}>All caught up! 🎉</Text>
      <Text style={styles.emptyStateText}>
        No pending verifications to review right now.
      </Text>
    </View>
  );

  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <SafeAreaView style={TeaKEStyles.safeContainer}>
        <View style={[TeaKEStyles.container, styles.loadingContainer]}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={styles.loadingText}>Loading admin dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={TeaKEStyles.safeContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.light.primary} />
        </TouchableOpacity>
        <Text style={TeaKEStyles.heading1}>Admin Dashboard</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Admin Stats */}
      {adminStats && (
        <TeaKECard style={styles.statsCard}>
          <Text style={styles.statsTitle}>📊 Overview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{adminStats.pending_verifications}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{adminStats.verified_users}</Text>
              <Text style={styles.statLabel}>Verified</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{adminStats.new_signups_week}</Text>
              <Text style={styles.statLabel}>New This Week</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {adminStats.avg_verification_hours?.toFixed(1) || '0'}h
              </Text>
              <Text style={styles.statLabel}>Avg. Review Time</Text>
            </View>
          </View>
        </TeaKECard>
      )}

      {/* Pending Verifications List */}
      <View style={styles.listContainer}>
        <Text style={styles.sectionTitle}>
          ⏳ Pending Verifications ({pendingUsers.length})
        </Text>
        
        <FlatList
          data={pendingUsers}
          renderItem={renderPendingUser}
          keyExtractor={(item) => item.user_id}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.light.primary]}
              tintColor={Colors.light.primary}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      </View>

      {/* User Approval Modal */}
      <UserApprovalModal
        visible={modalVisible}
        user={selectedUser}
        onClose={() => setModalVisible(false)}
        onApprovalComplete={handleApprovalComplete}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  backButton: {
    padding: Spacing.xs,
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  statsCard: {
    margin: Spacing.md,
    marginBottom: Spacing.sm,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.md,
  },
  listContent: {
    paddingBottom: Spacing.xl,
  },
  userItem: {
    marginBottom: Spacing.sm,
  },
  userCard: {
    padding: Spacing.md,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  idTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  idType: {
    fontSize: 12,
    color: Colors.light.primary,
    marginLeft: 4,
    fontWeight: '500',
  },
  waitingInfo: {
    alignItems: 'flex-end',
  },
  waitingTime: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  waitingDays: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.primary,
    marginBottom: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl * 2,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.text,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  emptyStateText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});