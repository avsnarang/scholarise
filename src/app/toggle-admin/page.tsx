"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useUserRole } from "@/hooks/useUserRole";

export default function ToggleAdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [status, setStatus] = useState("");
  const { isTeacher } = useUserRole();
  
  // Check current state on load
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const forceAdmin = localStorage.getItem('forceAdmin') === 'true';
    setIsAdmin(forceAdmin);
  }, []);
  
  // Toggle admin mode
  const toggleAdmin = () => {
    try {
      if (isAdmin) {
        // Disable admin mode
        localStorage.removeItem('forceAdmin');
        localStorage.removeItem('userRole');
        setStatus("Admin mode disabled. Reloading...");
      } else {
        // Enable admin mode
        localStorage.setItem('forceAdmin', 'true');
        localStorage.setItem('userRole', 'super_admin');
        setStatus("Admin mode enabled. Reloading...");
      }
      
      // Update state
      setIsAdmin(!isAdmin);
      
      // Reload after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`);
    }
  };
  
  return (
    <div className="container py-8">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Admin Mode Toggle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-2">
            <Switch 
              id="admin-mode" 
              checked={isAdmin}
              onCheckedChange={toggleAdmin}
            />
            <Label htmlFor="admin-mode">
              Admin Mode is {isAdmin ? "ON" : "OFF"}
            </Label>
          </div>
          
          {status && (
            <div className="p-3 bg-blue-50 text-blue-800 rounded-md border border-blue-200">
              {status}
            </div>
          )}
          
          <div className="text-sm text-gray-600">
            <p>
              This toggle enables all sidebar items and bypasses permission checks.
              Perfect for testing and development when you need to access all areas.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <div className="w-full flex justify-between">
            <Link href={isTeacher ? "/staff/teachers/dashboard" : "/dashboard"}>
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
            <Link href="/debug">
              <Button variant="secondary">Debug Page</Button>
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
} 