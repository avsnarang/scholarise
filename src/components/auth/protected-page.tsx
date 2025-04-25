import type { ReactNode } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { RoleGuard } from './role-guard';

interface ProtectedPageProps {
  children: ReactNode;
  title?: string;
  allowedRoles?: string[];
  fallbackPath?: string;
}

export function ProtectedPage({
  children,
  title,
  allowedRoles,
  fallbackPath = '/dashboard',
}: ProtectedPageProps) {
  const { isLoading } = useAuth();
  const router = useRouter();

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // If roles are specified, use RoleGuard
  if (allowedRoles && allowedRoles.length > 0) {
    return (
      <RoleGuard allowedRoles={allowedRoles} fallbackPath={fallbackPath}>
        <div>
          {title && <h1 className="mb-6 text-2xl font-bold">{title}</h1>}
          {children}
        </div>
      </RoleGuard>
    );
  }

  // Otherwise, just render the children (already protected by middleware)
  return (
    <div>
      {title && <h1 className="mb-6 text-2xl font-bold">{title}</h1>}
      {children}
    </div>
  );
}
