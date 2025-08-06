"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  User, 
  Calendar,
  IndianRupee,
  FileText,
  Award
} from 'lucide-react';
import { formatIndianCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";

interface PendingConcession {
  id: string;
  studentId: string;
  concessionTypeId: string;

  reason?: string | null;
  validFrom: Date;
  validUntil?: Date | null;
  notes?: string | null;
  status: string;
  createdAt: Date;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber: string;
    section?: {
      name: string;
      class: {
        name: string;
      };
    };
  };
  concessionType: {
    id: string;
    name: string;
    type: 'PERCENTAGE' | 'FIXED';
    value: number;
    appliedFeeHeads: string[];
    appliedFeeTerms: string[];
  };
}

interface ConcessionApprovalModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  concession: PendingConcession;
  onSubmit: (data: { notes?: string; approvedBy: string }) => Promise<void>;
  isLoading: boolean;
  approvalSettings?: any;
}

export function ConcessionApprovalModal({
  isOpen,
  onOpenChange,
  concession,
  onSubmit,
  isLoading,
  approvalSettings,
}: ConcessionApprovalModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState("");

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setNotes("");
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    // Check if notes are required
    if (approvalSettings?.requireReason && (!notes || notes.trim() === '')) {
      toast({
        title: "Validation Error",
        description: "Approval reason is required",
        variant: "destructive",
      });
      return;
    }

    await onSubmit({
      notes: notes.trim() || undefined,
      approvedBy: user.id,
    });
  };

      const concessionAmount = concession.concessionType.value;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Approve Concession
          </DialogTitle>
          <DialogDescription>
            Review and approve this concession request. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Student Information */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
              <User className="w-4 h-4" />
              Student Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Student Name</Label>
                <p className="font-medium">{concession.student.firstName} {concession.student.lastName}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Admission Number</Label>
                <p className="font-medium">{concession.student.admissionNumber}</p>
              </div>
              {concession.student.section && (
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground">Class & Section</Label>
                  <p className="font-medium">
                    {concession.student.section.class.name} - {concession.student.section.name}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Concession Details */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
              <Award className="w-4 h-4" />
              Concession Details
            </h3>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Concession Type</Label>
                <p className="font-medium">{concession.concessionType.name}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Type</Label>
                  <Badge variant="outline" className="mt-1">
                    {concession.concessionType.type === 'PERCENTAGE' ? 'Percentage' : 'Fixed Amount'}
                  </Badge>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Amount</Label>
                  <p className="font-semibold text-lg flex items-center gap-1">
                    {concession.concessionType.type === 'PERCENTAGE' ? (
                      `${concessionAmount}%`
                    ) : (
                      <>
                        <IndianRupee className="w-4 h-4" />
                        {formatIndianCurrency(concessionAmount)}
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Valid From</Label>
                  <p className="font-medium flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(concession.validFrom), "MMM dd, yyyy")}
                  </p>
                </div>
                {concession.validUntil && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Valid Until</Label>
                    <p className="font-medium flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(concession.validUntil), "MMM dd, yyyy")}
                    </p>
                  </div>
                )}
              </div>

              {concession.reason && (
                <div>
                  <Label className="text-xs text-muted-foreground">Request Reason</Label>
                  <p className="font-medium text-sm bg-background p-2 rounded border">
                    {concession.reason}
                  </p>
                </div>
              )}

              {concession.notes && (
                <div>
                  <Label className="text-xs text-muted-foreground">Additional Notes</Label>
                  <p className="font-medium text-sm bg-background p-2 rounded border">
                    {concession.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Approval Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="approval-notes" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Approval Notes {approvalSettings?.requireReason ? "(Required)" : "(Optional)"}
              </Label>
              <Textarea
                id="approval-notes"
                placeholder="Add any notes about this approval..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                These notes will be recorded in the concession history.
              </p>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Approving...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Approve Concession
                  </div>
                )}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}