import { useState } from "react";
import { CheckSquare, Trash, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { api } from "@/utils/api";

interface StudentBulkActionsProps {
  selectedStudentIds: string[];
  onActionComplete: () => void;
  onClearSelection: () => void;
}

export function StudentBulkActions({
  selectedStudentIds,
  onActionComplete,
  onClearSelection,
}: StudentBulkActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState("");

  const utils = api.useContext();

  // Fetch classes from the API
  const { data: classesData } = api.class.getAll.useQuery();
  const classes = classesData || [];

  // Bulk delete mutation
  const bulkDeleteMutation = api.student.bulkDelete.useMutation({
    onSuccess: () => {
      void utils.student.getAll.invalidate();
      void utils.student.getStats.invalidate();
      onActionComplete();
      onClearSelection();
    },
  });

  // Bulk update class mutation
  const bulkUpdateClassMutation = api.student.bulkUpdateClass.useMutation({
    onSuccess: () => {
      void utils.student.getAll.invalidate();
      void utils.student.getStats.invalidate();
      onActionComplete();
      onClearSelection();
      setSelectedClass("");
    },
  });

  // Bulk update status mutation
  const bulkUpdateStatusMutation = api.student.bulkUpdateStatus.useMutation({
    onSuccess: () => {
      void utils.student.getAll.invalidate();
      void utils.student.getStats.invalidate();
      onActionComplete();
      onClearSelection();
    },
  });

  const handleBulkDelete = async () => {
    if (selectedStudentIds.length === 0) return;

    if (confirm(`Are you sure you want to delete ${selectedStudentIds.length} students? This action cannot be undone.`)) {
      try {
        await bulkDeleteMutation.mutateAsync({ ids: selectedStudentIds });
      } catch (error) {
        console.error("Error deleting students:", error);
        alert("Failed to delete students. Please try again.");
      }
    }
  };

  const handleBulkUpdateClass = async () => {
    if (selectedStudentIds.length === 0 || !selectedClass) return;

    try {
      await bulkUpdateClassMutation.mutateAsync({
        ids: selectedStudentIds,
        classId: selectedClass,
      });
    } catch (error) {
      console.error("Error updating student classes:", error);
      alert("Failed to update student classes. Please try again.");
    }
  };

  const handleBulkUpdateStatus = async (isActive: boolean) => {
    if (selectedStudentIds.length === 0) return;

    try {
      await bulkUpdateStatusMutation.mutateAsync({
        ids: selectedStudentIds,
        isActive,
      });
    } catch (error) {
      console.error("Error updating student status:", error);
      alert("Failed to update student status. Please try again.");
    }
  };

  if (selectedStudentIds.length === 0) {
    return null;
  }

  return (
    <div className="mb-4 flex items-center gap-2 rounded-md border bg-gray-50 p-2">
      <span className="ml-2 flex items-center gap-1 text-sm font-medium">
        <CheckSquare className="h-4 w-4" />
        {selectedStudentIds.length} selected
      </span>

      <div className="ml-auto flex items-center gap-2">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              Assign Class
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-3">
            <div className="space-y-3">
              <h4 className="font-medium">Assign to Class</h4>
              <Select
                value={selectedClass}
                onValueChange={setSelectedClass}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name} - {cls.section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  disabled={!selectedClass}
                  onClick={() => {
                    handleBulkUpdateClass();
                    setIsOpen(false);
                  }}
                >
                  Assign
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1"
          onClick={() => handleBulkUpdateStatus(true)}
        >
          <UserCheck className="h-4 w-4" />
          Mark Active
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1"
          onClick={() => handleBulkUpdateStatus(false)}
        >
          <UserX className="h-4 w-4" />
          Mark Inactive
        </Button>

        <Button
          variant="destructive"
          size="sm"
          className="flex items-center gap-1"
          onClick={handleBulkDelete}
        >
          <Trash className="h-4 w-4" />
          Delete
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
