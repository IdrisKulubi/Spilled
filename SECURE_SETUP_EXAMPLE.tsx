/**
 * EXAMPLE: How to integrate secure configuration into your App.tsx
 *
 * This file shows you how to wrap your existing app with the secure configuration system.
 * Copy the relevant parts into your actual App.tsx file.
 */

import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { View, Text } from "react-native";
import SecureAppWrapper from "./src/components/SecureAppWrapper";
import AdminDashboard from "./src/components/AdminDashboard";
import { securityMonitor } from "./src/utils/securityMonitoring";
import { errorMonitor } from "./src/utils/errorMonitoring";
import { supabase } from "./src/config/supabase";

// Your existing app components
import YourExistingAppContent from "./YourExistingAppContent"; // Replace with your actual components

export default function App() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);

        // Set user context for monitoring
        securityMonitor.setUserContext(session.user.id);
        errorMonitor.setUserContext(session.user.id);

        // Check if user is admin
        const { isUserAdmin } = await import("./src/config/supabase");
        const adminStatus = await isUserAdmin(session.user.email);
        setIsAdmin(adminStatus);

        // Log successful authentication
        await securityMonitor.logSecurityEvent({
          event_type: "user_login",
          severity: "low",
          description: "User logged in successfully",
          metadata: {
            user_id: session.user.id,
            email: session.user.email,
            login_method: "supabase_auth",
          },
        });
      } else {
        setUser(null);
        setIsAdmin(false);

        // Clear user context
        securityMonitor.clearUserContext();
        errorMonitor.clearUserContext();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <SecureAppWrapper>
      <View style={{ flex: 1 }}>
        <StatusBar style="auto" />

        {/* Your existing app content */}
        <YourExistingAppContent user={user} />

        {/* Admin Dashboard - only show for admins */}
        {isAdmin && <AdminDashboard />}
      </View>
    </SecureAppWrapper>
  );
}

/**
 * ALTERNATIVE: If you prefer to handle initialization manually in your existing App.tsx
 */
export function AlternativeAppSetup() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize secure configuration
      const { secureConfig } = await import("./src/config/secureConfig");
      await secureConfig.initialize();

      // Initialize Supabase
      const { initializeSupabase } = await import("./src/config/supabase");
      await initializeSupabase();

      // Set up monitoring
      const { errorMonitor } = await import("./src/utils/errorMonitoring");
      errorMonitor.setOnlineStatus(true);

      setIsInitialized(true);
      console.log("✅ App initialized successfully");
    } catch (error) {
      console.error("❌ App initialization failed:", error);
      // Handle initialization error
    }
  };

  if (!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Initializing TeaKE...</Text>
      </View>
    );
  }

  return <View style={{ flex: 1 }}>{/* Your app content here */}</View>;
}

/**
 * EXAMPLE: How to use the monitoring systems in your components
 */
export function ExampleComponentWithMonitoring() {
  const handleUserAction = async () => {
    try {
      // Monitor API call performance
      const { errorMonitor } = await import("./src/utils/errorMonitoring");

      const result = await errorMonitor.monitorApiCall(
        "create_story",
        async () => {
          // Your API call here
          return await supabase.from("stories").insert({ content: "Hello" });
        },
        { user_action: "create_story" }
      );

      console.log("Story created successfully:", result);
    } catch (error) {
      console.error("Failed to create story:", error);
      // Error is automatically logged by monitorApiCall
    }
  };

  const handleScreenLoad = async () => {
    const { errorMonitor } = await import("./src/utils/errorMonitoring");

    await errorMonitor.monitorScreenLoad("HomeScreen", async () => {
      // Your screen loading logic here
      await new Promise((resolve) => setTimeout(resolve, 1000));
    });
  };

  return <View>{/* Your component content */}</View>;
}

/**
 * EXAMPLE: How to use cached API calls
 */
export function ExampleWithCaching() {
  const [stories, setStories] = useState([]);

  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    try {
      // Use cached API instead of direct Supabase call
      const { cachedApi } = await import("./src/utils/caching");
      const storiesData = await cachedApi.getStories(20, 0);
      setStories(storiesData);
    } catch (error) {
      console.error("Failed to load stories:", error);
    }
  };

  return <View>{/* Render stories */}</View>;
}

/**
 * EXAMPLE: How to handle file uploads with security
 */
export function ExampleFileUpload() {
  const handleImageUpload = async (imageUri: string) => {
    try {
      const { fileUtils } = await import("./src/utils/fileStorage");

      const result = await fileUtils.uploadStoryImage(
        imageUri,
        "user-id-here",
        (progress) => {
          console.log(`Upload progress: ${progress}%`);
        }
      );

      if (result.success) {
        console.log("Image uploaded:", result.cdnUrl);
        // Use the optimized CDN URL
        const thumbnailUrl = fileUtils.getThumbnailUrl(result.cdnUrl);
        // Update your UI with the thumbnail
      }
    } catch (error) {
      console.error("Upload failed:", error);
    }
  };

  return <View>{/* Your file upload UI */}</View>;
}
