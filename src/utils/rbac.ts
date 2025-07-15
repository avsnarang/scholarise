import { Permission, Role, type PermissionMap } from "@/types/permissions";

// Define permissions for each role
export const rolePermissions: PermissionMap = {
  [Role.SUPER_ADMIN]: Object.values(Permission), // Super admin has all permissions
  
  [Role.ADMIN]: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_STUDENTS,
    Permission.CREATE_STUDENT,
    Permission.EDIT_STUDENT,
    Permission.DELETE_STUDENT,
    Permission.MANAGE_ADMISSIONS,
    Permission.MANAGE_TRANSFER_CERTIFICATES,
    Permission.VIEW_MONEY_COLLECTION,
    Permission.CREATE_MONEY_COLLECTION,
    Permission.EDIT_MONEY_COLLECTION,
    Permission.DELETE_MONEY_COLLECTION,
    Permission.VIEW_TEACHERS,
    Permission.CREATE_TEACHER,
    Permission.EDIT_TEACHER,
    Permission.DELETE_TEACHER,
    Permission.VIEW_EMPLOYEES,
    Permission.CREATE_EMPLOYEE,
    Permission.EDIT_EMPLOYEE, 
    Permission.DELETE_EMPLOYEE,
    Permission.VIEW_DEPARTMENTS,
    Permission.CREATE_DEPARTMENT,
    Permission.EDIT_DEPARTMENT,
    Permission.DELETE_DEPARTMENT,
    Permission.VIEW_DESIGNATIONS,
    Permission.CREATE_DESIGNATION,
    Permission.EDIT_DESIGNATION,
    Permission.DELETE_DESIGNATION,
    Permission.VIEW_CLASSES,
    Permission.CREATE_CLASS,
    Permission.EDIT_CLASS,
    Permission.DELETE_CLASS,
    Permission.MANAGE_CLASS_STUDENTS,
    Permission.VIEW_ATTENDANCE,
    Permission.MARK_ATTENDANCE,
    Permission.VIEW_ATTENDANCE_REPORTS,
    Permission.VIEW_LEAVES,
    Permission.MANAGE_LEAVE_APPLICATIONS,
    Permission.MANAGE_LEAVE_POLICIES,
    Permission.VIEW_SALARY,
    Permission.MANAGE_SALARY_STRUCTURES,
    Permission.MANAGE_TEACHER_SALARIES,
    Permission.MANAGE_EMPLOYEE_SALARIES,
    Permission.MANAGE_SALARY_INCREMENTS,
    Permission.PROCESS_SALARY_PAYMENTS,
    Permission.VIEW_TRANSPORT,
    Permission.MANAGE_TRANSPORT_ROUTES,
    Permission.MANAGE_TRANSPORT_STOPS,
    Permission.MANAGE_TRANSPORT_ASSIGNMENTS,
    Permission.VIEW_FEES,
    Permission.MANAGE_FEES,
    Permission.VIEW_REPORTS,
    Permission.VIEW_SETTINGS,
    Permission.MANAGE_ROLES,
    // Finance Module Permissions for Admin
    Permission.VIEW_FINANCE_MODULE,
    Permission.MANAGE_FEE_HEADS,
    Permission.MANAGE_FEE_TERMS,
    Permission.MANAGE_CLASSWISE_FEES,
    Permission.COLLECT_FEES,
    Permission.VIEW_FINANCE_REPORTS,
    // Question Papers
    Permission.VIEW_QUESTION_PAPERS,
    Permission.CREATE_QUESTION_PAPER,
    Permission.MANAGE_QUESTION_PAPERS,
    // Examinations
    Permission.VIEW_EXAMINATIONS,
    Permission.MANAGE_EXAM_TYPES,
    Permission.MANAGE_EXAM_CONFIGURATIONS,
    Permission.MANAGE_EXAM_SCHEDULES,
    Permission.MANAGE_SEATING_PLANS,
    Permission.ENTER_MARKS,
    Permission.MANAGE_ASSESSMENTS,
    Permission.MANAGE_GRADE_SCALES,
    Permission.VIEW_EXAM_REPORTS,
    // System
    Permission.MANAGE_BRANCHES,
    Permission.MANAGE_ACADEMIC_SESSIONS,
    Permission.MANAGE_SUBJECTS,
  ],
  
  [Role.PRINCIPAL]: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_STUDENTS,
    Permission.CREATE_STUDENT,
    Permission.EDIT_STUDENT,
    Permission.MANAGE_ADMISSIONS,
    Permission.MANAGE_TRANSFER_CERTIFICATES,
    Permission.VIEW_MONEY_COLLECTION,
    Permission.CREATE_MONEY_COLLECTION,
    Permission.EDIT_MONEY_COLLECTION,
    Permission.VIEW_TEACHERS,
    Permission.VIEW_EMPLOYEES,
    Permission.VIEW_DEPARTMENTS,
    Permission.VIEW_DESIGNATIONS,
    Permission.VIEW_CLASSES,
    Permission.CREATE_CLASS,
    Permission.EDIT_CLASS,
    Permission.MANAGE_CLASS_STUDENTS,
    Permission.VIEW_ATTENDANCE,
    Permission.MARK_ATTENDANCE,
    Permission.VIEW_ATTENDANCE_REPORTS,
    Permission.VIEW_LEAVES,
    Permission.MANAGE_LEAVE_APPLICATIONS,
    Permission.MANAGE_LEAVE_POLICIES,
    Permission.VIEW_SALARY,
    Permission.VIEW_TRANSPORT,
    Permission.VIEW_FEES,
    Permission.VIEW_QUESTION_PAPERS,
    Permission.CREATE_QUESTION_PAPER,
    Permission.MANAGE_QUESTION_PAPERS,
    Permission.VIEW_EXAMINATIONS,
    Permission.MANAGE_EXAM_TYPES,
    Permission.MANAGE_EXAM_CONFIGURATIONS,
    Permission.MANAGE_EXAM_SCHEDULES,
    Permission.MANAGE_SEATING_PLANS,
    Permission.ENTER_MARKS,
    Permission.MANAGE_ASSESSMENTS,
    Permission.MANAGE_GRADE_SCALES,
    Permission.VIEW_EXAM_REPORTS,
    Permission.VIEW_REPORTS,
    Permission.VIEW_SETTINGS,
    Permission.MANAGE_ACADEMIC_SESSIONS,
    Permission.MANAGE_SUBJECTS,
    Permission.VIEW_COURTESY_CALLS,
    Permission.CREATE_COURTESY_CALL_FEEDBACK,
    Permission.VIEW_ALL_COURTESY_CALL_FEEDBACK,
    Permission.EDIT_COURTESY_CALL_FEEDBACK,
    Permission.DELETE_COURTESY_CALL_FEEDBACK,
  ],
  
  [Role.TEACHER]: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_STUDENTS,
    Permission.VIEW_CLASSES,
    Permission.VIEW_ATTENDANCE,
    Permission.MARK_ATTENDANCE,
    Permission.VIEW_LEAVES,
    Permission.MANAGE_LEAVE_APPLICATIONS,
    Permission.VIEW_QUESTION_PAPERS,
    Permission.CREATE_QUESTION_PAPER,
    Permission.VIEW_EXAMINATIONS,
    Permission.ENTER_MARKS,
    Permission.VIEW_EXAM_REPORTS,
    Permission.VIEW_COURTESY_CALLS,
    Permission.CREATE_COURTESY_CALL_FEEDBACK,
    Permission.VIEW_OWN_COURTESY_CALL_FEEDBACK,
    Permission.EDIT_COURTESY_CALL_FEEDBACK,
  ],
  
  [Role.ACCOUNTANT]: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_STUDENTS,
    Permission.VIEW_MONEY_COLLECTION,
    Permission.CREATE_MONEY_COLLECTION,
    Permission.EDIT_MONEY_COLLECTION,
    Permission.DELETE_MONEY_COLLECTION,
    Permission.VIEW_SALARY,
    Permission.MANAGE_SALARY_STRUCTURES,
    Permission.MANAGE_TEACHER_SALARIES,
    Permission.MANAGE_EMPLOYEE_SALARIES,
    Permission.MANAGE_SALARY_INCREMENTS,
    Permission.PROCESS_SALARY_PAYMENTS,
    Permission.VIEW_FEES,
    Permission.MANAGE_FEES,
    Permission.VIEW_REPORTS,
    // Finance Module Permissions for Accountant
    Permission.VIEW_FINANCE_MODULE,
    Permission.MANAGE_FEE_HEADS,
    Permission.MANAGE_FEE_TERMS,
    Permission.MANAGE_CLASSWISE_FEES,
    Permission.COLLECT_FEES,
    Permission.VIEW_FINANCE_REPORTS,
  ],
  
  [Role.RECEPTIONIST]: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_STUDENTS,
    Permission.VIEW_TEACHERS,
    Permission.VIEW_MONEY_COLLECTION,
    Permission.CREATE_MONEY_COLLECTION,
    Permission.MANAGE_ADMISSIONS,
    Permission.VIEW_ATTENDANCE,
    Permission.VIEW_TRANSPORT,
  ],
  
  [Role.TRANSPORT_MANAGER]: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_STUDENTS, 
    Permission.VIEW_TRANSPORT,
    Permission.MANAGE_TRANSPORT_ROUTES,
    Permission.MANAGE_TRANSPORT_STOPS,
    Permission.MANAGE_TRANSPORT_ASSIGNMENTS,
  ],
  
  [Role.STAFF]: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_STUDENTS,
    Permission.VIEW_LEAVES,
    Permission.MANAGE_LEAVE_APPLICATIONS,
    Permission.VIEW_ATTENDANCE,  // Ensure Employee/Staff always has VIEW_ATTENDANCE
    Permission.MARK_SELF_ATTENDANCE,
  ],
};

