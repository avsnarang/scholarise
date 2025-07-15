"use client";

import { ArrowLeft, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { EnhancedEmployeeForm } from "@/components/employees/enhanced-employee-form";
import type { EmployeeFormValues } from "@/server/api/employee-types";
import { api } from "@/utils/api";
import { Skeleton } from "@/components/ui/skeleton";

import { useEffect, useState } from "react";
import { toast } from "@/components/ui/use-toast";

// Helper function to safely format a date value for form input (YYYY-MM-DD)
const formatDateForInput = (dateValue: string | Date | undefined): string => {
  if (!dateValue) return "";
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return ""; 
    return date.toISOString().split('T')[0] ?? "";
  } catch (error) {
    return "";
  }
};

// Helper function to safely format a date value for display (YYYY-MM-DD)
// This might be redundant if display format is same as input, but kept for clarity
const formatDateForDisplay = (dateValue: string | Date | undefined): string => {
  if (!dateValue) return "";
  try {
    // If it's already a string in 'YYYY-MM-DD' format, return as is
    if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return dateValue;
    }
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return "";
    return date.toISOString().split('T')[0] ?? "";
  } catch (error) {
    // console.error("Error formatting date for display:", dateValue, error);
    return "";
  }
};

export default function EditEmployeePage() {
  const params = useParams();
  const router = useRouter();
  
  const id = params?.id && typeof params.id === "string" ? params.id : "";
  
  useEffect(() => {
    if (!id) {
      toast({ title: "Error", description: "Employee ID not found.", variant: "destructive" });
      router.push("/staff/employees"); 
      return;
    }
  }, [id, router]);

  const { data: employee, isLoading: isLoadingEmployee, error: employeeError } = api.employee.getById.useQuery(
    { id },
    { enabled: !!id } 
  );

  // State for the raw data to pass to the form. Type `any`
  const [initialApiData, setInitialApiData] = useState<any | undefined>(undefined);

  useEffect(() => {
    if (employee) {
      // Employee data now includes user account information (email, roleId, createUser)
      setInitialApiData(employee); // Pass employee data directly
    }
  }, [employee]);

  if (!id) { 
    return <div className="flex h-screen items-center justify-center">Invalid Employee ID.</div>;
  }
  
  // Consolidate loading states
  const isLoading = isLoadingEmployee;

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading employee details...</div>;
  }

  if (employeeError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <p className="text-red-500">Error loading employee: {employeeError.message}</p>
        <Button variant="outline" size="sm" asChild className="mt-4">
          <Link href="/staff/employees">
            <ArrowLeft className="mr-2 h-4 w-4" /> Go back to Employees
          </Link>
        </Button>
      </div>
    );
  }

  if (!employee || !initialApiData) { // Check initialApiData which is derived from employee
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <p>Employee data not available or failed to process.</p>
        <Button variant="outline" size="sm" asChild className="mt-4">
          <Link href="/staff/employees">
            <ArrowLeft className="mr-2 h-4 w-4" /> Go back to Employees
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-1">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold sm:text-3xl">Edit Employee</h1>
        <div>
          <Button variant="outline" size="sm" asChild className="w-fit">
            <Link href={`/staff/employees/${id}`} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Employee Details
            </Link>
          </Button>
        </div>
      </div>

      <EnhancedEmployeeForm 
        initialData={initialApiData} // Pass raw combined data
        isEdit={true} 
      />
    </div>
  );
} 