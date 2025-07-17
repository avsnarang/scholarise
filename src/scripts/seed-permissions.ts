import { db } from '@/server/db';

// Define all default permissions with categories
const defaultPermissions = [
  // Dashboard
  { name: 'view_dashboard', description: 'View dashboard and analytics', category: 'dashboard' },
  
  // Students
  { name: 'view_students', description: 'View student information', category: 'students' },
  { name: 'create_student', description: 'Create new student records', category: 'students' },
  { name: 'edit_student', description: 'Edit existing student records', category: 'students' },
  { name: 'delete_student', description: 'Delete student records', category: 'students' },
  { name: 'manage_admissions', description: 'Manage student admissions', category: 'students' },
  { name: 'manage_transfer_certificates', description: 'Manage transfer certificates', category: 'students' },
  
  // Teachers
  { name: 'view_teachers', description: 'View teacher information', category: 'teachers' },
  { name: 'create_teacher', description: 'Create new teacher records', category: 'teachers' },
  { name: 'edit_teacher', description: 'Edit existing teacher records', category: 'teachers' },
  { name: 'delete_teacher', description: 'Delete teacher records', category: 'teachers' },
  
  // Employees
  { name: 'view_employees', description: 'View employee information', category: 'employees' },
  { name: 'create_employee', description: 'Create new employee records', category: 'employees' },
  { name: 'edit_employee', description: 'Edit existing employee records', category: 'employees' },
  { name: 'delete_employee', description: 'Delete employee records', category: 'employees' },
  
  // Departments
  { name: 'view_departments', description: 'View department information', category: 'departments' },
  { name: 'create_department', description: 'Create new departments', category: 'departments' },
  { name: 'edit_department', description: 'Edit existing departments', category: 'departments' },
  { name: 'delete_department', description: 'Delete departments', category: 'departments' },
  
  // Designations
  { name: 'view_designations', description: 'View designation information', category: 'designations' },
  { name: 'create_designation', description: 'Create new designations', category: 'designations' },
  { name: 'edit_designation', description: 'Edit existing designations', category: 'designations' },
  { name: 'delete_designation', description: 'Delete designations', category: 'designations' },
  
  // Classes
  { name: 'view_classes', description: 'View class information', category: 'classes' },
  { name: 'create_class', description: 'Create new classes', category: 'classes' },
  { name: 'edit_class', description: 'Edit existing classes', category: 'classes' },
  { name: 'delete_class', description: 'Delete classes', category: 'classes' },
  { name: 'manage_class_students', description: 'Manage students in classes', category: 'classes' },
  
  // Attendance
  { name: 'view_attendance', description: 'View attendance records', category: 'attendance' },
  { name: 'mark_attendance', description: 'Mark attendance for students', category: 'attendance' },
  { name: 'mark_attendance_any_date', description: 'Mark attendance for any date', category: 'attendance' },
  { name: 'mark_self_attendance', description: 'Mark own attendance', category: 'attendance' },
  { name: 'mark_all_staff_attendance', description: 'Mark attendance for all staff', category: 'attendance' },
  { name: 'view_attendance_reports', description: 'View attendance reports', category: 'attendance' },
  
  // Leave Management
  { name: 'view_leaves', description: 'View leave applications', category: 'leave' },
  { name: 'manage_leave_applications', description: 'Manage leave applications', category: 'leave' },
  { name: 'manage_leave_policies', description: 'Manage leave policies', category: 'leave' },
  
  // Salary
  { name: 'view_salary', description: 'View salary information', category: 'salary' },
  { name: 'manage_salary_structures', description: 'Manage salary structures', category: 'salary' },
  { name: 'manage_teacher_salaries', description: 'Manage teacher salaries', category: 'salary' },
  { name: 'manage_employee_salaries', description: 'Manage employee salaries', category: 'salary' },
  { name: 'manage_salary_increments', description: 'Manage salary increments', category: 'salary' },
  { name: 'process_salary_payments', description: 'Process salary payments', category: 'salary' },
  
  // Transport
  { name: 'view_transport', description: 'View transport information', category: 'transport' },
  { name: 'manage_transport_routes', description: 'Manage transport routes', category: 'transport' },
  { name: 'manage_transport_stops', description: 'Manage transport stops', category: 'transport' },
  { name: 'manage_transport_assignments', description: 'Manage transport assignments', category: 'transport' },
  
  // Finance
  { name: 'view_finance_module', description: 'View finance module', category: 'finance' },
  { name: 'manage_fee_heads', description: 'Manage fee heads', category: 'finance' },
  { name: 'manage_fee_terms', description: 'Manage fee terms', category: 'finance' },
  { name: 'manage_classwise_fees', description: 'Manage classwise fees', category: 'finance' },
  { name: 'collect_fees', description: 'Collect fees', category: 'finance' },
  { name: 'view_finance_reports', description: 'View finance reports', category: 'finance' },
  { name: 'manage_fees', description: 'Manage fee structures', category: 'finance' },
  
  // Money Collection
  { name: 'view_money_collection', description: 'View money collection records', category: 'money_collection' },
  { name: 'create_money_collection', description: 'Create money collection records', category: 'money_collection' },
  { name: 'edit_money_collection', description: 'Edit money collection records', category: 'money_collection' },
  { name: 'delete_money_collection', description: 'Delete money collection records', category: 'money_collection' },
  
  // Question Papers
  { name: 'view_question_papers', description: 'View question papers', category: 'examinations' },
  { name: 'create_question_paper', description: 'Create question papers', category: 'examinations' },
  { name: 'manage_question_papers', description: 'Manage question papers', category: 'examinations' },
  
  // Examinations
  { name: 'view_examinations', description: 'View examination information', category: 'examinations' },
  { name: 'manage_exam_types', description: 'Manage exam types', category: 'examinations' },
  { name: 'manage_exam_configurations', description: 'Manage exam configurations', category: 'examinations' },
  { name: 'manage_exam_schedules', description: 'Manage exam schedules', category: 'examinations' },
  { name: 'manage_seating_plans', description: 'Manage seating plans', category: 'examinations' },
  { name: 'enter_marks', description: 'Enter examination marks', category: 'examinations' },
  { name: 'manage_assessments', description: 'Manage assessments', category: 'examinations' },
  { name: 'manage_grade_scales', description: 'Manage grade scales', category: 'examinations' },
  { name: 'view_exam_reports', description: 'View examination reports', category: 'examinations' },
  
  // Reports
  { name: 'view_reports', description: 'View system reports', category: 'reports' },
  
  // System Settings
  { name: 'view_settings', description: 'View system settings', category: 'settings' },
  { name: 'manage_branches', description: 'Manage branches', category: 'settings' },
  { name: 'manage_academic_sessions', description: 'Manage academic sessions', category: 'settings' },
  { name: 'manage_subjects', description: 'Manage subjects', category: 'settings' },
  { name: 'manage_attendance_config', description: 'Manage attendance configuration', category: 'settings' },
  { name: 'manage_roles', description: 'Manage user roles and permissions', category: 'settings' },
  
  // Courtesy Calls
  { name: 'view_courtesy_calls', description: 'View courtesy calls', category: 'courtesy_calls' },
  { name: 'create_courtesy_call_feedback', description: 'Create courtesy call feedback', category: 'courtesy_calls' },
  { name: 'edit_courtesy_call_feedback', description: 'Edit courtesy call feedback', category: 'courtesy_calls' },
  { name: 'view_own_courtesy_call_feedback', description: 'View own courtesy call feedback', category: 'courtesy_calls' },
  { name: 'view_all_courtesy_call_feedback', description: 'View all courtesy call feedback', category: 'courtesy_calls' },
  { name: 'delete_courtesy_call_feedback', description: 'Delete courtesy call feedback', category: 'courtesy_calls' },
  
  // Super Admin
  { name: 'super_admin', description: 'Super administrator with all permissions', category: 'admin' },
];

