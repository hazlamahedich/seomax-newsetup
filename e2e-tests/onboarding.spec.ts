import { test, expect } from '@playwright/test';

test.describe('User Onboarding Flow', () => {
  test('complete signup process', async ({ page }) => {
    await page.goto('/signup');
    
    // Fill in signup form
    await page.getByLabel(/name/i).fill('Test User');
    await page.getByLabel(/email/i).fill('test.user' + Date.now() + '@example.com');
    await page.getByLabel(/password/i).fill('SecurePassword123!');
    await page.getByLabel(/confirm password/i).fill('SecurePassword123!');
    
    // Accept terms
    await page.getByLabel(/terms and conditions/i).check();
    
    // Submit form
    await page.getByRole('button', { name: /sign up|create account/i }).click();
    
    // Check for success message or redirect
    await expect(page).toHaveURL(/.*verify-email|.*onboarding/);
    
    // Validation: Either a success message or redirection to onboarding
    const successElement = page.getByText(/verification email sent|complete your profile/i);
    await expect(successElement).toBeVisible();
  });

  test('post-signup onboarding wizard', async ({ page }) => {
    // Log in as a new user
    // This test assumes there's a way to bypass email verification in test mode
    // Or you can use a test account that's already verified
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('onboarding.test@example.com');
    await page.getByLabel(/password/i).fill('TestPassword123!');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Check if redirected to onboarding
    await expect(page).toHaveURL(/.*onboarding/);
    
    // Complete profile step
    await page.getByLabel(/company name/i).fill('Test Company');
    await page.getByLabel(/website/i).fill('https://testcompany.com');
    await page.getByLabel(/industry/i).selectOption('Technology');
    await page.getByRole('button', { name: /next|continue/i }).click();
    
    // Check that we moved to the next step
    await expect(page.getByText(/your goals/i)).toBeVisible();
    
    // Select goals
    await page.getByLabel(/improve search rankings/i).check();
    await page.getByLabel(/optimize content/i).check();
    await page.getByRole('button', { name: /next|continue/i }).click();
    
    // Check completion
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.getByText(/welcome to seo max/i)).toBeVisible();
  });

  test('email verification flow', async ({ page }) => {
    // Create an account that needs verification
    const testEmail = 'verify.test' + Date.now() + '@example.com';
    
    await page.goto('/signup');
    await page.getByLabel(/name/i).fill('Verify User');
    await page.getByLabel(/email/i).fill(testEmail);
    await page.getByLabel(/password/i).fill('VerifyTest123!');
    await page.getByLabel(/confirm password/i).fill('VerifyTest123!');
    await page.getByLabel(/terms and conditions/i).check();
    await page.getByRole('button', { name: /sign up|create account/i }).click();
    
    // Check we're on verification page
    await expect(page).toHaveURL(/.*verify-email/);
    
    // Test verification code input
    // Note: In a real test, you'd need to retrieve the actual code from your test email system
    // This is a simplified version
    await page.getByPlaceholder(/verification code/i).fill('123456');
    await page.getByRole('button', { name: /verify|confirm/i }).click();
    
    // For testing, we expect this to fail with an error message about invalid code
    await expect(page.getByText(/invalid|incorrect verification code/i)).toBeVisible();
    
    // Check resend code functionality
    await page.getByText(/resend code/i).click();
    await expect(page.getByText(/code sent/i)).toBeVisible();
  });

  test('profile setup and customization', async ({ page }) => {
    // Login with a verified account
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('profile.test@example.com');
    await page.getByLabel(/password/i).fill('ProfileTest123!');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Navigate to profile settings
    await page.goto('/dashboard/settings/profile');
    
    // Check profile page is loaded
    await expect(page.getByText(/profile settings/i)).toBeVisible();
    
    // Update profile information
    await page.getByLabel(/name/i).clear();
    await page.getByLabel(/name/i).fill('Updated User Name');
    
    // Update avatar if available
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText(/change avatar|upload photo/i).click();
    const fileChooser = await fileChooserPromise;
    // Note: In real test, you would point to an actual test image file
    // await fileChooser.setFiles('./test-assets/avatar.png');
    
    // Save changes
    await page.getByRole('button', { name: /save|update/i }).click();
    
    // Check for success message
    await expect(page.getByText(/profile updated|changes saved/i)).toBeVisible();
  });

  test('initial preference configuration', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('settings.test@example.com'); 
    await page.getByLabel(/password/i).fill('SettingsTest123!');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Navigate to settings
    await page.goto('/dashboard/settings/preferences');
    
    // Check settings page is loaded
    await expect(page.getByText(/preferences|settings/i)).toBeVisible();
    
    // Configure email notifications
    await page.getByLabel(/weekly report/i).check();
    await page.getByLabel(/ranking changes/i).check();
    
    // Set default language if available
    await page.getByLabel(/language/i).selectOption('English');
    
    // Set timezone if available
    await page.getByLabel(/timezone/i).selectOption('UTC');
    
    // Save preferences
    await page.getByRole('button', { name: /save|update preferences/i }).click();
    
    // Check for success message
    await expect(page.getByText(/preferences updated|settings saved/i)).toBeVisible();
  });
}); 