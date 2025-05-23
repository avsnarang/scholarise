"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Role } from "@/types/permissions";

export default function ForceSidebarPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  
  useEffect(() => {
    // Check if we're in browser environment
    if (typeof window === 'undefined') return;
    
    // Check if the forceAdmin is already set
    const hasForceAdmin = localStorage.getItem('forceAdmin') === 'true';
    if (hasForceAdmin) {
      setMessage("Force admin mode is already enabled");
    }
  }, []);

  const enableForceSidebar = () => {
    try {
      // Store a flag in localStorage to indicate force sidebar mode
      localStorage.setItem('forceAdmin', 'true');
      
      // Also store the role in localStorage as a fallback
      localStorage.setItem('userRole', Role.SUPER_ADMIN);
      
      setMessage("Force admin mode enabled! Reloading in 2 seconds...");
      
      // Force reload after 2 seconds
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error("Error setting localStorage:", error);
    }
  };
  
  const disableForceSidebar = () => {
    try {
      // Remove the flags from localStorage
      localStorage.removeItem('forceAdmin');
      localStorage.removeItem('userRole');
      
      setMessage("Force admin mode disabled! Reloading in 2 seconds...");
      
      // Force reload after 2 seconds
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error("Error removing from localStorage:", error);
    }
  };

  return (
    <div className="container py-8">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Force Full Sidebar</CardTitle>
          <CardDescription>
            Use this utility to temporarily show all sidebar items without changing user roles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              This is a temporary workaround that will show all sidebar items by bypassing the permission system.
              It will not grant actual permissions to access restricted pages.
            </p>
            
            {message && (
              <div className="bg-yellow-50 text-yellow-800 p-3 rounded-md border border-yellow-200">
                {message}
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex gap-4 justify-between">
          <Button 
            onClick={enableForceSidebar}
            className="flex-1"
            variant="default"
          >
            Enable Force Mode
          </Button>
          
          <Button 
            onClick={disableForceSidebar}
            className="flex-1"
            variant="outline"
          >
            Disable Force Mode
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 