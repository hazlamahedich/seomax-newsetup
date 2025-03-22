import { test, expect, Page } from '@playwright/test';

// Helper function to login for tests that require authentication
async function loginUser(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('test@example.com');
  await page.getByLabel(/password/i).fill('TestPassword123!');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/.*dashboard/);
}

test.describe('Keyword Research and Analysis', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    // Navigate to keyword research page
    await page.goto('/dashboard/keywords');
    await expect(page.getByText(/keyword research/i)).toBeVisible();
  });

  test('keyword search functionality', async ({ page }) => {
    // Enter a keyword in the search box
    await page.getByPlaceholder(/enter a keyword/i).fill('seo tools');
    await page.getByRole('button', { name: /search|analyze/i }).click();
    
    // Check that search results appear
    await expect(page.getByText(/search volume/i)).toBeVisible();
    await expect(page.getByText(/keyword difficulty/i)).toBeVisible();
    
    // Verify that results contain the searched keyword
    const resultsList = page.locator('.keyword-result-item');
    await expect(resultsList.first()).toBeVisible();
    await expect(page.getByText(/seo tools/i)).toBeVisible();
  });

  test('keyword metrics display and analysis', async ({ page }) => {
    // Search for a keyword
    await page.getByPlaceholder(/enter a keyword/i).fill('content marketing');
    await page.getByRole('button', { name: /search|analyze/i }).click();
    
    // Wait for analysis to complete
    await expect(page.getByText(/analysis complete/i)).toBeVisible({ timeout: 20000 });
    
    // Check for key metrics
    await expect(page.getByText(/search volume/i)).toBeVisible();
    await expect(page.getByText(/cpc/i)).toBeVisible();
    await expect(page.getByText(/competition/i)).toBeVisible();
    await expect(page.getByText(/keyword difficulty/i)).toBeVisible();
    
    // Check for trend graph
    const trendGraph = page.locator('.trend-graph');
    await expect(trendGraph).toBeVisible();
    
    // Check for SERP features if available
    await expect(page.getByText(/serp features/i)).toBeVisible();
  });

  test('competitor keyword analysis', async ({ page }) => {
    // Navigate to competitor analysis
    await page.getByRole('link', { name: /competitor analysis/i }).click();
    
    // Enter competitor domain
    await page.getByPlaceholder(/competitor domain/i).fill('competitor.com');
    await page.getByRole('button', { name: /analyze/i }).click();
    
    // Wait for analysis to complete
    await expect(page.getByText(/analysis complete/i)).toBeVisible({ timeout: 30000 });
    
    // Check for competitor keywords
    await expect(page.getByText(/top keywords/i)).toBeVisible();
    
    // Check for comparison view
    await page.getByRole('tab', { name: /keyword gap/i }).click();
    await expect(page.getByText(/keywords you're missing/i)).toBeVisible();
    
    // Check for opportunity metrics
    await expect(page.getByText(/keyword opportunity/i)).toBeVisible();
  });

  test('keyword difficulty evaluation', async ({ page }) => {
    // Search for a keyword
    await page.getByPlaceholder(/enter a keyword/i).fill('SEO strategy');
    await page.getByRole('button', { name: /search|analyze/i }).click();
    
    // Navigate to difficulty analysis
    await page.getByRole('link', { name: /difficulty analysis/i }).click();
    
    // Check difficulty gauge/visualization
    await expect(page.locator('.difficulty-gauge')).toBeVisible();
    
    // Check for difficulty factors
    await expect(page.getByText(/ranking factors/i)).toBeVisible();
    await expect(page.getByText(/content quality/i)).toBeVisible();
    await expect(page.getByText(/backlink profile/i)).toBeVisible();
    
    // Check for suggested action
    await expect(page.getByText(/recommended action/i)).toBeVisible();
  });

  test('keyword suggestions and recommendations', async ({ page }) => {
    // Search for a seed keyword
    await page.getByPlaceholder(/enter a keyword/i).fill('digital marketing');
    await page.getByRole('button', { name: /search|analyze/i }).click();
    
    // Navigate to suggestions tab
    await page.getByRole('tab', { name: /suggestions/i }).click();
    
    // Check for related keywords
    await expect(page.getByText(/related keywords/i)).toBeVisible();
    const suggestedKeywords = page.locator('.suggested-keyword-item');
    await expect(suggestedKeywords).toHaveCount({ min: 1 });
    
    // Check for questions people ask
    await page.getByRole('tab', { name: /questions/i }).click();
    await expect(page.getByText(/questions people ask/i)).toBeVisible();
    
    // Check for long-tail variations
    await page.getByRole('tab', { name: /long-tail/i }).click();
    await expect(page.getByText(/long-tail variations/i)).toBeVisible();
  });

  test('search volume trends visualization', async ({ page }) => {
    // Search for a keyword
    await page.getByPlaceholder(/enter a keyword/i).fill('remote work');
    await page.getByRole('button', { name: /search|analyze/i }).click();
    
    // Navigate to trends view
    await page.getByRole('tab', { name: /trends/i }).click();
    
    // Check for trends graph
    await expect(page.locator('.trends-graph')).toBeVisible();
    
    // Change time period if available
    await page.getByRole('button', { name: /1 year/i }).click();
    await page.getByRole('option', { name: /2 years/i }).click();
    
    // Verify graph updates
    await expect(page.locator('.trends-graph')).toBeVisible();
    
    // Check for seasonal patterns
    await expect(page.getByText(/seasonal patterns/i)).toBeVisible();
    
    // Check for trend insights
    await expect(page.getByText(/trend insights/i)).toBeVisible();
  });
}); 