"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AttendanceMarker() {
  const router = useRouter();
  
  useEffect(() => {
    // This could be replaced with actual functionality when implementing the real component
    console.log("AttendanceMarker component mounted");
  }, []);
  
  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6 text-[#00501B] dark:text-[#7aad8c]">Attendance Marker</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Mark Student Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            This is a placeholder for the attendance marker functionality. 
            The actual implementation will be migrated from the Pages Router.
          </p>
          <Button 
            onClick={() => router.push("/attendance/mark")} 
            className="bg-[#00501B] hover:bg-[#00501B]/90"
          >
            Go to Attendance Page
          </Button>
        </CardContent>
      </Card>
    </div>
  );
} 