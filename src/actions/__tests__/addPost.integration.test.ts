/**
 * Integration test for addPost action with real database
 * This test requires a working database connection
 */

import { addPost, CreatePostData } from '../addPost';
import { authUtils } from '../../utils/auth';
import { StoryRepository } from '../../repositories/StoryRepository';
import { GuyRepository } from '../../repositories/GuyRepository';
import { UserRepository } from '../../repositories/UserRepository';

// This is an integration test that requires actual database connection
// Run only when database is available
describe('addPost Integration Test', () => {
  const userRepository = new UserRepository();
  const guyRepository = new GuyRepository();
  const storyRepository = new StoryRepository();

  // Test user data
  const testUser = {
    id: 'test-user-' + Date.now(),
    email: 'test@example.com',
    nickname: 'TestUser',
    verificationStatus: 'approved' as const,
    verified: true,
    phone: '+254712345678',
    createdAt: new Date(),
  };

  beforeAll(async () => {
    // Create test user in database
    try {
      await userRepository.create(testUser);
    } catch (error) {
      console.log('Test user might already exist or database not available');
    }
  });

  afterAll(async () => {
    // Clean up test data
    try {
      // Find and delete test stories
      const userStories = await storyRepository.findByUserId(testUser.id);
      for (const story of userStories.data) {
        await storyRepository.delete(story.id);
      }

      // Find and delete test guys
      const userGuys = await guyRepository.findByCreatedByUserId(testUser.id);
      for (const guy of userGuys.data) {
        await guyRepository.delete(guy.id);
      }

      // Delete test user
      await userRepository.delete(testUser.id);
    } catch (error) {
      console.log('Cleanup failed or database not available');
    }
  });

  it('should create a post with new guy successfully', async () => {
    // Mock getCurrentUser to return our test user
    const originalGetCurrentUser = authUtils.getCurrentUser;
    authUtils.getCurrentUser = jest.fn().mockResolvedValue(testUser);

    const postData: CreatePostData = {
      guyName: 'John Test',
      guyPhone: '+254712345679',
      guyLocation: 'Nairobi Test',
      guyAge: 25,
      storyText: 'This is a test story about John',
      tags: ['good_vibes'],
      anonymous: false,
      nickname: 'TestUser',
    };

    const result = await addPost(postData);

    expect(result.success).toBe(true);
    expect(result.postId).toBeDefined();
    expect(result.guyId).toBeDefined();

    // Verify the story was created
    if (result.postId) {
      const createdStory = await storyRepository.findById(result.postId);
      expect(createdStory).toBeDefined();
      expect(createdStory?.text).toBe('This is a test story about John');
      expect(createdStory?.tags).toEqual(['good_vibes']);
    }

    // Verify the guy was created
    if (result.guyId) {
      const createdGuy = await guyRepository.findById(result.guyId);
      expect(createdGuy).toBeDefined();
      expect(createdGuy?.name).toBe('John Test');
      expect(createdGuy?.phone).toBe('+254712345679');
    }

    // Restore original function
    authUtils.getCurrentUser = originalGetCurrentUser;
  }, 10000); // 10 second timeout for database operations

  it('should fail when user is not verified', async () => {
    const unverifiedUser = {
      ...testUser,
      id: 'unverified-user-' + Date.now(),
      verificationStatus: 'pending' as const,
    };

    // Mock getCurrentUser to return unverified user
    const originalGetCurrentUser = authUtils.getCurrentUser;
    authUtils.getCurrentUser = jest.fn().mockResolvedValue(unverifiedUser);

    const postData: CreatePostData = {
      guyName: 'John Test',
      storyText: 'This should fail',
      tags: ['good_vibes'],
      anonymous: false,
    };

    const result = await addPost(postData);

    expect(result.success).toBe(false);
    expect(result.error).toContain('verification is still pending');

    // Restore original function
    authUtils.getCurrentUser = originalGetCurrentUser;
  });
});