/**
 * Add Post Action - Spilled
 * Handles creating new posts/stories about guys
 * Updated to use Drizzle repositories instead of Supabase
 */

import { authUtils } from '../utils/auth';
import { StoryRepository } from '../repositories/StoryRepository';
import { GuyRepository } from '../repositories/GuyRepository';


type TagType = "red_flag" | "good_vibes" | "unsure";

export interface CreatePostData {
  guyName?: string;
  guyPhone?: string;
  guySocials?: string;
  guyLocation?: string;
  guyAge?: number;
  storyText: string;
  tags: TagType[];
  imageUrl?: string;
  anonymous: boolean;
  nickname?: string;
}

export interface PostResponse {
  success: boolean;
  postId?: string;
  guyId?: string;
  error?: string;
}

// Initialize repositories
const storyRepository = new StoryRepository();
const guyRepository = new GuyRepository();

export const addPost = async (postData: CreatePostData): Promise<PostResponse> => {
  try {
    // Get authenticated user
    const currentUser = await authUtils.getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: 'You must be logged in to create a post'
      };
    }

    // Check if user is verified
    if (currentUser.verificationStatus !== 'approved') {
      const statusMessage = currentUser.verificationStatus === 'pending' 
        ? 'Your verification is still pending. Please wait for approval.'
        : currentUser.verificationStatus === 'rejected'
        ? 'Your verification was rejected. Please re-upload your ID.'
        : 'Please verify your identity by uploading your ID to post stories.';
      
      return {
        success: false,
        error: statusMessage
      };
    }

    // Validation
    if (!postData.storyText.trim()) {
      return {
        success: false,
        error: 'Story text is required'
      };
    }

    if (postData.tags.length === 0) {
      return {
        success: false,
        error: 'At least one tag is required'
      };
    }

    // Validate that at least one guy identifier is provided
    if (!postData.guyName && !postData.guyPhone && !postData.guySocials) {
      return {
        success: false,
        error: 'Please provide at least the guy\'s name, phone, or social handle'
      };
    }

    // Format phone number if provided
    let formattedPhone = postData.guyPhone;
    if (formattedPhone) {
      formattedPhone = authUtils.formatPhoneNumber(formattedPhone);
    }

    // Step 1: Find or create guy profile
    let guyId: string;
    
    // First, try to find existing guy using search functionality
    if (postData.guyName || formattedPhone || postData.guySocials) {
      const searchTerm = postData.guyName || formattedPhone || postData.guySocials || '';
      const searchResults = await guyRepository.searchGuys(searchTerm, { limit: 1 });
      
      if (searchResults.data.length > 0) {
        guyId = searchResults.data[0].id;
      } else {
        // Create new guy profile
        try {
          const newGuy = await guyRepository.create({
            name: postData.guyName || null,
            phone: formattedPhone || null,
            socials: postData.guySocials || null,
            location: postData.guyLocation || null,
            age: postData.guyAge || null,
            createdByUserId: currentUser.id,
          });

          guyId = newGuy.id;
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create guy profile'
          };
        }
      }
    } else {
      return {
        success: false,
        error: 'Please provide at least the guy\'s name, phone, or social handle'
      };
    }

    // Step 2: Create story entry
    try {
      const newStory = await storyRepository.create({
        guyId: guyId,
        userId: currentUser.id,
        text: postData.storyText.trim(),
        tags: postData.tags,
        imageUrl: postData.imageUrl || null,
        anonymous: postData.anonymous,
        nickname: postData.anonymous ? null : (postData.nickname || currentUser.nickname),
      });

      return {
        success: true,
        postId: newStory.id,
        guyId: guyId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create story'
      };
    }
  } catch (error) {
    console.error('Error creating post:', error);
    return {
      success: false,
      error: 'Failed to create post. Please try again.'
    };
  }
};

// Helper function to upload image to Cloudflare R2
export const uploadStoryImage = async (uri: string, storyId: string): Promise<string | null> => {
  try {
    console.log('[StoryUpload] Starting image upload:', { uri, storyId });

    // Use the story image utilities for consistent handling
    const { uploadStoryImageWithValidation } = await import('../utils/storyImageUtils');
    const result = await uploadStoryImageWithValidation(uri, storyId);

    if (!result.success) {
      console.error('[StoryUpload] Upload failed:', result.error);
      return null;
    }

    console.log('[StoryUpload] Image uploaded successfully:', result.imageUrl);
    return result.imageUrl || null;

  } catch (error) {
    console.error('[StoryUpload] Error uploading image:', error);
    return null;
  }
};