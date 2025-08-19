import type { VercelRequest, VercelResponse } from '@vercel/node';
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { expo } from "@better-auth/expo";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from '../../src/database/schema';

// Get database connection
const getDatabaseConnection = () => {
  const databaseUrl = process.env.DATABASE_URL || process.env.EXPO_PUBLIC_DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }
  
  const sql = neon(databaseUrl);
  return drizzle(sql, { schema });
};

// Initialize Better Auth
const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || process.env.EXPO_PUBLIC_AUTH_BASE_URL || "https://spilled-kappa.vercel.app/api/auth",
  secret: process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET,
  database: drizzleAdapter(getDatabaseConnection(), {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  plugins: [
    expo({
      overrideOrigin: true,
    }),
  ],
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('Session check request:', {
      method: req.method,
      headers: {
        authorization: req.headers.authorization,
        cookie: req.headers.cookie,
      },
      body: req.body
    });

    // For GET requests, check the current session
    if (req.method === 'GET') {
      // Extract session token from Authorization header or cookies
      const authHeader = req.headers.authorization;
      const sessionToken = authHeader?.replace('Bearer ', '');
      
      if (!sessionToken) {
        return res.status(401).json({
          success: false,
          error: 'No session token provided',
          session: null
        });
      }

      // Query the database directly to check session
      const db = getDatabaseConnection();
      const { eq } = await import('drizzle-orm');
      const sessions = await db
        .select()
        .from(schema.session)
        .where(eq(schema.session.token, sessionToken))
        .limit(1);

      if (sessions.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Session not found',
          session: null
        });
      }

      const session = sessions[0];
      
      // Check if session is expired
      if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
        return res.status(401).json({
          success: false,
          error: 'Session expired',
          session: null
        });
      }

      // Get user data
      const users = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, session.userId))
        .limit(1);

      const user = users[0] || null;

      return res.status(200).json({
        success: true,
        session: {
          id: session.id,
          userId: session.userId,
          expiresAt: session.expiresAt,
          createdAt: session.createdAt,
        },
        user: user ? {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
          verified: user.verified,
        } : null
      });
    }

    // For POST requests, create a new session (for debugging)
    if (req.method === 'POST') {
      const { userId, email } = req.body;
      
      if (!userId && !email) {
        return res.status(400).json({
          success: false,
          error: 'userId or email required'
        });
      }

      const db = getDatabaseConnection();
      
      // Find or create user
      const { eq } = await import('drizzle-orm');
      let user;
      if (userId) {
        const users = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.id, userId))
          .limit(1);
        user = users[0];
      } else if (email) {
        const users = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.email, email))
          .limit(1);
        user = users[0];
      }

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Create a debug session
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const sessionToken = `debug_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const now = new Date();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const newSession = await db
        .insert(schema.session)
        .values({
          id: sessionId,
          userId: user.id,
          token: sessionToken,
          expiresAt: expiresAt,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return res.status(200).json({
        success: true,
        message: 'Debug session created',
        session: {
          token: sessionToken,
          userId: user.id,
          expiresAt: expiresAt,
        },
        user: {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
        }
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error('Session handler error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
