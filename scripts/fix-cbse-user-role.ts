import { db } from '../src/server/db';
import { syncUserPermissions } from '../src/utils/sync-user-permissions';

async function fixCBSEUserRole() {
  console.log('🔧 Fixing CBSE In-Charge user role assignment...');
  
  try {
    const userId = '95fce2aa-cd6c-4b73-aab2-f473f451e288';
    
    // 1. Check if user exists
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true }
    });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('✅ Found user:', user.email, user.firstName, user.lastName);
    
    // 2. Find CBSE In-Charge role
    const cbseRole = await db.rbacRole.findFirst({
      where: { name: 'CBSE In-Charge', isActive: true }
    });
    
    if (!cbseRole) {
      console.log('❌ CBSE In-Charge role not found');
      return;
    }
    
    console.log('✅ Found CBSE In-Charge role:', cbseRole.id);
    
    // 3. Find associated employee record
    const employee = await db.employee.findFirst({
      where: { userId: userId }
    });
    
    if (!employee) {
      console.log('❌ Employee record not found for user');
      return;
    }
    
    console.log('✅ Found employee record:', employee.id);
    
    // 4. Check if assignment already exists
    const existingAssignment = await db.userRole.findFirst({
      where: { userId, roleId: cbseRole.id }
    });
    
    if (existingAssignment && existingAssignment.isActive) {
      console.log('✅ User already has active CBSE In-Charge role');
    } else if (existingAssignment && !existingAssignment.isActive) {
      // Reactivate existing assignment
      await db.userRole.update({
        where: { id: existingAssignment.id },
        data: { 
          isActive: true,
          employeeId: employee.id  // Ensure employeeId is set
        }
      });
      console.log('✅ Reactivated existing role assignment');
    } else {
      // Create new assignment
      await db.userRole.create({
        data: {
          userId,
          roleId: cbseRole.id,
          employeeId: employee.id,
          isActive: true
        }
      });
      console.log('✅ Created new role assignment');
    }
    
    // 5. Sync permissions to Supabase metadata
    await syncUserPermissions(userId);
    console.log('✅ Synced permissions to user metadata');
    
    // 6. Verify final state
    const finalAssignment = await db.userRole.findFirst({
      where: { userId, roleId: cbseRole.id, isActive: true },
      include: { role: true }
    });
    
    if (finalAssignment) {
      console.log('🎉 Success! User now has role:', finalAssignment.role.name);
      console.log('✅ User should now be able to see navigation items in the sidebar');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

fixCBSEUserRole().then(() => {
  console.log('✅ CBSE user role fix completed');
  process.exit(0);
}).catch(console.error); 