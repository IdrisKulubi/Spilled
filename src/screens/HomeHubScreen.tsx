/**
 * HomeHub Screen - Unified interface with segmented tabs
 * Combines Search, Share Story, and Explore into one smooth experience
 */

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  SafeAreaView,
  StyleSheet,
  Animated,
  useWindowDimensions,
  Platform 
} from 'react-native';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { TeaKEStyles, Spacing } from '../constants/Styles';
import { Colors } from '../../constants/Colors';
import { MaterialIcons } from '@expo/vector-icons';
import { ProfileDropdown } from '../components/ProfileDropdown';
import { SearchSection, ShareStorySection, ExploreSection } from '../components/HomeHubSections';

const LAST_TAB_STORAGE_KEY = '@TeaKE:lastSelectedTab';

// Tab route configuration
const routes = [
  { key: 'search', title: 'Search' },
  { key: 'share', title: 'Share' },
  { key: 'explore', title: 'Explore' },
];

// Scene components
const renderScene = SceneMap({
  search: SearchSection,
  share: ShareStorySection,
  explore: ExploreSection,
});





export const HomeHubScreen: React.FC = () => {
  const { user } = useAuth();
  const layout = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [pulseAnim] = useState(new Animated.Value(1));

  // Load last selected tab on mount
  useEffect(() => {
    const loadLastTab = async () => {
      try {
        const lastTab = await AsyncStorage.getItem(LAST_TAB_STORAGE_KEY);
        if (lastTab !== null) {
          const tabIndex = routes.findIndex(route => route.key === lastTab);
          if (tabIndex !== -1) {
            setIndex(tabIndex);
          }
        }
      } catch (error) {
        console.log('Error loading last tab:', error);
      }
    };

    loadLastTab();
  }, []);

  // Save selected tab when it changes
  useEffect(() => {
    const saveLastTab = async () => {
      try {
        await AsyncStorage.setItem(LAST_TAB_STORAGE_KEY, routes[index].key);
      } catch (error) {
        console.log('Error saving last tab:', error);
      }
    };

    saveLastTab();
  }, [index]);

  // Pulse animation for greeting
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [pulseAnim]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getUserDisplayName = () => {
    if (user?.nickname) return user.nickname;
    if (user?.email) return user.email.split('@')[0];
    return 'bestie';
  };

  const getTabIcon = (routeKey: string) => {
    switch (routeKey) {
      case 'search':
        return 'search';
      case 'share':
        return 'add-circle-outline';
      case 'explore':
        return 'explore';
      default:
        return 'circle';
    }
  };

  const renderTabBar = (props: any) => (
    <TabBar
      {...props}
      indicatorStyle={styles.tabIndicator}
      style={styles.tabBar}
      labelStyle={styles.tabLabel}
      activeColor={Colors.light.primary}
      inactiveColor={Colors.light.textSecondary}
      renderIcon={({ route, color }: { route: any; color: string }) => (
        <MaterialIcons
          name={getTabIcon(route.key) as any}
          size={20}
          color={color}
          style={styles.tabIcon}
        />
      )}
      renderLabel={({ route, color }: { route: any; color: string }) => (
        <Text style={[styles.tabLabel, { color }]}>
          {route.title}
        </Text>
      )}
      pressColor={Colors.light.accent}
      pressOpacity={0.8}
    />
  );

  return (
    <SafeAreaView style={TeaKEStyles.safeContainer}>
      {/* Header with personalized greeting */}
      <View style={styles.headerContainer}>
        <Animated.View style={[styles.greetingContainer, { transform: [{ scale: pulseAnim }] }]}>
          <Text style={styles.greeting}>
            {getGreeting()}, {getUserDisplayName()}! 👋
          </Text>
          <Text style={styles.tagline}>
            What vibe are we serving today? ✨
          </Text>
        </Animated.View>
        
        <ProfileDropdown user={user} />
      </View>

      {/* Tabbed Interface */}
      <View style={styles.tabContainer}>
        <TabView
          navigationState={{ index, routes }}
          renderScene={renderScene}
          onIndexChange={setIndex}
          initialLayout={{ width: layout.width }}
          renderTabBar={renderTabBar}
          style={styles.tabView}
          lazy={true}
          swipeEnabled={true}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.light.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    ...Platform.select({
      ios: {
        shadowColor: Colors.light.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
  },
  tabContainer: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  tabView: {
    flex: 1,
  },
  tabBar: {
    backgroundColor: Colors.light.cardBackground,
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  tabIndicator: {
    backgroundColor: Colors.light.primary,
    height: 3,
    borderRadius: 2,
  },
  tabIcon: {
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'none',
    marginTop: 2,
  },

});