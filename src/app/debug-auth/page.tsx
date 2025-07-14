"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/usePermissions";
import { Copy, RefreshCw } from "lucide-react";
import { useState } from "react";

export default function DebugAuthPage() {
  const { userId, sessionClaims, getToken } = useAuth();
  const { user } = useUser();
  const { isSuperAdmin, userRoles, userPermissions } = usePermissions();
  const [refreshing, setRefreshing] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const refreshData = async () => {
    setRefreshing(true);
    // Force refresh by reloading the page
    window.location.reload();
  };

  const debugData = {
    userId,
    sessionClaims,
    userFromUseUser: user ? {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      emailAddress: user.primaryEmailAddress?.emailAddress,
      publicMetadata: user.publicMetadata,
      unsafeMetadata: user.unsafeMetadata,
    } : null,
    userFromPermissionsHook: {
      isSuperAdmin,
      userRoles,
      userPermissions: userPermissions.slice(0, 10), // Show first 10 permissions
      totalPermissions: userPermissions.length
    }
  };

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Debug Auth Information
              <Button
                onClick={refreshData}
                disabled={refreshing}
                size="sm"
                variant="outline"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </CardTitle>
            <CardDescription>
              Complete debug information for authentication and authorization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Quick Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-sm text-gray-600">User ID</div>
                <div className="font-mono text-sm">{userId || 'Not found'}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600">Super Admin Status</div>
                <Badge variant={isSuperAdmin ? "default" : "secondary"}>
                  {isSuperAdmin ? "Yes" : "No"}
                </Badge>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600">Total Permissions</div>
                <div className="font-semibold">{userPermissions.length}</div>
              </div>
            </div>

            {/* Session Claims */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Session Claims</h3>
                <Button
                  onClick={() => copyToClipboard(JSON.stringify(sessionClaims, null, 2))}
                  size="sm"
                  variant="outline"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
              <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-auto max-h-60 font-mono">
                {JSON.stringify(sessionClaims, null, 2)}
              </pre>
            </div>

            {/* User Metadata */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">User Metadata (from useUser)</h3>
                <Button
                  onClick={() => copyToClipboard(JSON.stringify(debugData.userFromUseUser, null, 2))}
                  size="sm"
                  variant="outline"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
              <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-auto max-h-60 font-mono">
                {JSON.stringify(debugData.userFromUseUser, null, 2)}
              </pre>
            </div>

            {/* Permission Hook Data */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Permissions Hook Data</h3>
                <Button
                  onClick={() => copyToClipboard(JSON.stringify(debugData.userFromPermissionsHook, null, 2))}
                  size="sm"
                  variant="outline"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
              <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-auto max-h-60 font-mono">
                {JSON.stringify(debugData.userFromPermissionsHook, null, 2)}
              </pre>
            </div>

            {/* Roles */}
            <div>
              <h3 className="font-semibold mb-2">User Roles</h3>
              <div className="flex flex-wrap gap-2">
                {userRoles.length > 0 ? userRoles.map(role => (
                  <Badge key={role} variant="outline">{role}</Badge>
                )) : <span className="text-gray-500">No roles found</span>}
              </div>
            </div>

            {/* Key Metadata Fields */}
            <div>
              <h3 className="font-semibold mb-2">Key Metadata Fields</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium">publicMetadata.role</div>
                  <div className="font-mono text-sm bg-gray-100 p-2 rounded">
                    {user?.publicMetadata?.role as string || 'Not set'}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium">publicMetadata.roles</div>
                  <div className="font-mono text-sm bg-gray-100 p-2 rounded">
                    {JSON.stringify(user?.publicMetadata?.roles) || 'Not set'}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium">sessionClaims.metadata.role</div>
                  <div className="font-mono text-sm bg-gray-100 p-2 rounded">
                    {(sessionClaims?.metadata as any)?.role || 'Not set'}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium">sessionClaims.metadata.roles</div>
                  <div className="font-mono text-sm bg-gray-100 p-2 rounded">
                    {JSON.stringify((sessionClaims?.metadata as any)?.roles) || 'Not set'}
                  </div>
                </div>
              </div>
            </div>

            {/* Complete Debug Data */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Complete Debug Data</h3>
                <Button
                  onClick={() => copyToClipboard(JSON.stringify(debugData, null, 2))}
                  size="sm"
                  variant="outline"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy All
                </Button>
              </div>
              <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-auto max-h-96 font-mono">
                {JSON.stringify(debugData, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
} 