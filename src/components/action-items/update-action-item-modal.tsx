"use client";

import React, { useState } from "react";
import { api } from "@/utils/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

type ActionItem = {
  id: string;
  title: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "VERIFIED" | "REJECTED" | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  completionNotes: string | null;
  rejectionReason: string | null;
  student: {
    firstName: string;
    lastName: string;
    admissionNumber: string;
  };
};

interface UpdateActionItemModalProps {
  actionItem: ActionItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "PENDING":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    case "IN_PROGRESS":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "COMPLETED":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
  }
};

export function UpdateActionItemModal({
  actionItem,
  open,
  onOpenChange,
  onSuccess,
}: UpdateActionItemModalProps) {
  const { toast } = useToast();
  const [status, setStatus] = useState<"PENDING" | "IN_PROGRESS" | "COMPLETED">(
    actionItem.status === "COMPLETED" ? "COMPLETED" : actionItem.status === "IN_PROGRESS" ? "IN_PROGRESS" : "PENDING"
  );
  const [completionNotes, setCompletionNotes] = useState(actionItem.completionNotes || "");

  const updateActionItem = api.actionItems.updateStatus.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Action item status updated successfully",
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update action item",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (status === "COMPLETED" && !completionNotes.trim()) {
      toast({
        title: "Validation Error",
        description: "Completion notes are required when marking as completed",
        variant: "destructive",
      });
      return;
    }

    updateActionItem.mutate({
      id: actionItem.id,
      status,
      completionNotes: status === "COMPLETED" ? completionNotes.trim() : undefined,
    });
  };

  const isLoading = updateActionItem.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update Action Item Status</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Action Item Info */}
          <div className="space-y-2">
            <div>
              <h4 className="font-medium">{actionItem.title}</h4>
              <p className="text-sm text-muted-foreground">
                Student: {actionItem.student.firstName} {actionItem.student.lastName} ({actionItem.student.admissionNumber})
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm">Current Status:</span>
              <Badge className={getStatusColor(actionItem.status)}>
                {actionItem.status}
              </Badge>
            </div>
          </div>

          {/* Status Selection */}
          <div className="space-y-2">
            <Label htmlFor="status">New Status *</Label>
            <Select value={status} onValueChange={(value: any) => setStatus(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Completion Notes */}
          <div className="space-y-2">
            <Label htmlFor="completion-notes">
              Completion Notes {status === "COMPLETED" && "*"}
            </Label>
            <Textarea
              id="completion-notes"
              placeholder={
                status === "COMPLETED"
                  ? "Describe what was done to address this action item..."
                  : "Optional notes about progress or updates..."
              }
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              rows={4}
              className="resize-none"
            />
            {status === "COMPLETED" && (
              <p className="text-xs text-muted-foreground">
                Required when marking as completed
              </p>
            )}
          </div>

          {/* Progress Info */}
          {status === "COMPLETED" && (
            <Alert>
              <AlertDescription>
                Once marked as completed, this action item will be sent for verification by the head/supervisor.
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Status
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}