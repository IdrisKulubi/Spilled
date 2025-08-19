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

// Initialize Better Auth with the same configuration
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
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || process.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET || "",
      // Remove the callbackURL override - let Better Auth handle it
      // The callback will be handled by the server which will then redirect to the app
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
  trustedOrigins: [
    "*", // Allow all origins for now (you may want to restrict this in production)
    "spilled://",
    "spilled://*",
    "exp://*",
    "exp://localhost:*",
    "exp://*/--/*",
  ],
  telemetry: {
    enabled: false,
  },
  plugins: [
    expo({
      overrideOrigin: true,
    }),
  ],
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
  console.log("Auth API Request:", {
    method: req.method,
    url: req.url,
    path: req.url?.split('?')[0],
    query: req.query,
    headers: {
      origin: req.headers.origin,
      'content-type': req.headers['content-type'],
    },
  });

  // Log the configuration being used
  console.log("Better Auth Config:", {
    baseURL: auth.config.baseURL,
    secret: auth.config.secret ? '[SET]' : '[NOT SET]',
    googleClientId: auth.config.socialProviders?.google?.clientId ? '[SET]' : '[NOT SET]',
    googleCallbackURL: auth.config.socialProviders?.google?.callbackURL,
  });

    // Construct the full URL for Better Auth
    const url = new URL(req.url || '/', `https://${req.headers.host || 'spilled-kappa.vercel.app'}`);
    
    // Convert Vercel request to standard Request for Better Auth
    const request = new Request(url.toString(), {
      method: req.method || 'GET',
      headers: req.headers as HeadersInit,
      body: req.method !== 'GET' && req.method !== 'HEAD' 
        ? JSON.stringify(req.body) 
        : undefined,
    });

    // Handle the request with Better Auth
    const response = await auth.handler(request);

    // Log the response for debugging
    console.log('Auth API Response:', {
      status: response.status,
      statusText: response.statusText,
    });

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );

    // Handle OPTIONS request for CORS
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    // Copy headers from Better Auth response
    response.headers.forEach((value, key) => {
      if (!key.toLowerCase().startsWith('access-control-')) {
        res.setHeader(key, value);
      }
    });

    // Get response body
    const responseBody = await response.text();
    
    // Send response
    res.status(response.status);
    
    if (responseBody) {
      try {
        const jsonBody = JSON.parse(responseBody);
        res.json(jsonBody);
      } catch {
        res.send(responseBody);
      }
    } else {
      res.end();
    }

  } catch (error) {
    console.error('Auth handler error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
}
