/**
 * Comprehensive Database Operations Tests
 * Tests all database operations as specified in task 9.2
 * 
 * Requirements tested:
 * - 3.1: User profile creation and updates
 * - 3.2: Guy profile management
 * - 3.3: Story creation, editing, and deletion
 * - 3.4: Commenting functionality
 * - 4.1: Database operations with Drizzle ORM
 * - 4.2: Repository pattern implementation
 * - 4.3: Complex queries and relationships
 * - 4.4: Messaging system
 */

import { UserRepository } from '../repositories/UserRepository';
import { GuyRepository } from '../repositories/GuyRepository';
import { StoryRepository } from '../repositories/StoryRepository';
import { CommentRepository } from '../repositories/CommentRepository';
import { MessageRepository } from '../repositories/MessageRepository';
import type { User, Guy, Story, Comment, Message } from '../database/schema';

export interface TestResult {
  testName: string;
  success: boolean;
  message: string;
  error?: string;
  duration?: number;
}

export class DatabaseOperationsTester {
  private results: TestResult[] = [];
  private userRepository = new UserRepository();
  private guyRepository = new GuyRepository();
  private storyRepository = new StoryRepository();
  private commentRepository = new CommentRepository();
  private messageRepository = new MessageRepository();

  // Test data cleanup tracking
  private createdUsers: string[] = [];
  private createdGuys: string[] = [];
  private createdStories: string[] = [];
  private createdComments: string[] = [];
  private createdMessages: string[] = [];

  private addResult(testName: string, success: boolean, message: string, error?: string, duration?: number) {
    this.results.push({ testName, success, message, error, duration });
    const status = success ? '✅' : '❌';
    const durationText = duration ? ` (${duration}ms)` : '';
    console.log(`${status} ${testName}: ${message}${durationText}`);
    if (error) {
      console.error(`   Error: ${error}`);
    }
  }

  private async measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = Date.now();
    const result = await fn();
    const duration = Date.now() - start;
    return { result, duration };
  }

  private generateTestId(): string {
    return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Test 1: User Profile Creation and Updates
   * Requirements: 3.1, 4.1, 4.2
   */
  async testUserProfileOperations(): Promise<void> {
    console.log('🔧 Testing user profile operations...');

    try {
      const testUserId = this.generateTestId();
      const testEmail = `test-${testUserId}@example.com`;
      const testNickname = `TestUser${testUserId}`;

      // Test user creation
      const { result: createdUser, duration: createDuration } = await this.measureTime(async () => {
        return await this.userRepository.create({
          id: testUserId,
          email: testEmail,
          nickname: testNickname,
          phone: '+254712345678',
          verified: false,
          verificationStatus: 'pending',
          createdAt: new Date(),
        });
      });

      if (createdUser && createdUser.id === testUserId) {
        this.createdUsers.push(testUserId);
        this.addResult(
          'User Creation',
          true,
          `Successfully created user: ${createdUser.nickname}`,
          undefined,
          createDuration
        );

        // Test user retrieval
        const { result: retrievedUser, duration: retrieveDuration } = await this.measureTime(async () => {
          return await this.userRepository.findById(testUserId);
        });

        if (retrievedUser && retrievedUser.id === testUserId) {
          this.addResult(
            'User Retrieval',
            true,
            `Successfully retrieved user: ${retrievedUser.nickname}`,
            undefined,
            retrieveDuration
          );

          // Test user update
          const updatedNickname = `Updated${testNickname}`;
          const { result: updatedUser, duration: updateDuration } = await this.measureTime(async () => {
            return await this.userRepository.update(testUserId, {
              nickname: updatedNickname,
              verified: true,
              verificationStatus: 'approved',
            });
          });

          if (updatedUser && updatedUser.nickname === updatedNickname && updatedUser.verified === true) {
            this.addResult(
              'User Update',
              true,
              `Successfully updated user: ${updatedUser.nickname} (verified: ${updatedUser.verified})`,
              undefined,
              updateDuration
            );
          } else {
            this.addResult(
              'User Update',
              false,
              'User update failed or returned incorrect data',
              updatedUser ? `Got: ${JSON.stringify(updatedUser)}` : 'No user returned'
            );
          }

          // Test user search by email
          const { result: foundUser, duration: searchDuration } = await this.measureTime(async () => {
            return await this.userRepository.findByEmail(testEmail);
          });

          if (foundUser && foundUser.id === testUserId) {
            this.addResult(
              'User Search by Email',
              true,
              `Successfully found user by email: ${foundUser.email}`,
              undefined,
              searchDuration
            );
          } else {
            this.addResult(
              'User Search by Email',
              false,
              'Failed to find user by email'
            );
          }
        } else {
          this.addResult(
            'User Retrieval',
            false,
            'Failed to retrieve created user'
          );
        }
      } else {
        this.addResult(
          'User Creation',
          false,
          'Failed to create user',
          createdUser ? `Got: ${JSON.stringify(createdUser)}` : 'No user returned'
        );
      }
    } catch (error) {
      this.addResult(
        'User Profile Operations',
        fa

        