// Map module titles to their corresponding view permissions for automatic permission handling
export const moduleViewPermissions: Record<string, Permission> = {
  // Main navigation modules
  "Dashboard": Permission.VIEW_DASHBOARD,
  "Students": Permission.VIEW_STUDENTS,
  "Admissions": Permission.MANAGE_ADMISSIONS,
  "Money Collection": Permission.VIEW_MONEY_COLLECTION,
  "Staff": Permission.VIEW_EMPLOYEES,
  "Teachers": Permission.VIEW_TEACHERS,
  "Employees": Permission.VIEW_EMPLOYEES,
  "Departments": Permission.VIEW_DEPARTMENTS,
  "Designations": Permission.VIEW_DESIGNATIONS,
  "Classes": Permission.VIEW_CLASSES,
  "Attendance": Permission.VIEW_ATTENDANCE,
  "Leave Management": Permission.VIEW_LEAVES, 
  "Salary Management": Permission.VIEW_SALARY,
  "Transport": Permission.VIEW_TRANSPORT,
  "Fees": Permission.VIEW_FEES,
  "Question Papers": Permission.VIEW_QUESTION_PAPERS,
  "Reports": Permission.VIEW_REPORTS,
  "Settings": Permission.VIEW_SETTINGS,
  "Finance": Permission.VIEW_FINANCE_MODULE,
  "Examination": Permission.VIEW_EXAMINATIONS,
  "RBAC Settings": Permission.MANAGE_ROLES,
  
  // Submodules 
  "Class Students": Permission.MANAGE_CLASS_STUDENTS,
  "Mark Attendance": Permission.MARK_ATTENDANCE,
  "Student Attendance": Permission.VIEW_ATTENDANCE,
  "Attendance Reports": Permission.VIEW_ATTENDANCE_REPORTS,
  "Leave Applications": Permission.MANAGE_LEAVE_APPLICATIONS,
  "Leave Policies": Permission.MANAGE_LEAVE_POLICIES,
  "Salary Structures": Permission.MANAGE_SALARY_STRUCTURES,
  "Teacher Salaries": Permission.MANAGE_TEACHER_SALARIES,
  "Employee Salaries": Permission.MANAGE_EMPLOYEE_SALARIES,
  "Salary Increments": Permission.MANAGE_SALARY_INCREMENTS,
  "Process Payments": Permission.PROCESS_SALARY_PAYMENTS,
  "Routes": Permission.MANAGE_TRANSPORT_ROUTES,
  "Stops": Permission.MANAGE_TRANSPORT_STOPS,
  "Assignments": Permission.MANAGE_TRANSPORT_ASSIGNMENTS,
  "Branches": Permission.MANAGE_BRANCHES,
  "Academic Sessions": Permission.MANAGE_ACADEMIC_SESSIONS,
  "Subjects": Permission.MANAGE_SUBJECTS,
  "Users": Permission.MANAGE_ROLES,
  "User Roles": Permission.MANAGE_ROLES,
  "Attendance Configuration": Permission.MANAGE_ATTENDANCE_CONFIG,
  
  // Submodules for Question Papers
  "Create Blueprint": Permission.CREATE_QUESTION_PAPER,
  "Create Question Paper": Permission.CREATE_QUESTION_PAPER,
  "Question Papers List": Permission.VIEW_QUESTION_PAPERS,
  "Blueprints": Permission.CREATE_QUESTION_PAPER,
  
  // Aliases and additional mappings for flexibility
  "All Students": Permission.VIEW_STUDENTS,
  "Transfer Certificates": Permission.MANAGE_TRANSFER_CERTIFICATES,
  "Add Teacher": Permission.CREATE_TEACHER,
  "Add Employee": Permission.CREATE_EMPLOYEE,
  "All Classes": Permission.VIEW_CLASSES,
  "Overview": Permission.VIEW_SALARY,
  "Help": Permission.VIEW_DASHBOARD,  // Everyone can access Help
};

