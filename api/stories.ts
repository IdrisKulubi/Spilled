import type { VercelRequest, VercelResponse } from '@vercel/node';
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { stories, guys } from '../src/database/schema';
import { desc, eq } from 'drizzle-orm';

// Initialize database connection
const getDatabaseConnection = () => {
  const databaseUrl = process.env.DATABASE_URL || process.env.EXPO_PUBLIC_DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }
  
  const sql = neon(databaseUrl);
  return drizzle(sql);
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = getDatabaseConnection();
    
    // Get query parameters
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    // Fetch stories with guy info
    const results = await db
      .select()
      .from(stories)
      .leftJoin(guys, eq(stories.guyId, guys.id))
      .orderBy(desc(stories.createdAt))
      .limit(limit)
      .offset(offset);

    // Process and format the stories
    const processedStories = results.map((row) => {
      const story = row.stories;
      const guy = row.guys;

      return {
        id: story.id,
        guy_id: story.guyId,
        guy_name: guy?.name || null,
        guy_phone: guy?.phone || null,
        guy_socials: guy?.socials || null,
        guy_location: guy?.location || null,
        guy_age: guy?.age || null,
        user_id: story.userId,
        text: story.text,
        tags: story.tags || [],
        image_url: story.imageUrl || null,
        created_at: story.createdAt?.toISOString(),
        anonymous: story.anonymous || false,
        nickname: story.nickname || null,
      };
    });

    return res.status(200).json({
      success: true,
      stories: processedStories,
      total: processedStories.length,
      limit,
      offset
    });

  } catch (error) {
    console.error('Error fetching stories:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch stories',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
