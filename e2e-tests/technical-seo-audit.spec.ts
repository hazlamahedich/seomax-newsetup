import { test, expect, Page } from '@playwright/test';

// Helper function to login for tests that require authentication
async function loginUser(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('test@example.com');
  await page.getByLabel(/password/i).fill('TestPassword123!');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/.*dashboard/);
}

test.describe('Technical SEO Audit Process', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    // Navigate to technical SEO audit page
    await page.goto('/dashboard/audits');
    await expect(page.getByText(/technical audit|site audit/i)).toBeVisible();
  });

  test('website crawl functionality', async ({ page }) => {
    // Start a new audit
    await page.getByRole('button', { name: /new audit|run audit/i }).click();
    
    // Enter website URL
    await page.getByPlaceholder(/website url/i).fill('https://example.com');
    
    // Configure crawl settings if available
    const advancedSettingsButton = page.getByRole('button', { name: /advanced settings/i });
    if (await advancedSettingsButton.isVisible()) {
      await advancedSettingsButton.click();
      
      // Set crawl depth
      await page.getByLabel(/crawl depth/i).selectOption('3');
      
      // Set max pages
      await page.getByLabel(/max pages/i).fill('100');
      
      // Toggle respect robots.txt
      await page.getByLabel(/respect robots.txt/i).check();
    }
    
    // Start the crawl
    await page.getByRole('button', { name: /start audit|start crawl/i }).click();
    
    // Check for crawl in progress
    await expect(page.getByText(/crawl in progress|crawling/i)).toBeVisible();
    
    // Wait for a reasonable time to check status
    // For testing we won't wait for full completion
    await page.waitForTimeout(5000);
    
    // Check for crawl progress indicators
    await expect(page.getByText(/pages crawled|crawl progress/i)).toBeVisible();
    
    // Check for partial results if available
    const resultsSection = page.getByText(/partial results|live results/i);
    if (await resultsSection.isVisible()) {
      await expect(resultsSection).toBeVisible();
    }
  });

  test('page speed analysis', async ({ page }) => {
    // Navigate to existing audit or create new one
    // For test purposes, navigate to an existing audit to avoid long wait
    await page.locator('.audit-item').first().click();
    
    // Go to performance tab
    await page.getByRole('tab', { name: /performance|speed/i }).click();
    
    // Check for speed metrics
    await expect(page.getByText(/page speed/i)).toBeVisible();
    await expect(page.getByText(/performance score/i)).toBeVisible();
    
    // Check for core web vitals
    await expect(page.getByText(/LCP|FID|CLS/i)).toBeVisible();
    
    // Check for page speed distribution
    await expect(page.locator('.speed-distribution')).toBeVisible();
    
    // Check for slow pages section
    await expect(page.getByText(/slow pages/i)).toBeVisible();
    
    // Check for improvement suggestions
    await expect(page.getByText(/improvement suggestions/i)).toBeVisible();
  });

  test('mobile-friendliness testing', async ({ page }) => {
    // Navigate to existing audit
    await page.locator('.audit-item').first().click();
    
    // Go to mobile tab
    await page.getByRole('tab', { name: /mobile/i }).click();
    
    // Check for mobile-friendliness score
    await expect(page.getByText(/mobile-friendly score/i)).toBeVisible();
    
    // Check for mobile issues section
    await expect(page.getByText(/mobile issues/i)).toBeVisible();
    
    // Check for viewport issues
    await expect(page.getByText(/viewport|responsive/i)).toBeVisible();
    
    // Check for tap target issues
    await expect(page.getByText(/tap targets|touch elements/i)).toBeVisible();
    
    // Check for mobile preview if available
    const mobilePreview = page.locator('.mobile-preview');
    if (await mobilePreview.isVisible()) {
      await expect(mobilePreview).toBeVisible();
    }
  });

  test('schema markup validation', async ({ page }) => {
    // Navigate to existing audit
    await page.locator('.audit-item').first().click();
    
    // Go to schema/structured data tab
    await page.getByRole('tab', { name: /schema|structured data/i }).click();
    
    // Check for schema overview
    await expect(page.getByText(/structured data overview/i)).toBeVisible();
    
    // Check for detected schemas
    await expect(page.getByText(/detected schemas/i)).toBeVisible();
    
    // Check for schema validation
    await expect(page.getByText(/validation results/i)).toBeVisible();
    
    // Check for schema recommendations
    await expect(page.getByText(/schema recommendations/i)).toBeVisible();
    
    // Check for schema preview if available
    const schemaPreview = page.locator('.schema-preview');
    if (await schemaPreview.isVisible()) {
      await expect(schemaPreview).toBeVisible();
    }
  });

  test('broken link detection', async ({ page }) => {
    // Navigate to existing audit
    await page.locator('.audit-item').first().click();
    
    // Go to links tab
    await page.getByRole('tab', { name: /links/i }).click();
    
    // Check for broken links section
    await expect(page.getByText(/broken links/i)).toBeVisible();
    
    // Check for link status distribution
    await expect(page.locator('.link-status-chart')).toBeVisible();
    
    // Check for broken link list
    const brokenLinksList = page.locator('.broken-links-list');
    await expect(brokenLinksList).toBeVisible();
    
    // Check filter functionality if available
    const filterDropdown = page.getByRole('combobox', { name: /filter/i });
    if (await filterDropdown.isVisible()) {
      await filterDropdown.click();
      await page.getByRole('option', { name: /internal/i }).click();
      // Verify filter applied
      await expect(page).toHaveURL(/.*filter=internal/);
    }
  });

  test('SSL/Security check process', async ({ page }) => {
    // Navigate to existing audit
    await page.locator('.audit-item').first().click();
    
    // Go to security tab
    await page.getByRole('tab', { name: /security|ssl/i }).click();
    
    // Check for SSL status
    await expect(page.getByText(/ssl certificate/i)).toBeVisible();
    
    // Check for security headers section
    await expect(page.getByText(/security headers/i)).toBeVisible();
    
    // Check for HTTPS migration issues if present
    await expect(page.getByText(/mixed content|https migration/i)).toBeVisible();
    
    // Check for security recommendations
    await expect(page.getByText(/security recommendations/i)).toBeVisible();
    
    // Check for security score or rating
    await expect(page.locator('.security-score')).toBeVisible();
  });

  test('sitemap/robots.txt analysis', async ({ page }) => {
    // Navigate to existing audit
    await page.locator('.audit-item').first().click();
    
    // Go to sitemap tab
    await page.getByRole('tab', { name: /sitemap|robots/i }).click();
    
    // Check for sitemap analysis
    await expect(page.getByText(/sitemap analysis/i)).toBeVisible();
    
    // Check for sitemap issues list
    await expect(page.getByText(/sitemap issues/i)).toBeVisible();
    
    // Check for robots.txt analysis
    await expect(page.getByText(/robots.txt analysis/i)).toBeVisible();
    
    // Check for robots.txt preview
    await expect(page.locator('.robots-preview')).toBeVisible();
    
    // Check for recommendations
    await expect(page.getByText(/recommendations/i)).toBeVisible();
    
    // Check for sitemap validation results
    await expect(page.getByText(/validation results/i)).toBeVisible();
  });
}); 