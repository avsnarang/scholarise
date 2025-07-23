import { NextResponse, type NextRequest } from "next/server";
import { createClient } from '@supabase/supabase-js';
import { env } from '@/env';

// Define route matchers
const isPublicRoute = (pathname: string): boolean => {
  const publicRoutes = [
    '/',
    '/login',
    '/sign-in',
    '/auth/callback',
  ];
  return publicRoutes.some(route => pathname === route || pathname.startsWith(route));
};

const isApiRoute = (pathname: string): boolean => {
  const apiRoutes = [
    '/api/health',
    '/api/trpc/health',
  ];
  return apiRoutes.some(route => pathname === route || pathname.startsWith(route));
};

const isTrpcRoute = (pathname: string): boolean => {
  return pathname.startsWith('/api/trpc');
};

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
  '/leaves': ['view_leaves'], // Redirects to /leaves/application
  '/leaves/application': ['view_leaves'],
  '/leaves/policies': ['manage_leave_policies'],
  
  // Leave Management
  '/leave-management': ['view_leaves'],
  '/leave-management/application': ['manage_leave_applications'],
  '/leave-management/policies': ['manage_leave_policies'],
  
  // Examination
  '/examination': ['view_examinations'],
  '/examination/assessment-schemas': ['view_examinations'],
  '/examination/config': ['view_examinations'],
  '/examination/grade-scales': ['manage_grade_scales'],
  '/examination/reports': ['view_exam_reports'],
  '/examination/results-dashboard': ['view_exam_reports'],
  '/examination/score-entry': ['enter_marks'],
  '/examination/report-cards': ['view_report_cards', 'generate_report_cards'],
  '/examination/terms': ['manage_exam_terms'],
  
  // Salary
  '/salary': ['view_salary'],
  '/salary/structures': ['manage_salary_structures'],
  '/salary/teachers/assign': ['manage_teacher_salaries'],
  '/salary/employees/assign': ['manage_employee_salaries'],
  '/salary/increments': ['manage_salary_increments'],
  '/salary/increments/history': ['manage_salary_increments'],
  '/salary/payments': ['process_salary_payments'],
  
  // Finance
  '/finance': ['view_finance_module'],
  '/finance/classwise-fee': ['manage_classwise_fees'],
  '/finance/fee-collection': ['collect_fees'],
  '/finance/fee-head': ['manage_fee_heads'],
  '/finance/fee-term': ['manage_fee_terms'],
  '/finance/reports': ['view_finance_reports'],
  '/finance/concession-types': ['manage_concession_types'],
  '/finance/student-concessions': ['manage_student_concessions'],
  '/finance/reminders': ['manage_fee_reminders'],
  
  // Question Papers
  '/question-papers': ['view_question_papers'],
  '/question-papers/create': ['create_question_paper'],
  '/question-papers/list': ['view_question_papers'],
  '/question-papers/blueprints': ['create_question_paper'],
  '/question-papers/questions': ['view_question_papers'],
  
  // Courtesy Calls
  '/courtesy-calls': ['view_courtesy_calls'],
  '/courtesy-calls/teacher': ['view_courtesy_calls', 'view_own_courtesy_call_feedback'],
  '/courtesy-calls/head': ['view_courtesy_calls', 'view_all_courtesy_call_feedback'],
  
  // Communication
  '/communication': ['view_communication'],
  '/communication/send': ['create_communication_message'],
  '/communication/templates': ['manage_whatsapp_templates'],
  '/communication/history': ['view_communication_logs'],
  '/communication/settings': ['manage_communication_settings'],
  '/communication/chat': ['view_chat'],
  
  // Chat
  '/chat': ['view_chat'],
  
  '/question-papers/view': ['view_question_papers'],
  
  // Settings
  '/settings': ['view_settings'],
  '/settings/users': ['manage_roles'],
  '/settings/branches': ['manage_branches'],
  '/settings/academic-sessions': ['manage_academic_sessions'],
  '/settings/subjects': ['manage_subjects'],
  '/settings/attendance-config': ['manage_attendance_config'],
  '/settings/location-config': ['manage_location_config'],
  '/settings/email-config': ['manage_email_config'],
  '/settings/ai-configuration': ['manage_ai_config'],
  '/settings/background-services': ['manage_background_services'],
  '/settings/rbac': ['view_rbac_settings'],
  '/settings/roles': ['manage_roles'],
  '/settings/permissions': ['manage_permissions'],
  
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

