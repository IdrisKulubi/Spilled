/**
 * Tests for adminActions - Admin functionality for user verification management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  fetchPendingVerifications,
  approveUserVerification,
  rejectUserVerification,
  fetchAdminStats,
  bulkApprovePendingVerifications,
} from '../adminActions';
import { UserRepository } from '../../repositories/UserRepository';
import { db } from '../../database/connection';

// Mock the database connection and repositories
vi.mock('../../database/connection', () => ({
  db: {
    select: vi.fn(),
  },
}));

vi.mock('../../repositories/UserRepository', () => ({
  UserRepository: vi.fn().mockImplementation(() => ({
    findPendingVerificationUsers: vi.fn(),
    updateVerificationStatus: vi.fn(),
    getUserStats: vi.fn(),
    bulkUpdateVerificationStatus: vi.fn(),
  })),
}));

describe('adminActions', () => {
  let mockUserRepository: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUserRepository = new UserRepository();
  });

  describe('fetchPendingVerifications', () => {
    it('should fetch pending verifications successfully', async () => {
      const mockUsers = [
        {
          id: 'user1',
          email: 'test@example.com',
          nickname: 'testuser',
          phone: '+1234567890',
          idImageUrl: 'https://example.com/image.jpg',
          idType: 'school_id',
          createdAt: new Date('2024-01-01'),
        },
      ];

      mockUserRepository.findPendingVerificationUsers.mockResolvedValue({
        data: mockUsers,
        total: 1,
        page: 1,
        limit: 100,
      });

      const result = await fetchPendingVerifications();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0]).toMatchObject({
        user_id: 'user1',
        email: 'test@example.com',
        nickname: 'testuser',
        phone: '+1234567890',
        id_image_url: 'https://example.com/image.jpg',
        id_type: 'school_id',
      });
      expect(result.data![0].days_waiting).toBeGreaterThan(0);
    });

    it('should handle errors when fetching pending verifications', async () => {
      mockUserRepository.findPendingVerificationUsers.mockRejectedValue(
        new Error('Database error')
      );

      const result = await fetchPendingVerifications();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('approveUserVerification', () => {
    it('should approve user verification successfully', async () => {
      const mockUser = {
        id: 'user1',
        verificationStatus: 'approved',
        verifiedAt: new Date(),
      };

      mockUserRepository.updateVerificationStatus.mockResolvedValue(mockUser);

      const result = await approveUserVerification('user1');

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        user_id: 'user1',
        verification_status: 'approved',
      });
      expect(mockUserRepository.updateVerificationStatus).toHaveBeenCalledWith(
        'user1',
        'approved'
      );
    });

    it('should handle user not found', async () => {
      mockUserRepository.updateVerificationStatus.mockResolvedValue(null);

      const result = await approveUserVerification('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });
  });

  describe('rejectUserVerification', () => {
    it('should reject user verification successfully', async () => {
      const mockUser = {
        id: 'user1',
        verificationStatus: 'rejected',
        rejectionReason: 'Invalid ID',
      };

      mockUserRepository.updateVerificationStatus.mockResolvedValue(mockUser);

      const result = await rejectUserVerification('user1', 'Invalid ID');

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        user_id: 'user1',
        verification_status: 'rejected',
        rejection_reason: 'Invalid ID',
      });
      expect(mockUserRepository.updateVerificationStatus).toHaveBeenCalledWith(
        'user1',
        'rejected',
        'Invalid ID'
      );
    });

    it('should use default rejection reason when none provided', async () => {
      const mockUser = {
        id: 'user1',
        verificationStatus: 'rejected',
        rejectionReason: 'ID verification failed',
      };

      mockUserRepository.updateVerificationStatus.mockResolvedValue(mockUser);

      const result = await rejectUserVerification('user1');

      expect(result.success).toBe(true);
      expect(mockUserRepository.updateVerificationStatus).toHaveBeenCalledWith(
        'user1',
        'rejected',
        'ID verification failed'
      );
    });
  });

  describe('fetchAdminStats', () => {
    it('should fetch admin statistics successfully', async () => {
      // Mock user stats
      mockUserRepository.getUserStats.mockResolvedValue({
        total: 100,
        verified: 80,
        pending: 15,
        rejected: 5,
      });

      // Mock database queries for weekly stats
      const mockDbSelect = vi.fn().mockReturnThis();
      const mockDbFrom = vi.fn().mockReturnThis();
      const mockDbWhere = vi.fn().mockResolvedValue([{ count: '10' }]);

      (db.select as any).mockImplementation(() => ({
        from: mockDbFrom,
      }));
      mockDbFrom.mockImplementation(() => ({
        where: mockDbWhere,
      }));

      // Mock average verification time query
      mockDbWhere
        .mockResolvedValueOnce([{ count: '10' }]) // new signups
        .mockResolvedValueOnce([{ count: '25' }]) // new stories
        .mockResolvedValueOnce([{ count: '50' }]) // new messages
        .mockResolvedValueOnce([{ avg_hours: '24.5' }]); // avg verification time

      const result = await fetchAdminStats();

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        pending_verifications: 15,
        verified_users: 80,
        rejected_users: 5,
        new_signups_week: 10,
        new_stories_week: 25,
        new_messages_week: 50,
        avg_verification_hours: 24.5,
      });
    });

    it('should handle errors when fetching admin stats', async () => {
      mockUserRepository.getUserStats.mockRejectedValue(
        new Error('Database error')
      );

      const result = await fetchAdminStats();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('bulkApprovePendingVerifications', () => {
    it('should bulk approve pending verifications successfully', async () => {
      const mockUsers = [
        { id: 'user1' },
        { id: 'user2' },
        { id: 'user3' },
      ];

      mockUserRepository.findPendingVerificationUsers.mockResolvedValue({
        data: mockUsers,
        total: 3,
      });

      mockUserRepository.bulkUpdateVerificationStatus.mockResolvedValue([
        { id: 'user1', verificationStatus: 'approved' },
        { id: 'user2', verificationStatus: 'approved' },
        { id: 'user3', verificationStatus: 'approved' },
      ]);

      const result = await bulkApprovePendingVerifications();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ approved_count: 3 });
      expect(mockUserRepository.bulkUpdateVerificationStatus).toHaveBeenCalledWith(
        ['user1', 'user2', 'user3'],
        'approved'
      );
    });

    it('should handle no pending verifications', async () => {
      mockUserRepository.findPendingVerificationUsers.mockResolvedValue({
        data: [],
        total: 0,
      });

      const result = await bulkApprovePendingVerifications();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ approved_count: 0 });
      expect(mockUserRepository.bulkUpdateVerificationStatus).not.toHaveBeenCalled();
    });
  });
});