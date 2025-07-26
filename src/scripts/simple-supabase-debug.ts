import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

console.log('🔍 Debugging Supabase Realtime Connection...\n');

// Check if environment variables are loaded
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables!');
  console.log('📍 SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.log('🔑 SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'Missing');
  process.exit(1);
}

console.log('✅ Environment variables loaded');
console.log('📍 Supabase URL:', supabaseUrl);
console.log('🔑 Anon Key (first 20 chars):', supabaseAnonKey.substring(0, 20) + '...');

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  }
});

async function testSupabaseConnection() {
  console.log('\n🗄️ Testing database connectivity...');
  
  try {
    // Test basic connectivity
    const { data, error } = await supabase
      .from('Conversation')
      .select('id, branchId')
      .limit(1);

    if (error) {
      console.error('❌ Database query error:', error.message);
      console.error('📋 Error details:', error);
      return false;
    } else {
      console.log('✅ Database connected successfully!');
      console.log('📄 Sample conversation:', data?.[0] || 'No conversations found');
      return true;
    }
  } catch (error) {
    console.error('❌ Database connectivity failed:', error);
    return false;
  }
}

async function testRealtimeSubscription() {
  console.log('\n📡 Testing realtime subscription...');
  
  return new Promise((resolve) => {
    const testChannel = supabase
      .channel('test-realtime')
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
          testChannel.unsubscribe();
          resolve(false);
        }
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime subscription successful!');
          
          // Test inserting a message to see if realtime works
          console.log('\n🧪 Testing realtime by inserting a test ChatMessage...');
          
          setTimeout(async () => {
            try {
              // First get a conversation ID to use
              const { data: conversations } = await supabase
                .from('Conversation')
                .select('id')
                .limit(1);
              
              if (conversations && conversations.length > 0) {
                const { data: insertData, error: insertError } = await supabase
                  .from('ChatMessage')
                  .insert({
                    conversationId: conversations[0]!.id,
                    direction: 'OUTGOING',
                    content: 'Test realtime message ' + Date.now(),
                    messageType: 'TEXT',
                    status: 'SENT',
                    sentAt: new Date().toISOString(),
                  })
                  .select()
                  .single();

                if (insertError) {
                  console.error('❌ Failed to insert test message:', insertError);
                } else {
                  console.log('✅ Test message inserted:', insertData);
                }
              } else {
                console.log('⚠️ No conversations found to test with');
              }
            } catch (error) {
              console.error('❌ Test insert failed:', error);
            }
            
            // Cleanup
            setTimeout(() => {
              testChannel.unsubscribe();
              console.log('🧹 Test subscription cleaned up');
              resolve(true);
            }, 2000);
          }, 1000);
        }
      });
  });
}

async function main() {
  try {
    const dbConnected = await testSupabaseConnection();
    if (!dbConnected) {
      console.log('\n❌ Database connection failed - cannot test realtime');
      process.exit(1);
    }

    await testRealtimeSubscription();
    
    console.log('\n✅ Supabase debug complete!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Debug failed:', error);
    process.exit(1);
  }
}

main(); 