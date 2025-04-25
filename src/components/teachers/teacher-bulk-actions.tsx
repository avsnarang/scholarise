import { useState } from "react";
import { AlertCircle, Trash, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { api } from "@/utils/api";

interface TeacherBulkActionsProps {
  selectedTeacherIds: string[];
  onActionComplete: () => void;
  onClearSelection: () => void;
}

export function TeacherBulkActions({
  selectedTeacherIds,
  onActionComplete,
  onClearSelection,
}: TeacherBulkActionsProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<boolean>(true);

  // Mutations
  const bulkDeleteMutation = api.teacher.bulkDelete.useMutation({
    onSuccess: () => {
      onActionComplete();
      onClearSelection();
    },
  });

  const bulkUpdateStatusMutation = api.teacher.bulkUpdateStatus.useMutation({
    onSuccess: () => {
      onActionComplete();
      onClearSelection();
    },
  });

  // Handle bulk delete
  const handleBulkDelete = async () => {
    try {
      await bulkDeleteMutation.mutateAsync({ ids: selectedTeacherIds });
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting teachers:", error);
      alert("Failed to delete teachers. Please try again.");
    }
  };

  // Handle bulk status update
  const handleBulkStatusUpdate = async (isActive: boolean) => {
    try {
      await bulkUpdateStatusMutation.mutateAsync({
        ids: selectedTeacherIds,
        isActive,
      });
      setIsStatusDialogOpen(false);
    } catch (error) {
      console.error("Error updating teacher status:", error);
      alert("Failed to update teacher status. Please try again.");
    }
  };

  if (selectedTeacherIds.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-between rounded-md border bg-muted/50 p-2">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">
          {selectedTeacherIds.length} teacher{selectedTeacherIds.length > 1 ? "s" : ""} selected
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setNewStatus(true);
            setIsStatusDialogOpen(true);
          }}
          className="flex items-center gap-1"
        >
          <UserCheck className="h-4 w-4" />
          <span>Activate</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setNewStatus(false);
            setIsStatusDialogOpen(true);
          }}
          className="flex items-center gap-1"
        >
          <UserX className="h-4 w-4" />
          <span>Deactivate</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsDeleteDialogOpen(true)}
          className="flex items-center gap-1 text-red-500 hover:text-red-600"
        >
          <Trash className="h-4 w-4" />
          <span>Delete</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={onClearSelection}>
          Cancel
        </Button>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete {selectedTeacherIds.length} teacher
              {selectedTeacherIds.length > 1 ? "s" : ""}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Status Update Confirmation Dialog */}
      <AlertDialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Status Change</AlertDialogTitle>
            <AlertDialogDescription>
              This will {newStatus ? "activate" : "deactivate"} {selectedTeacherIds.length} teacher
              {selectedTeacherIds.length > 1 ? "s" : ""}. Do you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleBulkStatusUpdate(newStatus)}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
