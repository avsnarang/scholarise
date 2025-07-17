import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase Connection and Configuration...\n');

  // Check if required environment variables are present
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.log('❌ Missing required environment variables:');
    if (!supabaseUrl) console.log('  - NEXT_PUBLIC_SUPABASE_URL');
    if (!supabaseServiceKey) console.log('  - SUPABASE_SERVICE_ROLE_KEY');
    console.log('\nMake sure these are set in your .env file');
    return;
  }

  console.log('✅ Environment variables found');
  console.log(`📍 Supabase URL: ${supabaseUrl}`);

  try {
    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Test 1: Check if we can connect to Supabase
    console.log('\n1️⃣ Testing basic connection...');
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1
    });

    if (listError) {
      console.log(`❌ Connection failed: ${listError.message}`);
      console.log('🔧 Check your SUPABASE_SERVICE_ROLE_KEY is correct');
      return;
    }

    console.log(`✅ Connected successfully! Found ${users.length} existing users`);

    // Test 2: Try to create a test user
    console.log('\n2️⃣ Testing user creation...');
    const testEmail = 'test@ps.tsh.edu.in';
    
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: 'TempPass123!',
      email_confirm: true,
      user_metadata: {
        firstName: 'Test',
        lastName: 'User',
        role: 'Student',
      },
    });

    if (createError) {
      console.log(`❌ User creation failed: ${createError.message}`);
      
      // Provide specific guidance based on error
      if (createError.message.includes('User not allowed')) {
        console.log('\n🔧 CONFIGURATION ISSUE DETECTED:');
        console.log('The "User not allowed" error means your Supabase is blocking user creation.');
        console.log('');
        console.log('📋 Go to your Supabase Dashboard > Authentication > Settings:');
        console.log('');
        console.log('1. ✅ "Enable email signups" - Must be ON');
        console.log('2. ✅ "Enable email confirmations" - Should be OFF for migration');
        console.log('3. ✅ "Email domains allowlist" - Either:');
        console.log('   - Leave completely empty (allow all domains)');
        console.log('   - OR add: ps.tsh.edu.in, jun.tsh.edu.in, majra.tsh.edu.in, tsh.edu.in');
        console.log('4. ✅ Check "Auth Providers" - Email should be enabled');
        console.log('5. ✅ Remove any Row Level Security policies blocking user creation');
        console.log('');
        console.log('🚨 IMPORTANT: For the migration, temporarily set:');
        console.log('   - Enable signups: ON');
        console.log('   - Email confirmations: OFF');
        console.log('   - Domain allowlist: Empty (allow all)');
        console.log('');
        console.log('After migration, you can re-enable these security settings.');
      } else if (createError.message.includes('Email rate limit exceeded')) {
        console.log('⚠️  Email rate limit exceeded. Wait a few minutes and try again.');
      } else if (createError.message.includes('Invalid email')) {
        console.log('⚠️  Email format issue. Check your domain configuration.');
      } else {
        console.log(`🔧 Unexpected error: ${createError.message}`);
      }
      return;
    }

    console.log(`✅ User creation successful! Created user: ${createData.user?.id}`);

    // Test 3: Clean up test user
    console.log('\n3️⃣ Cleaning up test user...');
    if (createData.user?.id) {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(createData.user.id);
      if (deleteError) {
        console.log(`⚠️  Could not delete test user: ${deleteError.message}`);
        console.log('You can manually delete this test user from Supabase dashboard');
      } else {
        console.log('✅ Test user cleaned up successfully');
      }
    }

    console.log('\n🎉 Supabase is configured correctly for migration!');
    console.log('✅ You can now run: npm run migrate:clerk-to-supabase');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    console.log('\n🔧 This might be a network issue or invalid credentials.');
    console.log('Check your Supabase project URL and service role key.');
  }
}

// Run the test
testSupabaseConnection().catch(console.error); 