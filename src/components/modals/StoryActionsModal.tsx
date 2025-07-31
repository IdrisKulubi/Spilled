/**
 * StoryActionsModal - Three-dots menu for story edit/delete actions
 * Reusable for both stories and comments
 */

import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/src/constants/Styles';

interface StoryActionsModalProps {
  visible: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isOwner: boolean;
  itemType?: 'story' | 'comment';
}

export const StoryActionsModal: React.FC<StoryActionsModalProps> = ({
  visible,
  onClose,
  onEdit,
  onDelete,
  isOwner,
  itemType = 'story'
}) => {
  if (!isOwner) return null;

  const handleEdit = () => {
    onClose();
    onEdit();
  };

  const handleDelete = () => {
    onClose();
    onDelete();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.modalContainer}>
              <View style={styles.modal}>
                {/* Header */}
                <View style={styles.header}>
                  <Text style={styles.headerText}>
                    {itemType === 'story' ? 'Story Options' : 'Comment Options'}
                  </Text>
                </View>

                {/* Edit Option */}
                <TouchableOpacity style={styles.option} onPress={handleEdit}>
                  <MaterialIcons name="edit" size={20} color={Colors.light.primary} />
                  <Text style={styles.optionText}>Edit {itemType}</Text>
                </TouchableOpacity>

                {/* Delete Option */}
                <TouchableOpacity style={styles.option} onPress={handleDelete}>
                  <MaterialIcons name="delete-outline" size={20} color={Colors.light.error} />
                  <Text style={[styles.optionText, { color: Colors.light.error }]}>
                    Delete {itemType}
                  </Text>
                </TouchableOpacity>

                {/* Cancel */}
                <TouchableOpacity style={styles.cancelOption} onPress={onClose}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    maxWidth: 300,
  },
  modal: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  header: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  optionText: {
    fontSize: 16,
    marginLeft: Spacing.sm,
    color: Colors.light.text,
    fontWeight: '500',
  },
  cancelOption: {
    padding: Spacing.md,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
});