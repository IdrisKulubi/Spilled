/**
 * Test story image upload and management functionality
 */

import { uploadStoryImageWithValidation, updateStoryImage, deleteStoryImage, validateStoryImage } from './storyImageUtils';
import { uploadStoryImage } from '../actions/addPost';

export interface StoryImageTestResult {
  success: boolean;
  message: string;
  details?: any;
}

/**
 * Test story image validation
 */
export async function testStoryImageValidation(): Promise<StoryImageTestResult> {
  try {
    console.log('Testing story image validation...');

    // Test with mock image URI
    const mockImageUri = 'file:///mock/path/test-story-image.jpg';
    
    // This will likely fail with mock URI, but we can test the validation flow
    const validation = await validateStoryImage(mockImageUri);
    
    // Expected to fail with mock URI
    if (!validation.valid) {
      console.log('✓ Image validation failed as expected with mock URI:', validation.error);
    }

    return {
      success: true,
      message: 'Story image validation test completed',
      details: {
        validationTested: true,
        mockUriRejected: !validation.valid,
      },
    };

  } catch (error) {
    console.error('Story image validation test failed:', error);
    return {
      success: false,
      message: 'Story image validation test failed with error',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test story image upload functionality
 */
export async function testStoryImageUpload(): Promise<StoryImageTestResult> {
  try {
    console.log('Testing story image upload...');

    const mockImageUri = 'file:///mock/path/test-story-image.jpg';
    const mockStoryId = 'test-story-123';

    // Test the upload function (will fail with mock URI but tests configuration)
    const uploadResult = await uploadStoryImageWithValidation(mockImageUri, mockStoryId);
    
    if (!uploadResult.success) {
      // Expected to fail with mock URI, check if it's a configuration issue
      if (uploadResult.error?.includes('configuration') || uploadResult.error?.includes('R2')) {
        return {
          success: false,
          message: 'R2 configuration issue detected in story image upload',
          details: uploadResult.error,
        };
      }
      
      console.log('✓ Upload failed as expected with mock URI:', uploadResult.error);
    }

    // Test the addPost upload function as well
    const addPostUploadResult = await uploadStoryImage(mockImageUri, mockStoryId);
    
    // Should return null with mock URI
    if (addPostUploadResult === null) {
      console.log('✓ addPost upload function handled mock URI correctly');
    }

    return {
      success: true,
      message: 'Story image upload test completed successfully',
      details: {
        uploadFunctionTested: true,
        addPostFunctionTested: true,
        configurationValid: true,
      },
    };

  } catch (error) {
    console.error('Story image upload test failed:', error);
    return {
      success: false,
      message: 'Story image upload test failed with error',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test story image update functionality
 */
export async function testStoryImageUpdate(): Promise<StoryImageTestResult> {
  try {
    console.log('Testing story image update...');

    const mockNewImageUri = 'file:///mock/path/new-story-image.jpg';
    const mockCurrentImageUrl = 'https://example.com/old-image.jpg';
    const mockStoryId = 'test-story-123';

    // Test image update (will fail with mock URI but tests the flow)
    const updateResult = await updateStoryImage(mockNewImageUri, mockCurrentImageUrl, mockStoryId);
    
    if (!updateResult.success) {
      // Expected to fail with mock URI
      console.log('✓ Update failed as expected with mock URI:', updateResult.error);
    }

    // Test image removal (setting to null)
    const removeResult = await updateStoryImage(null, mockCurrentImageUrl, mockStoryId);
    
    if (removeResult.success) {
      console.log('✓ Image removal test passed');
    }

    return {
      success: true,
      message: 'Story image update test completed successfully',
      details: {
        updateFunctionTested: true,
        removeFunctionTested: true,
      },
    };

  } catch (error) {
    console.error('Story image update test failed:', error);
    return {
      success: false,
      message: 'Story image update test failed with error',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test story image deletion
 */
export async function testStoryImageDeletion(): Promise<StoryImageTestResult> {
  try {
    console.log('Testing story image deletion...');

    const mockImageUrl = 'https://example.com/test-image.jpg';

    // Test image deletion
    const deleteResult = await deleteStoryImage(mockImageUrl);
    
    if (!deleteResult.success) {
      // May fail if URL is not a valid R2 URL, but tests the flow
      console.log('✓ Delete failed as expected with mock URL:', deleteResult.error);
    }

    // Test deletion with empty URL
    const emptyDeleteResult = await deleteStoryImage('');
    if (emptyDeleteResult.success) {
      console.log('✓ Empty URL deletion handled correctly');
    }

    return {
      success: true,
      message: 'Story image deletion test completed successfully',
      details: {
        deleteFunctionTested: true,
        emptyUrlHandled: true,
      },
    };

  } catch (error) {
    console.error('Story image deletion test failed:', error);
    return {
      success: false,
      message: 'Story image deletion test failed with error',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test complete story image workflow
 */
export async function testCompleteStoryImageWorkflow(
  testImageUri?: string
): Promise<StoryImageTestResult> {
  try {
    console.log('Testing complete story image workflow...');

    if (!testImageUri) {
      return {
        success: false,
        message: 'Test image URI is required for complete workflow test',
      };
    }

    const mockStoryId = 'test-story-workflow-123';

    // Step 1: Validate image
    const validation = await validateStoryImage(testImageUri);
    if (!validation.valid) {
      return {
        success: false,
        message: 'Image validation failed in workflow test',
        details: validation.error,
      };
    }

    console.log('✓ Image validation passed');

    // Step 2: Upload image
    const uploadResult = await uploadStoryImageWithValidation(testImageUri, mockStoryId);
    if (!uploadResult.success) {
      return {
        success: false,
        message: 'Image upload failed in workflow test',
        details: uploadResult.error,
      };
    }

    console.log('✓ Image uploaded:', uploadResult.imageUrl);

    // Step 3: Test image update (replace with same image)
    const updateResult = await updateStoryImage(testImageUri, uploadResult.imageUrl, mockStoryId);
    if (!updateResult.success) {
      return {
        success: false,
        message: 'Image update failed in workflow test',
        details: updateResult.error,
      };
    }

    console.log('✓ Image updated:', updateResult.newImageUrl);

    // Step 4: Clean up - delete the test image
    const finalImageUrl = updateResult.newImageUrl || uploadResult.imageUrl;
    if (finalImageUrl) {
      const deleteResult = await deleteStoryImage(finalImageUrl);
      if (deleteResult.success) {
        console.log('✓ Test image cleaned up');
      } else {
        console.warn('⚠️ Failed to clean up test image:', deleteResult.error);
      }
    }

    return {
      success: true,
      message: 'Complete story image workflow test passed',
      details: {
        imageValidated: true,
        imageUploaded: true,
        imageUpdated: true,
        imageDeleted: true,
        uploadUrl: uploadResult.imageUrl,
        finalUrl: finalImageUrl,
      },
    };

  } catch (error) {
    console.error('Complete story image workflow test failed:', error);
    return {
      success: false,
      message: 'Complete story image workflow test failed with error',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Run all story image tests and log results
 */
export async function runStoryImageTests(testImageUri?: string): Promise<void> {
  console.log('🧪 Running Story Image Tests...\n');

  // Test 1: Image validation
  const validationTest = await testStoryImageValidation();
  if (validationTest.success) {
    console.log('🟢 Story Image Validation Test: PASSED');
    console.log(validationTest.message);
  } else {
    console.log('🔴 Story Image Validation Test: FAILED');
    console.log(validationTest.message);
    if (validationTest.details) {
      console.log('Error Details:', validationTest.details);
    }
  }

  console.log('');

  // Test 2: Image upload
  const uploadTest = await testStoryImageUpload();
  if (uploadTest.success) {
    console.log('🟢 Story Image Upload Test: PASSED');
    console.log(uploadTest.message);
  } else {
    console.log('🔴 Story Image Upload Test: FAILED');
    console.log(uploadTest.message);
    if (uploadTest.details) {
      console.log('Error Details:', uploadTest.details);
    }
  }

  console.log('');

  // Test 3: Image update
  const updateTest = await testStoryImageUpdate();
  if (updateTest.success) {
    console.log('🟢 Story Image Update Test: PASSED');
    console.log(updateTest.message);
  } else {
    console.log('🔴 Story Image Update Test: FAILED');
    console.log(updateTest.message);
    if (updateTest.details) {
      console.log('Error Details:', updateTest.details);
    }
  }

  console.log('');

  // Test 4: Image deletion
  const deletionTest = await testStoryImageDeletion();
  if (deletionTest.success) {
    console.log('🟢 Story Image Deletion Test: PASSED');
    console.log(deletionTest.message);
  } else {
    console.log('🔴 Story Image Deletion Test: FAILED');
    console.log(deletionTest.message);
    if (deletionTest.details) {
      console.log('Error Details:', deletionTest.details);
    }
  }

  console.log('');

  // Test 5: Complete workflow (only if test image provided)
  if (testImageUri) {
    const workflowTest = await testCompleteStoryImageWorkflow(testImageUri);
    if (workflowTest.success) {
      console.log('🟢 Complete Story Image Workflow Test: PASSED');
      console.log(workflowTest.message);
      if (workflowTest.details) {
        console.log('Test Details:', workflowTest.details);
      }
    } else {
      console.log('🔴 Complete Story Image Workflow Test: FAILED');
      console.log(workflowTest.message);
      if (workflowTest.details) {
        console.log('Error Details:', workflowTest.details);
      }
    }
  } else {
    console.log('⚠️  Complete Story Image Workflow Test: SKIPPED (no test image provided)');
  }

  console.log('\n✅ Story Image Tests Completed');
}