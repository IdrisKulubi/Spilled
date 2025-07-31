import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthProvider, useAuth } from '@/src/contexts/AuthContext';
import { SplashScreen } from '@/components/SplashScreen';

// This component now receives fontLoaded as a prop
function AppStack({ fontLoaded }: { fontLoaded: boolean }) {
  const { loading: authLoading } = useAuth();

  // The condition to show the splash screen is now combined here
  const isLoading = authLoading || !fontLoaded;

  console.log(
    `[Layout] AppStack. Auth loading: ${authLoading}, Fonts loaded: ${fontLoaded}, isLoading: ${isLoading}`
  );

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen 
        name="add-post" 
        options={{ 
          title: 'Share Your Story',
          headerShown: true,
          presentation: 'modal',
          headerTitleStyle: {
            color: '#D96BA0'
          },
          headerStyle: {
            backgroundColor: '#FFF8F9'
          }
        }} 
      />
      <Stack.Screen name="+not-found" />
      <Stack.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerShown: true,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="chat"
        options={{
          headerShown: false, // ChatScreen has its own header
          presentation: 'card',
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontTimeout, setFontTimeout] = React.useState(false);
  
  // The useFonts hook is now in the top-level layout component
  const [fontLoaded, fontError] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Add a timeout to prevent infinite loading due to font issues
  React.useEffect(() => {
    const timer = setTimeout(() => {
      console.log('[Layout] Font loading timeout - proceeding without fonts');
      setFontTimeout(true);
    }, 2000); // 2 second timeout

    if (fontLoaded || fontError) {
      clearTimeout(timer);
    }

    return () => clearTimeout(timer);
  }, [fontLoaded, fontError]);

  console.log('[Layout] Font loading status - loaded:', fontLoaded, 'error:', fontError, 'timeout:', fontTimeout);

  // If there's a font error, timeout, or fonts loaded, we'll proceed
  const fontsReady = fontLoaded || !!fontError || fontTimeout;

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        {/* The fontLoaded status is passed down as a prop */}
        <AppStack fontLoaded={fontsReady} />
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}

