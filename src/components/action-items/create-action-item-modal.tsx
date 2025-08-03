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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBranchContext } from "@/hooks/useBranchContext";

interface CreateActionItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  courtesyCallFeedbackId: string;
  studentId: string;
  prefilledData?: {
    studentName: string;
    admissionNumber: string;
    className?: string;
    feedbackSummary: string;
  };
}

export function CreateActionItemModal({
  open,
  onOpenChange,
  onSuccess,
  courtesyCallFeedbackId,
  studentId,
  prefilledData,
}: CreateActionItemModalProps) {
  const { toast } = useToast();
  const { currentBranchId } = useBranchContext();
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [dueDate, setDueDate] = useState<Date>();

  // Fetch teachers for assignment
  const { data: teachersData } = api.teacher.getAll.useQuery(
    {
      branchId: currentBranchId || undefined,
      isActive: true,
    },
    {
      enabled: !!currentBranchId && open,
    }
  );

  const createActionItem = api.actionItems.create.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Action item created successfully",
      });
      resetForm();
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create action item",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setAssignedToId("");
    setPriority("MEDIUM");
    setDueDate(undefined);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast({
        title: "Validation Error",
        description: "Title is required",
        variant: "destructive",
      });
      return;
    }

    if (!description.trim()) {
      toast({
        title: "Validation Error",
        description: "Description is required",
        variant: "destructive",
      });
      return;
    }

    if (!assignedToId) {
      toast({
        title: "Validation Error",
        description: "Please select a teacher to assign this task to",
        variant: "destructive",
      });
      return;
    }

    createActionItem.mutate({
      title: title.trim(),
      description: description.trim(),
      assignedToId,
      courtesyCallFeedbackId,
      studentId,
      priority,
      dueDate,
    });
  };

  const handleCancel = () => {
    resetForm();
    onOpenChange(false);
  };

  const isLoading = createActionItem.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Action Item</DialogTitle>
          {prefilledData && (
            <div className="text-sm text-muted-foreground">
              For student: {prefilledData.studentName} ({prefilledData.admissionNumber})
              {prefilledData.className && ` - ${prefilledData.className}`}
            </div>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Related Feedback Context */}
          {prefilledData && (
            <div className="p-3 bg-muted rounded-md">
              <Label className="text-sm font-medium">Related Feedback:</Label>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                {prefilledData.feedbackSummary}
              </p>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Brief title for the action item..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Detailed description of what needs to be done..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="resize-none"
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Assign To */}
            <div className="space-y-2">
              <Label htmlFor="assigned-to">Assign To *</Label>
              <Select value={assignedToId} onValueChange={setAssignedToId} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teachersData?.items?.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      <div className="flex flex-col">
                        <span>{teacher.firstName} {teacher.lastName}</span>
                        {teacher.employeeCode && (
                          <span className="text-xs text-muted-foreground">
                            {teacher.employeeCode}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  )) || []}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={(value: any) => setPriority(value)} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                      Low
                    </div>
                  </SelectItem>
                  <SelectItem value="MEDIUM">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                      Medium
                    </div>
                  </SelectItem>
                  <SelectItem value="HIGH">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                      High
                    </div>
                  </SelectItem>
                  <SelectItem value="URGENT">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-400"></div>
                      Urgent
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label>Due Date (Optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dueDate && "text-muted-foreground"
                  )}
                  disabled={isLoading}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : "Select due date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {dueDate && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDueDate(undefined)}
                className="h-auto p-0 text-xs text-muted-foreground"
                disabled={isLoading}
              >
                Clear date
              </Button>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Action Item
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}