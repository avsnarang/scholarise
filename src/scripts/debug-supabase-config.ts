import { createClient } from '@supabase/supabase-js';
import { env } from '@/env';

/**
 * Debug script to check Supabase configuration
 * Run with: npx tsx src/scripts/debug-supabase-config.ts
 */
async function debugSupabaseConfig() {
  console.log('🔍 Debugging Supabase Configuration...\n');

  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log(`- NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`- NEXT_PUBLIC_SUPABASE_URL: ${env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
  console.log(`- SUPABASE_SERVICE_ROLE_KEY: ${env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing'}`);
  
  if (env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log(`- Service Key Preview: ${env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)}...`);
    
    // Check if it looks like a JWT
    const isJWT = env.SUPABASE_SERVICE_ROLE_KEY.startsWith('eyJ');
    console.log(`- Is JWT format: ${isJWT ? '✅ Yes' : '❌ No (should start with eyJ)'}`);
    
    if (isJWT) {
      try {
        // Decode JWT payload (without verification, just for debugging)
        const payload = JSON.parse(atob(env.SUPABASE_SERVICE_ROLE_KEY.split('.')[1] || ''));
        console.log(`- JWT Role: ${payload.role || 'unknown'}`);
        console.log(`- JWT ISS: ${payload.iss || 'unknown'}`);
      } catch (e) {
        console.log('- JWT Decode: ❌ Failed to decode');
      }
    }
  }

  console.log('\n🔌 Testing Supabase Connection:');
  
  try {
    // Create admin client
    const supabase = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Test basic connection
    const { data, error } = await supabase.from('rbac_permission').select('id').limit(1);
    
    if (error) {
      console.log('❌ Database connection failed:', error.message);
    } else {
      console.log('✅ Database connection successful');
    }

    // Test admin auth capabilities
    console.log('\n🔐 Testing Admin Auth Capabilities:');
    try {
      // This should work with service role key
      const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1
      });

      if (authError) {
        console.log('❌ Admin auth failed:', authError.message);
        console.log('   This usually means the service role key is incorrect or missing');
      } else {
        console.log('✅ Admin auth capabilities working');
        console.log(`   Found ${authData.users.length} user(s) in first page`);
      }
    } catch (adminError) {
      console.log('❌ Admin auth test failed:', adminError);
    }

  } catch (connectionError) {
    console.log('❌ Failed to create Supabase client:', connectionError);
  }

  console.log('\n📝 Recommendations:');
  console.log('1. Verify SUPABASE_SERVICE_ROLE_KEY is the "service_role" key from your Supabase dashboard');
  console.log('2. Check that the key starts with "eyJ" and is much longer than the anon key');
  console.log('3. Ensure the key has admin privileges to create users');
  console.log('4. Restart your production server after updating environment variables');
}

// Run the debug function
debugSupabaseConfig().catch(console.error); 