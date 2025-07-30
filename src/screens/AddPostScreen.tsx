import React, { useState } from 'react';
import { 
  View, 
  Text, 
  SafeAreaView, 
  ScrollView, 
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { TeaKEStyles, Spacing } from '../constants/Styles';
import { TeaKEButton, TeaKECard, StatusTag } from '../components/ui';
import { Colors } from '../../constants/Colors';
import { addPost, CreatePostData } from '../actions/addPost';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

type TagType = 'red_flag' | 'good_vibes' | 'unsure';

export const AddPostScreen: React.FC = () => {
  const { user } = useAuth();
  
  // Form state
  const [guyName, setGuyName] = useState('');
  const [guyPhone, setGuyPhone] = useState('');
  const [guySocials, setGuySocials] = useState('');
  const [storyText, setStoryText] = useState('');
  const [selectedTags, setSelectedTags] = useState<TagType[]>([]);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [anonymous, setAnonymous] = useState(true);
  const [nickname, setNickname] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Available tags
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
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
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
      'Add Photo',
      'Choose how to add a photo to your story',
      [
        { text: 'Camera', onPress: takePhoto },
        { text: 'Photo Library', onPress: pickImage },
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

    if (!anonymous && !nickname.trim()) {
      Alert.alert('Nickname Required', 'Please provide a nickname or switch to anonymous posting.');
      return false;
    }

    return true;
  };

  const handlePost = async () => {
    if (!validateForm()) return;
    if (!user) {
      Alert.alert('Error', 'You must be logged in to post.');
      return;
    }

    setIsSubmitting(true);

    try {
      const postData: CreatePostData = {
        guyName: guyName.trim() || undefined,
        guyPhone: guyPhone.trim() || undefined,
        guySocials: guySocials.trim() || undefined,
        storyText: storyText.trim(),
        tags: selectedTags,
        imageUrl: imageUri || undefined,
        anonymous,
        nickname: anonymous ? undefined : (nickname.trim() || undefined)
      };

      const response = await addPost(postData);

      if (response.success) {
        Alert.alert(
          'Story Shared!',
          'Thank you for helping other women stay safe. Your story has been posted.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Reset form
                setGuyName('');
                setGuyPhone('');
                setGuySocials('');
                setStoryText('');
                setSelectedTags([]);
                setImageUri(null);
                setAnonymous(true);
                setNickname('');
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', response.error || 'Failed to post story. Please try again.');
      }
    } catch (error) {
      console.error('Post creation error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={TeaKEStyles.safeContainer}>
      <ScrollView 
        style={TeaKEStyles.container} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={TeaKEStyles.heading1}>Share Your Story</Text>
          <Text style={[TeaKEStyles.body, { opacity: 0.8 }]}>
            Help other women by sharing your experience. All information is kept secure.
          </Text>
        </View>

        {/* Guy Information Section */}
        <TeaKECard style={styles.section}>
          <Text style={[TeaKEStyles.heading2, { fontSize: 18, marginBottom: 12 }]}>
            About Him
          </Text>
          <Text style={[TeaKEStyles.caption, { marginBottom: 16 }]}>
            Provide any information you have to help identify him
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Name or Nickname</Text>
            <TextInput
              style={TeaKEStyles.textInput}
              placeholder="e.g., John Doe, Johnny, etc."
              value={guyName}
              onChangeText={setGuyName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={TeaKEStyles.textInput}
              placeholder="e.g., +254 123 456 789"
              value={guyPhone}
              onChangeText={setGuyPhone}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Social Media Handles</Text>
            <TextInput
              style={TeaKEStyles.textInput}
              placeholder="e.g., @username, Instagram handle, etc."
              value={guySocials}
              onChangeText={setGuySocials}
              autoCapitalize="none"
            />
          </View>
        </TeaKECard>

        {/* Story Section */}
        <TeaKECard style={styles.section}>
          <Text style={[TeaKEStyles.heading2, { fontSize: 18, marginBottom: 12 }]}>
            Your Story *
          </Text>
          <Text style={[TeaKEStyles.caption, { marginBottom: 16 }]}>
            Share your experience - what happened, how you felt, what others should know
          </Text>

          <TextInput
            style={[TeaKEStyles.textInput, styles.storyInput]}
            placeholder="Share your story here... Be as detailed as you're comfortable with. Your experience could help another woman stay safe."
            value={storyText}
            onChangeText={setStoryText}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />

          <View style={styles.characterCount}>
            <Text style={[TeaKEStyles.caption, { 
              color: storyText.length < 10 ? Colors.light.redFlag : Colors.light.textSecondary 
            }]}>
              {storyText.length} characters {storyText.length < 10 ? '(minimum 10)' : ''}
            </Text>
          </View>
        </TeaKECard>

        {/* Tags Section */}
        <TeaKECard style={styles.section}>
          <Text style={[TeaKEStyles.heading2, { fontSize: 18, marginBottom: 12 }]}>
            How would you tag this?
          </Text>
          <Text style={[TeaKEStyles.caption, { marginBottom: 16 }]}>
            Select all that apply to help categorize your experience
          </Text>

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
                <View style={styles.tagHeader}>
                  <Text style={styles.tagEmoji}>{tag.emoji}</Text>
                  <Text style={[
                    styles.tagLabel,
                    selectedTags.includes(tag.type) && styles.tagLabelSelected
                  ]}>
                    {tag.label}
                  </Text>
                  {selectedTags.includes(tag.type) && (
                    <MaterialIcons name="check-circle" size={20} color={Colors.light.primary} />
                  )}
                </View>
                <Text style={[
                  TeaKEStyles.caption,
                  selectedTags.includes(tag.type) && { color: Colors.light.primary }
                ]}>
                  {tag.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {selectedTags.length > 0 && (
            <View style={styles.selectedTags}>
              <Text style={[TeaKEStyles.caption, { marginBottom: 8 }]}>Selected tags:</Text>
              <View style={styles.tagsList}>
                {selectedTags.map(tag => (
                  <StatusTag key={tag} type={tag} style={{ marginRight: 8, marginBottom: 4 }} />
                ))}
              </View>
            </View>
          )}
        </TeaKECard>

        {/* Photo Section */}
        <TeaKECard style={styles.section}>
          <Text style={[TeaKEStyles.heading2, { fontSize: 18, marginBottom: 12 }]}>
            Add Photo (Optional)
          </Text>
          <Text style={[TeaKEStyles.caption, { marginBottom: 16 }]}>
            Add a photo if it helps tell your story (screenshots, photos, etc.)
          </Text>

          {imageUri ? (
            <View style={styles.imagePreview}>
              <Text style={[TeaKEStyles.body, { marginBottom: 8 }]}>✓ Photo selected</Text>
              <View style={styles.imageActions}>
                <TouchableOpacity onPress={showImageOptions} style={styles.changeImageButton}>
                  <Text style={styles.changeImageText}>Change Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setImageUri(null)} style={styles.removeImageButton}>
                  <Text style={styles.removeImageText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.addPhotoButton} onPress={showImageOptions}>
              <MaterialIcons name="add-photo-alternate" size={32} color={Colors.light.primary} />
              <Text style={styles.addPhotoText}>Add Photo</Text>
            </TouchableOpacity>
          )}
        </TeaKECard>

        {/* Privacy Section */}
        <TeaKECard style={styles.section}>
          <Text style={[TeaKEStyles.heading2, { fontSize: 18, marginBottom: 12 }]}>
            Privacy Settings
          </Text>

          <View style={styles.privacyOption}>
            <View style={styles.privacyOptionLeft}>
              <Text style={TeaKEStyles.body}>Post Anonymously</Text>
              <Text style={[TeaKEStyles.caption, { marginTop: 4 }]}>
                Your identity will be completely hidden
              </Text>
            </View>
            <Switch
              value={anonymous}
              onValueChange={setAnonymous}
              trackColor={{ false: Colors.light.border, true: Colors.light.accent }}
              thumbColor={anonymous ? Colors.light.primary : Colors.light.textSecondary}
            />
          </View>

          {!anonymous && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Display Nickname *</Text>
              <TextInput
                style={TeaKEStyles.textInput}
                placeholder="e.g., Sarah K., Anonymous User, etc."
                value={nickname}
                onChangeText={setNickname}
                autoCapitalize="words"
              />
              <Text style={[TeaKEStyles.caption, { marginTop: 4 }]}>
                This nickname will be shown instead of your real name
              </Text>
            </View>
          )}
        </TeaKECard>

        {/* Safety Notice */}
        <TeaKECard style={[styles.safetyNotice, { marginBottom: 100 }]}>
          <MaterialIcons name="security" size={24} color={Colors.light.primary} style={{ marginBottom: 8 }} />
          <Text style={[TeaKEStyles.body, { textAlign: 'center', fontSize: 14 }]}>
            <Text style={{ fontWeight: '600' }}>Your Safety Matters:</Text> By sharing your story, 
            you're helping create a safer community for all women. Thank you for your courage.
          </Text>
        </TeaKECard>

        {/* Submit Button */}
        <View style={styles.submitContainer}>
          <TeaKEButton
            title={isSubmitting ? "Posting..." : anonymous ? "Post Anonymously" : `Post as ${nickname || 'Nickname'}`}
            onPress={handlePost}
            disabled={isSubmitting || !storyText.trim()}
            style={styles.submitButton}
          />
          {isSubmitting && (
            <ActivityIndicator 
              size="small" 
              color={Colors.light.primary} 
              style={{ marginTop: 12 }} 
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.md,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 6,
  },
  storyInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  characterCount: {
    alignItems: 'flex-end',
    marginTop: 4,
  },
  tagsContainer: {
    gap: Spacing.sm,
  },
  tagOption: {
    padding: Spacing.md,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.cardBackground,
  },
  tagOptionSelected: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.accent,
  },
  tagHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  tagEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  tagLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    flex: 1,
  },
  tagLabelSelected: {
    color: Colors.light.primary,
  },
  selectedTags: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  tagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  addPhotoButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.accent,
  },
  addPhotoText: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  imagePreview: {
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.light.accent,
    borderRadius: 12,
  },
  imageActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  changeImageButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.light.primary,
    borderRadius: 8,
  },
  changeImageText: {
    color: Colors.light.textOnPrimary,
    fontWeight: '600',
  },
  removeImageButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.light.redFlag,
    borderRadius: 8,
  },
  removeImageText: {
    color: Colors.light.textOnPrimary,
    fontWeight: '600',
  },
  privacyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  privacyOptionLeft: {
    flex: 1,
    marginRight: Spacing.md,
  },
  safetyNotice: {
    alignItems: 'center',
    backgroundColor: Colors.light.accent,
    borderColor: Colors.light.primary,
    borderWidth: 1,
    paddingVertical: Spacing.lg,
  },
  submitContainer: {
    position: 'absolute',
    bottom: 34,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  submitButton: {
    width: '100%',
  },
});