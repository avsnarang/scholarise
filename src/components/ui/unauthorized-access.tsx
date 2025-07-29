import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldX, Home, ArrowLeft, Lock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface UnauthorizedAccessProps {
  title?: string;
  message?: string;
  requiredPermissions?: string[];
  showBackButton?: boolean;
  showHomeButton?: boolean;
}

export function UnauthorizedAccess({
  title = "Access Denied",
  message = "You don't have permission to access this page. Please contact your administrator if you believe this is an error.",
  requiredPermissions = [],
  showBackButton = true,
  showHomeButton = true,
}: UnauthorizedAccessProps) {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-900 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <ShieldX className="h-10 w-10 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{title}</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Error 403 - Forbidden
          </p>
        </div>

        <Card className="border-red-200 dark:border-red-800">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-400">
              <Lock className="h-5 w-5" />
              Insufficient Permissions
            </CardTitle>
            <CardDescription className="text-red-600 dark:text-red-300">
              Your current role doesn't allow access to this resource.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {message}
            </p>
            
            {requiredPermissions.length > 0 && (
              <div className="rounded-md bg-gray-50 p-3 dark:bg-gray-800">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                  Required Permissions:
                </h4>
                <ul className="mt-2 space-y-1">
                  {requiredPermissions.map((permission, index) => (
                    <li key={index} className="text-xs text-gray-600 dark:text-gray-400">
                      • {permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                What you can do:
              </h4>
              <ul className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <li>• Contact your system administrator to request access</li>
                <li>• Return to a page you have permission to view</li>
                <li>• Check if you're logged in with the correct account</li>
              </ul>
            </div>

            <div className="flex flex-col gap-3 pt-4 sm:flex-row">
              {showBackButton && (
                <Button
                  variant="outline"
                  onClick={() => router.back()}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Go Back
                </Button>
              )}
              {showHomeButton && (
                <Button asChild className="flex items-center gap-2">
                  <Link href="/dashboard">
                    <Home className="h-4 w-4" />
                    Dashboard
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Need help? Contact your administrator or IT support team.
          </p>
        </div>
      </div>
    </div>
  );
} 