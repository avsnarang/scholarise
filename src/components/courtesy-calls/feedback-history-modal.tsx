"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  User,
  MessageSquare,
  Clock,
  Edit,
  Trash2,
  Shield,
  Eye,
  EyeOff,
  ListTodo,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CreateActionItemModal } from "@/components/action-items/create-action-item-modal";
import { usePermissions } from "@/hooks/usePermissions";
import { Permission } from "@/types/permissions";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  section?: {
    name: string;
    class?: {
      name: string;
    };
  };
  parent?: {
    fatherName?: string;
    motherName?: string;
    guardianName?: string;
    fatherMobile?: string;
    motherMobile?: string;
  };
}

interface FeedbackRecord {
  id: string;
  purpose?: string;
  feedback: string;
  followUp?: string;
  isPrivate: boolean;
  callDate: Date;
  createdAt: Date;
  callerType: "TEACHER" | "HEAD";
  teacher?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface FeedbackHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  feedbackHistory: FeedbackRecord[];
  isLoading: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canViewAll?: boolean;
  onEdit?: (feedback: FeedbackRecord) => void;
  onDelete?: (feedbackId: string) => Promise<void>;
  isDeleting?: boolean;
  onActionItemCreated?: () => void;
}

export function FeedbackHistoryModal({
  isOpen,
  onClose,
  student,
  feedbackHistory,
  isLoading,
  canEdit = false,
  canDelete = false,
  canViewAll = false,
  onEdit,
  onDelete,
  isDeleting = false,
  onActionItemCreated,
}: FeedbackHistoryModalProps) {
  const { toast } = useToast();
  const { can } = usePermissions();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [createActionItemModalOpen, setCreateActionItemModalOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackRecord | null>(null);

  const canCreateActionItem = can(Permission.CREATE_ACTION_ITEM);

  if (!student) return null;

  const handleDelete = async (feedbackId: string) => {
    if (!onDelete) return;

    try {
      setDeletingId(feedbackId);
      await onDelete(feedbackId);
      toast({
        title: "Success",
        description: "Feedback deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete feedback",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const getCallerName = (feedback: FeedbackRecord) => {
    if (feedback.teacher) {
      return `${feedback.teacher.firstName} ${feedback.teacher.lastName}`;
    }
    if (feedback.employee) {
      return `${feedback.employee.firstName} ${feedback.employee.lastName}`;
    }
    return "Unknown";
  };

  const getCallerRole = (feedback: FeedbackRecord) => {
    return feedback.callerType === "TEACHER" ? "Teacher" : "Head";
  };

  const parentName =
    student.parent?.fatherName ||
    student.parent?.motherName ||
    student.parent?.guardianName ||
    "Not available";

  const parentContact =
    student.parent?.fatherMobile ||
    student.parent?.motherMobile ||
    "Not available";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Courtesy Call History
          </DialogTitle>
          <DialogDescription>
            View all courtesy call feedback for this student
          </DialogDescription>
        </DialogHeader>

        {/* Student Information */}
        <div className="bg-muted/50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Student Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div>
              <span className="font-medium">Name:</span> {student.firstName}{" "}
              {student.lastName}
            </div>
            <div>
              <span className="font-medium">Admission No:</span>{" "}
              {student.admissionNumber}
            </div>
            <div>
              <span className="font-medium">Class:</span>{" "}
              {student.section?.class?.name
                ? `${student.section.class.name} - ${student.section.name}`
                : "Not assigned"}
            </div>
            <div>
              <span className="font-medium">Parent:</span> {parentName}
            </div>
            <div className="md:col-span-2">
              <span className="font-medium">Contact:</span> {parentContact}
            </div>
          </div>
        </div>

        {/* Feedback History */}
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">
              Feedback History ({feedbackHistory.length})
            </h3>
            {!canViewAll && (
              <Badge variant="outline" className="text-xs">
                <EyeOff className="w-3 h-3 mr-1" />
                Limited View
              </Badge>
            )}
          </div>

          <ScrollArea className="h-[400px] pr-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">
                    Loading feedback history...
                  </p>
                </div>
              </div>
            ) : feedbackHistory.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No feedback records found for this student
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {feedbackHistory.map((feedback, index) => (
                  <Card key={feedback.id} className="relative">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">
                            {format(feedback.callDate, "PPP")}
                          </span>
                          {feedback.isPrivate && (
                            <Badge variant="secondary" className="text-xs">
                              <Shield className="w-3 h-3 mr-1" />
                              Private
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {canCreateActionItem && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedFeedback(feedback);
                                setCreateActionItemModalOpen(true);
                              }}
                              title="Create Action Item"
                            >
                              <ListTodo className="w-4 h-4" />
                            </Button>
                          )}
                          {canEdit && onEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEdit(feedback)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                          {canDelete && onDelete && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={
                                    deletingId === feedback.id || isDeleting
                                  }
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Feedback</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this feedback
                                    record? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(feedback.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {getCallerName(feedback)} ({getCallerRole(feedback)})
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Added {format(feedback.createdAt, "PPp")}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {feedback.purpose && (
                        <div className="mb-3">
                          <h5 className="text-sm font-medium mb-1">Purpose:</h5>
                          <p className="text-sm text-muted-foreground">
                            {feedback.purpose}
                          </p>
                        </div>
                      )}
                      <div className="mb-3">
                        <h5 className="text-sm font-medium mb-1">Feedback:</h5>
                        <p className="text-sm">{feedback.feedback}</p>
                      </div>
                      {feedback.followUp && (
                        <div>
                          <h5 className="text-sm font-medium mb-1">
                            Follow-up Actions:
                          </h5>
                          <p className="text-sm text-muted-foreground">
                            {feedback.followUp}
                          </p>
                        </div>
                      )}
                    </CardContent>
                    {index < feedbackHistory.length - 1 && (
                      <Separator className="mt-4" />
                    )}
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end pt-4">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>

      {/* Create Action Item Modal */}
      {selectedFeedback && student && (
        <CreateActionItemModal
          open={createActionItemModalOpen}
          onOpenChange={setCreateActionItemModalOpen}
          onSuccess={() => {
            setCreateActionItemModalOpen(false);
            setSelectedFeedback(null);
            onActionItemCreated?.();
            toast({
              title: "Success",
              description: "Action item created successfully",
            });
          }}
          courtesyCallFeedbackId={selectedFeedback.id}
          studentId={student.id}
          prefilledData={{
            studentName: `${student.firstName} ${student.lastName}`,
            admissionNumber: student.admissionNumber,
            className: student.section ? `${student.section.class?.name}-${student.section.name}` : undefined,
            feedbackSummary: `${selectedFeedback.purpose ? `Purpose: ${selectedFeedback.purpose}\n` : ""}Feedback: ${selectedFeedback.feedback}${selectedFeedback.followUp ? `\nFollow-up: ${selectedFeedback.followUp}` : ""}`,
          }}
        />
      )}
    </Dialog>
  );
} 