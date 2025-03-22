import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test('should display login form', async ({ page }) => {
    await page.goto('/login');
    
    await expect(page.getByRole('heading', { name: /login/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should show validation errors for empty form submission', async ({ page }) => {
    await page.goto('/login');
    
    // Submit form without entering data
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Check for validation messages
    await expect(page.getByText(/email is required/i)).toBeVisible();
    await expect(page.getByText(/password is required/i)).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Fill in form with incorrect credentials
    await page.getByLabel(/email/i).fill('invalid@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    
    // Submit form
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Check for error message
    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
  });

  test('should navigate to forgot password page', async ({ page }) => {
    await page.goto('/login');
    
    // Click on forgot password link
    await page.getByRole('link', { name: /forgot password/i }).click();
    
    // Check we've navigated to the forgot password page
    await expect(page).toHaveURL(/.*forgot-password/);
  });

  test('should navigate to signup page', async ({ page }) => {
    await page.goto('/login');
    
    // Click on sign up link
    await page.getByRole('link', { name: /sign up/i }).click();
    
    // Check we've navigated to the signup page
    await expect(page).toHaveURL(/.*signup/);
  });

  // This test requires legitimate credentials and would be skipped in CI
  test.skip('should login with valid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Fill in form with correct credentials
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('correctpassword');
    
    // Submit form
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Check we've navigated to the dashboard
    await expect(page).toHaveURL(/.*dashboard/);
  });
}); 