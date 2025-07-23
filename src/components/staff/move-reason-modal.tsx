"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeftRight } from "lucide-react";

interface MoveReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isLoading: boolean;
  personName: string;
  fromType: "teacher" | "employee";
  toType: "teacher" | "employee";
}

export function MoveReasonModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  personName,
  fromType,
  toType,
}: MoveReasonModalProps) {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    if (reason.trim()) {
      onConfirm(reason.trim());
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setReason("");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-blue-600" />
            Move {fromType === "teacher" ? "Teacher" : "Employee"} to {toType === "teacher" ? "Teacher" : "Employee"}
          </DialogTitle>
          <DialogDescription>
            You are about to move <strong>{personName}</strong> from {fromType} to {toType}. 
            This action will transfer all their data and cannot be undone. Please provide a reason for this move.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Move *</Label>
            <Textarea
              id="reason"
              placeholder="Please explain why this person is being moved (e.g., role change, department transfer, promotion, etc.)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              disabled={isLoading}
              className="resize-none"
            />
            {reason.trim().length < 10 && reason.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Please provide a more detailed reason (at least 10 characters)
              </p>
            )}
          </div>

          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
            <p className="text-sm text-amber-800">
              <strong>Important:</strong> This action will:
            </p>
            <ul className="text-sm text-amber-700 mt-1 space-y-1 list-disc list-inside">
              <li>Transfer all personal and employment data</li>
              <li>Move user roles and permissions</li>
              <li>Preserve employment history</li>
              <li>Create a permanent audit record</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading || reason.trim().length < 10}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 