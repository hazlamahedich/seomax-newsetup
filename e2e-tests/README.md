# End-to-End Tests for SEO Max

This directory contains the end-to-end tests for the SEO Max application using Playwright. These tests verify the application's functionality from a user's perspective by automating browser interactions.

## Test Structure

The tests are organized by feature area:

- `home.spec.ts` - Basic navigation and home page tests
- `login.spec.ts` - Authentication tests
- `onboarding.spec.ts` - User onboarding flow tests
- `keyword-research.spec.ts` - Keyword research and analysis tests
- `content-optimization.spec.ts` - Content optimization workflow tests
- `technical-seo-audit.spec.ts` - Technical SEO audit process tests
- `report-generation.spec.ts` - Report generation tests

## Helper Files

- `fixtures.ts` - Test fixtures, data, and helper functions
- `playwright.d.ts` - Type definitions for Playwright

## Running Tests

### Prerequisites

1. Install dependencies:
   ```
   npm install
   ```

2. Install Playwright browsers:
   ```
   npx playwright install
   ```

3. Start the development server (in a separate terminal):
   ```
   npm run dev
   ```

### Run All Tests

```
npm run test:e2e
```

### Run Tests with UI Mode

```
npm run test:e2e -- --ui
```

### Run Specific Test File

```
npm run test:e2e -- e2e-tests/login.spec.ts
```

### Run Tests with Headed Browser

```
npm run test:e2e -- --headed
```

## Test User Accounts

For local development testing, you need to create the following test accounts in your local Supabase instance:

1. Standard test user:
   - Email: `test@example.com`
   - Password: `TestPassword123!`
   - Name: `Test User`

2. Admin test user:
   - Email: `admin@example.com`
   - Password: `AdminPassword123!`
   - Name: `Admin User`

## Test Data

The tests rely on sample data defined in `fixtures.ts`. This includes:

- Test users
- Sample websites
- Test keywords
- Sample content for analysis

## CI Integration

The tests run automatically in GitHub Actions for pull requests and pushes to the main branch. See the `.github/workflows/test.yml` file for the configuration.

## Troubleshooting

### Tests Are Failing

1. Make sure the development server is running (`npm run dev`)
2. Check that test user accounts are created in the database
3. Verify that environment variables are properly set
4. Check the test fixtures and data in `fixtures.ts`

### Visual Debugging

Run tests with the `--headed` flag to see the browser in action:

```
npm run test:e2e -- --headed
```

## Adding New Tests

1. Create a new spec file in the `e2e-tests` directory
2. Use the existing tests as a template
3. Import helpers from `fixtures.ts` for common operations
4. Use Playwright's locators for finding elements
5. Add assertions to verify expected behavior

## Best Practices

1. Make tests independent and isolated
2. Use descriptive test names 
3. Group related tests with `test.describe`
4. Use the authentication fixture for authenticated tests
5. Clean up test data after tests when necessary
6. Avoid flaky tests by using appropriate waiting strategies
7. Add appropriate timeouts for async operations 