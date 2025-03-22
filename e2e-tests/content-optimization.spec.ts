import { test, expect, Page } from '@playwright/test';

// Helper function to login for tests that require authentication
async function loginUser(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('test@example.com');
  await page.getByLabel(/password/i).fill('TestPassword123!');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/.*dashboard/);
}

test.describe('Content Optimization Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    // Navigate to content optimization page
    await page.goto('/dashboard/content');
    await expect(page.getByText(/content optimization/i)).toBeVisible();
  });

  test('content analysis/upload functionality', async ({ page }) => {
    // Click on new content button
    await page.getByRole('button', { name: /new content|add content/i }).click();
    
    // Check for content input options
    await expect(page.getByText(/analyze content/i)).toBeVisible();
    
    // Choose URL option
    await page.getByRole('tab', { name: /url/i }).click();
    await page.getByPlaceholder(/https:\/\//i).fill('https://example.com/blog-post');
    await page.getByRole('button', { name: /analyze/i }).click();
    
    // Check for analysis in progress
    await expect(page.getByText(/analyzing|analyzing content/i)).toBeVisible();
    
    // Wait for analysis to complete (allowing longer timeout)
    await expect(page.getByText(/analysis complete|optimization opportunities/i)).toBeVisible({
      timeout: 30000
    });
    
    // Check that content was analyzed
    await expect(page.getByText(/content score/i)).toBeVisible();
  });

  test('readability analysis tests', async ({ page }) => {
    // Navigate to existing content or create new
    await page.getByRole('button', { name: /new content|add content/i }).click();
    
    // Use the text input option
    await page.getByRole('tab', { name: /text|paste/i }).click();
    
    // Input sample content
    await page.locator('textarea').fill(`This is a sample article about SEO optimization. 
    Search engine optimization is important for websites to rank higher in search results.
    There are many factors that contribute to good SEO, including content quality, backlinks, and technical factors.
    This sample text is intentionally written to test the readability analysis feature of the SEO Max tool.`);
    
    await page.getByRole('button', { name: /analyze/i }).click();
    
    // Wait for analysis to complete
    await expect(page.getByText(/analysis complete/i)).toBeVisible({ timeout: 20000 });
    
    // Navigate to readability tab
    await page.getByRole('tab', { name: /readability/i }).click();
    
    // Check for readability metrics
    await expect(page.getByText(/reading ease/i)).toBeVisible();
    await expect(page.getByText(/reading grade level/i)).toBeVisible();
    await expect(page.getByText(/sentence complexity/i)).toBeVisible();
    
    // Check for readability score
    await expect(page.locator('.readability-score')).toBeVisible();
    
    // Check for improvement suggestions
    await expect(page.getByText(/improvement suggestions/i)).toBeVisible();
  });

  test('keyword density/placement analysis', async ({ page }) => {
    // Navigate to existing content item
    // This assumes there's content already analyzed
    await page.locator('.content-item').first().click();
    
    // Go to keyword analysis tab
    await page.getByRole('tab', { name: /keywords/i }).click();
    
    // Check for target keyword input
    await page.getByPlaceholder(/target keyword/i).fill('SEO optimization');
    await page.getByRole('button', { name: /update|analyze/i }).click();
    
    // Check for keyword metrics
    await expect(page.getByText(/keyword density/i)).toBeVisible();
    await expect(page.getByText(/keyword placement/i)).toBeVisible();
    
    // Check for keyword distribution visualization
    await expect(page.locator('.keyword-distribution')).toBeVisible();
    
    // Check for optimal density indicator
    await expect(page.getByText(/optimal density/i)).toBeVisible();
    
    // Check for keyword suggestions
    await expect(page.getByText(/related keywords/i)).toBeVisible();
  });

  test('content structure recommendations', async ({ page }) => {
    // Navigate to existing content item
    await page.locator('.content-item').first().click();
    
    // Go to structure tab
    await page.getByRole('tab', { name: /structure|organization/i }).click();
    
    // Check for structure analysis
    await expect(page.getByText(/heading structure/i)).toBeVisible();
    await expect(page.getByText(/content sections/i)).toBeVisible();
    
    // Check for structure visualization 
    await expect(page.locator('.structure-visualization')).toBeVisible();
    
    // Check for structure recommendations
    await expect(page.getByText(/improvement suggestions/i)).toBeVisible();
    
    // Check for heading hierarchy analysis
    await expect(page.getByText(/h1|h2|h3/i)).toBeVisible();
  });

  test('content improvement suggestions', async ({ page }) => {
    // Navigate to existing content item
    await page.locator('.content-item').first().click();
    
    // Go to suggestions tab
    await page.getByRole('tab', { name: /suggestions|improvements/i }).click();
    
    // Check for AI suggestions
    await expect(page.getByText(/ai suggestions/i)).toBeVisible();
    
    // Check for suggestion categories
    await expect(page.getByText(/readability suggestions/i)).toBeVisible();
    await expect(page.getByText(/seo suggestions/i)).toBeVisible();
    await expect(page.getByText(/structure suggestions/i)).toBeVisible();
    
    // Check for apply suggestion functionality
    const suggestionItem = page.locator('.suggestion-item').first();
    await expect(suggestionItem).toBeVisible();
    
    // Check for suggestion apply button if available
    const applyButton = suggestionItem.getByRole('button', { name: /apply|implement/i });
    if (await applyButton.isVisible()) {
      await applyButton.click();
      // Check for confirmation
      await expect(page.getByText(/suggestion applied|updated/i)).toBeVisible();
    }
  });

  test('before/after content comparison', async ({ page }) => {
    // Navigate to existing content item
    await page.locator('.content-item').first().click();
    
    // Go to history/comparison tab
    await page.getByRole('tab', { name: /history|comparison|versions/i }).click();
    
    // Check for comparison UI
    await expect(page.getByText(/original content|before/i)).toBeVisible();
    await expect(page.getByText(/optimized content|after/i)).toBeVisible();
    
    // Check for metrics comparison
    await expect(page.getByText(/score improvement/i)).toBeVisible();
    await expect(page.locator('.comparison-chart')).toBeVisible();
    
    // Check for content diff visualization if available
    const diffView = page.locator('.content-diff');
    if (await diffView.isVisible()) {
      await expect(diffView).toContainText(/added|removed/i);
    }
    
    // Check for restore version functionality if available
    const restoreButton = page.getByRole('button', { name: /restore|revert/i });
    if (await restoreButton.isVisible()) {
      await restoreButton.click();
      // Check for confirmation dialog
      await expect(page.getByText(/restore this version/i)).toBeVisible();
      // Cancel the operation
      await page.getByRole('button', { name: /cancel/i }).click();
    }
  });
}); 