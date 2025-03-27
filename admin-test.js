// This is a simple test script to verify admin access to Supabase
// Run with: node admin-test.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function testAdminAccess() {
  console.log('Testing admin access to Supabase...');
  
  // Create admin client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  
  if (!serviceRoleKey) {
    console.error('ERROR: Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
    process.exit(1);
  }
  
  console.log(`Using URL: ${supabaseUrl}`);
  console.log(`Service key available: ${serviceRoleKey ? 'YES' : 'NO'}`);
  
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });
  
  try {
    // Test content_pages table access
    console.log('Querying content_pages table...');
    const { data, error } = await adminClient
      .from('content_pages')
      .select('count(*)')
      .limit(1)
      .single();
    
    if (error) {
      console.error('Error querying content_pages:', error.message);
      process.exit(1);
    }
    
    console.log('Success! content_pages table is accessible.');
    console.log('Results:', data);
    
    // Test competitors table
    console.log('\nQuerying competitors table...');
    const { data: compData, error: compError } = await adminClient
      .from('competitors')
      .select('count(*)')
      .limit(1)
      .single();
    
    if (compError) {
      console.error('Error querying competitors:', compError.message);
    } else {
      console.log('Success! competitors table is accessible.');
      console.log('Results:', compData);
    }
    
  } catch (error) {
    console.error('Unexpected error:', error.message);
    process.exit(1);
  }
}

// Run the test
testAdminAccess().catch(console.error); 