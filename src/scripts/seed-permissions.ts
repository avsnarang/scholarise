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
  { name: 'manage_transfer_certificates', description: 'Manage transfer certificates', category: 'students' },
  { name: 'manage_roll_numbers', description: 'Assign and manage student roll numbers', category: 'students' },
  { name: 'view_own_students', description: 'View students in assigned classes/subjects only', category: 'students' },
  { name: 'import_students', description: 'Import student data from external sources', category: 'students' },
  { name: 'export_students', description: 'Export student data to external formats', category: 'students' },
  
  // Admissions
  { name: 'manage_admissions', description: 'Manage student admissions and inquiries', category: 'admissions' },
  { name: 'view_admission_inquiries', description: 'View admission inquiries and applications', category: 'admissions' },
  { name: 'create_admission_inquiry', description: 'Create new admission inquiries', category: 'admissions' },
  { name: 'edit_admission_inquiry', description: 'Edit admission inquiry details', category: 'admissions' },
  { name: 'manage_admission_workflow', description: 'Manage admission workflow and status changes', category: 'admissions' },
  { name: 'access_admission_reports', description: 'Access admission reports and analytics', category: 'admissions' },
  { name: 'manage_admission_settings', description: 'Manage admission settings and configuration', category: 'admissions' },
  
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
  
  // Subjects
  { name: 'view_subjects', description: 'View subjects and subject information', category: 'subjects' },
  { name: 'manage_subjects', description: 'Create, edit, and manage subjects', category: 'subjects' },
  { name: 'manage_subject_assignments', description: 'Assign teachers to subjects', category: 'subjects' },
  { name: 'manage_class_subjects', description: 'Assign subjects to classes', category: 'subjects' },
  { name: 'manage_student_subjects', description: 'Assign optional subjects to students', category: 'subjects' },
  
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
  { name: 'create_transport_route', description: 'Create new transport routes', category: 'transport' },
  { name: 'edit_transport_route', description: 'Edit existing transport routes', category: 'transport' },
  { name: 'delete_transport_route', description: 'Delete transport routes', category: 'transport' },
  { name: 'view_transport_routes', description: 'View transport routes information', category: 'transport' },
  { name: 'create_transport_stop', description: 'Create new transport stops', category: 'transport' },
  { name: 'edit_transport_stop', description: 'Edit existing transport stops', category: 'transport' },
  { name: 'delete_transport_stop', description: 'Delete transport stops', category: 'transport' },
  { name: 'view_transport_stops', description: 'View transport stops information', category: 'transport' },
  { name: 'manage_transport_vehicles', description: 'Manage transport vehicles', category: 'transport' },
  { name: 'create_transport_vehicle', description: 'Add new transport vehicles', category: 'transport' },
  { name: 'edit_transport_vehicle', description: 'Edit transport vehicle details', category: 'transport' },
  { name: 'delete_transport_vehicle', description: 'Remove transport vehicles', category: 'transport' },
  { name: 'view_transport_vehicles', description: 'View transport vehicle information', category: 'transport' },
  { name: 'manage_transport_drivers', description: 'Manage transport drivers', category: 'transport' },
  { name: 'create_transport_driver', description: 'Add new transport drivers', category: 'transport' },
  { name: 'edit_transport_driver', description: 'Edit transport driver details', category: 'transport' },
  { name: 'delete_transport_driver', description: 'Remove transport drivers', category: 'transport' },
  { name: 'view_transport_drivers', description: 'View transport driver information', category: 'transport' },
  { name: 'manage_transport_fees', description: 'Manage transport fee structures', category: 'transport' },
  { name: 'view_transport_fees', description: 'View transport fee information', category: 'transport' },
  { name: 'collect_transport_fees', description: 'Collect transport fees from students', category: 'transport' },
  { name: 'manage_transport_schedules', description: 'Manage transport schedules and timings', category: 'transport' },
  { name: 'view_transport_schedules', description: 'View transport schedules', category: 'transport' },
  { name: 'track_transport_vehicles', description: 'Track vehicle locations in real-time', category: 'transport' },
  { name: 'view_transport_tracking', description: 'View vehicle tracking information', category: 'transport' },
  { name: 'manage_transport_maintenance', description: 'Manage vehicle maintenance schedules', category: 'transport' },
  { name: 'view_transport_maintenance', description: 'View vehicle maintenance records', category: 'transport' },
  { name: 'generate_transport_reports', description: 'Generate transport-related reports', category: 'transport' },
  { name: 'view_transport_reports', description: 'View transport reports and analytics', category: 'transport' },
  { name: 'manage_transport_attendance', description: 'Manage student transport attendance', category: 'transport' },
  { name: 'view_transport_attendance', description: 'View transport attendance records', category: 'transport' },
  { name: 'send_transport_alerts', description: 'Send transport-related alerts to parents', category: 'transport' },
  { name: 'manage_transport_settings', description: 'Manage transport module settings', category: 'transport' },
  
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
  
  // Communication
  { name: 'view_communication', description: 'View communication dashboard and features', category: 'communication' },
  { name: 'create_communication_message', description: 'Create and send WhatsApp messages', category: 'communication' },
  { name: 'manage_whatsapp_templates', description: 'Manage WhatsApp message templates', category: 'communication' },
  { name: 'view_communication_logs', description: 'View message history and chat logs', category: 'communication' },
  { name: 'manage_communication_settings', description: 'Manage communication settings and configuration', category: 'communication' },
  
  // Chat
  { name: 'view_chat', description: 'View WhatsApp chat interface', category: 'communication' },
  { name: 'manage_chat_settings', description: 'Manage chat configuration and settings', category: 'communication' },
  
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
  
  // Location-based Attendance
  { name: 'manage_attendance_locations', description: 'Manage attendance marking locations', category: 'attendance' },
  { name: 'view_attendance_locations', description: 'View attendance location configurations', category: 'attendance' },
  
  // Settings Extensions
  { name: 'manage_location_config', description: 'Manage location configuration settings', category: 'settings' },
  { name: 'manage_email_config', description: 'Manage email configuration settings', category: 'settings' },
  { name: 'manage_ai_config', description: 'Manage AI configuration settings', category: 'settings' },
  { name: 'manage_background_services', description: 'Manage background services configuration', category: 'settings' },
  
  // RBAC Management
  { name: 'manage_permissions', description: 'Manage system permissions', category: 'rbac' },
  { name: 'assign_user_roles', description: 'Assign roles to users', category: 'rbac' },
  { name: 'view_rbac_settings', description: 'View RBAC configuration', category: 'rbac' },
  
  // Finance Extensions
  { name: 'manage_concession_types', description: 'Manage fee concession types', category: 'finance' },
  { name: 'manage_student_concessions', description: 'Manage student fee concessions', category: 'finance' },
  { name: 'manage_fee_reminders', description: 'Manage fee payment reminders', category: 'finance' },
  { name: 'view_collection_reports', description: 'View fee collection reports', category: 'finance' },
  
  // Enhanced Examination
  { name: 'view_report_cards', description: 'View student report cards', category: 'examination' },
  { name: 'generate_report_cards', description: 'Generate and print report cards', category: 'examination' },
  { name: 'manage_exam_terms', description: 'Manage examination terms', category: 'examination' },
  { name: 'export_exam_data', description: 'Export examination data', category: 'examination' },
  
    // Additional Admin
  { name: 'manage_system_settings', description: 'Manage system-wide settings', category: 'admin' },
  { name: 'view_system_logs', description: 'View system logs and diagnostics', category: 'admin' },
  { name: 'manage_data_export', description: 'Manage data export and backup', category: 'admin' },

  // Additional missing permissions
  { name: 'send_to_all_students', description: 'Send messages to all students', category: 'communication' },
  { name: 'send_to_all_teachers', description: 'Send messages to all teachers', category: 'communication' },
  { name: 'send_to_all_employees', description: 'Send messages to all employees', category: 'communication' },
  { name: 'send_to_parents', description: 'Send messages to parents', category: 'communication' },
  { name: 'send_communication_message', description: 'Send communication messages', category: 'communication' },
  { name: 'view_fees', description: 'View fee information', category: 'finance' },

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
      'view_students', 'create_student', 'edit_student', 'manage_roll_numbers', 'import_students', 'export_students',
      'view_teachers', 'create_teacher', 'edit_teacher',
      'view_employees', 'create_employee', 'edit_employee',
      'view_departments', 'create_department', 'edit_department',
      'view_designations', 'create_designation', 'edit_designation',
      'view_classes', 'create_class', 'edit_class', 'manage_class_students',
      'view_subjects', 'manage_subjects', 'manage_subject_assignments', 'manage_class_subjects', 'manage_student_subjects',
      'view_money_collection', 'create_money_collection', 'edit_money_collection',
      'manage_admissions', 'view_admission_inquiries', 'create_admission_inquiry', 'edit_admission_inquiry', 'manage_admission_workflow', 'access_admission_reports', 'manage_admission_settings', 'manage_transfer_certificates',
      'view_attendance', 'mark_attendance', 'view_attendance_reports',
      'view_leaves', 'manage_leave_applications', 'manage_leave_policies',
      'view_salary', 'manage_salary_structures', 'manage_teacher_salaries', 'manage_employee_salaries',
      'view_reports',
      'view_finance_module', 'manage_fee_heads', 'manage_fee_terms', 'manage_classwise_fees', 'collect_fees',
      'manage_concession_types', 'manage_student_concessions', 'manage_fee_reminders', 'view_collection_reports',
      'view_examinations', 'manage_exam_types', 'manage_exam_configurations', 'view_report_cards', 'generate_report_cards',
      'view_communication', 'create_communication_message', 'manage_whatsapp_templates', 'view_communication_logs', 'manage_communication_settings',
      'view_chat', 'manage_chat_settings',
      'view_courtesy_calls', 'view_all_courtesy_call_feedback',
      'view_settings', 'manage_academic_sessions', 'manage_subjects', 'manage_attendance_config',
      'manage_location_config', 'manage_email_config', 'manage_background_services',
      'view_rbac_settings', 'manage_roles', 'assign_user_roles',
      'manage_attendance_locations', 'view_attendance_locations',
      'view_transport', 'manage_transport_routes', 'manage_transport_stops', 'manage_transport_assignments',
      'create_transport_route', 'edit_transport_route', 'delete_transport_route', 'view_transport_routes',
      'create_transport_stop', 'edit_transport_stop', 'delete_transport_stop', 'view_transport_stops',
      'manage_transport_vehicles', 'create_transport_vehicle', 'edit_transport_vehicle', 'delete_transport_vehicle', 'view_transport_vehicles',
      'manage_transport_drivers', 'create_transport_driver', 'edit_transport_driver', 'delete_transport_driver', 'view_transport_drivers',
      'manage_transport_fees', 'view_transport_fees', 'collect_transport_fees',
      'manage_transport_schedules', 'view_transport_schedules', 'track_transport_vehicles', 'view_transport_tracking',
      'manage_transport_maintenance', 'view_transport_maintenance', 'generate_transport_reports', 'view_transport_reports',
      'manage_transport_attendance', 'view_transport_attendance', 'send_transport_alerts', 'manage_transport_settings'
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
      'view_classes', 'manage_class_students',
      'view_subjects', 'manage_subject_assignments', 'manage_class_subjects', 'manage_student_subjects',
      'view_money_collection',
      'manage_admissions', 'view_admission_inquiries', 'manage_admission_workflow', 'access_admission_reports',
      'view_attendance', 'view_attendance_reports',
      'view_leaves', 'manage_leave_applications',
      'view_salary',
      'view_reports',
      'view_finance_module', 'view_finance_reports', 'view_collection_reports',
      'view_examinations', 'view_exam_reports', 'view_report_cards', 'generate_report_cards',
      'view_communication', 'create_communication_message', 'view_communication_logs',
      'view_chat',
      'view_courtesy_calls', 'view_all_courtesy_call_feedback',
      'view_settings'
    ]
  },
  {
    name: 'Teacher',
    description: 'Teacher with classroom management permissions',
    isSystem: true,
    permissions: [
      'view_dashboard',
      'view_students',
      'view_classes', 'manage_class_students',
      'view_subjects',
      'view_attendance', 'mark_attendance',
      'view_leaves', 'manage_leave_applications',
      'view_question_papers', 'create_question_paper',
      'view_examinations', 'enter_marks', 'view_report_cards',
      'view_communication', 'create_communication_message', 'view_communication_logs',
      'view_chat',
      'view_courtesy_calls', 'view_own_courtesy_call_feedback', 'create_courtesy_call_feedback',
      'mark_self_attendance', 'manage_roll_numbers', 'view_own_students'
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
      'manage_concession_types', 'manage_student_concessions', 'manage_fee_reminders', 'view_collection_reports',
      'view_money_collection', 'create_money_collection', 'edit_money_collection',
      'view_reports',
      'view_salary'
    ]
  },
  {
    name: 'Admissions Staff',
    description: 'Staff member with admissions management permissions',
    isSystem: true,
    permissions: [
      'view_dashboard',
      'view_students', 'create_student',
      'manage_admissions', 'view_admission_inquiries', 'create_admission_inquiry', 'edit_admission_inquiry', 'manage_admission_workflow', 'access_admission_reports', 'manage_admission_settings',
      'view_communication', 'create_communication_message', 'view_communication_logs'
    ]
  },
  {
    name: 'Subject Coordinator',
    description: 'Staff member with subject management permissions',
    isSystem: true,
    permissions: [
      'view_dashboard',
      'view_students', 'view_teachers', 'view_classes',
      'view_subjects', 'manage_subjects', 'manage_subject_assignments', 'manage_class_subjects', 'manage_student_subjects',
      'view_communication', 'create_communication_message', 'manage_roll_numbers', 'view_own_students'
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