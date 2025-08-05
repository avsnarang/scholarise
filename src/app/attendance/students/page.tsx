"use client";

import React from "react";
import dynamic from "next/dynamic";
import { useUserRole } from "@/hooks/useUserRole";
import { usePermissions } from "@/hooks/usePermissions";
import { Permission } from "@/types/permissions";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, ShieldX } from "lucide-react";

// Dynamically import role-specific components to reduce bundle size
const ClassTeacherAttendance = dynamic(() => import("./components/class-teacher-attendance"), {
  ssr: false,
  loading: () => <AttendanceLoadingSkeleton />
});

const AdminAttendance = dynamic(() => import("./components/admin-attendance"), {
  ssr: false,
  loading: () => <AttendanceLoadingSkeleton />
});

// Loading skeleton component
function AttendanceLoadingSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center">
        <div className="bg-[#00501B] dark:bg-[#7aad8c] h-8 w-1.5 rounded-md mr-3"></div>
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="h-6 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// No permission component
function NoPermissionView() {
  return (
    <div className="space-y-2 p-2">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">
              Attendance System
            </h2>
        </div>
      
      <Card className="border-red-200 dark:border-red-800">
        <CardContent className="p-12 text-center">
          <ShieldX className="mx-auto h-16 w-16 text-red-500 mb-4" />
          <h3 className="text-xl font-semibold text-red-700 dark:text-red-400 mb-2">
            Access Denied
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            You don't have permission to access the student attendance system.
            Please contact your administrator if you believe this is an error.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// No role assignment component
function NoRoleView() {
  return (
    <div className="space-y-2 p-2">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">
          Attendance System
        </h2>
      </div>
      
      <Card className="border-yellow-200 dark:border-yellow-800">
        <CardContent className="p-12 text-center">
          <AlertTriangle className="mx-auto h-16 w-16 text-yellow-500 mb-4" />
          <h3 className="text-xl font-semibold text-yellow-700 dark:text-yellow-400 mb-2">
            No Role Assigned
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You haven't been assigned any role in the system yet. 
            Please contact your administrator to set up your role and class assignments.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            You need either a Teacher role with class assignments or appropriate administrative permissions to access attendance management.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Main Student Attendance Page with Role-Based Access Control
 * 
 * This component determines which attendance interface to show based on user role:
 * - Class Teachers: See only their assigned classes/sections
 * - Admin/Super Admin/Staff with permissions: See all classes with dropdowns
 */
export default function StudentAttendancePage() {
  const { isTeacher, isAdmin, isSuperAdmin, teacherId } = useUserRole();
  const { can } = usePermissions();

  // Check base attendance permissions
  const canViewAttendance = isSuperAdmin || can(Permission.VIEW_ATTENDANCE);
  const canMarkAttendance = isSuperAdmin || 
                            can(Permission.MARK_ATTENDANCE) || 
                            can(Permission.MARK_SELF_ATTENDANCE);

  // If user has no attendance permissions at all
  if (!canViewAttendance && !canMarkAttendance) {
    return <NoPermissionView />;
  }

  // Determine which component to render based on role and permissions
  const shouldShowTeacherView = isTeacher && teacherId && !isAdmin && !isSuperAdmin;
  const shouldShowAdminView = isSuperAdmin || isAdmin || can(Permission.MARK_ATTENDANCE);

  // If user is a teacher but has no teacher ID (not properly set up)
  if (shouldShowTeacherView && !teacherId) {
    return <NoRoleView />;
  }

  // If user has no suitable role for attendance
  if (!shouldShowTeacherView && !shouldShowAdminView) {
    return <NoRoleView />;
  }

  // Render appropriate attendance interface
  if (shouldShowTeacherView) {
    return <ClassTeacherAttendance teacherId={teacherId} />;
  }

  if (shouldShowAdminView) {
    return <AdminAttendance />;
  }

  // Fallback (should never reach here)
  return <NoRoleView />;
}