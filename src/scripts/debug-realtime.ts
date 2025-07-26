import { createClient } from '@supabase/supabase-js';
import { env } from '../env.js';

// Create Supabase client
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
);

async function debugSupabaseRealtime() {
  console.log('🔍 Debugging Supabase Realtime Connection...\n');

  // Test 1: Check Supabase client creation
  console.log('✅ Supabase client created');
  console.log('📍 Supabase URL:', env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('🔑 Anon Key (first 20 chars):', env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20) + '...');

  // Test 2: Check authentication
  console.log('\n🔐 Checking authentication...');
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Session error:', sessionError);
    } else if (session) {
      console.log('✅ User authenticated:', session.user.email);
      console.log('👤 User ID:', session.user.id);
    } else {
      console.log('⚠️ No active session found');
    }
  } catch (error) {
    console.error('❌ Authentication check failed:', error);
  }

  // Test 3: Check database connectivity
  console.log('\n🗄️ Testing database connectivity...');
  try {
    const { data, error } = await supabase
      .from('Conversation')
      .select('id, branchId')
      .limit(1);

    if (error) {
      console.error('❌ Database query error:', error);
    } else {
      console.log('✅ Database connected. Sample conversation:', data?.[0]);
    }
  } catch (error) {
    console.error('❌ Database connectivity failed:', error);
  }

  // Test 4: Test realtime subscription
  console.log('\n📡 Testing realtime subscription...');
  try {
    const testChannel = supabase
      .channel('test-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ChatMessage'
        },
        (payload) => {
          console.log('📨 Realtime event received:', payload);
        }
      )
      .subscribe((status, error) => {
        console.log('📡 Subscription status:', status);
        if (error) {
          console.error('❌ Subscription error:', error);
        }
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime subscription successful!');
          
          // Cleanup after 3 seconds
          setTimeout(() => {
            testChannel.unsubscribe();
            console.log('🧹 Test subscription cleaned up');
            process.exit(0);
          }, 3000);
        }
      });

  } catch (error) {
    console.error('❌ Realtime subscription failed:', error);
  }

  // Test 5: Check table structure
  console.log('\n🏗️ Checking table structure...');
  try {
    const { data: chatMessages, error: chatError } = await supabase
      .from('ChatMessage')
      .select('id, conversationId, direction, content')
      .limit(1);

    if (chatError) {
      console.error('❌ ChatMessage table error:', chatError);
    } else {
      console.log('✅ ChatMessage table accessible. Sample:', chatMessages?.[0]);
    }

    const { data: conversations, error: convError } = await supabase
      .from('Conversation')
      .select('id, branchId, whatsappPhoneNumber')
      .limit(1);

    if (convError) {
      console.error('❌ Conversation table error:', convError);
    } else {
      console.log('✅ Conversation table accessible. Sample:', conversations?.[0]);
    }
  } catch (error) {
    console.error('❌ Table structure check failed:', error);
  }
}

// Run the debug function
debugSupabaseRealtime().catch(console.error);

export { debugSupabaseRealtime }; 