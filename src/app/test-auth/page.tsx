"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useRouter } from "next/navigation";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Shield, CheckCircle, XCircle, AlertCircle, User, Lock, Key, Eye } from "lucide-react";

export default function TestAuthPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { userPermissions, userRoles, isSuperAdmin, can } = usePermissions();
  const router = useRouter();
  const [testResults, setTestResults] = useState<Array<{
    test: string;
    status: 'pass' | 'fail' | 'pending';
    message: string;
  }>>([]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      runTests();
    }
  }, [isLoading, isAuthenticated, userPermissions.length, userRoles.length, isSuperAdmin]);

  const runTests = async () => {
    const results = [];

    // Test 1: User Authentication
    results.push({
      test: "User Authentication",
      status: isAuthenticated ? 'pass' as const : 'fail' as const,
      message: isAuthenticated 
        ? `User is authenticated as ${user?.name || user?.email}` 
        : "User is not authenticated"
    });

    // Test 2: Role Assignment
    results.push({
      test: "Role Assignment",
      status: userRoles.length > 0 ? 'pass' as const : 'fail' as const,
      message: userRoles.length > 0 
        ? `User has roles: ${userRoles.join(', ')}` 
        : "User has no roles assigned"
    });

    // Test 3: Permission Loading
    results.push({
      test: "Permission Loading",
      status: userPermissions.length > 0 ? 'pass' as const : 'fail' as const,
      message: userPermissions.length > 0 
        ? `User has ${userPermissions.length} permissions` 
        : "User has no permissions"
    });

    // Test 4: Super Admin Check
    results.push({
      test: "Super Admin Check",
      status: 'pass' as const,
      message: isSuperAdmin 
        ? "User is a Super Admin" 
        : "User is not a Super Admin"
    });

    // Test 5: Basic Permission Check
    const hasAnyPermission = userPermissions.length > 0;
    results.push({
      test: "Basic Permission Check",
      status: hasAnyPermission ? 'pass' as const : 'fail' as const,
      message: hasAnyPermission 
        ? "User has functional permissions" 
        : "User has no functional permissions"
    });

    setTestResults(results);
  };

  const testRouteAccess = (route: string) => {
    router.push(route);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'fail': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending': return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  if (isLoading) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00501B] mx-auto mb-4"></div>
            <p className="text-gray-600">Loading authentication test...</p>
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (!isAuthenticated) {
    return (
      <PageWrapper>
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Authentication Test
            </CardTitle>
            <CardDescription>
              You need to be signed in to run the authentication tests.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Not Authenticated</AlertTitle>
              <AlertDescription>
                Please sign in to access the authentication test page.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Authentication & Authorization Test
            </CardTitle>
            <CardDescription>
              Test the authentication and authorization system implementation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* User Information */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <h3 className="font-semibold">User Information</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div><strong>Name:</strong> {user?.name || 'Not provided'}</div>
                  <div><strong>Email:</strong> {user?.email || 'Not provided'}</div>
                  <div><strong>User ID:</strong> {user?.id || 'Not provided'}</div>
                  <div><strong>Branch ID:</strong> {user?.branchId || 'Not provided'}</div>
                  <div className="flex items-center space-x-2">
                    <strong>Super Admin:</strong>
                    <Badge variant={isSuperAdmin ? "default" : "secondary"}>
                      {isSuperAdmin ? "Yes" : "No"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Role Information */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Key className="h-4 w-4" />
                  <h3 className="font-semibold">Roles & Permissions</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <strong>Roles:</strong>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {userRoles.length > 0 ? userRoles.map(role => (
                        <Badge key={role} variant="outline">{role}</Badge>
                      )) : <span className="text-gray-500">No roles assigned</span>}
                    </div>
                  </div>
                  <div>
                    <strong>Permissions:</strong>
                    <div className="text-gray-600 mt-1">
                      {userPermissions.length} permissions granted
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Eye className="h-5 w-5 mr-2" />
              Test Results
            </CardTitle>
            <CardDescription>
              Results of authentication and authorization tests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {testResults.map((result, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
                  {getStatusIcon(result.status)}
                  <div className="flex-1">
                    <div className="font-medium">{result.test}</div>
                    <div className="text-sm text-gray-600">{result.message}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Route Access Tests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Lock className="h-5 w-5 mr-2" />
              Route Access Tests
            </CardTitle>
            <CardDescription>
              Test access to different routes based on permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">Student Management</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testRouteAccess('/students')}
                  className="w-full justify-start"
                >
                  View Students
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testRouteAccess('/students/create')}
                  className="w-full justify-start"
                >
                  Create Student
                </Button>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Staff Management</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testRouteAccess('/teachers')}
                  className="w-full justify-start"
                >
                  View Teachers
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testRouteAccess('/employees')}
                  className="w-full justify-start"
                >
                  View Employees
                </Button>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">System Management</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testRouteAccess('/settings')}
                  className="w-full justify-start"
                >
                  Settings
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testRouteAccess('/admin')}
                  className="w-full justify-start"
                >
                  Admin Panel
                </Button>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Academic Management</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testRouteAccess('/examination')}
                  className="w-full justify-start"
                >
                  Examination
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testRouteAccess('/finance')}
                  className="w-full justify-start"
                >
                  Finance
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Permission Details */}
        <Card>
          <CardHeader>
            <CardTitle>All Permissions</CardTitle>
            <CardDescription>
              Complete list of permissions assigned to your user
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {userPermissions.length > 0 ? userPermissions.map(permission => (
                <Badge key={permission} variant="outline" className="text-xs">
                  {permission}
                </Badge>
              )) : (
                <div className="col-span-full text-center text-gray-500">
                  No permissions assigned
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
} 