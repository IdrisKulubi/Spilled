/**
 * DeleteConfirmationModal - Confirms story/comment deletion with warning
 * Uses soft delete approach (hide rather than permanent delete)
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
import { Colors } from '../../../constants/Colors';
import { Spacing } from '../../constants/Styles';
import { TeaKEButton } from '../../components/ui';

interface DeleteConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemType: 'story' | 'comment';
  isDeleting?: boolean;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  visible,
  onClose,
  onConfirm,
  itemType,
  isDeleting = false
}) => {
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
                {/* Warning Icon */}
                <View style={styles.iconContainer}>
                  <MaterialIcons 
                    name="warning" 
                    size={48} 
                    color={Colors.light.error} 
                  />
                </View>

                {/* Title */}
                <Text style={styles.title}>
                  Delete {itemType === 'story' ? 'Story' : 'Comment'}?
                </Text>

                {/* Description */}
                <Text style={styles.description}>
                  {itemType === 'story' 
                    ? "This will hide your story from everyone. You can't undo this action bestie! 😢"
                    : "This will remove your comment permanently. You can't get it back! 😢"
                  }
                </Text>

                {/* Privacy Note */}
                <View style={styles.privacyNote}>
                  <MaterialIcons name="info-outline" size={16} color={Colors.light.textSecondary} />
                  <Text style={styles.privacyText}>
                    {itemType === 'story' 
                      ? "Your story will be hidden but kept for safety records"
                      : "Comment will be removed from all views"
                    }
                  </Text>
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                  <TouchableOpacity 
                    style={styles.cancelButton} 
                    onPress={onClose}
                    disabled={isDeleting}
                  >
                    <Text style={styles.cancelText}>Keep It</Text>
                  </TouchableOpacity>

                  <TeaKEButton
                    title={isDeleting ? "Deleting..." : "Yes, Delete"}
                    onPress={onConfirm}
                    disabled={isDeleting}
                    size="small"
                    style={[styles.deleteButton, { 
                      backgroundColor: Colors.light.error,
                      opacity: isDeleting ? 0.6 : 1
                    }]}
                  />
                </View>
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
    width: '85%',
    maxWidth: 320,
  },
  modal: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 20,
    padding: Spacing.lg,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  iconContainer: {
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.accent,
    padding: Spacing.sm,
    borderRadius: 8,
    marginBottom: Spacing.lg,
  },
  privacyText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginLeft: Spacing.xs,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    width: '100%',
    gap: Spacing.sm,
  },
  cancelButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  deleteButton: {
    flex: 1,
  },
});