// Define default roles with their permissions
const defaultRoles = [
  {
    name: 'Super Admin',
    description: 'Super administrator with all permissions',
    isSystem: true,
    permissions: ['super_admin']
  },
  {
    name: 'Admin',
    description: 'Administrator with most permissions',
    isSystem: true,
    permissions: [
      'view_dashboard',
      'view_students', 'create_student', 'edit_student',
      'view_teachers', 'create_teacher', 'edit_teacher',
      'view_employees', 'create_employee', 'edit_employee',
      'view_departments', 'create_department', 'edit_department',
      'view_designations', 'create_designation', 'edit_designation',
      'view_classes', 'create_class', 'edit_class', 'manage_class_students',
      'view_money_collection', 'create_money_collection', 'edit_money_collection',
      'manage_admissions',
      'view_attendance', 'mark_attendance', 'view_attendance_reports',
      'view_reports',
      'view_finance_module', 'manage_fee_heads', 'manage_fee_terms', 'manage_classwise_fees', 'collect_fees',
      'view_examinations', 'manage_exam_types', 'manage_exam_configurations',
      'view_settings', 'manage_academic_sessions', 'manage_subjects'
    ]
  },
  {
    name: 'Principal',
    description: 'Principal with oversight permissions',
    isSystem: true,
    permissions: [
      'view_dashboard',
      'view_students', 'edit_student',
      'view_teachers', 'edit_teacher',
      'view_employees', 'edit_employee',
      'view_departments', 'view_designations',
      'view_classes',
      'view_money_collection',
      'view_attendance', 'view_attendance_reports',
      'view_reports',
      'view_finance_module', 'view_finance_reports',
      'view_examinations', 'view_exam_reports'
    ]
  },
  {
    name: 'Teacher',
    description: 'Teacher with classroom management permissions',
    isSystem: true,
    permissions: [
      'view_dashboard',
      'view_students',
      'view_classes',
      'view_attendance', 'mark_attendance',
      'view_question_papers', 'create_question_paper',
      'enter_marks'
    ]
  },
  {
    name: 'Accountant',
    description: 'Accountant with finance management permissions',
    isSystem: true,
    permissions: [
      'view_dashboard',
      'view_students',
      'view_finance_module', 'manage_fee_heads', 'manage_fee_terms', 'manage_classwise_fees', 'collect_fees', 'view_finance_reports',
      'view_money_collection', 'create_money_collection', 'edit_money_collection',
      'view_reports'
    ]
  },
  {
    name: 'Librarian',
    description: 'Librarian with limited permissions',
    isSystem: true,
    permissions: [
      'view_dashboard',
      'view_students'
    ]
  },
  {
    name: 'Student',
    description: 'Student with basic view permissions',
    isSystem: true,
    permissions: [
      'view_dashboard'
    ]
  },
  {
    name: 'Employee',
    description: 'General employee with basic permissions',
    isSystem: true,
    permissions: [
      'view_dashboard',
      'mark_self_attendance'
    ]
  }
];

