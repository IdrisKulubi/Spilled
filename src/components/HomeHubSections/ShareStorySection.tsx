/**
 * Share Story Section Component - For sharing stories within HomeHub
 * Extracted from Home and AddPost screens
 */

import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet,
  TouchableOpacity 
} from 'react-native';
import {  Spacing } from '../../constants/Styles';
import { TeaKEButton, TeaKECard } from '../../components/ui';
import { Colors } from '../../../constants/Colors';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export const ShareStorySection: React.FC = () => {
  const router = useRouter();

  const handleShareStory = () => {
    router.push('/add-post');
  };

  return (
    <View style={[styles.container, { paddingHorizontal: Spacing.md, paddingTop: Spacing.md }]}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Share Your Story 📝</Text>
        <Text style={styles.subtitle}>
          Spill the tea to help other girls stay safe ☕✨
        </Text>
      </View>

      {/* Main CTA Card */}
      <TeaKECard style={styles.mainCard}>
        <View style={styles.mainCardContent}>
          <Text style={styles.mainEmoji}>✨</Text>
          <Text style={styles.mainCardTitle}>Got Tea to Spill?</Text>
          <Text style={styles.mainCardDescription}>
            Your story could save another girl from a bad situation. 
            Share what you know - it's anonymous and encrypted 💕
          </Text>
          
          <TeaKEButton
            title="Share Your Story"
            onPress={handleShareStory}
            style={styles.shareButton}
          />
        </View>
      </TeaKECard>

      {/* Quick Prompts */}
      <View style={styles.promptsContainer}>
        <Text style={styles.promptsTitle}>Need help getting started? 💭</Text>
        
        <TeaKECard style={styles.promptCard}>
          <TouchableOpacity 
            onPress={handleShareStory}
            style={styles.promptContent}
          >
            <MaterialIcons name="warning" size={20} color={Colors.light.redFlag} />
            <View style={styles.promptText}>
              <Text style={styles.promptTitle}>Red Flags 🚩</Text>
              <Text style={styles.promptDescription}>
                Share warning signs you noticed
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={Colors.light.textSecondary} />
          </TouchableOpacity>
        </TeaKECard>

        <TeaKECard style={styles.promptCard}>
          <TouchableOpacity 
            onPress={handleShareStory}
            style={styles.promptContent}
          >
            <MaterialIcons name="favorite" size={20} color={Colors.light.success} />
            <View style={styles.promptText}>
              <Text style={styles.promptTitle}>Good Vibes ✨</Text>
              <Text style={styles.promptDescription}>
                Share positive experiences too!
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={Colors.light.textSecondary} />
          </TouchableOpacity>
        </TeaKECard>

        <TeaKECard style={styles.promptCard}>
          <TouchableOpacity 
            onPress={handleShareStory}
            style={styles.promptContent}
          >
            <MaterialIcons name="help" size={20} color={Colors.light.unsure} />
            <View style={styles.promptText}>
              <Text style={styles.promptTitle}>Mixed Feelings 🤔</Text>
              <Text style={styles.promptDescription}>
                Not sure? Share anyway - it helps!
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={Colors.light.textSecondary} />
          </TouchableOpacity>
        </TeaKECard>
      </View>

      {/* Community Impact */}
      <TeaKECard style={styles.impactCard}>
        <Text style={styles.impactEmoji}>🌟</Text>
        <Text style={styles.impactTitle}>Your Story Matters</Text>
        <Text style={styles.impactDescription}>
          Every story shared helps build a safer community for women. 
          Your experience could prevent someone else from getting hurt 💜
        </Text>
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>1.2K+</Text>
            <Text style={styles.statLabel}>Stories shared</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>500+</Text>
            <Text style={styles.statLabel}>Girls helped</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>100%</Text>
            <Text style={styles.statLabel}>Anonymous</Text>
          </View>
        </View>
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
  mainCard: {
    marginBottom: Spacing.lg,
    backgroundColor: Colors.light.accent,
    borderColor: Colors.light.primary,
    borderWidth: 1,
  },
  mainCardContent: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  mainEmoji: {
    fontSize: 32,
    marginBottom: Spacing.md,
  },
  mainCardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.sm,
  },
  mainCardDescription: {
    fontSize: 15,
    color: Colors.light.text,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  shareButton: {
    paddingHorizontal: Spacing.xl,
  },
  promptsContainer: {
    marginBottom: Spacing.lg,
  },
  promptsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.md,
  },
  promptCard: {
    marginBottom: Spacing.sm,
  },
  promptContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  promptText: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  promptTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 2,
  },
  promptDescription: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  impactCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    backgroundColor: Colors.light.cardBackground,
    borderColor: Colors.light.success,
    borderWidth: 1,
  },
  impactEmoji: {
    fontSize: 28,
    marginBottom: Spacing.md,
  },
  impactTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.sm,
  },
  impactDescription: {
    fontSize: 14,
    color: Colors.light.text,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.primary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.light.border,
  },
});