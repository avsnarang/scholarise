"use client";

import { useState } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Permission } from "@/types/permissions";
import { PageWrapper } from "@/components/layout/page-wrapper";

export default function DebugPermissionsPage() {
  const { user } = useAuth();
  const {
    roles,
    permissions,
    isSuperAdmin,
    isLoading,
    can,
    canAccess,
  } = usePermissions();

  const [testPermission, setTestPermission] = useState<Permission>(Permission.VIEW_ATTENDANCE);
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});

  // Test common permissions
  const commonPermissions = [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_ATTENDANCE,
    Permission.VIEW_STUDENTS,
    Permission.VIEW_TEACHERS,
    Permission.VIEW_EMPLOYEES,
    Permission.MANAGE_ROLES,
    Permission.CREATE_STUDENT,
    Permission.EDIT_STUDENT,
    Permission.VIEW_CLASSES,
    Permission.VIEW_FEES,
  ];

  const testPermissions = () => {
    const results: Record<string, boolean> = {};
    
    commonPermissions.forEach(permission => {
      results[permission] = can(permission);
    });
    
    setTestResults(results);
  };

  const testRouteAccess = () => {
    console.log("Testing route access...");
    
    // Test some common route permission combinations
    const routes = [
      { name: "Attendance", permissions: [Permission.VIEW_ATTENDANCE] },
      { name: "Students", permissions: [Permission.VIEW_STUDENTS] },
      { name: "User Management", permissions: [Permission.MANAGE_ROLES] },
      { name: "Create Student", permissions: [Permission.CREATE_STUDENT] },
    ];

    routes.forEach(route => {
      const hasAccess = canAccess(route.permissions);
      console.log(`Route "${route.name}" access: ${hasAccess}`);
    });
  };

  return (
    <PageWrapper>
      <div className="container mx-auto py-8 space-y-6">
        <h1 className="text-3xl font-bold text-[#00501B]">RBAC Debug Console</h1>
        
        {/* User Info */}
        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <strong>User ID:</strong> {user?.id || "Not available"}
            </div>
            <div>
              <strong>User Email:</strong> {user?.email || "Not available"}
            </div>
            <div>
              <strong>User Roles:</strong> {roles.length > 0 ? roles.map(role => role.role.name).join(", ") : "None"}
            </div>
            <div>
              <strong>Is Super Admin:</strong> <Badge variant={isSuperAdmin ? "default" : "secondary"}>{String(isSuperAdmin)}</Badge>
            </div>
            <div>
              <strong>Force Admin Mode:</strong> <Badge variant="secondary">Not applicable</Badge>
            </div>
            <div>
              <strong>Loading Permissions:</strong> <Badge variant={isLoading ? "destructive" : "default"}>{String(isLoading)}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* User Permissions */}
        <Card>
          <CardHeader>
            <CardTitle>User Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            {permissions.length > 0 ? (
              <div className="space-y-2">
                <p><strong>Count:</strong> {permissions.length}</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {permissions.map((permission: string) => (
                    <Badge key={permission} variant="outline" className="text-xs">
                      {permission.replace(/_/g, " ")}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No user permissions loaded</p>
            )}
          </CardContent>
        </Card>

        {/* Permission Testing */}
        <Card>
          <CardHeader>
            <CardTitle>Permission Testing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={testPermissions}>Test Common Permissions</Button>
              <Button onClick={testRouteAccess} variant="outline">Test Route Access</Button>
            </div>
            
            {Object.keys(testResults).length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Permission Test Results:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {Object.entries(testResults).map(([permission, hasPermission]) => (
                    <div key={permission} className="flex justify-between items-center p-2 border rounded">
                      <span className="text-sm">{permission.replace(/_/g, " ")}</span>
                      <Badge variant={hasPermission ? "default" : "destructive"}>
                        {hasPermission ? "✓" : "✗"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Manual Permission Test */}
        <Card>
          <CardHeader>
            <CardTitle>Manual Permission Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Select Permission to Test:
              </label>
              <select 
                value={testPermission}
                onChange={(e) => setTestPermission(e.target.value as Permission)}
                className="w-full p-2 border rounded"
              >
                {Object.values(Permission).map((permission) => (
                  <option key={permission} value={permission}>
                    {permission.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={() => {
                const result = can(testPermission);
                alert(`Permission "${testPermission}": ${result ? "GRANTED" : "DENIED"}`);
              }}>
                Test Permission
              </Button>
              
              <Button onClick={() => {
                const result = canAccess([testPermission]);
                alert(`Route access for "${testPermission}": ${result ? "GRANTED" : "DENIED"}`);
              }} variant="outline">
                Test Route Access
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Raw Data */}
        <Card>
          <CardHeader>
            <CardTitle>Raw Data (Developer Info)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold">User Object:</h4>
                <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                  {JSON.stringify(user, null, 2)}
                </pre>
              </div>
              
              <div>
                <h4 className="font-semibold">User Permissions Array:</h4>
                <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                  {JSON.stringify(permissions, null, 2)}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
} 