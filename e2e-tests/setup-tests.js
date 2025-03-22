#!/usr/bin/env node

/**
 * E2E Test Setup Script
 * 
 * This script sets up the necessary environment for E2E testing, including:
 * 1. Creating test users in Supabase
 * 2. Generating test data
 * 3. Creating environment variables for testing
 * 
 * Usage: 
 * node e2e-tests/setup-tests.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('   Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Test users from fixtures.ts
const TEST_USERS = [
  {
    email: 'test@example.com',
    password: 'TestPassword123!',
    name: 'Test User',
    role: 'user'
  },
  {
    email: 'admin@example.com',
    password: 'AdminPassword123!',
    name: 'Admin User',
    role: 'admin'
  },
  {
    email: 'profile.test@example.com',
    password: 'ProfileTest123!',
    name: 'Profile Test User',
    role: 'user'
  },
  {
    email: 'settings.test@example.com',
    password: 'SettingsTest123!',
    name: 'Settings Test User',
    role: 'user'
  },
  {
    email: 'onboarding.test@example.com',
    password: 'TestPassword123!',
    name: 'Onboarding Test User',
    role: 'user'
  }
];

// Create test users
async function createTestUsers() {
  console.log('🔧 Creating test users...');
  
  for (const user of TEST_USERS) {
    try {
      // Check if user already exists
      const { data: existingUsers } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', user.email);
      
      if (existingUsers && existingUsers.length > 0) {
        console.log(`✅ User ${user.email} already exists, skipping`);
        continue;
      }
      
      // Create user
      const { data, error } = await supabase.auth.signUp({
        email: user.email,
        password: user.password,
        options: {
          data: {
            name: user.name,
            role: user.role
          }
        }
      });
      
      if (error) {
        throw error;
      }
      
      console.log(`✅ Created user: ${user.email}`);
      
      // Auto-confirm the user for testing (if possible)
      try {
        await supabase.auth.admin.updateUserById(data.user.id, {
          email_confirm: true
        });
        console.log(`✅ Auto-confirmed user: ${user.email}`);
      } catch (error) {
        console.log(`⚠️ Could not auto-confirm user: ${user.email}`);
        // This is fine, just means we don't have admin access
      }
      
    } catch (error) {
      console.error(`❌ Error creating user ${user.email}:`, error.message);
    }
  }
}

// Create test projects
async function createTestProjects() {
  console.log('🔧 Creating test projects...');
  
  try {
    // Get standard test user
    const { data: { user } } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'TestPassword123!'
    });
    
    if (!user) {
      throw new Error('Failed to sign in as test user');
    }
    
    // Create test project
    const { error } = await supabase
      .from('projects')
      .insert([
        {
          name: 'Test Project',
          url: 'https://example.com',
          user_id: user.id,
          description: 'A test project for E2E testing'
        },
        {
          name: 'E-Commerce Test',
          url: 'https://fakeecommerce.com',
          user_id: user.id,
          description: 'An e-commerce test site for E2E testing'
        }
      ])
      .select();
    
    if (error) {
      throw error;
    }
    
    console.log('✅ Created test projects');
  } catch (error) {
    console.error('❌ Error creating test projects:', error.message);
  }
}

// Create test environment file
function createTestEnvFile() {
  console.log('🔧 Creating test environment file...');
  
  const testEnvContent = `
# Test Environment Configuration
NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${supabaseKey}
TEST_MODE=true
SKIP_AUTH_IN_TEST=true
`;
  
  try {
    fs.writeFileSync(path.join(process.cwd(), '.env.test'), testEnvContent);
    console.log('✅ Created .env.test file');
  } catch (error) {
    console.error('❌ Error creating .env.test file:', error.message);
  }
}

// Main function
async function setup() {
  console.log('🚀 Setting up E2E test environment');
  
  try {
    await createTestUsers();
    await createTestProjects();
    createTestEnvFile();
    
    console.log('✅ Setup complete!');
    console.log('\nTo run the tests:');
    console.log('1. Start the dev server:    npm run dev');
    console.log('2. Run the tests:           npm run test:e2e');
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run setup
setup(); 