import { test, expect, Page } from '@playwright/test';

// Helper function to login for tests that require authentication
async function loginUser(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('test@example.com');
  await page.getByLabel(/password/i).fill('TestPassword123!');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/.*dashboard/);
}

test.describe('Report Generation Tests', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    // Navigate to reports page
    await page.goto('/dashboard/reports');
    await expect(page.getByText(/reports|reporting/i)).toBeVisible();
  });

  test('SEO report generation process', async ({ page }) => {
    // Start creating a new report
    await page.getByRole('button', { name: /new report|generate report/i }).click();
    
    // Check that report configuration UI is visible
    await expect(page.getByText(/report configuration|report settings/i)).toBeVisible();
    
    // Select report type
    await page.getByRole('radio', { name: /site audit report/i }).check();
    
    // Select data source (assuming there are existing site audits)
    await page.getByLabel(/select audit/i).click();
    await page.getByRole('option').first().click();
    
    // Configure report sections if available
    const sectionsExpander = page.getByText(/customize sections/i);
    if (await sectionsExpander.isVisible()) {
      await sectionsExpander.click();
      
      // Select specific sections
      await page.getByLabel(/technical issues/i).check();
      await page.getByLabel(/performance/i).check();
      await page.getByLabel(/content analysis/i).check();
    }
    
    // Add report name
    await page.getByLabel(/report name/i).fill('Automated Test Report');
    
    // Generate the report
    await page.getByRole('button', { name: /generate|create report/i }).click();
    
    // Check for generation in progress
    await expect(page.getByText(/generating report|processing/i)).toBeVisible();
    
    // Wait for report generation to complete or timeout
    await expect(page.getByText(/report ready|generation complete/i)).toBeVisible({
      timeout: 30000
    });
    
    // Verify report created
    await expect(page.getByText(/automated test report/i)).toBeVisible();
  });

  test('PDF/export functionality', async ({ page }) => {
    // Navigate to existing report
    await page.locator('.report-item').first().click();
    
    // Check for report viewer
    await expect(page.getByText(/report summary|report overview/i)).toBeVisible();
    
    // Locate and click export button
    await page.getByRole('button', { name: /export|download/i }).click();
    
    // Check for export options
    await expect(page.getByText(/export options|download options/i)).toBeVisible();
    
    // Select PDF export
    await page.getByRole('button', { name: /pdf/i }).click();
    
    // Download should trigger - we can't test actual download in e2e
    // But we can check for a success message or dialog
    await expect(page.getByText(/preparing download|download started/i)).toBeVisible();
    
    // Try other export formats if available
    const exportCSV = page.getByRole('button', { name: /csv|excel/i });
    if (await exportCSV.isVisible()) {
      await exportCSV.click();
      await expect(page.getByText(/preparing download|download started/i)).toBeVisible();
    }
  });

  test('report scheduling/automation', async ({ page }) => {
    // Navigate to report scheduling section
    await page.getByRole('link', { name: /schedule|automated reports/i }).click();
    
    // Check for scheduling UI
    await expect(page.getByText(/schedule reports|report automation/i)).toBeVisible();
    
    // Create new scheduled report
    await page.getByRole('button', { name: /new schedule|create schedule/i }).click();
    
    // Configure the schedule
    await page.getByLabel(/report name/i).fill('Weekly Site Audit Report');
    
    // Select report type
    await page.getByRole('radio', { name: /site audit report/i }).check();
    
    // Select frequency
    await page.getByLabel(/frequency/i).selectOption('weekly');
    
    // Select day if applicable
    const daySelector = page.getByLabel(/day of week/i);
    if (await daySelector.isVisible()) {
      await daySelector.selectOption('Monday');
    }
    
    // Select recipients
    await page.getByLabel(/email recipients/i).fill('test@example.com');
    
    // Save schedule
    await page.getByRole('button', { name: /save schedule|create schedule/i }).click();
    
    // Check for confirmation
    await expect(page.getByText(/schedule created|report scheduled/i)).toBeVisible();
    
    // Verify schedule appears in list
    await expect(page.getByText(/weekly site audit report/i)).toBeVisible();
  });

  test('report customization options', async ({ page }) => {
    // Navigate to customize reports section
    await page.getByRole('link', { name: /customize|templates/i }).click();
    
    // Check for customization UI
    await expect(page.getByText(/report templates|report customization/i)).toBeVisible();
    
    // Create new template
    await page.getByRole('button', { name: /new template|create template/i }).click();
    
    // Configure template
    await page.getByLabel(/template name/i).fill('Custom Brand Report');
    
    // Upload logo if available
    const logoUpload = page.getByText(/upload logo|brand logo/i);
    if (await logoUpload.isVisible()) {
      // Skip actual file upload in test
    }
    
    // Set brand colors if available
    const colorPicker = page.getByLabel(/primary color|brand color/i);
    if (await colorPicker.isVisible()) {
      await colorPicker.fill('#3366CC');
    }
    
    // Customize sections
    await page.getByLabel(/include executive summary/i).check();
    await page.getByLabel(/include recommendations/i).check();
    
    // Save template
    await page.getByRole('button', { name: /save template|create template/i }).click();
    
    // Check for confirmation
    await expect(page.getByText(/template saved|template created/i)).toBeVisible();
    
    // Verify template appears in list
    await expect(page.getByText(/custom brand report/i)).toBeVisible();
  });

  test('data visualization in reports', async ({ page }) => {
    // Navigate to existing report
    await page.locator('.report-item').first().click();
    
    // Check for charts and visualizations
    await expect(page.locator('.chart-container')).toBeVisible();
    
    // Check for key metrics visualization
    await expect(page.getByText(/key metrics|performance indicators/i)).toBeVisible();
    
    // Check for various chart types
    await expect(page.locator('.bar-chart')).toBeVisible();
    
    // Test chart interaction if possible
    const chartElement = page.locator('.interactive-chart').first();
    if (await chartElement.isVisible()) {
      // Hover over chart element to show tooltip
      await chartElement.hover();
      // Check for tooltip data
      await expect(page.locator('.chart-tooltip')).toBeVisible();
    }
    
    // Check for data tables
    await expect(page.locator('table')).toBeVisible();
    
    // Check for filtering or sorting if available
    const sortButton = page.getByRole('button', { name: /sort|filter/i }).first();
    if (await sortButton.isVisible()) {
      await sortButton.click();
      // Verify sort/filter applied
      await expect(page.locator('table')).toBeVisible();
    }
  });

  test('historical data comparison', async ({ page }) => {
    // Navigate to existing report with historical data
    await page.locator('.report-item').first().click();
    
    // Check for comparison view
    await page.getByRole('tab', { name: /comparison|historical data/i }).click();
    
    // Check for date range selector
    await expect(page.getByText(/date range|time period/i)).toBeVisible();
    
    // Select different time periods
    await page.getByRole('button', { name: /last month|30 days/i }).click();
    await page.getByRole('option', { name: /last quarter|90 days/i }).click();
    
    // Check for trend visualization
    await expect(page.locator('.trend-chart')).toBeVisible();
    
    // Check for key metrics comparison
    await expect(page.getByText(/metrics comparison|performance trends/i)).toBeVisible();
    
    // Check for improvement indicators
    await expect(page.getByText(/improvement|change/i)).toBeVisible();
    
    // Check for comparison table
    await expect(page.locator('.comparison-table')).toBeVisible();
  });
}); 