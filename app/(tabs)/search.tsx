/**
 * Search Tab - Integrated Search Screen for TeaKE
 * Allows users to search for guys and view results
 */

import React, { useState } from 'react';
import { 
  View, 
  Text, 
  SafeAreaView, 
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert 
} from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { SignInScreen } from '@/src/screens/SignInScreen';
import { VerificationScreen } from '@/src/screens/VerificationScreen';
import { TeaKEStyles } from '@/src/constants/Styles';
import { TeaKEButton, TeaKECard } from '@/src/components/ui';
import { Colors } from '@/constants/Colors';

export default function SearchScreen() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Show auth screens if needed
  if (!user) {
    return <SignInScreen />;
  }

  if (!user.verified) {
    return <VerificationScreen />;
  }

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      Alert.alert('Enter Search Term', 'Please enter a name, nickname, phone, or social handle');
      return;
    }

    setIsSearching(true);
    
    // TODO: Implement actual search functionality
    setTimeout(() => {
      setSearchResults([]);
      setIsSearching(false);
      Alert.alert('Search Complete', 'No results found. This feature is coming soon!');
    }, 1000);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
  };

  return (
    <SafeAreaView style={TeaKEStyles.safeContainer}>
      <ScrollView style={TeaKEStyles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={TeaKEStyles.heading1}>Search for a Guy</Text>
          <Text style={[TeaKEStyles.body, { opacity: 0.8 }]}>
            Enter any information you have about him
          </Text>
        </View>

        {/* Search Form */}
        <TeaKECard style={styles.searchCard}>
          <Text style={[TeaKEStyles.heading2, { fontSize: 16, marginBottom: 16 }]}>
            Search by any of these:
          </Text>
          
          <TextInput
            style={[TeaKEStyles.textInput, styles.searchInput]}
            placeholder="Name, nickname, phone, social handle..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            multiline={false}
            autoCapitalize="none"
            autoComplete="off"
          />

          <View style={styles.searchButtons}>
            <TeaKEButton
              title={isSearching ? "Searching..." : "Search"}
              onPress={handleSearch}
              disabled={isSearching || !searchTerm.trim()}
              style={{ flex: 1, marginRight: 8 }}
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity 
                style={styles.clearButton}
                onPress={clearSearch}
              >
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
        </TeaKECard>

        {/* Search Tips */}
        <TeaKECard style={styles.tipsCard}>
          <Text style={[TeaKEStyles.heading2, { fontSize: 16, marginBottom: 12 }]}>
            💡 Search Tips
          </Text>
          <Text style={[TeaKEStyles.body, { fontSize: 14, lineHeight: 22 }]}>
            • Try different spellings or nicknames{'\n'}
            • Use partial phone numbers (last 4 digits){'\n'}
            • Include social media handles (@username){'\n'}
            • Don't include sensitive personal info
          </Text>
        </TeaKECard>

        {/* Results Section */}
        {searchResults.length > 0 && (
          <View style={styles.resultsContainer}>
            <Text style={[TeaKEStyles.heading2, { marginBottom: 16 }]}>
              Search Results
            </Text>
            {/* TODO: Render search results */}
          </View>
        )}

        {/* No Results State */}
        {searchTerm && !isSearching && searchResults.length === 0 && (
          <TeaKECard style={styles.noResultsCard}>
            <Text style={styles.noResultsEmoji}>🔍</Text>
            <Text style={[TeaKEStyles.heading2, { fontSize: 18, marginBottom: 8 }]}>
              No Results Found
            </Text>
            <Text style={[TeaKEStyles.body, { textAlign: 'center', marginBottom: 16 }]}>
              No one has posted about "{searchTerm}" yet.
            </Text>
            <TeaKEButton
              title="Be the First to Share"
              onPress={() => {
                // TODO: Navigate to add post with pre-filled name
                Alert.alert('Coming Soon', 'Add post functionality is being developed!');
              }}
              variant="secondary"
              size="small"
            />
          </TeaKECard>
        )}

        {/* Safety Notice */}
        <TeaKECard style={[styles.safetyCard, { marginBottom: 32 }]}>
          <Text style={styles.safetyEmoji}>🛡️</Text>
          <Text style={[TeaKEStyles.body, { fontSize: 14, textAlign: 'center' }]}>
            <Text style={{ fontWeight: '600' }}>Privacy Notice:</Text> We don't store your searches. 
            All information is encrypted and only verified users can search.
          </Text>
        </TeaKECard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingTop: 16,
    marginBottom: 24,
  },
  searchCard: {
    marginBottom: 16,
  },
  searchInput: {
    marginBottom: 16,
    minHeight: 48,
  },
  searchButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: Colors.light.accent,
  },
  clearButtonText: {
    color: Colors.light.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  tipsCard: {
    backgroundColor: Colors.light.accent,
    marginBottom: 24,
  },
  resultsContainer: {
    marginBottom: 24,
  },
  noResultsCard: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 24,
  },
  noResultsEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  safetyCard: {
    alignItems: 'center',
    backgroundColor: Colors.light.accent,
    borderColor: Colors.light.primary,
    borderWidth: 1,
    paddingVertical: 20,
  },
  safetyEmoji: {
    fontSize: 24,
    marginBottom: 12,
  },
});
