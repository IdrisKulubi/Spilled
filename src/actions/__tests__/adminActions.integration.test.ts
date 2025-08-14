/**
 * Integration test for adminActions - Test with actual database connection
 */

import {
  fetchPendingVerifications,
  fetchAdminStats,
} from '../adminActions';

/**
 * Simple integration test to verify adminActions work with database
 * This test should be run manually when database is available
 */
export async function testAdminActionsIntegration(): Promise<void> {
  console.log('Testing adminActions integration...');

  try {
    // Test fetchPendingVerifications
    console.log('Testing fetchPendingVerifications...');
    const pendingResult = await fetchPendingVerifications();
    console.log('✓ fetchPendingVerifications result:', {
      success: pendingResult.success,
      dataCount: pendingResult.data?.length || 0,
      error: pendingResult.error,
    });

    // Test fetchAdminStats
    console.log('Testing fetchAdminStats...');
    const statsResult = await fetchAdminStats();
    console.log('✓ fetchAdminStats result:', {
      success: statsResult.success,
      data: statsResult.data,
      error: statsResult.error,
    });

    console.log('🎉 Integration tests completed!');
  } catch (error) {
    console.error('❌ Integration test failed:', error);
  }
}

// Export for manual testing
if (require.main === module) {
  testAdminActionsIntegration();
}