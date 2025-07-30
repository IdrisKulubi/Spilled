import React, { useState } from 'react';
import { 
  View, 
  Text, 
  SafeAreaView, 
  Alert,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TeaKEStyles } from '../constants/Styles';
import { useAuth } from '../contexts/AuthContext';

export const SignUpScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { signInWithGoogle } = useAuth();

  const handleGoogleSignUp = async () => {
    setLoading(true);
    try {
      const result = await signInWithGoogle();

      if (result.success) {
        Alert.alert(
          'Welcome to TeaKE!',
          'Your account has been created successfully. Please upload your ID for verification to start posting and messaging.',
          [{ text: 'OK' }]
        );
        // Navigation will be handled by AuthContext state change
      } else {
        Alert.alert('Sign Up Failed', result.error || 'Failed to create account with Google');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={TeaKEStyles.safeContainer}>
      <View style={[TeaKEStyles.container, { justifyContent: 'center' }]}>
        <View style={{ marginBottom: 60, alignItems: 'center' }}>
          <Text style={[TeaKEStyles.heading1, { textAlign: 'center' }]}>Join TeaKE</Text>
          <Text style={[TeaKEStyles.body, { textAlign: 'center', marginTop: 12 }]}>
            Create your account with Google to start sharing and discovering information about guys in Kenya.
          </Text>
        </View>

        <View style={{ alignItems: 'center' }}>
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignUp}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#3B3B3B" />
            ) : (
              <>
                <Ionicons name="logo-google" size={24} color="#4285F4" />
                <Text style={styles.googleButtonText}>Sign up with Google</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ marginTop: 32, paddingHorizontal: 20 }}>
            <Text style={[TeaKEStyles.caption, { textAlign: 'center', marginBottom: 16 }]}>
              💡 After creating your account, you'll need to upload your school ID or national ID 
              to verify you're a girl. This keeps our community safe and authentic.
            </Text>
            
            <Text style={[TeaKEStyles.caption, { textAlign: 'center', fontSize: 12, color: '#666' }]}>
              By signing up, you agree to our Terms of Service and Privacy Policy. 
              We use Google OAuth for secure authentication.
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = {
  googleButton: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    minWidth: 280,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#3B3B3B',
    marginLeft: 12,
  },
};