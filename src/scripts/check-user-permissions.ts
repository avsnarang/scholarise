import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create clients
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔍 Checking User Permissions and Teacher/Employee Links...\n');

async function checkUserPermissions() {
  // Check current auth session
  console.log('1️⃣ Checking current authentication...');
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError) {
    console.error('❌ Session error:', sessionError);
    return;
  }
  
  if (!session) {
    console.log('⚠️ No active session found');
    console.log('💡 Please sign in to the app first, then run this script');
    return;
  }
  
  console.log('✅ User authenticated:');
  console.log('  📧 Email:', session.user.email);
  console.log('  🆔 User ID:', session.user.id);
  console.log('  📝 Metadata:', JSON.stringify(session.user.user_metadata, null, 2));
  
  const userId = session.user.id;
  
  // Check Teacher table
  console.log('\n2️⃣ Checking Teacher associations...');
  const { data: teachers, error: teacherError } = await supabaseAdmin
    .from('Teacher')
    .select('id, userId, branchId, firstName, lastName, employeeCode')
    .eq('userId', userId);
  
  if (teacherError) {
    console.error('❌ Teacher query error:', teacherError);
  } else if (teachers && teachers.length > 0) {
    console.log('✅ Found Teacher records:');
    teachers.forEach(teacher => {
      console.log(`  👨‍🏫 ${teacher.firstName} ${teacher.lastName} (${teacher.employeeCode})`);
      console.log(`      Branch ID: ${teacher.branchId}`);
      console.log(`      Teacher ID: ${teacher.id}`);
    });
  } else {
    console.log('⚠️ No Teacher records found for this user');
  }
  
  // Check Employee table  
  console.log('\n3️⃣ Checking Employee associations...');
  const { data: employees, error: employeeError } = await supabaseAdmin
    .from('Employee')
    .select('id, userId, branchId, firstName, lastName, employeeCode')
    .eq('userId', userId);
  
  if (employeeError) {
    console.error('❌ Employee query error:', employeeError);
  } else if (employees && employees.length > 0) {
    console.log('✅ Found Employee records:');
    employees.forEach(employee => {
      console.log(`  👥 ${employee.firstName} ${employee.lastName} (${employee.employeeCode})`);
      console.log(`      Branch ID: ${employee.branchId}`);
      console.log(`      Employee ID: ${employee.id}`);
    });
  } else {
    console.log('⚠️ No Employee records found for this user');
  }
  
  // Check what branches this user should have access to
  const allBranches = [...(teachers || []), ...(employees || [])];
  const accessibleBranches = [...new Set(allBranches.map(record => record.branchId))];
  
  console.log('\n4️⃣ Branch access summary:');
  if (accessibleBranches.length > 0) {
    console.log('✅ User has access to branches:', accessibleBranches);
    
    // Test conversation access for each branch
    console.log('\n5️⃣ Testing conversation access for each branch...');
    for (const branchId of accessibleBranches) {
      console.log(`\n🧪 Testing branch: ${branchId}`);
      
      // Use the authenticated client (not admin) to test RLS
      const { data: conversations, error: convError } = await supabase
        .from('Conversation')
        .select('id, branchId, participantName')
        .eq('branchId', branchId)
        .limit(3);
      
      if (convError) {
        console.error(`  ❌ Access denied: ${convError.message}`);
        console.error(`  📋 Error details:`, convError);
      } else {
        console.log(`  ✅ Access granted! Found ${conversations?.length || 0} conversations`);
        if (conversations && conversations.length > 0) {
          conversations.forEach(conv => {
            console.log(`    💬 ${conv.participantName || 'Unknown'} (${conv.id})`);
          });
        }
      }
    }
  } else {
    console.log('❌ User has no branch access (not linked to Teacher or Employee records)');
    
    console.log('\n💡 To fix this, you need to:');
    console.log('1. Create a Teacher or Employee record');
    console.log('2. Set the userId field to:', userId);
    console.log('3. Set the branchId to the branch you want access to');
    
    // Show available branches
    console.log('\n📍 Available branches:');
    const { data: branches, error: branchError } = await supabaseAdmin
      .from('Branch')
      .select('id, name, address')
      .limit(10);
    
    if (branchError) {
      console.error('❌ Could not fetch branches:', branchError);
    } else if (branches) {
      branches.forEach(branch => {
        console.log(`  🏢 ${branch.name} (ID: ${branch.id})`);
        console.log(`      Address: ${branch.address}`);
      });
    }
  }
  
  console.log('\n✅ User permission check complete!');
}

checkUserPermissions().catch(console.error); 