// Define default permissions that specific roles should always have 
// regardless of what's in the database
export const roleDefaultPermissions: Record<string, Permission[]> = {
  "Employee": [Permission.VIEW_ATTENDANCE, Permission.MARK_SELF_ATTENDANCE],
  "employee": [Permission.VIEW_ATTENDANCE, Permission.MARK_SELF_ATTENDANCE],
  "Staff": [Permission.VIEW_ATTENDANCE, Permission.MARK_SELF_ATTENDANCE],
  "staff": [Permission.VIEW_ATTENDANCE, Permission.MARK_SELF_ATTENDANCE],
  "Teacher": [Permission.VIEW_ATTENDANCE, Permission.MARK_ATTENDANCE],
  "teacher": [Permission.VIEW_ATTENDANCE, Permission.MARK_ATTENDANCE],
  "Admin": [Permission.VIEW_ATTENDANCE, Permission.MARK_ATTENDANCE],
  "admin": [Permission.VIEW_ATTENDANCE, Permission.MARK_ATTENDANCE],
  "Principal": [Permission.VIEW_ATTENDANCE, Permission.MARK_ATTENDANCE],
  "principal": [Permission.VIEW_ATTENDANCE, Permission.MARK_ATTENDANCE],
};

// Navigation items with required permissions - structured by module
export const navItemPermissions = {
  // Dashboard module
  dashboard: [Permission.VIEW_DASHBOARD],
  
  // Students module
  students: [Permission.VIEW_STUDENTS],
  admission: [Permission.MANAGE_ADMISSIONS],
  moneyCollection: [Permission.VIEW_MONEY_COLLECTION],
  createMoneyCollection: [Permission.CREATE_MONEY_COLLECTION],
  editMoneyCollection: [Permission.EDIT_MONEY_COLLECTION],
  deleteMoneyCollection: [Permission.DELETE_MONEY_COLLECTION],
  transfer: [Permission.MANAGE_TRANSFER_CERTIFICATES],
  
  // Staff module - Teachers
  teachers: [Permission.VIEW_TEACHERS],
  createTeacher: [Permission.CREATE_TEACHER],
  editTeacher: [Permission.EDIT_TEACHER],
  deleteTeacher: [Permission.DELETE_TEACHER],
  
  // Staff module - Employees
  employees: [Permission.VIEW_EMPLOYEES],
  createEmployee: [Permission.CREATE_EMPLOYEE],
  editEmployee: [Permission.EDIT_EMPLOYEE],
  deleteEmployee: [Permission.DELETE_EMPLOYEE],
  
  // Staff module - Departments
  departments: [Permission.VIEW_DEPARTMENTS],
  createDepartment: [Permission.CREATE_DEPARTMENT],
  editDepartment: [Permission.EDIT_DEPARTMENT],
  deleteDepartment: [Permission.DELETE_DEPARTMENT],
  
  // Staff module - Designations
  designations: [Permission.VIEW_DESIGNATIONS],
  createDesignation: [Permission.CREATE_DESIGNATION],
  editDesignation: [Permission.EDIT_DESIGNATION],
  deleteDesignation: [Permission.DELETE_DESIGNATION],
  
  // Classes module
  classes: [Permission.VIEW_CLASSES],
  createClass: [Permission.CREATE_CLASS],
  editClass: [Permission.EDIT_CLASS],
  deleteClass: [Permission.DELETE_CLASS],
  classStudents: [Permission.MANAGE_CLASS_STUDENTS],
  
  // Attendance module
  attendance: [Permission.VIEW_ATTENDANCE],
  markAttendance: [Permission.MARK_ATTENDANCE],
  markSelfAttendance: [Permission.MARK_SELF_ATTENDANCE],
  markAllStaffAttendance: [Permission.MARK_ALL_STAFF_ATTENDANCE],
  attendanceReports: [Permission.VIEW_ATTENDANCE_REPORTS],
  
  // Leave module
  leaves: [Permission.VIEW_LEAVES],
  leaveApplications: [Permission.MANAGE_LEAVE_APPLICATIONS],
  leavePolicies: [Permission.MANAGE_LEAVE_POLICIES],
  
  // Examination module - comprehensive permissions
  examination: [Permission.VIEW_EXAMINATIONS],

  enterMarks: [Permission.ENTER_MARKS],
  manageAssessments: [Permission.MANAGE_ASSESSMENTS],
  gradeScales: [Permission.MANAGE_GRADE_SCALES],
  examReports: [Permission.VIEW_EXAM_REPORTS],
  terms: [Permission.MANAGE_ACADEMIC_SESSIONS],
  
  // Salary module
  salary: [Permission.VIEW_SALARY],
  salaryStructures: [Permission.MANAGE_SALARY_STRUCTURES],
  teacherSalaries: [Permission.MANAGE_TEACHER_SALARIES],
  employeeSalaries: [Permission.MANAGE_EMPLOYEE_SALARIES],
  salaryIncrements: [Permission.MANAGE_SALARY_INCREMENTS],
  salaryPayments: [Permission.PROCESS_SALARY_PAYMENTS],
  
  // Transport module
  transport: [Permission.VIEW_TRANSPORT],
  transportRoutes: [Permission.MANAGE_TRANSPORT_ROUTES],
  transportStops: [Permission.MANAGE_TRANSPORT_STOPS],
  transportAssignments: [Permission.MANAGE_TRANSPORT_ASSIGNMENTS],
  
  // Question Paper module
  questionPapers: [Permission.VIEW_QUESTION_PAPERS],
  createQuestionPaper: [Permission.CREATE_QUESTION_PAPER],
  manageQuestionPapers: [Permission.MANAGE_QUESTION_PAPERS],
  
  // Finance Module - comprehensive fee management
  finance: [Permission.VIEW_FINANCE_MODULE],
  feeHeads: [Permission.MANAGE_FEE_HEADS],
  feeTerms: [Permission.MANAGE_FEE_TERMS],
  classwiseFees: [Permission.MANAGE_CLASSWISE_FEES],
  feeCollection: [Permission.COLLECT_FEES],
  financeReports: [Permission.VIEW_FINANCE_REPORTS],
  
  // Basic Fees (separate from comprehensive Finance module)
  fees: [Permission.VIEW_FEES],
  manageFees: [Permission.MANAGE_FEES],
  
  // Courtesy Calls module
  courtesyCalls: [Permission.VIEW_COURTESY_CALLS],
  createCourtesyCallFeedback: [Permission.CREATE_COURTESY_CALL_FEEDBACK],
  viewOwnCourtesyCallFeedback: [Permission.VIEW_OWN_COURTESY_CALL_FEEDBACK],
  viewAllCourtesyCallFeedback: [Permission.VIEW_ALL_COURTESY_CALL_FEEDBACK],
  editCourtesyCallFeedback: [Permission.EDIT_COURTESY_CALL_FEEDBACK],
  deleteCourtesyCallFeedback: [Permission.DELETE_COURTESY_CALL_FEEDBACK],
  
  // Reports module
  reports: [Permission.VIEW_REPORTS],
  
  // Settings module
  settings: [Permission.VIEW_SETTINGS],
  branches: [Permission.MANAGE_BRANCHES],
  academicSessions: [Permission.MANAGE_ACADEMIC_SESSIONS],
  subjects: [Permission.MANAGE_SUBJECTS],
  users: [Permission.MANAGE_ROLES],
  attendanceConfig: [Permission.MANAGE_ATTENDANCE_CONFIG],
};

