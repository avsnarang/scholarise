import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export interface FeeHead {
  id: string;
  name: string;
  description: string | null;
  isSystemDefined: boolean;
  isActive: boolean;
  studentType: string;
  branchId: string;
  sessionId: string;
  createdAt: Date;
  updatedAt: Date;
  branch?: {
    id: string;
    name: string;
  };
  session?: {
    id: string;
    name: string;
  };
  _count?: {
    feeTerms: number;
    classwiseFees: number;
  };
}

interface FeeHeadFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (feeHead: {
    name: string;
    description: string | null;
    isSystemDefined: boolean;
    studentType: string;
  }) => void;
  feeHead?: FeeHead | null;
  isLoading?: boolean;
}

export function FeeHeadFormModal({
  isOpen,
  onClose,
  onSuccess,
  feeHead,
  isLoading = false,
}: FeeHeadFormModalProps) {
  const isEditing = !!feeHead;

  // Initialize form data based on whether we're editing or creating
  const initialFormData = useMemo(() => {
    if (feeHead) {
      return {
        name: feeHead.name,
        description: feeHead.description ?? '',
        isSystemDefined: feeHead.isSystemDefined,
        studentType: feeHead.studentType || 'BOTH',
      };
    }
    return {
      name: '',
      description: '',
      isSystemDefined: false,
      studentType: 'BOTH',
    };
  }, [feeHead]);

  const [formData, setFormData] = useState(initialFormData);

  // Reset form data when modal opens/closes or feeHead changes
  useEffect(() => {
    if (isOpen) {
      setFormData(initialFormData);
    }
  }, [isOpen, initialFormData]);

  const handleInputChange = useCallback((field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      return;
    }

    onSuccess({
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      isSystemDefined: formData.isSystemDefined,
      studentType: formData.studentType,
    });
  }, [formData, onSuccess]);

  const handleClose = useCallback(() => {
    if (!isLoading) {
      onClose();
    }
  }, [isLoading, onClose]);

  // Memoize handlers for input changes to prevent re-renders
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleInputChange('name', e.target.value);
  }, [handleInputChange]);

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleInputChange('description', e.target.value);
  }, [handleInputChange]);

  const handleStudentTypeChange = useCallback((value: string) => {
    handleInputChange('studentType', value);
  }, [handleInputChange]);

  const handleSystemDefinedChange = useCallback((checked: boolean) => {
    handleInputChange('isSystemDefined', checked);
  }, [handleInputChange]);

  const handleDialogOpenChange = useCallback((open: boolean) => {
    if (!open) {
      handleClose();
    }
  }, [handleClose]);

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Fee Head" : "Add New Fee Head"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Fee Head Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="e.g., Tuition Fee, Library Fee"
                value={formData.name}
                onChange={handleNameChange}
                disabled={isLoading}
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of this fee head"
                value={formData.description}
                onChange={handleDescriptionChange}
                disabled={isLoading}
                className="mt-1"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="studentType">Student Type</Label>
              <Select
                value={formData.studentType}
                onValueChange={handleStudentTypeChange}
                disabled={isLoading}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select student type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BOTH">Both (New & Old Students)</SelectItem>
                  <SelectItem value="NEW_ADMISSION">New Admission Only</SelectItem>
                  <SelectItem value="OLD_STUDENT">Old Students Only</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-sm text-gray-500 mt-1">
                Choose which type of students this fee head applies to
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <Label htmlFor="system-defined">System Defined</Label>
                <div className="text-sm text-gray-500">
                  System-defined fee heads have limited editability
                </div>
              </div>
              <Switch
                id="system-defined"
                checked={formData.isSystemDefined}
                onCheckedChange={handleSystemDefinedChange}
                disabled={isLoading || isEditing}
              />
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
              type="submit"
              disabled={isLoading || !formData.name.trim()}
              className="bg-[#00501B] hover:bg-[#00501B]/90 text-white"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Update Fee Head" : "Create Fee Head"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 