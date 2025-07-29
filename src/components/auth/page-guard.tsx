"use client";

import React from "react";
import { RouteGuard } from "@/components/route-guard";
import { Permission } from "@/types/permissions";

interface PageGuardProps {
  children: React.ReactNode;
  permissions: Permission[];
  title?: string;
  message?: string;
  fallbackPage?: string;
  redirectOnFail?: boolean;
}

export function PageGuard({
  children,
  permissions,
  title,
  message,
  fallbackPage = "/dashboard",
  redirectOnFail = false,
}: PageGuardProps) {
  return (
    <RouteGuard
      requiredPermissions={permissions}
      redirectOnFail={redirectOnFail}
      redirectTo={fallbackPage}
      fallbackTitle={title}
      fallbackMessage={message}
    >
      {children}
    </RouteGuard>
  );
}

// Higher-order component for protecting pages
export function withPageGuard<P extends object>(
  Component: React.ComponentType<P>,
  permissions: Permission[],
  options?: {
    title?: string;
    message?: string;
    fallbackPage?: string;
    redirectOnFail?: boolean;
  }
) {
  const ProtectedComponent = (props: P) => {
    return (
      <PageGuard
        permissions={permissions}
        title={options?.title}
        message={options?.message}
        fallbackPage={options?.fallbackPage}
        redirectOnFail={options?.redirectOnFail}
      >
        <Component {...props} />
      </PageGuard>
    );
  };

  // Set display name for debugging
  ProtectedComponent.displayName = `withPageGuard(${Component.displayName || Component.name})`;
  
  return ProtectedComponent;
}

// Specific guards for common use cases
export function AdminOnlyPageGuard({ children }: { children: React.ReactNode }) {
  return (
    <PageGuard
      permissions={[Permission.MANAGE_ROLES]}
      title="Admin Access Required"
      message="This page is restricted to administrators only. You need admin privileges to access this section."
    >
      {children}
    </PageGuard>
  );
}

export function StudentManagementPageGuard({ children }: { children: React.ReactNode }) {
  return (
    <PageGuard
      permissions={[Permission.VIEW_STUDENTS]}
      title="Student Management Access Required"
      message="You need student management permissions to access this page. Contact your administrator to request access."
    >
      {children}
    </PageGuard>
  );
}

export function CreateStudentPageGuard({ children }: { children: React.ReactNode }) {
  return (
    <PageGuard
      permissions={[Permission.CREATE_STUDENT]}
      title="Student Creation Access Required"
      message="You don't have permission to create new students. This action requires 'Create Student' permission."
    >
      {children}
    </PageGuard>
  );
}

export function CommunicationPageGuard({ children }: { children: React.ReactNode }) {
  return (
    <PageGuard
      permissions={[Permission.VIEW_COMMUNICATION]}
      title="Communication Access Required"
      message="You need communication permissions to access messaging features. Contact your administrator to request access."
    >
      {children}
    </PageGuard>
  );
}

export function SubjectsPageGuard({ children }: { children: React.ReactNode }) {
  return (
    <PageGuard
      permissions={[Permission.VIEW_SUBJECTS]}
      title="Subjects Access Required"
      message="You need subjects management permissions to access this page. Contact your administrator to request access."
    >
      {children}
    </PageGuard>
  );
}

export function AdmissionsPageGuard({ children }: { children: React.ReactNode }) {
  return (
    <PageGuard
      permissions={[Permission.MANAGE_ADMISSIONS]}
      title="Admissions Access Required"
      message="You need admissions management permissions to access this page. Contact your administrator to request access."
    >
      {children}
    </PageGuard>
  );
} 