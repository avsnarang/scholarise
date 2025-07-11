"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { 
  Users, 
  Search, 
  UserPlus, 
  MoreHorizontal, 
  Edit
} from "lucide-react";
import Link from "next/link";
import { api } from "@/utils/api";
import { PageWrapper } from "@/components/page-wrapper";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";

export default function ClassStudentsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params!.id as string;
  const { toast } = useToast();
  const { currentSessionId } = useAcademicSessionContext();
  
  // State for UI
  const [searchQuery, setSearchQuery] = useState("");
  
  // Get class details
  const { 
    data: classData, 
    isLoading: isLoadingClass,
    refetch: refetchClass
  } = api.class.getById.useQuery(
    { id: id, includeSections: true },
    { enabled: !!id }
  );
  
  // Get students in the class using section API
  const {
    data: studentsData,
    isLoading: isLoadingStudents,
    refetch: refetchStudents
  } = api.student.getAll.useQuery(
    { 
      sectionId: classData?.sections?.[0]?.id,
      limit: 500 // Set a high limit to get all students in the class
    },
    { enabled: !!classData?.sections?.[0]?.id }
  );

  // Extract students from the API response
  const students = studentsData?.items || [];
  
  // Filter students based on search query
  const filteredStudents = students.filter((student: any) => {
    if (!searchQuery) return true;
    
    const searchLower = searchQuery.toLowerCase();
    return (
      student.firstName.toLowerCase().includes(searchLower) ||
      student.lastName.toLowerCase().includes(searchLower) ||
      student.admissionNumber.toLowerCase().includes(searchLower)
    );
  });

  // Get the first section for display
  const primarySection = classData?.sections?.[0];
  
  // Loading state
  const isLoading = isLoadingClass || isLoadingStudents || !id;
  
  if (isLoading) {
    return (
      <PageWrapper>
        <PageHeader
          heading="Class Students"
          description="Loading student information..."
          backPath={`/classes/${id}`}
        />
        
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Admission #</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20 float-right" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </PageWrapper>
    );
  }
  
  if (!classData) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <h1 className="text-2xl font-bold">Class Not Found</h1>
          <p className="text-gray-500">The class you are looking for does not exist.</p>
          <Button asChild>
            <Link href="/classes">Back to Classes</Link>
          </Button>
        </div>
      </PageWrapper>
    );
  }
  
  return (
    <PageWrapper>
      <PageHeader
        heading={`${classData.name}${primarySection ? ` - ${primarySection.name}` : ''} Students`}
        description="View and manage students in this class"
        backPath={`/classes/${id}`}
      />
      
      {/* Search and actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            type="search"
            placeholder="Search students..."
            className="w-full pl-9 pr-4"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <Button
          onClick={() => router.push(`/students/admission?classId=${id}`)}
          className="bg-[#00501B] hover:bg-[#00501B]/90 text-white clickable"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Add Student
        </Button>
      </div>
      
      {/* Students table */}
      {filteredStudents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-8 text-center">
          <Users className="h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No students found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchQuery 
              ? "Try a different search term or" 
              : currentSessionId 
                ? "No students in this class for the selected academic session" 
                : "Get started by"} 
            {!currentSessionId && "adding students to this class."}
          </p>
          {!currentSessionId && (
            <div className="mt-4">
              <Button 
                onClick={() => router.push(`/students/admission?classId=${id}`)}
                className="bg-[#00501B] hover:bg-[#00501B]/90 text-white clickable"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Add Student
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Admission #</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">{student.admissionNumber}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium">
                        {student.firstName?.[0]}{student.lastName?.[0]}
                      </div>
                      <div>
                        <div className="font-medium">{student.firstName} {student.lastName}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(student.dateOfBirth).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{student.gender}</TableCell>
                  <TableCell>
                    {student.isActive ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="clickable">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={() => router.push(`/students/${student.id}`)}
                          className="clickable"
                        >
                          <Users className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => router.push(`/students/${student.id}/edit`)}
                          className="clickable"
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </PageWrapper>
  );
}
