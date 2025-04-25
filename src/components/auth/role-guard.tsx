import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
  fallbackPath?: string;
}

export function RoleGuard({ 
  children, 
  allowedRoles, 
  fallbackPath = '/dashboard' 
}: RoleGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      // Check if user has at least one of the allowed roles
      const hasAllowedRole = allowedRoles.some(role => 
        user.roles?.includes(role) || user.role === role
      );

      if (!hasAllowedRole) {
        void router.push(fallbackPath);
      }
    }
  }, [user, isLoading, allowedRoles, fallbackPath, router]);

  // Show loading state while checking
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // If user has required role, render children
  if (user && allowedRoles.some(role => user.roles?.includes(role) || user.role === role)) {
    return <>{children}</>;
  }

  // Otherwise render nothing (will redirect in useEffect)
  return null;
}
