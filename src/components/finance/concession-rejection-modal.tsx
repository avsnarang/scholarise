"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
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
  XCircle, 
  User, 
  Calendar,
  IndianRupee,
  FileText,
  Award,
  AlertTriangle
} from 'lucide-react';
import { formatIndianCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";

interface PendingConcession {
  id: string;
  studentId: string;
  concessionTypeId: string;
  customValue?: number | null;
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

interface ConcessionRejectionModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  concession: PendingConcession;
  onSubmit: (data: { reason: string; rejectedBy: string }) => Promise<void>;
  isLoading: boolean;
}

export function ConcessionRejectionModal({
  isOpen,
  onOpenChange,
  concession,
  onSubmit,
  isLoading,
}: ConcessionRejectionModalProps) {
  const { user } = useAuth();
  const [rejectionReason, setRejectionReason] = useState("");
  const [isFormValid, setIsFormValid] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setRejectionReason("");
      setIsFormValid(false);
    }
  }, [isOpen]);

  // Validate form
  useEffect(() => {
    setIsFormValid(rejectionReason.trim().length >= 10);
  }, [rejectionReason]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !isFormValid) return;

    await onSubmit({
      reason: rejectionReason.trim(),
      rejectedBy: user.id,
    });
  };

  const concessionAmount = concession.customValue ?? concession.concessionType.value;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-600" />
            Reject Concession
          </DialogTitle>
          <DialogDescription>
            Provide a detailed reason for rejecting this concession request. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Warning Banner */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-semibold">Warning</span>
            </div>
            <p className="text-red-700 text-sm mt-1">
              Rejecting this concession will permanently deny the request. The student and relevant staff will be notified.
            </p>
          </div>

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

              {concession.reason && (
                <div>
                  <Label className="text-xs text-muted-foreground">Request Reason</Label>
                  <p className="font-medium text-sm bg-background p-2 rounded border">
                    {concession.reason}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Rejection Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="rejection-reason" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Rejection Reason *
              </Label>
              <Textarea
                id="rejection-reason"
                placeholder="Please provide a detailed reason for rejecting this concession request..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="mt-1"
                required
              />
              <div className="flex justify-between items-center mt-1">
                <p className="text-xs text-muted-foreground">
                  Minimum 10 characters required. Be specific and constructive.
                </p>
                <p className={`text-xs ${rejectionReason.length >= 10 ? 'text-green-600' : 'text-red-600'}`}>
                  {rejectionReason.length}/10
                </p>
              </div>
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
                disabled={isLoading || !isFormValid}
                variant="destructive"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Rejecting...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    Reject Concession
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