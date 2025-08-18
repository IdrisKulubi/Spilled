import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { expo } from "@better-auth/expo";
import { db } from "../database/connection";
import { users, session, account, verification } from "../database/schema";

// Development mode check
const isDevelopment = process.env.EXPO_PUBLIC_DEV_MODE === 'true';

export const auth = betterAuth({
  baseURL: process.env.EXPO_PUBLIC_AUTH_BASE_URL || "http://localhost:8081/api/auth",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: users,
      session: session,
      account: account,
      verification: verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set to true if you want email verification
  },
  socialProviders: {
    google: {
      clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID!,
      clientSecret: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET!,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
  user: {
    additionalFields: {
      nickname: {
        type: "string",
        required: false,
      },
      phone: {
        type: "string", 
        required: false,
      },
      verified: {
        type: "boolean",
        defaultValue: false,
      },
      verificationStatus: {
        type: "string",
        defaultValue: "pending",
      },
      idImageUrl: {
        type: "string",
        required: false,
      },
      idType: {
        type: "string",
        required: false,
      },
      rejectionReason: {
        type: "string",
        required: false,
      },
      verifiedAt: {
        type: "date",
        required: false,
      },
    },
  },
  trustedOrigins: isDevelopment ? [
    "*", // Allow all origins in development for easier testing
  ] : [
    "spilled://", // App scheme from app.json
    "spilled://*", // Wildcard support for all paths
    "exp://*", // Expo development URLs
    "exp://localhost:*", // Expo localhost development  
    "exp://*/--/*", // Expo deep linking format
  ],
  telemetry: {
    enabled: false, // Disable telemetry
  },
  plugins: [
    expo({
      overrideOrigin: true, // Set to true if facing CORS issues with Expo API routes
      trustHost: true, // Trust the host header for generating the callback URL
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
// Use our database User type instead of Better Auth User type
export type { User } from '../database/schema';