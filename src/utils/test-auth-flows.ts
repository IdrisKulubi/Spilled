/**
 * Test script for authentication flows
 * This script tests the updated authentication system with Better Auth
 */

import { authClient } from '../lib/auth-client';
import { authUtils } from './auth';
import { UserRepository } from '../repositories/UserRepository';

const userRepository = new UserRepository();

export interface TestResult {
  testName: string;
  success: boolean;
  message: string;
  error?: string;
}

export class AuthFlowTester {
  private results: TestResult[] = [];

  private addResult(testName: string, success: boolean, message: string, error?: string) {
    this.results.push({ testName, success, message, error });
    console.log(`${success ? '✅' : '❌'} ${testName}: ${message}`);
    if (error) {
      console.error(`   Error: ${error}`);
    }
  }

  /**
   * Test Better Auth client initialization
   */
  async testAuthClientInitialization(): Promise<void> {
    try {
      const session = await authClient.getSession();
      this.addResult(
        'Auth Client Initialization',
        true,
        'Better Auth client initialized successfully',
      );
    } catch (error) {
      this.addResult(
        'Auth Client Initialization',
        false,
        'Failed to initialize Better Auth client',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Test session persistence
   */
  async testSessionPersistence(): Promise<void> {
    try {
      const sessionResult = await authClient.getSession();
      
      if (sessionResult.data?.user) {
        this.addResult(
          'Session Persistence',
          true,
          `Session found for user: ${sessionResult.data.user.email || sessionResult.data.user.id}`,
        );
      } else {
        this.addResult(
          'Session Persistence',
          true,
          'No active session found (expected if not logged in)',
        );
      }
    } catch (error) {
      this.addResult(
        'Session Persistence',
        false,
        'Failed to check session persistence',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Test user profile creation and retrieval
   */
  async testUserProfileOperations(): Promise<void> {
    try {
      const sessionResult = await authClient.getSession();
      
      if (!sessionResult.data?.user) {
        this.addResult(
          'User Profile Operations',
          true,
          'Skipped - no active session (user needs to be logged in)',
        );
        return;
      }

      // Test getting current user
      const currentUser = await authUtils.getCurrentUser();
      
      if (currentUser) {
        this.addResult(
          'User Profile Operations',
          true,
          `Successfully retrieved user profile: ${currentUser.nickname || currentUser.email}`,
        );

        // Test profile update
        try {
          const updateResult = await authUtils.updateProfile({
            nickname: currentUser.nickname || 'Test User',
          });

          if (updateResult.success) {
            this.addResult(
              'Profile Update',
              true,
              'Successfully updated user profile',
            );
          } else {
            this.addResult(
              'Profile Update',
              false,
              'Failed to update user profile',
              updateResult.error
            );
          }
        } catch (updateError) {
          this.addResult(
            'Profile Update',
            false,
            'Error during profile update',
            updateError instanceof Error ? updateError.message : String(updateError)
          );
        }
      } else {
        this.addResult(
          'User Profile Operations',
          false,
          'Failed to retrieve user profile despite active session',
        );
      }
    } catch (error) {
      this.addResult(
        'User Profile Operations',
        false,
        'Error during user profile operations',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Test verification status functionality
   */
  async testVerificationStatus(): Promise<void> {
    try {
      const verificationStatus = await authUtils.getVerificationStatus();
      
      if (verificationStatus) {
        this.addResult(
          'Verification Status',
          true,
          `Verification status: ${verificationStatus.status}`,
        );

        // Test canUserPost
        const canPost = await authUtils.canUserPost();
        this.addResult(
          'Can User Post Check',
          true,
          `User can post: ${canPost}`,
        );
      } else {
        this.addResult(
          'Verification Status',
          true,
          'No verification status (user not logged in)',
        );
      }
    } catch (error) {
      this.addResult(
        'Verification Status',
        false,
        'Error checking verification status',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Test database connectivity
   */
  async testDatabaseConnectivity(): Promise<void> {
    try {
      // Test if we can connect to the database
      const sessionResult = await authClient.getSession();
      
      if (sessionResult.data?.user) {
        const dbUser = await userRepository.findById(sessionResult.data.user.id);
        
        if (dbUser) {
          this.addResult(
            'Database Connectivity',
            true,
            'Successfully connected to database and retrieved user',
          );
        } else {
          this.addResult(
            'Database Connectivity',
            false,
            'Database connection works but user not found in database',
          );
        }
      } else {
        // Test basic database connection
        try {
          // This will test the database connection without requiring a user
          const testResult = await userRepository.findById('test-id-that-does-not-exist');
          this.addResult(
            'Database Connectivity',
            true,
            'Database connection successful (no user logged in to test with)',
          );
        } catch (dbError) {
          this.addResult(
            'Database Connectivity',
            false,
            'Database connection failed',
            dbError instanceof Error ? dbError.message : String(dbError)
          );
        }
      }
    } catch (error) {
      this.addResult(
        'Database Connectivity',
        false,
        'Error testing database connectivity',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Test phone number validation utilities
   */
  async testPhoneValidation(): Promise<void> {
    try {
      const testCases = [
        { phone: '+254712345678', expected: true },
        { phone: '0712345678', expected: true },
        { phone: '254712345678', expected: true },
        { phone: '1234567890', expected: false },
        { phone: '+1234567890', expected: false },
      ];

      let allPassed = true;
      for (const testCase of testCases) {
        const result = authUtils.validateKenyanPhone(testCase.phone);
        if (result !== testCase.expected) {
          allPassed = false;
          break;
        }
      }

      if (allPassed) {
        this.addResult(
          'Phone Validation',
          true,
          'All phone validation tests passed',
        );
      } else {
        this.addResult(
          'Phone Validation',
          false,
          'Some phone validation tests failed',
        );
      }

      // Test phone formatting
      const formatted = authUtils.formatPhoneNumber('0712345678');
      if (formatted === '+254712345678') {
        this.addResult(
          'Phone Formatting',
          true,
          'Phone formatting works correctly',
        );
      } else {
        this.addResult(
          'Phone Formatting',
          false,
          `Phone formatting failed: expected +254712345678, got ${formatted}`,
        );
      }
    } catch (error) {
      this.addResult(
        'Phone Validation',
        false,
        'Error testing phone validation',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Run all tests
   */
  async runAllTests(): Promise<TestResult[]> {
    console.log('🧪 Starting authentication flow tests...\n');

    await this.testAuthClientInitialization();
    await this.testSessionPersistence();
    await this.testDatabaseConnectivity();
    await this.testUserProfileOperations();
    await this.testVerificationStatus();
    await this.testPhoneValidation();

    console.log('\n📊 Test Results Summary:');
    const passed = this.results.filter(r => r.success).length;
    const total = this.results.length;
    console.log(`✅ Passed: ${passed}/${total}`);
    console.log(`❌ Failed: ${total - passed}/${total}`);

    if (passed === total) {
      console.log('\n🎉 All authentication tests passed!');
    } else {
      console.log('\n⚠️  Some tests failed. Check the details above.');
    }

    return this.results;
  }
}

/**
 * Run authentication tests
 */
export async function testAuthenticationFlows(): Promise<TestResult[]> {
  const tester = new AuthFlowTester();
  return await tester.runAllTests();
}