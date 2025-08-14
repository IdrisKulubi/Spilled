/**
 * Story Management Actions - Edit, Delete, and Update operations
 * Handles story modifications with proper permissions and soft delete
 */

import { StoryRepository } from "../repositories/StoryRepository";
import { GuyRepository } from "../repositories/GuyRepository";
import { CommentRepository } from "../repositories/CommentRepository";
import { StoryFeedItem } from "./fetchStoriesFeed";
import { ValidationError, NotFoundError } from "../repositories/utils/ErrorHandler";

// Update story data interface
export interface UpdateStoryData {
  guyName?: string;
  guyPhone?: string;
  guySocials?: string;
  guyLocation?: string;
  guyAge?: number;
  storyText: string;
  tags: string[];
  imageUrl?: string;
  anonymous: boolean;
  nickname?: string;
}

// Delete story (hard delete)
export const deleteStory = async (storyId: string, userId: string) => {
  try {
    const storyRepo = new StoryRepository();
    
    // First verify the user owns this story
    const isOwner = await storyRepo.isOwner(storyId, userId);
    
    if (!isOwner) {
      return {
        success: false,
        error: "You can only delete your own stories bestie! 🚫",
      };
    }

    // Delete the story and all associated comments
    const deleted = await storyRepo.deleteWithComments(storyId);

    if (!deleted) {
      return {
        success: false,
        error: "Failed to delete story. Please try again.",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Delete story error:", error);
    
    if (error instanceof NotFoundError) {
      return { success: false, error: "Story not found" };
    }
    
    if (error instanceof ValidationError) {
      return { success: false, error: error.message };
    }
    
    return { success: false, error: "Something went wrong bestie! 😭" };
  }
};

// Update only guy information without touching the story
export const updateGuyInfo = async (
  storyId: string,
  userId: string,
  guyData: {
    guyName?: string;
    guyPhone?: string;
    guySocials?: string;
    guyLocation?: string;
    guyAge?: number;
  }
) => {
  try {
    const storyRepo = new StoryRepository();
    const guyRepo = new GuyRepository();
    
    // First verify the user owns this story
    const isOwner = await storyRepo.isOwner(storyId, userId);
    
    if (!isOwner) {
      return {
        success: false,
        error: "You can only edit your own stories bestie! 🚫",
      };
    }

    // Get the story to find the associated guy
    const story = await storyRepo.findById(storyId);
    
    if (!story) {
      return { success: false, error: "Story not found" };
    }

    // Update only the guy information (if guy exists)
    if (story.guyId) {
      const updatedGuy = await guyRepo.updateProfile(story.guyId, {
        name: guyData.guyName || null,
        phone: guyData.guyPhone || null,
        socials: guyData.guySocials || null,
        location: guyData.guyLocation || null,
        age: guyData.guyAge || null,
      });

      if (!updatedGuy) {
        return { success: false, error: "Failed to update person information" };
      }

      return { success: true };
    } else {
      return { success: false, error: "No person associated with this story" };
    }
  } catch (error) {
    console.error("Unexpected error updating guy info:", error);
    
    if (error instanceof NotFoundError) {
      return { success: false, error: "Story or person not found" };
    }
    
    if (error instanceof ValidationError) {
      return { success: false, error: error.message };
    }
    
    return { success: false, error: "An unexpected error occurred" };
  }
};

// Update story content
export const updateStory = async (
  storyId: string,
  userId: string,
  updateData: UpdateStoryData
) => {
  try {
    const storyRepo = new StoryRepository();
    const guyRepo = new GuyRepository();
    
    // First verify the user owns this story
    const isOwner = await storyRepo.isOwner(storyId, userId);
    
    if (!isOwner) {
      return {
        success: false,
        error: "You can only edit your own stories bestie! 🚫",
      };
    }

    // Get the story to find the associated guy
    const story = await storyRepo.findById(storyId);
    
    if (!story) {
      return { success: false, error: "Story not found" };
    }

    // Update the guy information first (if guy exists)
    if (story.guyId) {
      await guyRepo.updateProfile(story.guyId, {
        name: updateData.guyName || null,
        phone: updateData.guyPhone || null,
        socials: updateData.guySocials || null,
        location: updateData.guyLocation || null,
        age: updateData.guyAge || null,
      });
    }

    // Update the story content
    const updatedStory = await storyRepo.updateStory(storyId, {
      text: updateData.storyText,
      tags: updateData.tags as ("red_flag" | "good_vibes" | "unsure")[],
      imageUrl: updateData.imageUrl || null,
      anonymous: updateData.anonymous,
      nickname: updateData.anonymous ? null : updateData.nickname,
    });

    if (!updatedStory) {
      return {
        success: false,
        error: "Failed to update story. Please try again.",
      };
    }

    return { success: true, story: updatedStory };
  } catch (error) {
    console.error("Update story error:", error);
    
    if (error instanceof NotFoundError) {
      return { success: false, error: "Story not found" };
    }
    
    if (error instanceof ValidationError) {
      return { success: false, error: error.message };
    }
    
    return { success: false, error: "Something went wrong bestie! 😭" };
  }
};

// Delete comment (hard delete for comments)
export const deleteComment = async (commentId: string, userId: string) => {
  try {
    const commentRepo = new CommentRepository();
    
    // First verify the user owns this comment
    const isOwner = await commentRepo.isOwner(commentId, userId);
    
    if (!isOwner) {
      return {
        success: false,
        error: "You can only delete your own comments bestie! 🚫",
      };
    }

    // Delete the comment
    const deleted = await commentRepo.delete(commentId);

    if (!deleted) {
      return {
        success: false,
        error: "Failed to delete comment. Please try again.",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Delete comment error:", error);
    
    if (error instanceof NotFoundError) {
      return { success: false, error: "Comment not found" };
    }
    
    if (error instanceof ValidationError) {
      return { success: false, error: error.message };
    }
    
    return { success: false, error: "Something went wrong bestie! 😭" };
  }
};

// Check if user owns a story
export const checkStoryOwnership = (
  story: StoryFeedItem,
  userId: string
): boolean => {
  return story.user_id === userId;
};

// Check if user owns a comment
export const checkCommentOwnership = (
  comment: any,
  userId: string
): boolean => {
  return comment.user_id === userId;
};
