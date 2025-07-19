"use client";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface ClassSectionSelectorProps {
  classes: any[];
  selectedClassId: string;
  selectedSectionId: string;
  onClassChange: (classId: string) => void;
  onSectionChange: (sectionId: string) => void;
  isLoading?: boolean;
}

export function ClassSectionSelector({
  classes,
  selectedClassId,
  selectedSectionId,
  onClassChange,
  onSectionChange,
  isLoading = false
}: ClassSectionSelectorProps) {
  const selectedClass = classes.find(cls => cls.id === selectedClassId);
  const sectionsInClass = selectedClass?.sections || [];

  const handleClassChange = (classId: string) => {
    onClassChange(classId);
    // Reset section when class changes
    onSectionChange("");
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Class Selection */}
      <div className="space-y-2">
        <Label htmlFor="class-select">Class</Label>
        <Select
          value={selectedClassId}
          onValueChange={handleClassChange}
        >
          <SelectTrigger id="class-select">
            <SelectValue placeholder="Select a class" />
          </SelectTrigger>
          <SelectContent>
            {classes.map((cls) => (
              <SelectItem key={cls.id} value={cls.id}>
                {cls.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Section Selection */}
      <div className="space-y-2">
        <Label htmlFor="section-select">Section</Label>
        <Select
          value={selectedSectionId}
          onValueChange={onSectionChange}
          disabled={!selectedClassId}
        >
          <SelectTrigger id="section-select">
            <SelectValue placeholder="Select a section" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sections</SelectItem>
            {sectionsInClass.map((section: any) => (
              <SelectItem key={section.id} value={section.id}>
                {section.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
} 