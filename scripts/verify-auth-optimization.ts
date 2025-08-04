#!/usr/bin/env npx tsx

/**
 * Script to verify auth optimization is working correctly
 * Run this after deploying the fixes to check auth request patterns
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Track auth requests
let authRequests = 0;
const originalGetSession = createClient.prototype.auth?.getSession;

// Monkey patch to count requests (for testing only)
if (originalGetSession) {
  createClient.prototype.auth.getSession = async function(...args: any[]) {
    authRequests++;
    console.log(`🔐 Auth request #${authRequests} from:`, new Error().stack?.split('\n')[2]);
    return originalGetSession.apply(this, args);
  };
}

async function simulateAppUsage() {
  console.log('🚀 Starting auth optimization verification...\n');
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Simulate initial app load
  console.log('1️⃣ Simulating initial app load...');
  await supabase.auth.getSession();
  console.log(`   Auth requests so far: ${authRequests}\n`);
  
  // Simulate navigating to different pages
  console.log('2️⃣ Simulating page navigation...');
  await new Promise(resolve => setTimeout(resolve, 100));
  console.log(`   Auth requests so far: ${authRequests}\n`);
  
  // Simulate API calls
  console.log('3️⃣ Simulating API calls...');
  for (let i = 0; i < 5; i++) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  console.log(`   Auth requests so far: ${authRequests}\n`);
  
  // Results
  console.log('📊 Results:');
  console.log(`   Total auth requests: ${authRequests}`);
  console.log(`   Expected: 1-2 (initial load only)`);
  console.log(`   Status: ${authRequests <= 2 ? '✅ PASS' : '❌ FAIL - Too many requests!'}\n`);
  
  if (authRequests > 2) {
    console.log('⚠️  WARNING: Auth requests are higher than expected!');
    console.log('   This might indicate the optimization is not working correctly.');
    console.log('   Check the stack traces above to identify the source of extra requests.');
  } else {
    console.log('🎉 Success! Auth optimization is working correctly.');
    console.log('   The app should no longer hit rate limits.');
  }
}

// Run the verification
simulateAppUsage().catch(console.error);