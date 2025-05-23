"use client";

import { useAuth } from "@/hooks/useAuth";
import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePermissions } from "@/hooks/usePermissions";
import { useUserRole } from "@/hooks/useUserRole";
import { Role } from "@/types/permissions";

export default function DebugRole() {
  const { user } = useAuth();
  const { isSuperAdmin: permissionIsSuperAdmin, userRoles } = usePermissions();
  const { user: clerkUser } = useUser();
  const { isSuperAdmin: roleIsSuperAdmin } = useUserRole();
  
  // Get superadmin checks in all formats
  const hasCapitalizedSuperAdmin = user?.roles?.includes('SuperAdmin') || user?.role === 'SuperAdmin';
  const hasLowercaseSuperAdmin = user?.roles?.includes('superadmin') || user?.role === 'superadmin';
  const hasEnumSuperAdmin = user?.roles?.includes(Role.SUPER_ADMIN) || user?.role === Role.SUPER_ADMIN;
  
  return (
    <div className="container py-8">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>User Role Debug</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">User from useAuth:</h3>
            <pre className="bg-muted p-4 rounded-md overflow-auto text-xs">
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">User Roles from usePermissions:</h3>
            <p>Roles: {JSON.stringify(userRoles)}</p>
            <p>Is Super Admin (permissions): {String(permissionIsSuperAdmin)}</p>
            <p>Is Super Admin (useUserRole): {String(roleIsSuperAdmin)}</p>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">SuperAdmin Role Checks:</h3>
            <p>Has 'SuperAdmin': {String(hasCapitalizedSuperAdmin)}</p>
            <p>Has 'superadmin': {String(hasLowercaseSuperAdmin)}</p>
            <p>Has enum 'super_admin': {String(hasEnumSuperAdmin)}</p>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">Raw Clerk User (publicMetadata):</h3>
            <pre className="bg-muted p-4 rounded-md overflow-auto text-xs">
              {JSON.stringify(clerkUser?.publicMetadata, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 