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

export const SignInScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { signInWithGoogle } = useAuth();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await signInWithGoogle();

      if (result.success) {
        // Navigation will be handled by AuthContext state change
      } else {
        Alert.alert('Sign In Failed', result.error || 'Failed to sign in with Google');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={TeaKEStyles.safeContainer}>
      <View style={[TeaKEStyles.container, { justifyContent: 'center' }]}>
        <View style={{ marginBottom: 60, alignItems: 'center' }}>
          <Text style={[TeaKEStyles.heading1, { textAlign: 'center' }]}>Welcome to TeaKE</Text>
          <Text style={[TeaKEStyles.body, { textAlign: 'center', marginTop: 12 }]}>
            Sign in with Google to start sharing and discovering information about guys in Kenya.
          </Text>
        </View>

        <View style={{ alignItems: 'center' }}>
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#3B3B3B" />
            ) : (
              <>
                <Ionicons name="logo-google" size={24} color="#4285F4" />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={[TeaKEStyles.caption, { textAlign: 'center', marginTop: 24, paddingHorizontal: 20 }]}>
            💡 After signing in, you'll need to upload your school ID or national ID 
            to verify you're a girl. This keeps our community safe and authentic.
          </Text>
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