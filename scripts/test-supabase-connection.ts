import { createServerSupabaseClient } from '@/lib/supabase/server';

async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase Connection and Configuration...\n');

  try {
    const supabase = createServerSupabaseClient();

    // Test 1: Check if we can connect to Supabase
    console.log('1️⃣ Testing basic connection...');
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1
    });

    if (listError) {
      console.log(`❌ Connection failed: ${listError.message}`);
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
        console.log('The "User not allowed" error typically means:');
        console.log('');
        console.log('📋 Go to your Supabase Dashboard:');
        console.log('1. Navigate to Authentication > Settings');
        console.log('2. Check "Enable email signups" - Should be ON');
        console.log('3. Check "Enable email confirmations" - Should be OFF for migration');
        console.log('4. Check "Email domains allowlist":');
        console.log('   - Either leave empty (allow all)');
        console.log('   - Or add: ps.tsh.edu.in, jun.tsh.edu.in, majra.tsh.edu.in, tsh.edu.in');
        console.log('5. Check if there are any auth policies blocking creation');
        console.log('');
        console.log('💡 For migration, temporarily set:');
        console.log('   - Enable signups: ON');
        console.log('   - Email confirmations: OFF');
        console.log('   - Domain allowlist: Empty or include your domains');
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
      } else {
        console.log('✅ Test user cleaned up successfully');
      }
    }

    console.log('\n🎉 Supabase is configured correctly for migration!');
    console.log('You can now run: npm run migrate:clerk-to-supabase');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    console.log('\n🔧 Check your environment variables:');
    console.log('- NEXT_PUBLIC_SUPABASE_URL');
    console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY');
    console.log('- SUPABASE_SERVICE_ROLE_KEY');
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testSupabaseConnection().catch(console.error);
}

export { testSupabaseConnection }; 