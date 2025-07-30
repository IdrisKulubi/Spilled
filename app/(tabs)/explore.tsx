import React from 'react';
import { View, Text, SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import { TeaKEStyles } from '@/src/constants/Styles';
import { TeaKECard } from '@/src/components/ui';
import { Colors } from '@/constants/Colors';
import { MaterialIcons } from '@expo/vector-icons';

export default function ExploreScreen() {
  return (
    <SafeAreaView style={[TeaKEStyles.safeContainer, styles.container]}>
      <ScrollView style={TeaKEStyles.container} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={[TeaKEStyles.h1, styles.title]}>Explore</Text>
          <Text style={[TeaKEStyles.body, styles.subtitle]}>
            Discover trending topics and popular stories
          </Text>
        </View>

        {/* Coming Soon Card */}
        <TeaKECard style={styles.comingSoonCard}>
          <View style={styles.iconContainer}>
            <MaterialIcons name="explore" size={48} color={Colors.light.primary} />
          </View>
          <Text style={[TeaKEStyles.h3, styles.comingSoonTitle]}>
            Coming Soon!
          </Text>
          <Text style={[TeaKEStyles.body, styles.comingSoonDescription]}>
            The Explore section is under development. Soon you'll be able to discover:
          </Text>
          
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <MaterialIcons name="trending-up" size={16} color={Colors.light.success} />
              <Text style={styles.featureText}>Trending stories and discussions</Text>
            </View>
            <View style={styles.featureItem}>
              <MaterialIcons name="tag" size={16} color={Colors.light.success} />
              <Text style={styles.featureText}>Popular tags and topics</Text>
            </View>
            <View style={styles.featureItem}>
              <MaterialIcons name="people" size={16} color={Colors.light.success} />
              <Text style={styles.featureText}>Most active community members</Text>
            </View>
            <View style={styles.featureItem}>
              <MaterialIcons name="star" size={16} color={Colors.light.success} />
              <Text style={styles.featureText}>Curated content recommendations</Text>
            </View>
          </View>
        </TeaKECard>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    color: Colors.light.secondary,
  },
  comingSoonCard: {
    marginHorizontal: 24,
    alignItems: 'center',
    paddingVertical: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.light.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  comingSoonTitle: {
    marginBottom: 16,
    textAlign: 'center',
  },
  comingSoonDescription: {
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  featureList: {
    alignSelf: 'stretch',
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  featureText: {
    flex: 1,
    fontSize: 16,
    color: Colors.light.text,
    lineHeight: 22,
  },
});