// Check if user has a specific permission
export function hasPermission(userRoles: Role[] | string[], permission: Permission): boolean {
  if (!userRoles || userRoles.length === 0) {
    console.log(`hasPermission check failed: No user roles provided for permission ${permission}`);
    return false;
  }
  
  // Convert string roles to Role enum if needed and handle custom roles
  const roles = userRoles.map(role => {
    if (typeof role === 'string') {
      // Check if this role has default permissions that include the requested permission
      const defaultPerms = roleDefaultPermissions[role];
      if (defaultPerms?.includes(permission)) {
        if (permission === Permission.VIEW_ATTENDANCE) {
          console.log(`Role ${role} has default permission ${permission}`);
        }
        return true; // This will be used to mark this user as having the permission
      }
      
      // Special case handling for Employee role with VIEW_ATTENDANCE permission
      if ((role === 'Employee' || role === 'employee' || role === 'Staff' || role === 'staff') 
          && permission === Permission.VIEW_ATTENDANCE) {
        console.log("Special case: Employee/Staff should have VIEW_ATTENDANCE permission");
        return true; // This will be used to mark this user as having VIEW_ATTENDANCE permission
      }
      
      // Check if the string role is one of the valid Role enum values (case-insensitive)
      const roleUpperCase = role.toUpperCase();
      
      for (const enumRole of Object.values(Role)) {
        if (enumRole.toUpperCase() === roleUpperCase) {
          return enumRole as Role;
        }
      }
      
      // Log warning for roles that don't match an enum value
      console.warn(`Role "${role}" doesn't match any Role enum value, treating as custom role`);
      return role;
    }
    return role;
  });
  
  // Special debugging for VIEW_ATTENDANCE
  const isAttendanceCheck = permission === Permission.VIEW_ATTENDANCE;
  if (isAttendanceCheck) {
    console.log(`Checking ${permission} permission for roles: ${userRoles.join(', ')}`);
  }
  
  // Super admin bypass - always has all permissions
  if (roles.some(role => {
    // Check if role is a string (custom role name)
    if (typeof role === 'string') {
      return role.toUpperCase() === 'SUPERADMIN' || 
             role.toUpperCase() === 'SUPER_ADMIN' || 
             role.toUpperCase() === 'SUPER ADMIN';
    }
    // Check if role is a boolean (special case handler)
    if (typeof role === 'boolean') {
      return false; // Boolean values can't be SUPER_ADMIN
    }
    // Must be a Role enum value
    return role === Role.SUPER_ADMIN;
  })) {
    if (isAttendanceCheck) console.log("User is SUPER_ADMIN, granting permission");
    return true;
  }
  
  // Special case: If we found any special case handlers returned 'true' above, grant permission
  if (roles.includes(true as any)) {
    if (isAttendanceCheck) {
      console.log(`Granting ${permission} via special case rule`);
    }
    return true;
  }
  
  // For standard roles, check if they have the required permission
  const result = roles.some(role => {
    if (typeof role === 'boolean') return role; // Already processed special case
    
    // Special case for Employee role and VIEW_ATTENDANCE
    if (typeof role === 'string' && 
        (role === 'Employee' || role === 'employee' || role === 'Staff' || role === 'staff') && 
        permission === Permission.VIEW_ATTENDANCE) {
      if (isAttendanceCheck) {
        console.log("Employee/Staff role always has VIEW_ATTENDANCE permission");
      }
      return true;
    }
    
    // Skip custom roles (strings that aren't in the enum)
    if (typeof role === 'string' && !Object.values(Role).includes(role as any)) {
      if (isAttendanceCheck) {
        console.log(`Skipping permission check for custom role "${role}"`);
      }
      return false;
    }
 
    // Safely get permissions for the role
    try {
      const permissions = rolePermissions[role as Role];
      
      if (isAttendanceCheck) {
        console.log(`Role ${role} permissions:`, permissions ? permissions.join(', ') : 'none');
        console.log(`Role ${role} has ${permission}:`, permissions && permissions.includes(permission));
      }
      
      return permissions && permissions.includes(permission);
    } catch (error) {
      console.error(`Error getting permissions for role "${role}":`, error);
      return false;
    }
  });
  
  if (isAttendanceCheck) {
    console.log(`Final result for ${permission} permission check: ${result}`);
  }
  
  return result;
}

// Check if user has any of the given permissions
export function hasAnyPermission(userRoles: Role[] | string[], permissions: Permission[]): boolean {
  if (!userRoles || userRoles.length === 0) return false;
  
  // Check each permission individually
  return permissions.some(permission => hasPermission(userRoles, permission));
}

// Check if user has all of the given permissions
export function hasAllPermissions(userRoles: Role[] | string[], permissions: Permission[]): boolean {
  if (!userRoles || userRoles.length === 0) return false;
  
  // Check each permission individually
  return permissions.every(permission => hasPermission(userRoles, permission));
} 