// Note: Role-permission mappings removed in favor of database-driven RBAC system
// Permissions are now checked via user metadata populated by the database system

// Helper function to check if user has required permissions
// Now checks permissions directly from user metadata (populated by database RBAC system)
function hasRequiredPermissions(userPermissions: string[], requiredPermissions: string[]): boolean {
  if (!requiredPermissions || requiredPermissions.length === 0) {
    return true;
  }

  if (!userPermissions || userPermissions.length === 0) {
    return false;
  }

  // Check if user has any of the required permissions
  return requiredPermissions.some(permission => userPermissions.includes(permission));
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

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  // Handle public routes (no authentication required)
  if (isPublicRoute(pathname) || isApiRoute(pathname)) {
    return NextResponse.next();
  }

  // Make tRPC routes public but accessible to auth methods
  if (isTrpcRoute(pathname)) {
    return NextResponse.next();
  }

  // Create Supabase client
  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        storage: {
          getItem: (key: string) => {
            return req.cookies.get(key)?.value || null;
          },
          setItem: (key: string, value: string) => {
            // We can't set cookies in middleware, but this is required by the interface
          },
          removeItem: (key: string) => {
            // We can't remove cookies in middleware, but this is required by the interface
          },
        },
      },
    }
  );

  // Check for authenticated session
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session) {
    const url = new URL('/sign-in', req.url);
    // Preserve the original URL as a redirect parameter
    url.searchParams.set('redirectUrl', pathname);
    return NextResponse.redirect(url);
  }
  
  const user = session.user;
  
  // Get user permissions from user metadata (populated by database RBAC system)
  const userRole = (user.user_metadata?.role as string) || '';
  const userRoles = (user.user_metadata?.roles as string[]) || [];
  const userPermissions = (user.user_metadata?.permissions as string[]) || [];
  
  // Normalize roles array for super admin check
  const allUserRoles = [userRole, ...userRoles].filter(Boolean);
  
  // Debug logging for troubleshooting
  console.log('Middleware Auth Debug:', {
    pathname,
    userId: user.id,
    userRole,
    userRoles,
    userPermissions,
    userMetadata: user.user_metadata
  });
  
  // Check if user is super admin (bypass all permission checks)
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

  
  console.log('Super Admin Check:', { 
    isSuperAdmin, 
    allUserRoles,
    finalSuperAdminStatus: isSuperAdmin 
  });

  if (isSuperAdmin) {
    console.log('Super admin detected, bypassing permission checks');
    return NextResponse.next();
  }

  // Don't check permissions for dashboard route to prevent redirect loops
  if (pathname === '/dashboard') {
    console.log('Dashboard route detected, skipping permission checks');
    return NextResponse.next();
  }

  // Get required permissions for this route
  const requiredPermissions = getRequiredPermissions(pathname);

  console.log('Route Permission Check:', {
    pathname,
    requiredPermissions,
    willCheckPermissions: requiredPermissions.length > 0
  });

  if (requiredPermissions.length > 0) {
    // Check if user has required permissions using database-driven permissions
    const hasPermission = hasRequiredPermissions(userPermissions, requiredPermissions);
    
    console.log('Permission Check Result:', {
      hasPermission,
      userPermissions,
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
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|.*\\..+$).*)',
    // Include API routes
    '/(api|trpc)(.*)',
  ],
};
