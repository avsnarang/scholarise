"use client";

import { ArrowLeft, Users, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { EnhancedEmployeeForm } from "@/components/employees/enhanced-employee-form";
import { Card } from "@/components/ui/card";
import { Suspense } from "react";

export default function CreateEmployeePage() {
  return (
    <div className="w-full px-4 py-1">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Briefcase className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Create New Employee</h1>
              <p className="text-muted-foreground">Add a new employee to your institution</p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild className="w-fit">
            <Link href="/staff/employees" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Employees
            </Link>
          </Button>
        </div>
        
        {/* Employee Form */}
        <Suspense fallback={<div className="flex items-center justify-center p-8">Loading...</div>}>
          <EnhancedEmployeeForm />
        </Suspense>
      </div>
  );
} 