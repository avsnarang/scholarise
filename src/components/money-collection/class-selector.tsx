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

interface ClassSelectorProps {
  branchId: string;
  sessionId?: string;
  onClassSelect: (classId: string) => void;
  selectedClassId?: string;
  allowedClassIds?: string[]; // Optional array of class IDs that are allowed to be selected
}

export function ClassSelector({ 
  branchId, 
  sessionId, 
  onClassSelect, 
  selectedClassId,
  allowedClassIds 
}: ClassSelectorProps) {
  const { toast } = useToast();
  const [classes, setClasses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { data: classesData, error: classesError } = api.class.getAll.useQuery(
    {
      branchId,
      isActive: true,
      ...(sessionId ? { sessionId } : {})
    }
  );

  // Handle successful data loading
  useEffect(() => {
    if (classesData) {
      // If allowedClassIds is provided, filter the classes
      let filteredClasses = classesData;
      
      if (allowedClassIds && allowedClassIds.length > 0) {
        filteredClasses = classesData.filter(cls => 
          allowedClassIds.includes(cls.id)
        );
      }
      
      setClasses(filteredClasses);
      setIsLoading(false);
    }
  }, [classesData, allowedClassIds]);

  // Handle errors
  useEffect(() => {
    if (classesError) {
      toast({
        title: "Error",
        description: classesError.message,
        variant: "destructive",
      });
      setIsLoading(false);
    }
  }, [classesError, toast]);

  const handleClassChange = (value: string) => {
    onClassSelect(value);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Select Class</CardTitle>
        <CardDescription>
          Choose a class to view students and manage money collection
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Select
          value={selectedClassId || ""}
          onValueChange={handleClassChange}
          disabled={isLoading || classes.length === 0}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={isLoading ? "Loading classes..." : "Select a class"} />
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
  );
} 