import { clerkMiddleware, createRouteMatcher, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Define matchers for different route types
const isPublicRoute = createRouteMatcher([
  '/',
  '/login(.*)',
  '/sign-in(.*)',
  '/sso-callback(.*)',
]);

const isApiRoute = createRouteMatcher([
  '/api/health',
  '/api/trpc/health',
  '/api/webhooks/clerk',
]);

const isTrpcRoute = createRouteMatcher([
  '/api/trpc(.*)',
]);

// Define route-to-permission mapping
const routePermissions: Record<string, string[]> = {
  // Dashboard
  '/dashboard': ['view_dashboard'],
  
  // Students
  '/students': ['view_students'],
  '/students/create': ['create_student'],
  '/students/[id]': ['view_students', 'edit_student'],
  '/students/[id]/edit': ['edit_student'],
  
  // Admissions
  '/admissions': ['manage_admissions'],
  '/admissions/applications': ['manage_admissions'],
  '/admissions/dashboard': ['manage_admissions'],
  '/admissions/leads': ['manage_admissions'],
  '/admissions/settings': ['manage_admissions'],
  '/admissions/staff': ['manage_admissions'],
  
  // Money Collection
  '/money-collection': ['view_money_collection'],
  '/money-collection/new': ['create_money_collection'],
  '/money-collection/[id]': ['view_money_collection', 'edit_money_collection'],
  '/money-collection/[id]/edit': ['edit_money_collection'],
  
  // Teachers
  '/teachers': ['view_teachers'],
  '/teachers/create': ['create_teacher'],
  '/teachers/[id]': ['view_teachers', 'edit_teacher'],
  '/teachers/[id]/edit': ['edit_teacher'],
  
  // Staff/Employees
  '/staff': ['view_employees'],
  '/employees': ['view_employees'],
  '/employees/create': ['create_employee'],
  '/employees/[id]': ['view_employees', 'edit_employee'],
  '/employees/[id]/edit': ['edit_employee'],
  
  // Departments
  '/departments': ['view_departments'],
  '/departments/create': ['create_department'],
  '/departments/list': ['view_departments'],
  '/departments/[id]': ['view_departments', 'edit_department'],
  '/departments/[id]/edit': ['edit_department'],
  
  // Designations
  '/designations': ['view_designations'],
  '/designations/create': ['create_designation'],
  '/designations/list': ['view_designations'],
  '/designations/[id]': ['view_designations', 'edit_designation'],
  '/designations/[id]/edit': ['edit_designation'],
  
  // Classes
  '/classes': ['view_classes'],
  '/classes/create': ['create_class'],
  '/classes/order': ['view_classes'],
  '/classes/[id]': ['view_classes', 'edit_class'],
  '/classes/[id]/edit': ['edit_class'],
  '/classes/[id]/students': ['manage_class_students'],
  '/classes/assignments': ['view_teachers'],
  
  // Attendance
  '/attendance': ['view_attendance'],
  '/attendance/mark': ['mark_attendance'],
  '/attendance/students': ['view_attendance'],
  '/attendance/reports': ['view_attendance_reports'],
  '/attendance-marker': ['mark_attendance'],
  '/attendance-records': ['view_attendance'],
  
  // Leaves
  '/leaves': ['view_leaves'],
  '/leaves/dashboard': ['view_leaves'],
  
  // Examination
  '/examination': ['view_examinations'],
  '/examination/assessment-schemas': ['view_examinations'],
  '/examination/config': ['view_examinations'],
  '/examination/grade-scales': ['manage_grade_scales'],
  '/examination/reports': ['view_exam_reports'],
  '/examination/results-dashboard': ['view_exam_reports'],
  '/examination/score-entry': ['enter_marks'],
  
  // Salary
  '/salary': ['view_salary'],
  
  // Finance
  '/finance': ['view_finance_module'],
  '/finance/classwise-fee': ['manage_classwise_fees'],
  '/finance/fee-collection': ['collect_fees'],
  '/finance/fee-head': ['manage_fee_heads'],
  '/finance/fee-term': ['manage_fee_terms'],
  '/finance/reports': ['view_finance_reports'],
  
  // Question Papers
  '/question-papers': ['view_question_papers'],
  '/question-papers/create': ['create_question_paper'],
  '/question-papers/list': ['view_question_papers'],
  '/question-papers/blueprints': ['create_question_paper'],
  '/question-papers/questions': ['view_question_papers'],
  '/question-papers/view': ['view_question_papers'],
  
  // Settings
  '/settings': ['view_settings'],
  '/settings/users': ['manage_roles'],
  '/settings/branches': ['manage_branches'],
  '/settings/academic-sessions': ['manage_academic_sessions'],
  '/settings/subjects': ['manage_subjects'],
  '/settings/attendance-config': ['manage_attendance_config'],
  
  // Admin routes
  '/admin': ['manage_roles'],
  '/admin/clerk-users': ['manage_roles'],
  '/admin/fix-teacher-account': ['manage_roles'],
  '/admin/force-sidebar': ['manage_roles'],
  '/admin/set-superadmin': ['manage_roles'],
  
  // Debug and test routes
  '/debug': ['manage_roles'],
  '/debug-permissions': ['manage_roles'],
  '/debug-role': ['manage_roles'],
  '/demo': ['view_dashboard'],
  
  // Assign roll number
  '/assign-roll-number': ['edit_student'],
  
  // Profile
  '/profile': ['view_dashboard'],
  
  // Test upload
  '/test-upload': ['manage_roles'],
  '/toggle-admin': ['manage_roles'],
};

// Define permissions for each role (mirroring the RBAC system)
const rolePermissions: Record<string, string[]> = {
  'super_admin': [
    'view_dashboard',
    'view_students', 'create_student', 'edit_student', 'delete_student',
    'manage_admissions', 'manage_transfer_certificates',
    'view_money_collection', 'create_money_collection', 'edit_money_collection', 'delete_money_collection',
    'view_teachers', 'create_teacher', 'edit_teacher', 'delete_teacher',
    'view_employees', 'create_employee', 'edit_employee', 'delete_employee',
    'view_departments', 'create_department', 'edit_department', 'delete_department',
    'view_designations', 'create_designation', 'edit_designation', 'delete_designation',
    'view_classes', 'create_class', 'edit_class', 'delete_class', 'manage_class_students',
    'view_attendance', 'mark_attendance', 'view_attendance_reports',
    'view_leaves', 'manage_leave_applications', 'manage_leave_policies',
    'view_salary', 'manage_salary_structures', 'manage_teacher_salaries', 'manage_employee_salaries',
    'view_transport', 'manage_transport_routes', 'manage_transport_stops', 'manage_transport_assignments',
    'view_fees', 'manage_fees', 'view_finance_module', 'manage_fee_heads', 'manage_fee_terms',
    'manage_classwise_fees', 'collect_fees', 'view_finance_reports',
    'view_question_papers', 'create_question_paper', 'manage_question_papers',
    'view_examinations', 'manage_exam_types', 'manage_exam_configurations', 'enter_marks',
    'manage_assessments', 'manage_grade_scales', 'view_exam_reports',
    'view_reports', 'view_settings', 'manage_branches', 'manage_academic_sessions',
    'manage_subjects', 'manage_roles', 'manage_attendance_config'
  ],
  'admin': [
    'view_dashboard',
    'view_students', 'create_student', 'edit_student', 'delete_student',
    'manage_admissions', 'manage_transfer_certificates',
    'view_money_collection', 'create_money_collection', 'edit_money_collection', 'delete_money_collection',
    'view_teachers', 'create_teacher', 'edit_teacher', 'delete_teacher',
    'view_employees', 'create_employee', 'edit_employee', 'delete_employee',
    'view_departments', 'create_department', 'edit_department', 'delete_department',
    'view_designations', 'create_designation', 'edit_designation', 'delete_designation',
    'view_classes', 'create_class', 'edit_class', 'delete_class', 'manage_class_students',
    'view_attendance', 'mark_attendance', 'view_attendance_reports',
    'view_leaves', 'manage_leave_applications', 'manage_leave_policies',
    'view_salary', 'manage_salary_structures', 'manage_teacher_salaries', 'manage_employee_salaries',
    'view_transport', 'manage_transport_routes', 'manage_transport_stops', 'manage_transport_assignments',
    'view_fees', 'manage_fees', 'view_reports', 'view_settings'
  ],
  'principal': [
    'view_dashboard',
    'view_students', 'create_student', 'edit_student',
    'manage_admissions', 'manage_transfer_certificates',
    'view_money_collection', 'create_money_collection', 'edit_money_collection',
    'view_teachers', 'view_employees', 'view_departments', 'view_designations',
    'view_classes', 'create_class', 'edit_class', 'manage_class_students',
    'view_attendance', 'mark_attendance', 'view_attendance_reports',
    'view_leaves', 'manage_leave_applications', 'manage_leave_policies',
    'view_salary', 'view_transport', 'view_fees',
    'view_question_papers', 'create_question_paper', 'manage_question_papers',
    'view_examinations', 'manage_exam_types', 'manage_exam_configurations', 'enter_marks',
    'manage_assessments', 'manage_grade_scales', 'view_exam_reports',
    'view_reports', 'view_settings', 'manage_academic_sessions', 'manage_subjects'
  ],
  'teacher': [
    'view_dashboard', 'view_students', 'view_classes',
    'view_attendance', 'mark_attendance',
    'view_leaves', 'manage_leave_applications',
    'view_question_papers', 'create_question_paper',
    'view_examinations', 'enter_marks', 'view_exam_reports'
  ],
  'accountant': [
    'view_dashboard', 'view_students',
    'view_money_collection', 'create_money_collection', 'edit_money_collection', 'delete_money_collection',
    'view_salary', 'manage_salary_structures', 'manage_teacher_salaries', 'manage_employee_salaries',
    'view_fees', 'manage_fees', 'view_reports',
    'view_finance_module', 'manage_fee_heads', 'manage_fee_terms',
    'manage_classwise_fees', 'collect_fees', 'view_finance_reports'
  ],
  'receptionist': [
    'view_dashboard', 'view_students', 'view_teachers',
    'view_money_collection', 'create_money_collection',
    'manage_admissions', 'view_attendance', 'view_transport'
  ],
  'transport_manager': [
    'view_dashboard', 'view_students', 'view_transport',
    'manage_transport_routes', 'manage_transport_stops', 'manage_transport_assignments'
  ],
  'staff': [
    'view_dashboard', 'view_students',
    'view_leaves', 'manage_leave_applications',
    'view_attendance', 'mark_self_attendance'
  ],
  'employee': [
    'view_dashboard', 'view_students',
    'view_leaves', 'manage_leave_applications',
    'view_attendance', 'mark_self_attendance'
  ]
};

// Helper function to check if user has required permissions based on their roles
function hasRequiredPermissions(userRoles: string[], requiredPermissions: string[]): boolean {
  if (!requiredPermissions || requiredPermissions.length === 0) {
    return true;
  }

  if (!userRoles || userRoles.length === 0) {
    return false;
  }

  // Get all permissions for the user's roles
  const allUserPermissions = new Set<string>();
  
  for (const role of userRoles) {
    const normalizedRole = role.toLowerCase().replace(/\s+/g, '_');
    const permissions = rolePermissions[normalizedRole] || [];
    permissions.forEach(permission => allUserPermissions.add(permission));
  }

  // Check if user has any of the required permissions
  return requiredPermissions.some(permission => allUserPermissions.has(permission));
}

// Helper function to match dynamic routes
function matchRoute(pathname: string, routePattern: string): boolean {
  // Convert route pattern to regex
  const pattern = routePattern
    .replace(/\[([^\]]+)\]/g, '([^/]+)')  // Replace [id] with capture group
    .replace(/\//g, '\\/');  // Escape forward slashes
  
  const regex = new RegExp(`^${pattern}$`);
  return regex.test(pathname);
}

// Helper function to find required permissions for a route
function getRequiredPermissions(pathname: string): string[] {
  // Direct match
  if (routePermissions[pathname]) {
    return routePermissions[pathname];
  }

  // Check for dynamic route matches
  for (const [routePattern, permissions] of Object.entries(routePermissions)) {
    if (matchRoute(pathname, routePattern)) {
      return permissions;
    }
  }

  // Default: no specific permissions required
  return [];
}

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;
  
  // Handle public routes (no authentication required)
  if (isPublicRoute(req) || isApiRoute(req)) {
    return;
  }

  // Make tRPC routes public but accessible to auth methods
  if (isTrpcRoute(req)) {
    return;
  }

  // For all other routes, ensure the user is authenticated
  const { userId, sessionClaims } = await auth();
  
  if (!userId) {
    const url = new URL('/sign-in', req.url);
    // Preserve the original URL as a redirect parameter
    url.searchParams.set('redirectUrl', pathname);
    return NextResponse.redirect(url);
  }
  
  // Check if user is active
  if (sessionClaims?.metadata && (sessionClaims.metadata as any).isActive === false) {
    const url = new URL('/sign-in?error=account_inactive', req.url);
    return NextResponse.redirect(url);
  }
  
  // Get user data from Clerk to access publicMetadata (where role info is stored)
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  
  // Get user role information from publicMetadata (not sessionClaims.metadata)
  const userRole = (user.publicMetadata?.role as string) || '';
  const userRoles = (user.publicMetadata?.roles as string[]) || [];
  
  // Normalize roles array
  const allUserRoles = [userRole, ...userRoles].filter(Boolean);
  
  // Debug logging for troubleshooting
  console.log('Middleware Auth Debug:', {
    pathname,
    userId,
    userRole,
    userRoles,
    allUserRoles,
    publicMetadata: user.publicMetadata
  });
  
  // Check if user is super admin (bypass all permission checks)
  // Use the same logic as usePermissions hook for consistency
  const isSuperAdmin = allUserRoles.some(role => {
    if (typeof role === 'string') {
      return role === 'super_admin' || 
             role === 'Super Admin' || 
             role === 'SuperAdmin' ||
             role.toLowerCase().replace(/\s+/g, '_') === 'super_admin' ||
             role.toLowerCase() === 'superadmin';
    }
    return false;
  });

  // Temporary debug bypass - same as in usePermissions hook
  const isDebugSuperAdmin = userId === 'user_2y1xEACdC5UpJaTuVRuuzH75bOA';
  
  console.log('Super Admin Check:', { 
    isSuperAdmin, 
    allUserRoles, 
    isDebugSuperAdmin,
    finalSuperAdminStatus: isSuperAdmin || isDebugSuperAdmin 
  });

  if (isSuperAdmin || isDebugSuperAdmin) {
    console.log('Super admin detected, bypassing permission checks');
    return;
  }

  // Don't check permissions for dashboard route to prevent redirect loops
  if (pathname === '/dashboard') {
    console.log('Dashboard route detected, skipping permission checks');
    return;
  }

  // Get required permissions for this route
  const requiredPermissions = getRequiredPermissions(pathname);

  console.log('Route Permission Check:', {
    pathname,
    requiredPermissions,
    willCheckPermissions: requiredPermissions.length > 0
  });

  if (requiredPermissions.length > 0) {
    // Check if user has required permissions
    const hasPermission = hasRequiredPermissions(allUserRoles, requiredPermissions);
    
    console.log('Permission Check Result:', {
      hasPermission,
      userRoles: allUserRoles,
      requiredPermissions
    });
    
    if (!hasPermission) {
      console.log('Access denied, redirecting to dashboard');
      // Redirect to dashboard with error message
      const url = new URL('/dashboard', req.url);
      url.searchParams.set('error', 'insufficient_permissions');
      return NextResponse.redirect(url);
    }
  }

  // User is authenticated and has required permissions, proceed
  return;
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|.*\\..+$).*)',
    // Include API routes
    '/(api|trpc)(.*)',
  ],
};
