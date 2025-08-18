/**
 * EditStoryModal - Full-featured story editing modal
 * Reuses AddPostScreen form logic with pre-populated data
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../contexts/AuthContext';
import { TeaKEButton, TeaKECard } from '../../components/ui';
import { Colors } from '../../../constants/Colors';
import { Spacing } from '../../constants/Styles';
import { StoryFeedItem } from '../../actions/fetchStoriesFeed';

type TagType = 'red_flag' | 'good_vibes' | 'unsure';

interface EditStoryModalProps {
  visible: boolean;
  story: StoryFeedItem | null;
  onClose: () => void;
  onUpdate: (updatedStory: StoryFeedItem) => void;
  isUpdating?: boolean;
}

// Available tags (same as AddPostScreen)
const availableTags: { type: TagType; label: string; emoji: string; description: string }[] = [
  { 
    type: 'red_flag', 
    label: 'Red Flag', 
    emoji: '🚩', 
    description: 'Warning signs or concerning behavior'
  },
  { 
    type: 'good_vibes', 
    label: 'Good Vibes', 
    emoji: '✅', 
    description: 'Positive experience or green flags'
  },
  { 
    type: 'unsure', 
    label: 'Unsure', 
    emoji: '❓', 
    description: 'Mixed feelings or unclear situation'
  }
];

export const EditStoryModal: React.FC<EditStoryModalProps> = ({
  visible,
  story,
  onClose,
  onUpdate,
  isUpdating = false
}) => {
  const { user } = useAuth();
  
  // Form state (populated from story)
  const [guyName, setGuyName] = useState('');
  const [guyPhone, setGuyPhone] = useState('');
  const [guySocials, setGuySocials] = useState('');
  const [guyLocation, setGuyLocation] = useState('');
  const [guyAge, setGuyAge] = useState('');
  const [storyText, setStoryText] = useState('');
  const [selectedTags, setSelectedTags] = useState<TagType[]>([]);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [anonymous, setAnonymous] = useState(true);
  const [nickname, setNickname] = useState('');

  // Populate form when story changes
  useEffect(() => {
    if (story && visible) {
      setGuyName(story.guy_name || '');
      setGuyPhone(story.guy_phone || '');
      setGuySocials(story.guy_socials || '');
      setGuyLocation(story.guy_location || '');
      setGuyAge(story.guy_age ? story.guy_age.toString() : '');
      setStoryText(story.text);
      setSelectedTags(story.tags as TagType[]);
      setImageUri(story.image_url || null);
      setAnonymous(story.anonymous);
      setNickname(story.nickname || '');
    }
  }, [story, visible]);

  // Reset form when modal closes
  const handleClose = () => {
    // Reset form to original values
    if (story) {
      setGuyName(story.guy_name || '');
      setGuyPhone(story.guy_phone || '');
      setGuySocials(story.guy_socials || '');
      setGuyLocation(story.guy_location || '');
      setGuyAge(story.guy_age ? story.guy_age.toString() : '');
      setStoryText(story.text);
      setSelectedTags(story.tags as TagType[]);
      setImageUri(story.image_url || null);
      setAnonymous(story.anonymous);
      setNickname(story.nickname || '');
    }
    onClose();
  };

  const toggleTag = (tag: TagType) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Update Photo',
      'Choose how to update your story photo',
      [
        { text: 'Camera', onPress: takePhoto },
        { text: 'Photo Library', onPress: pickImage },
        { text: 'Remove Photo', onPress: () => setImageUri(null) },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const validateForm = (): boolean => {
    if (!storyText.trim()) {
      Alert.alert('Story Required', 'Please share your story or experience.');
      return false;
    }

    if (storyText.trim().length < 10) {
      Alert.alert('Story Too Short', 'Please provide more details in your story (at least 10 characters).');
      return false;
    }

    if (!guyName.trim() && !guyPhone.trim() && !guySocials.trim()) {
      Alert.alert(
        'Guy Information Required', 
        'Please provide at least one way to identify the person (name, phone, or social handle).'
      );
      return false;
    }

    // Validate age if provided
    if (guyAge.trim() && (isNaN(Number(guyAge)) || Number(guyAge) < 18 || Number(guyAge) > 100)) {
      Alert.alert('Invalid Age', 'Please enter a valid age between 18 and 100.');
      return false;
    }

    if (!anonymous && !nickname.trim()) {
      Alert.alert('Nickname Required', 'Please provide a nickname or switch to anonymous posting.');
      return false;
    }

    return true;
  };

  const handleUpdate = async () => {
    if (!validateForm() || !story) return;
    if (!user) {
      Alert.alert('Error', 'You must be logged in to update stories.');
      return;
    }

    try {
      // Create updated story object
      const updatedStory: StoryFeedItem = {
        ...story,
        guy_name: guyName.trim() || undefined,
        guy_phone: guyPhone.trim() || undefined,
        guy_socials: guySocials.trim() || undefined,
        guy_location: guyLocation.trim() || undefined,
        guy_age: guyAge.trim() ? Number(guyAge.trim()) : undefined,
        text: storyText.trim(),
        tags: selectedTags,
        image_url: imageUri || undefined,
        anonymous,
        nickname: anonymous ? undefined : (nickname.trim() || undefined)
      };

      // TODO: Call actual update API
      // const response = await updateStory(story.id, updateData);
      
      // For now, just call the callback
      onUpdate(updatedStory);
      
      Alert.alert(
        'Story Updated!',
        'Your story has been updated successfully! 💕',
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (error) {
      console.error('Story update error:', error);
      Alert.alert('Error', 'Failed to update story. Please try again bestie! 😭');
    }
  };

  if (!story) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <MaterialIcons name="close" size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Story</Text>
          <View style={styles.headerRight} />
        </View>

        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Guy Information Section */}
            <TeaKECard style={styles.section}>
              <Text style={styles.sectionTitle}>👤 Who is this about?</Text>
              <Text style={styles.sectionSubtitle}>Update the person&apos;s details</Text>

              <TextInput
                style={styles.input}
                placeholder="Full name or nickname"
                value={guyName}
                onChangeText={setGuyName}
                maxLength={100}
              />

              <TextInput
                style={styles.input}
                placeholder="Phone number (for identification)"
                value={guyPhone}
                onChangeText={setGuyPhone}
                keyboardType="phone-pad"
                maxLength={15}
              />

              <TextInput
                style={styles.input}
                placeholder="Social media handles (@username)"
                value={guySocials}
                onChangeText={setGuySocials}
                maxLength={100}
              />

              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  placeholder="Location"
                  value={guyLocation}
                  onChangeText={setGuyLocation}
                  maxLength={50}
                />
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  placeholder="Age"
                  value={guyAge}
                  onChangeText={setGuyAge}
                  keyboardType="numeric"
                  maxLength={2}
                />
              </View>
            </TeaKECard>

            {/* Story Section */}
            <TeaKECard style={styles.section}>
              <Text style={styles.sectionTitle}>📝 Your Story</Text>
              <Text style={styles.sectionSubtitle}>Update your experience</Text>

              <TextInput
                style={styles.textArea}
                placeholder="Tell us what happened... Be detailed so other women can stay safe"
                value={storyText}
                onChangeText={setStoryText}
                multiline
                textAlignVertical="top"
                maxLength={2000}
              />
              <Text style={styles.characterCount}>
                {storyText.length}/2000 characters
              </Text>
            </TeaKECard>

            {/* Tags Section */}
            <TeaKECard style={styles.section}>
              <Text style={styles.sectionTitle}>🏷️ Update Tags</Text>
              <Text style={styles.sectionSubtitle}>What kind of experience was this?</Text>

              <View style={styles.tagsContainer}>
                {availableTags.map((tag) => (
                  <TouchableOpacity
                    key={tag.type}
                    style={[
                      styles.tagOption,
                      selectedTags.includes(tag.type) && styles.tagOptionSelected
                    ]}
                    onPress={() => toggleTag(tag.type)}
                  >
                    <Text style={styles.tagEmoji}>{tag.emoji}</Text>
                    <Text style={[
                      styles.tagLabel,
                      selectedTags.includes(tag.type) && styles.tagLabelSelected
                    ]}>
                      {tag.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </TeaKECard>

            {/* Photo Section */}
            <TeaKECard style={styles.section}>
              <Text style={styles.sectionTitle}>📸 Update Photo (Optional)</Text>
              <Text style={styles.sectionSubtitle}>Add or update evidence photo</Text>

              <TouchableOpacity style={styles.imageButton} onPress={showImageOptions}>
                <MaterialIcons 
                  name={imageUri ? "photo" : "add-a-photo"} 
                  size={24} 
                  color={Colors.light.primary} 
                />
                <Text style={styles.imageButtonText}>
                  {imageUri ? "Update Photo" : "Add Photo"}
                </Text>
              </TouchableOpacity>

              {imageUri && (
                <View style={styles.imagePreview}>
                  <Text style={styles.imagePreviewText}>Photo attached ✅</Text>
                  <TouchableOpacity onPress={() => setImageUri(null)}>
                    <MaterialIcons name="close" size={20} color={Colors.light.error} />
                  </TouchableOpacity>
                </View>
              )}
            </TeaKECard>

            {/* Anonymous Section */}
            <TeaKECard style={styles.section}>
              <Text style={styles.sectionTitle}>👤 Update Posting Preference</Text>

              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={styles.switchLabel}>Post anonymously</Text>
                  <Text style={styles.switchDescription}>
                    {anonymous ? "Your identity is hidden" : "Your nickname will be shown"}
                  </Text>
                </View>
                <Switch
                  value={anonymous}
                  onValueChange={setAnonymous}
                  trackColor={{ false: Colors.light.border, true: Colors.light.primary }}
                  thumbColor={Colors.light.cardBackground}
                />
              </View>

              {!anonymous && (
                <TextInput
                  style={styles.input}
                  placeholder="Your display nickname"
                  value={nickname}
                  onChangeText={setNickname}
                  maxLength={30}
                />
              )}
            </TeaKECard>

            {/* Submit Button */}
            <View style={styles.submitSection}>
              <TeaKEButton
                title={isUpdating ? "Updating..." : "Update Story"}
                onPress={handleUpdate}
                disabled={isUpdating}
                style={styles.submitButton}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    backgroundColor: Colors.light.cardBackground,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  headerRight: {
    width: 32, // Same as close button for centering
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  section: {
    marginTop: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 16,
    color: Colors.light.text,
    backgroundColor: Colors.light.cardBackground,
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  halfInput: {
    flex: 1,
  },
  textArea: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 16,
    color: Colors.light.text,
    backgroundColor: Colors.light.cardBackground,
    minHeight: 120,
    marginBottom: Spacing.xs,
  },
  characterCount: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: 'right',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  tagOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.cardBackground,
  },
  tagOptionSelected: {
    backgroundColor: Colors.light.accent,
    borderColor: Colors.light.primary,
  },
  tagEmoji: {
    fontSize: 16,
    marginRight: Spacing.xs,
  },
  tagLabel: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: '500',
  },
  tagLabelSelected: {
    color: Colors.light.primary,
    fontWeight: '600',
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.light.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: Colors.light.accent,
  },
  imageButtonText: {
    fontSize: 16,
    color: Colors.light.primary,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  imagePreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.light.accent,
    borderRadius: 8,
  },
  imagePreviewText: {
    fontSize: 14,
    color: Colors.light.success,
    fontWeight: '500',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  switchInfo: {
    flex: 1,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 2,
  },
  switchDescription: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  submitSection: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  submitButton: {
    width: '100%',
  },
});