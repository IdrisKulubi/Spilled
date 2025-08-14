/**
 * Test for addPost action with Drizzle repositories
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { addPost, CreatePostData } from '../addPost';
import { authUtils } from '../../utils/auth';
import { StoryRepository } from '../../repositories/StoryRepository';
import { GuyRepository } from '../../repositories/GuyRepository';

// Mock the repositories
vi.mock('../../repositories/StoryRepository');
vi.mock('../../repositories/GuyRepository');
vi.mock('../../utils/auth');

describe('addPost', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    nickname: 'TestUser',
    verificationStatus: 'approved' as const,
    verified: true,
    phone: '+254712345678',
    createdAt: new Date(),
  };

  const mockGuy = {
    id: 'guy-123',
    name: 'John Doe',
    phone: '+254712345678',
    socials: '@johndoe',
    location: 'Nairobi',
    age: 25,
    createdByUserId: 'user-123',
    createdAt: new Date(),
  };

  const mockStory = {
    id: 'story-123',
    guyId: 'guy-123',
    userId: 'user-123',
    text: 'Test story',
    tags: ['good_vibes'] as const,
    imageUrl: null,
    anonymous: false,
    nickname: 'TestUser',
    createdAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a post successfully with existing guy', async () => {
    // Mock auth
    vi.mocked(authUtils.getCurrentUser).mockResolvedValue(mockUser);

    // Mock guy repository - return existing guy
    const mockGuyRepository = {
      searchGuys: vi.fn().mockResolvedValue({
        data: [mockGuy],
        total: 1,
        page: 1,
        limit: 1,
        totalPages: 1,
      }),
    };
    vi.mocked(GuyRepository).mockImplementation(() => mockGuyRepository as any);

    // Mock story repository
    const mockStoryRepository = {
      create: vi.fn().mockResolvedValue(mockStory),
    };
    vi.mocked(StoryRepository).mockImplementation(() => mockStoryRepository as any);

    const postData: CreatePostData = {
      guyName: 'John Doe',
      storyText: 'Test story about John',
      tags: ['good_vibes'],
      anonymous: false,
      nickname: 'TestUser',
    };

    const result = await addPost(postData);

    expect(result.success).toBe(true);
    expect(result.postId).toBe('story-123');
    expect(result.guyId).toBe('guy-123');
    expect(mockGuyRepository.searchGuys).toHaveBeenCalledWith('John Doe', { limit: 1 });
    expect(mockStoryRepository.create).toHaveBeenCalledWith({
      guyId: 'guy-123',
      userId: 'user-123',
      text: 'Test story about John',
      tags: ['good_vibes'],
      imageUrl: null,
      anonymous: false,
      nickname: 'TestUser',
    });
  });

  it('should create a post with new guy when guy not found', async () => {
    // Mock auth
    vi.mocked(authUtils.getCurrentUser).mockResolvedValue(mockUser);

    // Mock guy repository - no existing guy, create new one
    const mockGuyRepository = {
      searchGuys: vi.fn().mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 1,
        totalPages: 0,
      }),
      create: vi.fn().mockResolvedValue(mockGuy),
    };
    vi.mocked(GuyRepository).mockImplementation(() => mockGuyRepository as any);

    // Mock story repository
    const mockStoryRepository = {
      create: vi.fn().mockResolvedValue(mockStory),
    };
    vi.mocked(StoryRepository).mockImplementation(() => mockStoryRepository as any);

    const postData: CreatePostData = {
      guyName: 'Jane Doe',
      guyPhone: '+254712345679',
      guyLocation: 'Mombasa',
      guyAge: 23,
      storyText: 'Test story about Jane',
      tags: ['red_flag'],
      anonymous: true,
    };

    const result = await addPost(postData);

    expect(result.success).toBe(true);
    expect(result.postId).toBe('story-123');
    expect(result.guyId).toBe('guy-123');
    expect(mockGuyRepository.searchGuys).toHaveBeenCalledWith('Jane Doe', { limit: 1 });
    expect(mockGuyRepository.create).toHaveBeenCalledWith({
      name: 'Jane Doe',
      phone: '+254712345679',
      socials: null,
      location: 'Mombasa',
      age: 23,
      createdByUserId: 'user-123',
    });
  });

  it('should fail when user is not authenticated', async () => {
    vi.mocked(authUtils.getCurrentUser).mockResolvedValue(null);

    const postData: CreatePostData = {
      guyName: 'John Doe',
      storyText: 'Test story',
      tags: ['good_vibes'],
      anonymous: false,
    };

    const result = await addPost(postData);

    expect(result.success).toBe(false);
    expect(result.error).toBe('You must be logged in to create a post');
  });

  it('should fail when user is not verified', async () => {
    const unverifiedUser = {
      ...mockUser,
      verificationStatus: 'pending' as const,
    };
    vi.mocked(authUtils.getCurrentUser).mockResolvedValue(unverifiedUser);

    const postData: CreatePostData = {
      guyName: 'John Doe',
      storyText: 'Test story',
      tags: ['good_vibes'],
      anonymous: false,
    };

    const result = await addPost(postData);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Your verification is still pending. Please wait for approval.');
  });

  it('should fail when story text is empty', async () => {
    vi.mocked(authUtils.getCurrentUser).mockResolvedValue(mockUser);

    const postData: CreatePostData = {
      guyName: 'John Doe',
      storyText: '   ', // Empty/whitespace only
      tags: ['good_vibes'],
      anonymous: false,
    };

    const result = await addPost(postData);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Story text is required');
  });

  it('should fail when no tags are provided', async () => {
    vi.mocked(authUtils.getCurrentUser).mockResolvedValue(mockUser);

    const postData: CreatePostData = {
      guyName: 'John Doe',
      storyText: 'Test story',
      tags: [], // No tags
      anonymous: false,
    };

    const result = await addPost(postData);

    expect(result.success).toBe(false);
    expect(result.error).toBe('At least one tag is required');
  });

  it('should fail when no guy identifiers are provided', async () => {
    vi.mocked(authUtils.getCurrentUser).mockResolvedValue(mockUser);

    const postData: CreatePostData = {
      // No guyName, guyPhone, or guySocials
      storyText: 'Test story',
      tags: ['good_vibes'],
      anonymous: false,
    };

    const result = await addPost(postData);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Please provide at least the guy\'s name, phone, or social handle');
  });
});