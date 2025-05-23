"use client";

import { ArrowLeft, GraduationCap, Users, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { EnhancedTeacherForm } from "@/components/teachers/enhanced-teacher-form";
import { Card } from "@/components/ui/card";

export default function CreateTeacherPage() {
  return (
    <div className="w-full px-4">
      {/* Header with breadcrumb navigation */}
      <div className="">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Create New Teacher</h1>
              <p className="text-muted-foreground">Add a new teacher to your institution</p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild className="w-fit">
            <Link href="/teachers" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Teachers
            </Link>
          </Button>
        </div>
        
        {/* Quick info cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="p-4 border-l-4 border-l-blue-500">
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 text-blue-700 p-2 rounded-md">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-medium">Add Teacher Information</h3>
                <p className="text-sm text-muted-foreground">Enter personal and professional details</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 border-l-4 border-l-emerald-500">
            <div className="flex items-start gap-3">
              <div className="bg-emerald-100 text-emerald-700 p-2 rounded-md">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-medium">Set Qualifications</h3>
                <p className="text-sm text-muted-foreground">Add educational background and certifications</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 border-l-4 border-l-amber-500">
            <div className="flex items-start gap-3">
              <div className="bg-amber-100 text-amber-700 p-2 rounded-md">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-medium">Create User Account</h3>
                <p className="text-sm text-muted-foreground">Enable system access for the teacher</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Main form area with shadow and rounded corners */}
      <Card className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="border-b px-6 py-4 bg-muted/30">
          <h2 className="text-xl font-semibold">Teacher Information Form</h2>
          <p className="text-sm text-muted-foreground">Fill out the form below to add a new teacher</p>
        </div>
        <div className="p-6">
          <EnhancedTeacherForm />
        </div>
      </Card>
    </div>
  );
}
