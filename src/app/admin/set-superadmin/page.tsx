"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

export default function SetSuperAdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const makeSuperAdmin = async () => {
    if (!user) {
      setError("No authenticated user found");
      return;
    }

    setIsLoading(true);
    setMessage("");
    setError("");

    try {
      // Use the API call method to update user metadata
      const response = await fetch('/api/set-superadmin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update user role');
      }
      
      setMessage("Successfully set user as Super Admin! Reloading in 2 seconds...");
      
      // Force a reload after 2 seconds to reflect the changes
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      setError(`Failed to update user role. Please contact support.`);
      console.error("Error updating user role:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container py-8">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Set Super Admin Role</CardTitle>
          <CardDescription>
            Use this utility to set your current user account as a Super Admin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-1">Current User:</h3>
              <p>{user?.name} ({user?.email})</p>
            </div>
            <div>
              <h3 className="font-medium mb-1">Current Role(s):</h3>
              <p>{user?.roles?.join(", ") || user?.role || "No roles assigned"}</p>
            </div>
            
            {message && (
              <div className="bg-green-50 text-green-800 p-3 rounded-md border border-green-200">
                {message}
              </div>
            )}
            
            {error && (
              <div className="bg-red-50 text-red-800 p-3 rounded-md border border-red-200">
                {error}
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button 
            onClick={makeSuperAdmin} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? "Setting Role..." : "Make Super Admin"}
          </Button>
          
          <p className="text-xs text-muted-foreground text-center">
            If you continue to have issues, try logging out and logging back in after setting the role.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
} 