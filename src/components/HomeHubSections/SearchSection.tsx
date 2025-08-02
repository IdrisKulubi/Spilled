/**
 * Search Section Component - Extracted from SearchScreen
 * Allows users to search for guys within the HomeHub
 */

import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator 
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { TeaKEStyles, Spacing } from '../../constants/Styles';
import { TeaKEButton, TeaKECard } from '../../components/ui';
import { Colors } from '../../../constants/Colors';
import { searchGuys, GuyProfile } from '../../actions/fetchGuyProfile';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export const SearchSection: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<GuyProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      Alert.alert('Enter Search Term', 'Please enter a name, nickname, phone, or social handle');
      return;
    }

    setIsSearching(true);
    setSearchResults([]);
    
    try {
      const results = await searchGuys({
        searchTerm: searchTerm.trim()
      });
      
      setSearchResults(results);
      
      if (results.length === 0) {
        Alert.alert(
          'No Results Found', 
          `No tea found about "${searchTerm.trim()}" yet 👀\n\nThis could mean:\n• No one's spilled the tea yet\n• Try different spelling or nickname\n• Try searching with partial name`,
          [
            { text: 'Try Again', style: 'default' },
            { 
              text: 'Be the First to Share', 
              onPress: () => router.push('/add-post'),
              style: 'default'
            }
          ]
        );
      }
    } catch (error) {
      Alert.alert('Search Error', 'Something went wrong bestie 😭 Please try again.');
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
  };

  const handleGuySelect = (guy: GuyProfile) => {
    Alert.alert(
      guy.name || 'Unknown Name',
      `${guy.stories?.length || 0} stories shared about this person 📱\n\n` +
      `Phone: ${guy.phone || 'Not provided'}\n` +
      `Socials: ${guy.socials || 'Not provided'}`,
      [
        { text: 'View Details', onPress: () => console.log('Navigate to profile:', guy.id) },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingHorizontal: Spacing.md, paddingTop: Spacing.md }]}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Search for Someone 🔍</Text>
        <Text style={styles.subtitle}>
          Spill or find the tea ☕
        </Text>
      </View>

      {/* Search Form */}
      <TeaKECard style={styles.searchCard}>
        <Text style={styles.searchLabel}>
          Who are we investigating? 👀
        </Text>
        
        <TextInput
          style={[TeaKEStyles.textInput, styles.searchInput]}
          placeholder="Name, nickname, phone, social handle..."
          placeholderTextColor={Colors.light.textSecondary}
          value={searchTerm}
          onChangeText={setSearchTerm}
          multiline={false}
          autoCapitalize="none"
          autoComplete="off"
        />

        <View style={styles.searchButtons}>
          <TeaKEButton
            title={isSearching ? "Searching..." : "Find the Tea ☕"}
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
          <Text style={styles.resultsTitle}>
            Found the Tea! ☕ ({searchResults.length})
          </Text>
          {searchResults.map((guy, index) => (
            <TeaKECard key={guy.id} style={styles.resultCard}>
              <TouchableOpacity 
                onPress={() => handleGuySelect(guy)}
                style={styles.resultContent}
              >
                <View style={styles.resultHeader}>
                  <View style={styles.resultInfo}>
                    <Text style={styles.guyName}>
                      {guy.name || 'Unknown Name'}
                    </Text>
                    
                    {/* Guy Details */}
                    <View style={styles.guyDetails}>
                      {guy.age && (
                        <Text style={styles.detailText}>
                          {guy.age} years old
                        </Text>
                      )}
                      {guy.location && (
                        <Text style={styles.detailText}>
                          📍 {guy.location}
                        </Text>
                      )}
                      {guy.phone && (
                        <Text style={styles.detailText}>
                          📱 ***{guy.phone.slice(-4)}
                        </Text>
                      )}
                      {guy.socials && (
                        <Text style={styles.detailText}>
                          📱 {guy.socials}
                        </Text>
                      )}
                    </View>

                    {/* Story Count */}
                    <View style={styles.storyCount}>
                      <MaterialIcons name="chat-bubble-outline" size={16} color={Colors.light.primary} />
                      <Text style={styles.storyCountText}>
                        {guy.story_count} {guy.story_count === 1 ? 'story' : 'stories'} shared
                      </Text>
                    </View>

                    {/* Match Source */}
                    {guy.match_source === 'story_content' && (
                      <Text style={styles.matchSource}>
                        💬 Found in story content
                      </Text>
                    )}
                  </View>
                  
                  <MaterialIcons name="chevron-right" size={24} color={Colors.light.textSecondary} />
                </View>
              </TouchableOpacity>
            </TeaKECard>
          ))}
        </View>
      )}

      {/* Privacy Notice */}
      <TeaKECard style={styles.privacyCard}>
        <Text style={styles.privacyEmoji}>🛡️</Text>
        <Text style={styles.privacyText}>
          <Text style={{ fontWeight: '600' }}>Privacy Notice:</Text> We don't store your searches bestie! 
          All info is encrypted and only verified users can search 💕
        </Text>
      </TeaKECard>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    lineHeight: 22,
  },
  searchCard: {
    marginBottom: Spacing.md,
  },
  searchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.md,
  },
  searchInput: {
    marginBottom: Spacing.md,
    minHeight: 48,
  },
  searchButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
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
  resultsContainer: {
    marginBottom: Spacing.lg,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.md,
  },
  resultCard: {
    marginBottom: Spacing.sm,
  },
  resultContent: {
    padding: 16,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  resultInfo: {
    flex: 1,
  },
  guyName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  guyDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
    gap: 12,
  },
  detailText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  storyCount: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  storyCountText: {
    fontSize: 13,
    marginLeft: 4,
    color: Colors.light.primary,
  },
  matchSource: {
    fontSize: 12,
    color: Colors.light.primary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  privacyCard: {
    alignItems: 'center',
    backgroundColor: Colors.light.accent,
    borderColor: Colors.light.primary,
    borderWidth: 1,
    paddingVertical: 20,
  },
  privacyEmoji: {
    fontSize: 24,
    marginBottom: 12,
  },
  privacyText: {
    fontSize: 14,
    textAlign: 'center',
    color: Colors.light.text,
  },
});