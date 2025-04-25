import { useAuth } from './useAuth';

export function useHasRole(roles: string | string[]): boolean {
  const { user } = useAuth();
  
  if (!user) return false;
  
  const rolesToCheck = Array.isArray(roles) ? roles : [roles];
  
  // Check if user has any of the specified roles
  return rolesToCheck.some(role => 
    user.roles?.includes(role) || user.role === role
  );
}
