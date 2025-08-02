/**
 * Profile Dropdown Component
 * Shows user avatar with dropdown menu for Profile and Sign Out
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'expo-router';

interface ProfileDropdownProps {
  user: any;
}

export const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ user }) => {
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const { signOut } = useAuth();
  const router = useRouter();

  const handleProfilePress = () => {
    setDropdownVisible(false);
    router.push('/profile');
  };

  const handleSignOut = async () => {
    setDropdownVisible(false);
    await signOut();
  };

  const toggleDropdown = () => {
    setDropdownVisible(!dropdownVisible);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={toggleDropdown}
        style={styles.profileButton}
        activeOpacity={0.7}
      >
        <MaterialIcons name="account-circle" size={32} color={Colors.light.primary} />
      </TouchableOpacity>

      <Modal
        transparent={true}
        visible={dropdownVisible}
        animationType="fade"
        onRequestClose={() => setDropdownVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setDropdownVisible(false)}
        >
          <View style={styles.dropdownContainer}>
            <View style={styles.dropdown}>
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={handleProfilePress}
            >
              <MaterialIcons name="person" size={20} color={Colors.light.text} />
              <Text style={styles.dropdownText}>Profile</Text>
            </TouchableOpacity>
            
            <View style={styles.separator} />
            
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={handleSignOut}
            >
              <MaterialIcons name="logout" size={20} color={Colors.light.redFlag} />
              <Text style={[styles.dropdownText, { color: Colors.light.redFlag }]}>
                Sign Out
              </Text>
            </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.light.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  dropdownContainer: {
    position: 'absolute',
    top: 90,
    right: 16,
  },
  dropdown: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 8,
    paddingVertical: 4,
    minWidth: 120,
    shadowColor: Colors.light.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dropdownText: {
    fontSize: 14,
    color: Colors.light.text,
    marginLeft: 8,
    fontWeight: '500',
  },
  separator: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginHorizontal: 8,
  },
});