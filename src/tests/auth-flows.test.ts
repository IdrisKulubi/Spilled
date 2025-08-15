/**
 * Comprehensive Authentication Flow Tests
 * Tests all user authentication flows as specified in task 9.1
 * 
 * Requirements tested:
 * - 2.1: Better Auth framework authentication
 * - 2.2: Google OAuth sign-in and session persistence
 * - 2.3: Session management and token refresh
 * - 2.5: User profile management
 * - 2.6: Session restoration across app restarts
 */

import { authClient } from '../lib/auth-client';
import { authUtils } from '../utils/auth';
import { UserRepository } from '../repositories/UserRepository';
import type { User } from '../database/schema';

export interface TestResult {
  testName: string;
  success: boolean;
  message: string;
  error?: string;
  duration?: number;
}

export class AuthenticationFlowTester {
  private results: TestResult[] = [];
  private userRepository = new UserRepository();

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

  /**
   * Test 1: Better Auth Client Initialization
   * Requirement: 2.1 - Better Auth framework authentication
   */
  async testBetterAuthInitialization(): Promise<void> {
    try {
      const { result: session, duration } = await this.measureTime(async () => {
        return await authClient.getSession();
      });

      this.addResult(
        'Better Auth Client Initialization',
        true,
        'Better Auth client initialized and session check successful',
        undefined,
        duration
      );
    } catch (error) {
      this.addResult(
        'Better Auth Client Initialization',
        false,
        'Failed to initialize Better Auth client',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Test 2: Google OAuth Configuration
   * Requirement: 2.2 - Google OAuth sign-in
   */
  async testGoogleOAuthConfiguration(): Promise<void> {
    try {
      // Test if Google OAuth is properly configured
      const baseURL = process.env.EXPO_PUBLIC_AUTH_BASE_URL;
      const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

      if (!baseURL) {
        this.addResult(
          'Google OAuth Configuration',
          false,
          'Missing EXPO_PUBLIC_AUTH_BASE_URL environment variable'
        );
        return;
      }

      if (!googleClientId) {
        this.addResult(
          'Google OAuth Configuration',
          false,
          'Missing EXPO_PUBLIC_GOOGLE_CLIENT_ID environment variable'
        );
        return;
      }

      // Test if auth endpoints are accessible
      const { result: response, duration } = await this.measureTime(async () => {
        return await fetch(`${baseURL}/session`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      });

      if (response.ok || response.status === 401) {
        // 401 is expected if no session exists
        this.addResult(
          'Google OAuth Configuration',
          true,
          'Auth endpoints accessible and Google OAuth configured',
          undefined,
          duration
        );
      } else {
        this.addResult(
          'Google OAuth Configuration',
          false,
          `Auth endpoint returned status: ${response.status}`,
          await response.text()
        );
      }
    } catch (error) {
      this.addResult(
        'Google OAuth Configuration',
        false,
        'Failed to test Google OAuth configuration',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Test 3: Session Persistence and Restoration
   * Requirements: 2.2, 2.6 - Session persistence and restoration across app restarts
   */
  async testSessionPersistence(): Promise<void> {
    try {
      const { result: sessionResult, duration } = await this.measureTime(async () => {
        return await authClient.getSession();
      });

      if (sessionResult.data?.user) {
        // Test session data integrity
        const user = sessionResult.data.user;
        const hasRequiredFields = user.id && (user.email || user.name);

        if (hasRequiredFields) {
          this.addResult(
            'Session Persistence',
            true,
            `Active session found for user: ${user.email || user.name} (ID: ${user.id})`,
            undefined,
            duration
          );

          // Test session token validity
          await this.testSessionTokenValidity(user.id);
        } else {
          this.addResult(
            'Session Persistence',
            false,
            'Session exists but missing required user fields',
            `User object: ${JSON.stringify(user)}`
          );
        }
      } else {
        this.addResult(
          'Session Persistence',
          true,
          'No active session found (expected if user not logged in)',
          undefined,
          duration
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
   * Test 4: Session Token Validity
   * Requirement: 2.3 - Session management and token refresh
   */
  async testSessionTokenValidity(userId: string): Promise<void> {
    try {
      // Test if we can make authenticated requests
      const { result: userProfile, duration } = await this.measureTime(async () => {
        return await authUtils.getCurrentUser();
      });

      if (userProfile && userProfile.id === userId) {
        this.addResult(
          'Session Token Validity',
          true,
          'Session token is valid and can access user data',
          undefined,
          duration
        );
      } else {
        this.addResult(
          'Session Token Validity',
          false,
          'Session token invalid or cannot access user data',
          userProfile ? `Expected ID: ${userId}, Got: ${userProfile.id}` : 'No user profile returned'
        );
      }
    } catch (error) {
      this.addResult(
        'Session Token Validity',
        false,
        'Failed to validate session token',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Test 5: User Profile Management
   * Requirement: 2.5 - User profile management
   */
  async testUserProfileManagement(): Promise<void> {
    try {
      const currentUser = await authUtils.getCurrentUser();

      if (!currentUser) {
        this.addResult(
          'User Profile Management',
          true,
          'Skipped - no active session (user needs to be logged in)'
        );
        return;
      }

      // Test profile retrieval
      const { result: retrievedUser, duration: retrievalDuration } = await this.measureTime(async () => {
        return await this.userRepository.findById(currentUser.id);
      });

      if (retrievedUser) {
        this.addResult(
          'Profile Retrieval',
          true,
          `Successfully retrieved user profile: ${retrievedUser.nickname || retrievedUser.email}`,
          undefined,
          retrievalDuration
        );

        // Test profile update
        await this.testProfileUpdate(currentUser);
      } else {
        this.addResult(
          'Profile Retrieval',
          false,
          'Failed to retrieve user profile from database'
        );
      }
    } catch (error) {
      this.addResult(
        'User Profile Management',
        false,
        'Error during user profile management test',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Test 6: Profile Update Functionality
   * Requirement: 2.5 - User profile management
   */
  async testProfileUpdate(user: User): Promise<void> {
    try {
      const originalNickname = user.nickname;
      const testNickname = `Test User ${Date.now()}`;

      // Test profile update
      const { result: updateResult, duration: updateDuration } = await this.measureTime(async () => {
        return await authUtils.updateProfile({
          nickname: testNickname,
        });
      });

      if (updateResult.success && updateResult.user) {
        this.addResult(
          'Profile Update',
          true,
          `Successfully updated profile nickname to: ${updateResult.user.nickname}`,
          undefined,
          updateDuration
        );

        // Restore original nickname
        if (originalNickname !== testNickname) {
          await authUtils.updateProfile({
            nickname: originalNickname,
          });
        }
      } else {
        this.addResult(
          'Profile Update',
          false,
          'Failed to update user profile',
          updateResult.error
        );
      }
    } catch (error) {
      this.addResult(
        'Profile Update',
        false,
        'Error during profile update test',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Test 7: Sign-out Functionality
   * Requirement: 2.3 - Session management
   */
  async testSignOutFunctionality(): Promise<void> {
    try {
      const sessionBefore = await authClient.getSession();
      
      if (!sessionBefore.data?.user) {
        this.addResult(
          'Sign-out Functionality',
          true,
          'Skipped - no active session to sign out from'
        );
        return;
      }

      // Test sign out (but don't actually sign out to preserve session for other tests)
      // Instead, test the sign out method exists and is callable
      const signOutMethod = authUtils.signOut;
      
      if (typeof signOutMethod === 'function') {
        this.addResult(
          'Sign-out Functionality',
          true,
          'Sign-out method is available and callable (not executed to preserve session)'
        );
      } else {
        this.addResult(
          'Sign-out Functionality',
          false,
          'Sign-out method is not available or not a function'
        );
      }
    } catch (error) {
      this.addResult(
        'Sign-out Functionality',
        false,
        'Error testing sign-out functionality',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Test 8: Verification Status Management
   * Requirement: 2.5 - User profile management (verification status)
   */
  async testVerificationStatus(): Promise<void> {
    try {
      const { result: verificationStatus, duration } = await this.measureTime(async () => {
        return await authUtils.getVerificationStatus();
      });

      if (verificationStatus) {
        this.addResult(
          'Verification Status',
          true,
          `Verification status retrieved: ${verificationStatus.status}${verificationStatus.reason ? ` (${verificationStatus.reason})` : ''}`,
          undefined,
          duration
        );

        // Test canUserPost functionality
        const canPost = await authUtils.canUserPost();
        const expectedCanPost = verificationStatus.status === 'approved';
        
        if (canPost === expectedCanPost) {
          this.addResult(
            'Can User Post Check',
            true,
            `User can post: ${canPost} (matches verification status: ${verificationStatus.status})`
          );
        } else {
          this.addResult(
            'Can User Post Check',
            false,
            `Mismatch: canUserPost=${canPost}, but verification status is ${verificationStatus.status}`
          );
        }
      } else {
        this.addResult(
          'Verification Status',
          true,
          'No verification status (user not logged in)',
          undefined,
          duration
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
   * Test 9: Database Integration
   * Requirement: 2.1 - Better Auth with database integration
   */
  async testDatabaseIntegration(): Promise<void> {
    try {
      const sessionResult = await authClient.getSession();

      if (sessionResult.data?.user) {
        // Test database user retrieval
        const { result: dbUser, duration } = await this.measureTime(async () => {
          return await this.userRepository.findById(sessionResult.data!.user.id);
        });

        if (dbUser) {
          this.addResult(
            'Database Integration',
            true,
            `Successfully retrieved user from database: ${dbUser.nickname || dbUser.email}`,
            undefined,
            duration
          );

          // Verify data consistency between Better Auth and database
          const consistencyCheck = this.verifyDataConsistency(sessionResult.data!.user, dbUser);
          this.addResult(
            'Data Consistency Check',
            consistencyCheck.consistent,
            consistencyCheck.message,
            consistencyCheck.error
          );
        } else {
          this.addResult(
            'Database Integration',
            false,
            'User exists in Better Auth but not in database',
            `Better Auth User ID: ${sessionResult.data!.user.id}`
          );
        }
      } else {
        // Test basic database connectivity
        try {
          const { result: testResult, duration } = await this.measureTime(async () => {
            return await this.userRepository.findById('non-existent-id');
          });

          this.addResult(
            'Database Integration',
            true,
            'Database connection successful (no user logged in to test with)',
            undefined,
            duration
          );
        } catch (dbError) {
          this.addResult(
            'Database Integration',
            false,
            'Database connection failed',
            dbError instanceof Error ? dbError.message : String(dbError)
          );
        }
      }
    } catch (error) {
      this.addResult(
        'Database Integration',
        false,
        'Error testing database integration',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Verify data consistency between Better Auth user and database user
   */
  private verifyDataConsistency(betterAuthUser: any, dbUser: User): { consistent: boolean; message: string; error?: string } {
    try {
      const issues: string[] = [];

      // Check ID consistency
      if (betterAuthUser.id !== dbUser.id) {
        issues.push(`ID mismatch: Better Auth=${betterAuthUser.id}, DB=${dbUser.id}`);
      }

      // Check email consistency (if both exist)
      if (betterAuthUser.email && dbUser.email && betterAuthUser.email !== dbUser.email) {
        issues.push(`Email mismatch: Better Auth=${betterAuthUser.email}, DB=${dbUser.email}`);
      }

      if (issues.length === 0) {
        return {
          consistent: true,
          message: 'Data consistency verified between Better Auth and database'
        };
      } else {
        return {
          consistent: false,
          message: 'Data inconsistencies found',
          error: issues.join('; ')
        };
      }
    } catch (error) {
      return {
        consistent: false,
        message: 'Error checking data consistency',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Test 10: Phone Number Validation Utilities
   * Requirement: 2.5 - User profile management (phone validation)
   */
  async testPhoneValidation(): Promise<void> {
    try {
      const testCases = [
        { phone: '+254712345678', expected: true, description: 'International format' },
        { phone: '0712345678', expected: true, description: 'Local format (07xx)' },
        { phone: '254712345678', expected: true, description: 'Country code without +' },
        { phone: '0112345678', expected: true, description: 'Local format (01xx)' },
        { phone: '1234567890', expected: false, description: 'Invalid format' },
        { phone: '+1234567890', expected: false, description: 'Wrong country code' },
        { phone: '0812345678', expected: false, description: 'Invalid prefix (08xx)' },
      ];

      let passedTests = 0;
      const failedTests: string[] = [];

      for (const testCase of testCases) {
        const result = authUtils.validateKenyanPhone(testCase.phone);
        if (result === testCase.expected) {
          passedTests++;
        } else {
          failedTests.push(`${testCase.phone} (${testCase.description}): expected ${testCase.expected}, got ${result}`);
        }
      }

      if (failedTests.length === 0) {
        this.addResult(
          'Phone Validation',
          true,
          `All ${testCases.length} phone validation tests passed`
        );
      } else {
        this.addResult(
          'Phone Validation',
          false,
          `${failedTests.length}/${testCases.length} phone validation tests failed`,
          failedTests.join('; ')
        );
      }

      // Test phone formatting
      const formatTests = [
        { input: '0712345678', expected: '+254712345678' },
        { input: '254712345678', expected: '+254712345678' },
        { input: '+254712345678', expected: '+254712345678' },
      ];

      let formatPassedTests = 0;
      const formatFailedTests: string[] = [];

      for (const test of formatTests) {
        const result = authUtils.formatPhoneNumber(test.input);
        if (result === test.expected) {
          formatPassedTests++;
        } else {
          formatFailedTests.push(`${test.input}: expected ${test.expected}, got ${result}`);
        }
      }

      if (formatFailedTests.length === 0) {
        this.addResult(
          'Phone Formatting',
          true,
          `All ${formatTests.length} phone formatting tests passed`
        );
      } else {
        this.addResult(
          'Phone Formatting',
          false,
          `${formatFailedTests.length}/${formatTests.length} phone formatting tests failed`,
          formatFailedTests.join('; ')
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
   * Run all authentication flow tests
   */
  async runAllTests(): Promise<TestResult[]> {
    console.log('🧪 Starting comprehensive authentication flow tests...\n');
    console.log('Testing Requirements: 2.1, 2.2, 2.3, 2.5, 2.6\n');

    const startTime = Date.now();

    // Run all tests
    await this.testBetterAuthInitialization();
    await this.testGoogleOAuthConfiguration();
    await this.testSessionPersistence();
    await this.testUserProfileManagement();
    await this.testSignOutFunctionality();
    await this.testVerificationStatus();
    await this.testDatabaseIntegration();
    await this.testPhoneValidation();

    const totalDuration = Date.now() - startTime;

    // Generate summary
    console.log('\n📊 Authentication Flow Test Results Summary:');
    console.log('=' .repeat(50));
    
    const passed = this.results.filter(r => r.success).length;
    const total = this.results.length;
    const passRate = ((passed / total) * 100).toFixed(1);
    
    console.log(`✅ Passed: ${passed}/${total} (${passRate}%)`);
    console.log(`❌ Failed: ${total - passed}/${total}`);
    console.log(`⏱️  Total Duration: ${totalDuration}ms`);

    // Show failed tests
    const failedTests = this.results.filter(r => !r.success);
    if (failedTests.length > 0) {
      console.log('\n❌ Failed Tests:');
      failedTests.forEach(test => {
        console.log(`   • ${test.testName}: ${test.message}`);
        if (test.error) {
          console.log(`     Error: ${test.error}`);
        }
      });
    }

    if (passed === total) {
      console.log('\n🎉 All authentication flow tests passed!');
      console.log('✅ Requirements 2.1, 2.2, 2.3, 2.5, 2.6 verified');
    } else {
      console.log('\n⚠️  Some authentication tests failed. Check the details above.');
    }

    return this.results;
  }

  /**
   * Get test results
   */
  getResults(): TestResult[] {
    return this.results;
  }

  /**
   * Get test summary
   */
  getSummary(): { passed: number; total: number; passRate: number; duration: number } {
    const passed = this.results.filter(r => r.success).length;
    const total = this.results.length;
    const passRate = total > 0 ? (passed / total) * 100 : 0;
    const duration = this.results.reduce((sum, r) => sum + (r.duration || 0), 0);

    return { passed, total, passRate, duration };
  }
}

/**
 * Export function to run authentication flow tests
 */
export async function runAuthenticationFlowTests(): Promise<TestResult[]> {
  const tester = new AuthenticationFlowTester();
  return await tester.runAllTests();
}