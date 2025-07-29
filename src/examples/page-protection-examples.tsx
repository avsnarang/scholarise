/**
 * PAGE PROTECTION EXAMPLES
 * 
 * This file demonstrates all the different ways to protect pages using the new
 * authentication system. Users without proper permissions will see a "no access"
 * page instead of being redirected.
 */

"use client";

import { 
  PageGuard, 
  CreateStudentPageGuard,
  SubjectsPageGuard,
  AdmissionsPageGuard,
  CommunicationPageGuard,
  AdminOnlyPageGuard,
  withPageGuard 
} from "@/components/auth/page-guard";
import { Permission } from "@/types/permissions";

// ===== METHOD 1: Using specific pre-built guards =====

export function ExampleCreateStudentPage() {
  return (
    <CreateStudentPageGuard>
      <div className="p-6">
        <h1>Create Student Page</h1>
        <p>This page requires 'create_student' permission.</p>
        <p>Users without this permission will see the "no access" page.</p>
      </div>
    </CreateStudentPageGuard>
  );
}

export function ExampleSubjectsPage() {
  return (
    <SubjectsPageGuard>
      <div className="p-6">
        <h1>Subjects Management</h1>
        <p>This page requires 'view_subjects' permission.</p>
      </div>
    </SubjectsPageGuard>
  );
}

export function ExampleAdmissionsPage() {
  return (
    <AdmissionsPageGuard>
      <div className="p-6">
        <h1>Admissions Management</h1>
        <p>This page requires 'manage_admissions' permission.</p>
      </div>
    </AdmissionsPageGuard>
  );
}

// ===== METHOD 2: Using the flexible PageGuard component =====

export function ExampleCustomProtectedPage() {
  return (
    <PageGuard
      permissions={[Permission.CREATE_TEACHER, Permission.EDIT_TEACHER]}
      title="Teacher Management Access Required"
      message="You need teacher management permissions to access this page. Contact your administrator to request 'Create Teacher' or 'Edit Teacher' permissions."
    >
      <div className="p-6">
        <h1>Teacher Management</h1>
        <p>This page requires either 'create_teacher' OR 'edit_teacher' permission.</p>
        <p>The PageGuard checks if the user has ANY of the required permissions.</p>
      </div>
    </PageGuard>
  );
}

export function ExampleFinanceProtectedPage() {
  return (
    <PageGuard
      permissions={[Permission.VIEW_FINANCE_MODULE]}
      title="Finance Module Access Denied"
      message="Access to the finance module is restricted to authorized personnel only. Please contact your administrator to request finance permissions."
      fallbackPage="/dashboard"
    >
      <div className="p-6">
        <h1>Finance Dashboard</h1>
        <p>This page requires 'view_finance_module' permission.</p>
        <p>Custom title and message are displayed when access is denied.</p>
      </div>
    </PageGuard>
  );
}

// ===== METHOD 3: Using Higher-Order Component (HOC) =====

function BaseReportsPage() {
  return (
    <div className="p-6">
      <h1>Reports Dashboard</h1>
      <p>This page is protected using the withPageGuard HOC.</p>
      <p>Users need 'view_reports' permission to access this page.</p>
    </div>
  );
}

// Export the protected version
export const ExampleReportsPage = withPageGuard(
  BaseReportsPage,
  [Permission.VIEW_REPORTS],
  {
    title: "Reports Access Required",
    message: "You need reporting permissions to view this dashboard. Please contact your administrator for access.",
  }
);

// ===== METHOD 4: Multiple permission combinations =====

export function ExampleAdvancedPermissionsPage() {
  return (
    <PageGuard
      permissions={[Permission.MANAGE_ROLES, Permission.VIEW_RBAC_SETTINGS]}
      title="RBAC Management Access Required"
      message="This page requires role management or RBAC viewing permissions. You need elevated privileges to access user management features."
    >
      <div className="p-6">
        <h1>User Role Management</h1>
        <p>This page requires 'manage_roles' OR 'view_rbac_settings' permission.</p>
        <p>Users with either permission can access this page.</p>
      </div>
    </PageGuard>
  );
}

// ===== METHOD 5: Admin-only protection =====

export function ExampleAdminOnlyPage() {
  return (
    <AdminOnlyPageGuard>
      <div className="p-6">
        <h1>System Administration</h1>
        <p>This page is restricted to administrators only.</p>
        <p>Requires 'manage_roles' permission (admin-level access).</p>
      </div>
    </AdminOnlyPageGuard>
  );
}

// ===== METHOD 6: Redirect vs Show No Access =====

export function ExampleRedirectPage() {
  return (
    <PageGuard
      permissions={[Permission.MANAGE_SYSTEM_SETTINGS]} // Super admin functionality
      title="Super Admin Required"
      message="This page is for super administrators only."
      redirectOnFail={true}  // This will redirect instead of showing no access page
      fallbackPage="/dashboard"
    >
      <div className="p-6">
        <h1>Super Admin Panel</h1>
        <p>This page redirects unauthorized users instead of showing no access page.</p>
      </div>
    </PageGuard>
  );
}

// ===== HOW TO IMPLEMENT IN YOUR PAGES =====

/*

// For App Router pages (src/app/your-page/page.tsx):

"use client";

import { CreateStudentPageGuard } from "@/components/auth/page-guard";

function YourPageContent() {
  return (
    <div>
      Your protected content here
    </div>
  );
}

export default function YourPage() {
  return (
    <CreateStudentPageGuard>
      <YourPageContent />
    </CreateStudentPageGuard>
  );
}

// Or with custom permissions:

export default function YourCustomPage() {
  return (
    <PageGuard
      permissions={[]} // Replace with actual Permission enum values
      title="Custom Access Required"
      message="You need specific permissions to access this page."
    >
      <YourPageContent />
    </PageGuard>
  );
}

*/

// ===== TESTING THE PROTECTION =====

/*

To test the protection system:

1. Remove the required permission from your user role
2. Try accessing the protected URL directly (e.g., /students/create)
3. You should see the "no access" page instead of the actual content
4. The middleware will also block the request at the server level

Common test scenarios:
- /students/create (requires 'create_student')
- /subjects/manage (requires 'manage_subjects') 
- /communication (requires 'view_communication')
- /admissions (requires 'manage_admissions')

*/ 