import React, { useState, useEffect } from 'react';
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
import { Loader2 } from "lucide-react";

export interface FeeHead {
  id: string;
  name: string;
  description: string | null;
  isSystemDefined: boolean;
  isActive: boolean;
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
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isSystemDefined: false,
  });

  const isEditing = !!feeHead;

  useEffect(() => {
    if (feeHead) {
      setFormData({
        name: feeHead.name,
        description: feeHead.description ?? '',
        isSystemDefined: feeHead.isSystemDefined,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        isSystemDefined: false,
      });
    }
  }, [feeHead, isOpen]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      return;
    }

    onSuccess({
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      isSystemDefined: formData.isSystemDefined,
    });
  };

  const handleClose = () => {
    if (!isLoading) {
      setFormData({
        name: '',
        description: '',
        isSystemDefined: false,
      });
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
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
                onChange={(e) => handleInputChange('name', e.target.value)}
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
                onChange={(e) => handleInputChange('description', e.target.value)}
                disabled={isLoading}
                className="mt-1"
                rows={3}
              />
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
                onCheckedChange={(checked) => handleInputChange('isSystemDefined', checked)}
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