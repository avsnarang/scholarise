"use client";

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { api } from '@/utils/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

export function PermissionDebugger() {
  const { user, isAuthenticated } = useAuth();
  const { permissions, roles, isSuperAdmin, canAccess, isLoading } = usePermissions();
  const [isFixing, setIsFixing] = useState(false);
  const [fixResult, setFixResult] = useState<{ success: boolean; message: string } | null>(null);

  // Get raw database data
  const { data: dbUserRoles = [] } = api.role.getUserRoles.useQuery(
    { userId: user?.id || '' },
    { enabled: !!user?.id && isAuthenticated }
  );
  
  const { data: dbUserPermissions = [] } = api.role.getUserPermissions.useQuery(
    { userId: user?.id || '' },
    { enabled: !!user?.id && isAuthenticated }
  );

  if (!isAuthenticated || !user) {
    return <div>User not authenticated</div>;
  }

  if (isLoading) {
    return <div>Loading permission data...</div>;
  }

  // Test key permissions for sidebar visibility
  const keyPermissions = [
    'view_dashboard',
    'view_students',
    'view_teachers',
    'view_employees',
    'view_classes',
    'view_attendance',
    'view_finance_module',
    'view_examinations',
    'view_settings'
  ];

  // Function to fix user permissions
  const fixUserPermissions = async () => {
    if (!user?.id) return;
    
    setIsFixing(true);
    setFixResult(null);
    
    try {
      const response = await fetch('/api/fix-permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'sync_current_user'
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setFixResult({ success: true, message: result.message });
        // Refresh the page after a short delay to show updated permissions
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setFixResult({ success: false, message: result.error || 'Failed to sync permissions' });
      }
    } catch (error) {
      setFixResult({ success: false, message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` });
    } finally {
      setIsFixing(false);
    }
  };

  // Function to fix CBSE In-Charge role permissions
  const fixCBSEInChargePermissions = async () => {
    setIsFixing(true);
    setFixResult(null);
    
    try {
      const response = await fetch('/api/fix-permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'sync_cbse_incharge'
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setFixResult({ success: true, message: result.message });
      } else {
        setFixResult({ success: false, message: result.error || 'Failed to sync CBSE In-Charge permissions' });
      }
    } catch (error) {
      setFixResult({ success: false, message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` });
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Permission Debugger</CardTitle>
          <CardDescription>
            Debug information for user: {user.email} (ID: {user.id})
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* Fix Actions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3 text-blue-800">Permission Fix Actions</h3>
            <div className="flex flex-wrap gap-3 mb-3">
              <Button 
                onClick={fixUserPermissions}
                disabled={isFixing}
                className="flex items-center gap-2"
              >
                {isFixing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Sync My Permissions
              </Button>
              
              <Button 
                onClick={fixCBSEInChargePermissions}
                disabled={isFixing}
                variant="outline"
                className="flex items-center gap-2"
              >
                {isFixing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Fix CBSE In-Charge Role
              </Button>
            </div>
            
            {fixResult && (
              <div className={`flex items-center gap-2 p-3 rounded ${
                fixResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {fixResult.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                {fixResult.message}
              </div>
            )}
            
            <p className="text-sm text-blue-600 mt-2">
              If you have permission issues, click "Sync My Permissions" to refresh your permissions from the database.
              If you're an admin troubleshooting the CBSE In-Charge role, use the second button.
            </p>
          </div>

          {/* User Metadata */}
          <div>
            <h3 className="text-lg font-semibold mb-2">User Metadata (Supabase Auth)</h3>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
              {JSON.stringify({
                role: user.role,
                roles: user.roles,
                branchId: user.branchId,
              }, null, 2)}
            </pre>
          </div>

          {/* Database Roles */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Database Roles ({dbUserRoles.length})</h3>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
              {JSON.stringify(dbUserRoles.map(ur => ({
                roleName: ur.role?.name,
                roleId: ur.roleId,
                branchId: ur.branchId,
                isActive: ur.isActive,
                teacherId: ur.teacherId,
                employeeId: ur.employeeId
              })), null, 2)}
            </pre>
          </div>

          {/* Database Permissions */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Database Permissions ({dbUserPermissions.length})</h3>
            <div className="bg-gray-100 p-3 rounded text-sm max-h-60 overflow-auto">
              {dbUserPermissions.length > 0 ? (
                <ul className="space-y-1">
                  {dbUserPermissions.sort().map(permission => (
                    <li key={permission} className="text-xs">• {permission}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-red-600">No permissions found in database!</p>
              )}
            </div>
          </div>

          {/* Permission Tests */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Key Permission Tests</h3>
            <div className="grid grid-cols-2 gap-2">
              {keyPermissions.map(permission => (
                <div key={permission} className={`p-2 rounded text-sm ${
                  canAccess([permission]) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {permission}: {canAccess([permission]) ? '✅' : '❌'}
                </div>
              ))}
            </div>
          </div>

          {/* Super Admin Check */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Super Admin Status</h3>
            <div className={`p-3 rounded ${isSuperAdmin ? 'bg-green-100' : 'bg-yellow-100'}`}>
              Is Super Admin: {isSuperAdmin ? 'Yes' : 'No'}
            </div>
          </div>

          {/* Sidebar Visibility Logic */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Sidebar Visibility Tests</h3>
            <div className="space-y-2">
              <div>Dashboard visible: {(isSuperAdmin || canAccess(['view_dashboard'])) ? '✅' : '❌'}</div>
              <div>Students section visible: {(isSuperAdmin || canAccess(['view_students'])) ? '✅' : '❌'}</div>
              <div>Staff section visible: {(isSuperAdmin || canAccess(['view_teachers', 'view_employees'])) ? '✅' : '❌'}</div>
              <div>Classes section visible: {(isSuperAdmin || canAccess(['view_classes'])) ? '✅' : '❌'}</div>
              <div>Attendance section visible: {(isSuperAdmin || canAccess(['view_attendance', 'mark_attendance', 'mark_self_attendance', 'mark_all_staff_attendance'])) ? '✅' : '❌'}</div>
              <div>Settings section visible: {(isSuperAdmin || canAccess(['view_settings'])) ? '✅' : '❌'}</div>
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
} 