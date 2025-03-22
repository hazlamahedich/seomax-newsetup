import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should navigate to the home page', async ({ page }) => {
    await page.goto('/');
    
    // Check that the page has loaded correctly
    await expect(page).toHaveTitle(/SEO Max/);
  });

  test('should show navigation links', async ({ page }) => {
    await page.goto('/');
    
    // Check for navigation elements
    await expect(page.getByRole('link', { name: /login/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /sign up/i })).toBeVisible();
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/');
    
    // Click the login link
    await page.getByRole('link', { name: /login/i }).click();
    
    // Check we've navigated to the login page
    await expect(page).toHaveURL(/.*login/);
  });

  test('should navigate to signup page', async ({ page }) => {
    await page.goto('/');
    
    // Click the signup link
    await page.getByRole('link', { name: /sign up/i }).click();
    
    // Check we've navigated to the signup page
    await expect(page).toHaveURL(/.*signup/);
  });
}); 