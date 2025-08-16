import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { expo } from "@better-auth/expo";
import { db } from "../database/connection";
import { users } from "../database/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: users,
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
  trustedOrigins: [
    "spilled://", // App scheme from app.json
    "spilled://*", // Wildcard support for all paths
  ],
  telemetry: {
    enabled: false, // Disable telemetry
  },
  plugins: [
    expo({
      overrideOrigin: true, // Set to true if facing CORS issues with Expo API routes
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
// Use our database User type instead of Better Auth User type
export type { User } from '../database/schema';