import { test as base, expect, Page } from '@playwright/test';

// Extended test fixture with auth and helper methods
export const test = base.extend({
  // Authentication fixture
  authenticatedPage: async ({ page }, use) => {
    await loginUser(page);
    await use(page);
  },
});

// Re-export expect
export { expect };

// Test data
export const testUsers = {
  standard: {
    email: 'test@example.com',
    password: 'TestPassword123!',
    name: 'Test User',
  },
  admin: {
    email: 'admin@example.com',
    password: 'AdminPassword123!',
    name: 'Admin User',
  },
  new: (suffix = Date.now()) => ({
    email: `test.user${suffix}@example.com`,
    password: 'NewUserPassword123!',
    name: 'New Test User',
  }),
};

export const testSites = {
  example: 'https://example.com',
  ecommerce: 'https://fakeecommerce.com',
  blog: 'https://fakeblog.com',
};

export const testKeywords = [
  'seo optimization',
  'content marketing',
  'keyword research',
  'technical seo',
  'link building',
];

export const testContent = `
This is a sample article about SEO optimization. 
Search engine optimization is important for websites to rank higher in search results.
There are many factors that contribute to good SEO, including content quality, backlinks, and technical factors.
This sample text is intentionally written to test the readability analysis feature of the SEO Max tool.
`;

// Helper functions
export async function loginUser(page: Page, user = testUsers.standard) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(user.email);
  await page.getByLabel(/password/i).fill(user.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/.*dashboard/);
}

export async function createProject(page: Page, name = 'Test Project') {
  await page.goto('/dashboard/projects');
  await page.getByRole('button', { name: /new project|add project/i }).click();
  await page.getByLabel(/project name/i).fill(name);
  await page.getByLabel(/website/i).fill(testSites.example);
  await page.getByRole('button', { name: /create|save/i }).click();
  await expect(page.getByText(/project created/i)).toBeVisible();
  return name;
}

export async function runAudit(page: Page, url = testSites.example) {
  await page.goto('/dashboard/audits');
  await page.getByRole('button', { name: /new audit|run audit/i }).click();
  await page.getByPlaceholder(/website url/i).fill(url);
  await page.getByRole('button', { name: /start audit|start crawl/i }).click();
  // Wait for audit to start
  await expect(page.getByText(/crawl in progress|crawling/i)).toBeVisible();
  // For testing purposes, don't wait for completion
}

export async function analyzeContent(page: Page, content = testContent) {
  await page.goto('/dashboard/content');
  await page.getByRole('button', { name: /new content|add content/i }).click();
  await page.getByRole('tab', { name: /text|paste/i }).click();
  await page.locator('textarea').fill(content);
  await page.getByRole('button', { name: /analyze/i }).click();
  // Wait for analysis to start
  await expect(page.getByText(/analyzing|analyzing content/i)).toBeVisible();
  // For testing purposes, don't wait for completion
}

export async function searchKeyword(page: Page, keyword = testKeywords[0]) {
  await page.goto('/dashboard/keywords');
  await page.getByPlaceholder(/enter a keyword/i).fill(keyword);
  await page.getByRole('button', { name: /search|analyze/i }).click();
  // Wait for search to start
  await expect(page.getByText(/searching|analyzing/i)).toBeVisible({ timeout: 10000 });
  // For testing purposes, don't wait for completion
}

export async function generateReport(page: Page, name = 'Automated Test Report') {
  await page.goto('/dashboard/reports');
  await page.getByRole('button', { name: /new report|generate report/i }).click();
  await page.getByLabel(/report name/i).fill(name);
  await page.getByRole('radio', { name: /site audit report/i }).check();
  // Try to select the first audit if available
  try {
    await page.getByLabel(/select audit/i).click();
    await page.getByRole('option').first().click();
  } catch (e) {
    // If no audits are available, this will fail - that's OK for fixture code
  }
  await page.getByRole('button', { name: /generate|create report/i }).click();
  // Check for generation in progress
  await expect(page.getByText(/generating report|processing/i)).toBeVisible();
  // For testing purposes, don't wait for completion
} 