export async function seedPermissions() {
  console.log('🌱 Seeding permissions...');

  try {
    // Create permissions
    const createdPermissions = [];
    for (const permission of defaultPermissions) {
      const existingPermission = await db.permission.findUnique({
        where: { name: permission.name }
      });

      if (!existingPermission) {
        const created = await db.permission.create({
          data: {
            ...permission,
            isSystem: true
          }
        });
        createdPermissions.push(created);
        console.log(`✅ Created permission: ${permission.name}`);
      } else {
        console.log(`⏭️  Permission already exists: ${permission.name}`);
      }
    }

    console.log(`🎉 Created ${createdPermissions.length} permissions`);
    return createdPermissions;
  } catch (error) {
    console.error('❌ Error seeding permissions:', error);
    throw error;
  }
}

export async function seedRoles() {
  console.log('🌱 Seeding roles...');

  try {
    const createdRoles = [];
    
    for (const roleData of defaultRoles) {
      const existingRole = await db.rbacRole.findUnique({
        where: { name: roleData.name }
      });

      if (!existingRole) {
        // Create the role
        const role = await db.rbacRole.create({
          data: {
            name: roleData.name,
            description: roleData.description,
            isSystem: roleData.isSystem,
            permissions: roleData.permissions, // Legacy permissions array
          }
        });

        // Find permission IDs and create role-permission associations
        const permissions = await db.permission.findMany({
          where: {
            name: { in: roleData.permissions }
          }
        });

        if (permissions.length > 0) {
          await db.rolePermission.createMany({
            data: permissions.map(permission => ({
              roleId: role.id,
              permissionId: permission.id
            }))
          });
        }

        createdRoles.push(role);
        console.log(`✅ Created role: ${roleData.name} with ${permissions.length} permissions`);
      } else {
        console.log(`⏭️  Role already exists: ${roleData.name}`);
      }
    }

    console.log(`🎉 Created ${createdRoles.length} roles`);
    return createdRoles;
  } catch (error) {
    console.error('❌ Error seeding roles:', error);
    throw error;
  }
}

export async function seedPermissionsAndRoles() {
  console.log('🌱 Starting permissions and roles seed...');
  
  try {
    await seedPermissions();
    await seedRoles();
    console.log('🎉 Permissions and roles seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error in permissions and roles seeding:', error);
    throw error;
  }
}

// Run the seed if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedPermissionsAndRoles()
    .then(() => {
      console.log('✅ Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
} 