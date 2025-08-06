import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  SafeAreaView, 
  Alert,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { TeaKEStyles } from '../constants/Styles';
import { TeaKEButton, TeaKECard, VerificationStatusBadge } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../constants/Colors';

export const VerificationScreen: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [idType, setIdType] = useState<'school_id' | 'national_id'>('school_id');
  const [uploading, setUploading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<{
    status: 'pending' | 'approved' | 'rejected';
    reason?: string;
  } | null>(null);

  const { uploadVerificationImage, getVerificationStatus, user } = useAuth();

  const loadVerificationStatus = useCallback(async () => {
    const status = await getVerificationStatus();
    setVerificationStatus(status);
  }, [getVerificationStatus]);

  useEffect(() => {
    loadVerificationStatus();
  }, [loadVerificationStatus]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'We need camera roll permissions to upload your ID');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'We need camera permissions to take a photo of your ID');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleUpload = async () => {
    if (!selectedImage) {
      Alert.alert('Error', 'Please select an image first');
      return;
    }

    setUploading(true);
    try {
      const result = await uploadVerificationImage(selectedImage, idType);

      if (result.success) {
        Alert.alert(
          'Upload Successful!',
          'Your ID has been uploaded for verification. We\'ll review it within 10 mins or less.',
          [{ text: 'OK', onPress: loadVerificationStatus }]
        );
        setSelectedImage(null);
      } else {
        Alert.alert('Upload Failed', result.error || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Error uploading verification image:', error);
      Alert.alert('Error', 'Failed to upload verification image');
    } finally {
      setUploading(false);
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Select Image',
      'Choose how you want to upload your ID',
      [
        { text: 'Camera', onPress: takePhoto },
        { text: 'Photo Library', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  if (verificationStatus?.status === 'approved') {
    return (
      <SafeAreaView style={TeaKEStyles.safeContainer}>
        <View style={[TeaKEStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <VerificationStatusBadge status="approved" size="large" />
          <Text style={[TeaKEStyles.heading2, { textAlign: 'center', marginTop: 24 }]}>
            Verification Complete! 🎉
          </Text>
          <Text style={[TeaKEStyles.body, { textAlign: 'center', marginTop: 16 }]}>
            You&apos;re now a verified member of TeaKE. You can post stories, comment, and message other users.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (verificationStatus?.status === 'rejected') {
    return (
      <SafeAreaView style={TeaKEStyles.safeContainer}>
        <View style={TeaKEStyles.container}>
          <Text style={TeaKEStyles.heading1}>Verification Rejected</Text>
          
          <TeaKECard style={{ marginTop: 16 }}>
            <VerificationStatusBadge status="rejected" />
            <Text style={[TeaKEStyles.body, { marginTop: 12 }]}>
              Your verification was rejected for the following reason:
            </Text>
            <Text style={[TeaKEStyles.body, { fontWeight: '600', marginTop: 8 }]}>
              {verificationStatus.reason || 'No specific reason provided'}
            </Text>
          </TeaKECard>

          <Text style={[TeaKEStyles.body, { marginTop: 24 }]}>
            Please upload a clearer image of your ID and try again.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // SENIOR DEVELOPER FIX: Only show pending UI if user has actually uploaded an ID
  if (verificationStatus?.status === 'pending' && user?.id_image_url && user.id_image_url.trim() !== '') {
    return (
      <SafeAreaView style={TeaKEStyles.safeContainer}>
        <View style={[TeaKEStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <VerificationStatusBadge status="pending" size="large" />
          <Text style={[TeaKEStyles.heading2, { textAlign: 'center', marginTop: 24 }]}>
            Verification Pending
          </Text>
          <Text style={[TeaKEStyles.body, { textAlign: 'center', marginTop: 16 }]}>
            We&apos;re reviewing your ID. This usually takes less than 24 hours. 
            You&apos;ll be notified once it&apos;s approved.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // If we reach here, show the upload UI (no ID uploaded yet or rejected)
  
  return (
    <SafeAreaView style={TeaKEStyles.safeContainer}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={TeaKEStyles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
         
          
          <Text style={TeaKEStyles.heading1}>Verify Your Identity</Text>
          <Text style={TeaKEStyles.body}>
            To keep Spilled safe for women, we need to verify your identity. 
            Please upload a photo of your school ID or national ID.
          </Text>

          <TeaKECard style={{ marginTop: 24 }}>
            <Text style={[TeaKEStyles.heading2, { fontSize: 16 }]}>Choose ID Type</Text>
            
            <View style={styles.idTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.idTypeButton,
                  idType === 'school_id' && styles.idTypeButtonActive
                ]}
                onPress={() => setIdType('school_id')}
              >
                <Text style={[
                  styles.idTypeText,
                  idType === 'school_id' && styles.idTypeTextActive
                ]}>
                  🎓 School ID
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.idTypeButton,
                  idType === 'national_id' && styles.idTypeButtonActive
                ]}
                onPress={() => setIdType('national_id')}
              >
                <Text style={[
                  styles.idTypeText,
                  idType === 'national_id' && styles.idTypeTextActive
                ]}>
                  🆔 National ID
                </Text>
              </TouchableOpacity>
            </View>
          </TeaKECard>

          <TeaKECard style={{ marginTop: 16 }}>
            <Text style={[TeaKEStyles.heading2, { fontSize: 16 }]}>Upload Photo</Text>
            
            {selectedImage ? (
              <View style={{ marginTop: 12 }}>
                <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                <TeaKEButton
                  title="Choose Different Image"
                  onPress={showImageOptions}
                  variant="secondary"
                  size="small"
                  style={{ marginTop: 12 }}
                />
              </View>
            ) : (
              <TouchableOpacity style={styles.uploadArea} onPress={showImageOptions}>
                <Text style={styles.uploadText}>📷</Text>
                <Text style={[TeaKEStyles.body, { textAlign: 'center' }]}>
                  Tap to upload ID photo
                </Text>
              </TouchableOpacity>
            )}
          </TeaKECard>

          <View style={styles.tipsSection}>
            <Text style={[TeaKEStyles.caption, { marginBottom: 16 }]}>
              📝 Tips for a good photo:
              {'\n'}• Ensure all text is clearly visible
              {'\n'}• Good lighting, no shadows
              {'\n'}• Hold your phone steady
              {'\n'}• Your photo will be deleted after verification
            </Text>
          </View>
        </ScrollView>
        
        {/* Fixed submit button at bottom */}
        <View style={styles.submitButtonContainer}>
          <TeaKEButton
            title={uploading ? "Uploading..." : "Submit for Verification"}
            onPress={handleUpload}
            disabled={uploading || !selectedImage}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  idTypeContainer: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
  },
  idTypeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.light.border,
    alignItems: 'center',
  },
  idTypeButtonActive: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.accent,
  },
  idTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  idTypeTextActive: {
    color: Colors.light.primary,
  },
  uploadArea: {
    marginTop: 12,
    padding: 32,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.light.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    backgroundColor: Colors.light.accent,
  },
  uploadText: {
    fontSize: 32,
    marginBottom: 8,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    resizeMode: 'contain',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  tipsSection: {
    marginTop: 24,
    marginBottom: 20,
  },
  submitButtonContainer: {
    backgroundColor: Colors.light.background,
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 34, // Extra padding for safe area
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
});