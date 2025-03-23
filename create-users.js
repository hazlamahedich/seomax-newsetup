// create-users.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('   Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local');
  process.exit(1);
}

// Initialize Supabase client (anon key for regular operations)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Initialize admin client if service role key is available
const adminClient = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// Test users to create
const USERS = [
  {
    email: 'admin@seomax.com',
    password: 'AdminPassword123!',
    name: 'Admin User',
    role: 'admin'
  },
  {
    email: 'testuser@gmail.com',
    password: 'TestPassword123!',
    name: 'Test User',
    role: 'user'
  }
];

// Create test users
async function createUsers() {
  console.log('🔧 Creating users...');
  
  for (const user of USERS) {
    try {
      // Check if user already exists by trying to sign in
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: user.password
      });
      
      if (!signInError) {
        console.log(`User ${user.email} already exists and can sign in.`);
        continue;
      }
      
      // Create user if they don't exist
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
        if (error.message.includes('already registered')) {
          console.log(`User ${user.email} already exists, but needs confirmation.`);
          
          // Try to auto-confirm with admin client if available
          if (adminClient) {
            const userId = await getUserIdByEmail(user.email);
            if (userId) {
              await autoConfirmUser(userId);
            }
          } else {
            console.log(`⚠️ Cannot auto-confirm without service role key. Check email at ${user.email}`);
          }
          
          continue;
        }
        throw error;
      }
      
      console.log(`✅ Created user: ${user.email}`);
      console.log(`   User ID: ${data.user.id}`);
      
      // Auto-confirm user if admin client is available
      if (adminClient && data.user.id) {
        await autoConfirmUser(data.user.id);
      } else {
        console.log(`⚠️ IMPORTANT: Check your email at ${user.email} to confirm your account`);
        console.log(`   If you don't confirm, you won't be able to log in`);
      }
      
    } catch (error) {
      console.error(`❌ Error creating user ${user.email}:`, error.message);
    }
  }
}

// Get user ID by email using admin client
async function getUserIdByEmail(email) {
  if (!adminClient) return null;
  
  try {
    // Use admin functions to get user by email
    const { data, error } = await adminClient.auth.admin.listUsers();
    
    if (error) {
      console.error(`Error listing users: ${error.message}`);
      return null;
    }
    
    const user = data.users.find(u => u.email === email);
    return user ? user.id : null;
  } catch (error) {
    console.error(`Error finding user by email: ${error.message}`);
    return null;
  }
}

// Auto-confirm a user's email
async function autoConfirmUser(userId) {
  if (!adminClient) return;
  
  try {
    const { error } = await adminClient.auth.admin.updateUserById(userId, {
      email_confirm: true
    });
    
    if (error) {
      console.error(`Error confirming user: ${error.message}`);
    } else {
      console.log(`✅ Auto-confirmed user with ID: ${userId}`);
    }
  } catch (error) {
    console.error(`Error auto-confirming user: ${error.message}`);
  }
}

// Main function
async function main() {
  console.log('🚀 Setting up test users');
  
  try {
    await createUsers();
    console.log('\n✅ Setup complete!');
    console.log('\nCredentials Summary:');
    USERS.forEach(user => {
      console.log(`- ${user.name} (${user.role})`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Password: ${user.password}`);
    });
    
    if (!adminClient) {
      console.log('\n⚠️ NOTE: Users may need email confirmation. To auto-confirm, add SUPABASE_SERVICE_ROLE_KEY to .env.local');
    }
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run the script
main(); 