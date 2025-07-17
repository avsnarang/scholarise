"use client";

import { api } from "@/utils/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Users, Key, Settings } from "lucide-react";
import Link from "next/link";
import { usePermissions } from "@/hooks/usePermissions";

export function RBACOverview() {
  const { hasPermission } = usePermissions();

  // Queries
  const { data: roles = [] } = api.role.getAll.useQuery({
    includeSystem: true,
    includeInactive: false,
  });

  const { data: permissions = [] } = api.permission.getAll.useQuery({
    includeSystem: true,
    includeInactive: false,
  });

  const { data: categories = [] } = api.permission.getCategories.useQuery();

  // Check permissions
  const canManageRoles = hasPermission('manage_roles');

  const systemRoles = roles.filter(role => role.isSystem);
  const customRoles = roles.filter(role => !role.isSystem);
  const systemPermissions = permissions.filter(perm => perm.isSystem);
  const customPermissions = permissions.filter(perm => !perm.isSystem);

  // Calculate total users assigned to roles
  const totalUsersWithRoles = roles.reduce((total, role) => {
    return total + (role.userRoles?.length || 0);
  }, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">RBAC System Overview</h2>
        <p className="text-muted-foreground">
          Role-Based Access Control system statistics and management
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roles.length}</div>
            <p className="text-xs text-muted-foreground">
              {systemRoles.length} system, {customRoles.length} custom
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Permissions</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{permissions.length}</div>
            <p className="text-xs text-muted-foreground">
              {systemPermissions.length} system, {customPermissions.length} custom
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Permission Categories</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
            <p className="text-xs text-muted-foreground">
              Organized permission groups
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Users with Roles</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsersWithRoles}</div>
            <p className="text-xs text-muted-foreground">
              Role assignments active
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Most Used Roles */}
        <Card>
          <CardHeader>
            <CardTitle>Most Used Roles</CardTitle>
            <CardDescription>
              Roles with the highest number of user assignments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {roles
                .sort((a, b) => (b.userRoles?.length || 0) - (a.userRoles?.length || 0))
                .slice(0, 5)
                .map((role) => (
                  <div key={role.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      <span className="font-medium">{role.name}</span>
                      {role.isSystem && <Badge variant="secondary" className="text-xs">System</Badge>}
                    </div>
                    <Badge variant="outline">
                      {role.userRoles?.length || 0} users
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Permission Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Permission Categories</CardTitle>
            <CardDescription>
              Breakdown of permissions by category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {categories
                .sort((a, b) => b.count - a.count)
                .slice(0, 8)
                .map((category) => (
                  <div key={category.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4" />
                      <span className="font-medium">
                        {category.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </div>
                    <Badge variant="outline">
                      {category.count} permissions
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      {canManageRoles && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common RBAC management tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Link href="/settings/roles">
                <Button variant="outline">
                  <Shield className="w-4 h-4 mr-2" />
                  Manage Roles
                </Button>
              </Link>
              <Button variant="outline" disabled>
                <Key className="w-4 h-4 mr-2" />
                Manage Permissions
              </Button>
              <Button variant="outline" disabled>
                <Users className="w-4 h-4 mr-2" />
                User Role Assignments
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 