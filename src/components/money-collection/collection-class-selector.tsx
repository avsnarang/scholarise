"use client";

import { useState, useEffect } from "react";
import { api } from "@/utils/api";
import { useToast } from "@/components/ui/use-toast";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentCollectionTable } from "./student-collection-table";

interface CollectionClassSelectorProps {
  collectionId: string;
  branchId: string;
  defaultClassId?: string;
  existingItems: any[];
}

export function CollectionClassSelector({ 
  collectionId,
  branchId,
  defaultClassId,
  existingItems
}: CollectionClassSelectorProps) {
  const { toast } = useToast();
  const [selectedClassId, setSelectedClassId] = useState<string>(defaultClassId || "");

  // Fetch classes for the branch
  const { data: classes = [], isLoading: isLoadingClasses, error: classesError } = api.class.getAll.useQuery(
    {
      branchId,
      isActive: true,
    }
  );

  // Show error toast if classes fetch fails
  useEffect(() => {
    if (classesError) {
      toast({
        title: "Error",
        description: "Failed to load classes",
        variant: "destructive",
      });
    }
  }, [classesError, toast]);

  // Set default class ID when it changes
  useEffect(() => {
    if (defaultClassId) {
      setSelectedClassId(defaultClassId);
    }
  }, [defaultClassId]);

  // Fetch students for the selected class
  const { 
    data: rawStudents = [], 
    isLoading: isLoadingStudents,
    error: studentsError 
  } = api.moneyCollection.getDetailedStudentsByClass.useQuery(
    { classId: selectedClassId },
    { enabled: !!selectedClassId }
  );

  // Show error toast if students fetch fails
  useEffect(() => {
    if (studentsError) {
      toast({
        title: "Error",
        description: "Failed to load students",
        variant: "destructive",
      });
    }
  }, [studentsError, toast]);

  const handleClassChange = (value: string) => {
    setSelectedClassId(value);
  };

  const students = rawStudents.map(student => ({
    ...student,
    class: student.class ? { name: student.class.name, section: student.class.section } : undefined,
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Select Class</CardTitle>
          <CardDescription>
            Choose a class to view students and manage money collection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedClassId}
            onValueChange={handleClassChange}
            disabled={isLoadingClasses || classes.length === 0}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={isLoadingClasses ? "Loading classes..." : "Select a class"} />
            </SelectTrigger>
            <SelectContent>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name} {cls.section}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Show student collection table if a class is selected */}
      {selectedClassId && (
        <div className="mt-6">
          {isLoadingStudents ? (
            <div>Loading students...</div>
          ) : (
            <StudentCollectionTable
              students={students}
              collectionId={collectionId}
              existingItems={existingItems}
            />
          )}
        </div>
      )}
    </div>
  );
} 