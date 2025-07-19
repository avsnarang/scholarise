"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Users, UserCheck, UserX } from "lucide-react";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  rollNumber?: number | null;
  admissionNumber?: string;
}

interface StudentSelectorProps {
  students: Student[];
  selectedStudents: string[];
  onSelectionChange: (studentIds: string[]) => void;
  isLoading?: boolean;
}

export function StudentSelector({
  students,
  selectedStudents,
  onSelectionChange,
  isLoading = false
}: StudentSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");

  // Filter students based on search term
  const filteredStudents = students.filter(student => {
    const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
    const rollNumber = student.rollNumber?.toString().toLowerCase() || "";
    const admissionNumber = student.admissionNumber?.toLowerCase() || "";
    const search = searchTerm.toLowerCase();
    
    return fullName.includes(search) || 
           rollNumber.includes(search) || 
           admissionNumber.includes(search);
  });

  const handleStudentToggle = (studentId: string) => {
    if (selectedStudents.includes(studentId)) {
      onSelectionChange(selectedStudents.filter(id => id !== studentId));
    } else {
      onSelectionChange([...selectedStudents, studentId]);
    }
  };

  const handleSelectAll = () => {
    const allFilteredIds = filteredStudents.map(student => student.id);
    onSelectionChange([...new Set([...selectedStudents, ...allFilteredIds])]);
  };

  const handleSelectNone = () => {
    const filteredIds = filteredStudents.map(student => student.id);
    onSelectionChange(selectedStudents.filter(id => !filteredIds.includes(id)));
  };

  const handleSelectAllStudents = () => {
    onSelectionChange(students.map(student => student.id));
  };

  const handleClearSelection = () => {
    onSelectionChange([]);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-3">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Bulk Actions */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search students by name, roll number, or admission number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              disabled={filteredStudents.length === 0}
              className="flex items-center gap-1"
            >
              <UserCheck className="h-3 w-3" />
              Select Visible ({filteredStudents.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectNone}
              disabled={filteredStudents.length === 0}
              className="flex items-center gap-1"
            >
              <UserX className="h-3 w-3" />
              Deselect Visible
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAllStudents}
              disabled={students.length === 0}
              className="flex items-center gap-1"
            >
              <Users className="h-3 w-3" />
              Select All ({students.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearSelection}
              disabled={selectedStudents.length === 0}
              className="flex items-center gap-1"
            >
              <UserX className="h-3 w-3" />
              Clear All
            </Button>
          </div>
        </div>

        {selectedStudents.length > 0 && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {selectedStudents.length} selected
            </Badge>
            <span className="text-sm text-blue-700">
              Students selected for report card generation
            </span>
          </div>
        )}
      </div>

      {/* Students List */}
      <div className="border rounded-lg">
        <ScrollArea className="h-[400px]">
          <div className="p-4 space-y-2">
            {filteredStudents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? "No students match your search" : "No students found"}
              </div>
            ) : (
              filteredStudents.map((student) => {
                const isSelected = selectedStudents.includes(student.id);
                return (
                  <div
                    key={student.id}
                    className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                      isSelected 
                        ? "bg-blue-50 border-blue-200" 
                        : "hover:bg-gray-50 border-gray-200"
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleStudentToggle(student.id)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">
                          {student.firstName} {student.lastName}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {student.rollNumber && (
                            <Badge variant="outline" className="text-xs">
                              Roll: {student.rollNumber}
                            </Badge>
                          )}
                          {student.admissionNumber && (
                            <Badge variant="outline" className="text-xs">
                              Adm: {student.admissionNumber}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Selection Summary */}
      {students.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Showing {filteredStudents.length} of {students.length} students
          {searchTerm && ` (filtered by "${searchTerm}")`}
        </div>
      )}
    </div>
  );
} 