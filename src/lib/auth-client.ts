import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";

export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_AUTH_BASE_URL || "http://localhost:8081/api/auth",
  plugins: [
    expoClient({
      scheme: "spilled", // App scheme from app.json
      storagePrefix: "spilled",
      storage: SecureStore,
    }),
  ],
});

export type Session = typeof authClient.$Infer.Session;
// Use our database User type instead of Better Auth User type
export type { User } from '../database/schema';