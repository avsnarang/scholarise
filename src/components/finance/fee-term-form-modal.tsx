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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, X } from "lucide-react";

export interface FeeTerm {
  id: string;
  name: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  dueDate: Date;
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
  feeHeads?: Array<{
    feeHead: {
      id: string;
      name: string;
    };
  }>;
  _count?: {
    classwiseFees: number;
    feeCollections: number;
  };
}

interface FeeHead {
  id: string;
  name: string;
  description: string | null;
  isSystemDefined: boolean;
}

interface FeeTermFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (feeTerm: {
    name: string;
    description: string | null;
    startDate: Date;
    endDate: Date;
    dueDate: Date;
    feeHeadIds: string[];
  }) => void;
  feeTerm?: FeeTerm | null;
  feeHeads?: FeeHead[];
  isLoading?: boolean;
}

export function FeeTermFormModal({
  isOpen,
  onClose,
  onSuccess,
  feeTerm,
  feeHeads = [],
  isLoading = false,
}: FeeTermFormModalProps) {
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    dueDate: string;
    selectedFeeHeadIds: string[];
  }>({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    dueDate: '',
    selectedFeeHeadIds: [],
  });

  const isEditing = !!feeTerm;

  useEffect(() => {
    if (feeTerm) {
      setFormData({
        name: feeTerm.name,
        description: feeTerm.description ?? '',
        startDate: feeTerm.startDate ? (new Date(feeTerm.startDate).toISOString().split('T')[0] ?? '') : '',
        endDate: feeTerm.endDate ? (new Date(feeTerm.endDate).toISOString().split('T')[0] ?? '') : '',
        dueDate: feeTerm.dueDate ? (new Date(feeTerm.dueDate).toISOString().split('T')[0] ?? '') : '',
        selectedFeeHeadIds: feeTerm.feeHeads?.map(fh => fh.feeHead.id) ?? [],
      });
    } else {
      setFormData({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        dueDate: '',
        selectedFeeHeadIds: [],
      });
    }
  }, [feeTerm, isOpen]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFeeHeadToggle = (feeHeadId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedFeeHeadIds: prev.selectedFeeHeadIds.includes(feeHeadId)
        ? prev.selectedFeeHeadIds.filter(id => id !== feeHeadId)
        : [...prev.selectedFeeHeadIds, feeHeadId],
    }));
  };

  const removeFeeHead = (feeHeadId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedFeeHeadIds: prev.selectedFeeHeadIds.filter(id => id !== feeHeadId),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.startDate || !formData.endDate || !formData.dueDate) {
      return;
    }

    // Validate dates
    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);
    const dueDate = new Date(formData.dueDate);

    if (endDate <= startDate) {
      alert('End date must be after start date');
      return;
    }

    onSuccess({
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      startDate,
      endDate,
      dueDate,
      feeHeadIds: formData.selectedFeeHeadIds,
    });
  };

  const handleClose = () => {
    if (!isLoading) {
      setFormData({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        dueDate: '',
        selectedFeeHeadIds: [],
      });
      onClose();
    }
  };

  const getSelectedFeeHeads = () => {
    return feeHeads.filter(fh => formData.selectedFeeHeadIds.includes(fh.id));
  };

  const getUnselectedFeeHeads = () => {
    return feeHeads.filter(fh => !formData.selectedFeeHeadIds.includes(fh.id));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Fee Term" : "Add New Fee Term"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Term Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="e.g., Term 1 (2024-2025)"
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
                placeholder="Brief description of this fee term"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                disabled={isLoading}
                className="mt-1"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  disabled={isLoading}
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                  disabled={isLoading}
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => handleInputChange('dueDate', e.target.value)}
                  disabled={isLoading}
                  className="mt-1"
                  required
                />
              </div>
            </div>

            <div>
              <Label>Associated Fee Heads</Label>
              
              {/* Selected Fee Heads */}
              {getSelectedFeeHeads().length > 0 && (
                <div className="mt-2 mb-4">
                  <Label className="text-sm text-gray-600 dark:text-gray-400 mb-2">Selected Fee Heads:</Label>
                  <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-md min-h-[40px]">
                    {getSelectedFeeHeads().map((feeHead) => (
                      <Badge
                        key={feeHead.id}
                        variant="secondary"
                        className="flex items-center gap-1 bg-[#00501B] text-white hover:bg-[#00501B]/90"
                      >
                        {feeHead.name}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => removeFeeHead(feeHead.id)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Available Fee Heads */}
              {getUnselectedFeeHeads().length > 0 ? (
                <div className="mt-2">
                  <Label className="text-sm text-gray-600 dark:text-gray-400 mb-2">Available Fee Heads:</Label>
                  <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
                    {getUnselectedFeeHeads().map((feeHead) => (
                      <div key={feeHead.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`feeHead-${feeHead.id}`}
                          checked={formData.selectedFeeHeadIds.includes(feeHead.id)}
                          onCheckedChange={() => handleFeeHeadToggle(feeHead.id)}
                          disabled={isLoading}
                        />
                        <Label
                          htmlFor={`feeHead-${feeHead.id}`}
                          className="flex-1 cursor-pointer text-sm"
                        >
                          <div>{feeHead.name}</div>
                          {feeHead.description && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {feeHead.description}
                            </div>
                          )}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                formData.selectedFeeHeadIds.length === 0 && (
                  <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 italic">
                    {feeHeads.length === 0 
                      ? "No fee heads available. Please create some fee heads first."
                      : "All available fee heads have been selected."
                    }
                  </div>
                )
              )}
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
              disabled={isLoading || !formData.name.trim() || !formData.startDate || !formData.endDate || !formData.dueDate}
              className="bg-[#00501B] hover:bg-[#00501B]/90 text-white"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Update Fee Term" : "Create Fee Term"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 