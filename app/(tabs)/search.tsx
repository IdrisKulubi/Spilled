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
  Alert,
  ActivityIndicator 
} from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { SignInScreen } from '@/src/screens/SignInScreen';
import { VerificationScreen } from '@/src/screens/VerificationScreen';
import { TeaKEStyles } from '@/src/constants/Styles';
import { TeaKEButton, TeaKECard, StatusTag } from '@/src/components/ui';
import { Colors } from '@/constants/Colors';
import { searchGuys, GuyProfile } from '@/src/actions/fetchGuyProfile';
import { MaterialIcons } from '@expo/vector-icons';

export default function SearchScreen() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [nameField, setNameField] = useState('');
  const [phoneField, setPhoneField] = useState('');
  const [socialsField, setSocialsField] = useState('');
  const [searchResults, setSearchResults] = useState<GuyProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchType, setSearchType] = useState<'simple' | 'advanced'>('simple');
  const [selectedGuy, setSelectedGuy] = useState<GuyProfile | null>(null);

  // Show auth screens if needed
  if (!user) {
    return <SignInScreen />;
  }

  if (!user.verified) {
    return <VerificationScreen />;
  }

  const handleSearch = async () => {
    let searchParams: { name?: string; phone?: string; socials?: string } = {};

    if (searchType === 'simple') {
      if (!searchTerm.trim()) {
        Alert.alert('Enter Search Term', 'Please enter a name, nickname, phone, or social handle');
        return;
      }
      // For simple search, try the term in all fields
      const term = searchTerm.trim();
      if (term.includes('@') || term.includes('instagram') || term.includes('twitter') || term.includes('tiktok')) {
        searchParams.socials = term;
      } else if (/^[0-9+\-\s()]+$/.test(term)) {
        searchParams.phone = term;
      } else {
        searchParams.name = term;
      }
    } else {
      // Advanced search - use specific fields
      if (!nameField.trim() && !phoneField.trim() && !socialsField.trim()) {
        Alert.alert('Enter Search Criteria', 'Please fill in at least one search field');
        return;
      }
      if (nameField.trim()) searchParams.name = nameField.trim();
      if (phoneField.trim()) searchParams.phone = phoneField.trim();
      if (socialsField.trim()) searchParams.socials = socialsField.trim();
    }

    setIsSearching(true);
    setSearchResults([]);
    
    try {
      const results = await searchGuys(searchParams);
      setSearchResults(results);
      
      if (results.length === 0) {
        const searchedTerm = searchType === 'simple' ? searchTerm : 
          [nameField, phoneField, socialsField].filter(f => f.trim()).join(', ');
        Alert.alert('No Results', `No one has posted about "${searchedTerm}" yet.`);
      }
    } catch (error) {
      Alert.alert('Search Error', 'Something went wrong. Please try again.');
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setNameField('');
    setPhoneField('');
    setSocialsField('');
    setSearchResults([]);
    setSelectedGuy(null);
  };

  const toggleSearchType = () => {
    setSearchType(prev => prev === 'simple' ? 'advanced' : 'simple');
    clearSearch();
  };

  const handleGuySelect = (guy: GuyProfile) => {
    setSelectedGuy(guy);
    // For now, just show an alert with guy info
    // Later this could navigate to a detailed profile screen
    Alert.alert(
      guy.name || 'Unknown Name',
      `${guy.stories?.length || 0} stories shared about this person.\n\n` +
      `Phone: ${guy.phone || 'Not provided'}\n` +
      `Socials: ${guy.socials || 'Not provided'}`,
      [
        { text: 'View Details', onPress: () => console.log('Navigate to profile:', guy.id) },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
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
  toggleContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: Colors.light.accent,
    borderRadius: 8,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeToggle: {
    backgroundColor: Colors.light.primary,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  activeToggleText: {
    color: '#FFFFFF',
  },
  searchCard: {
    marginBottom: 16,
  },
  searchInput: {
    marginBottom: 16,
    minHeight: 48,
  },
  advancedField: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  advancedInput: {
    flex: 1,
    marginLeft: 12,
    marginBottom: 0,
    minHeight: 44,
  },
  searchButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 12,
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
  resultCard: {
    marginBottom: 12,
    paddingVertical: 16,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  resultInfo: {
    flex: 1,
  },
  resultDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  storyCount: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.light.accent,
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
