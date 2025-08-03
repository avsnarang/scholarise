import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { DateRangeSelector } from "@/components/ui/date-range-selector";
import type { DateRange } from "react-day-picker";
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
    feeCollectionItems: number;
  };
}

interface FeeHead {
  id: string;
  name: string;
  description: string | null;
  isSystemDefined: boolean;
}

interface FeeTermFormProps {
  onSuccess: (feeTerm: {
    name: string;
    description?: string;
    startDate: Date;
    endDate: Date;
    dueDate: Date;
    feeHeadIds: string[];
  }) => void;
  onCancel: () => void;
  feeTerm?: FeeTerm | null;
  feeHeads?: FeeHead[];
  isLoading?: boolean;
}

export function FeeTermForm({
  onSuccess,
  onCancel,
  feeTerm,
  feeHeads = [],
  isLoading = false,
}: FeeTermFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    dateRange: undefined as DateRange | undefined,
    dueDate: null as Date | null,
    feeHeadIds: [] as string[],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data when modal opens or feeTerm changes
  useEffect(() => {
    if (feeTerm) {
      setFormData({
        name: feeTerm.name,
        description: feeTerm.description || '',
        dateRange: {
          from: feeTerm.startDate,
          to: feeTerm.endDate,
        },
        dueDate: feeTerm.dueDate,
        feeHeadIds: feeTerm.feeHeads?.map(fh => fh.feeHead.id) || [],
      });
    } else {
      setFormData({
        name: '',
        description: '',
        dateRange: undefined,
        dueDate: null,
        feeHeadIds: [],
      });
    }
  }, [feeTerm]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Fee term name is required';
    }

    if (!formData.dateRange?.from) {
      newErrors.dateRange = 'Start date is required';
    }

    if (!formData.dateRange?.to) {
      newErrors.dateRange = 'End date is required';
    }

    if (!formData.dueDate) {
      newErrors.dueDate = 'Due date is required';
    }

    // Validate date logic - check that end date is after start date
    if (formData.dateRange?.from && formData.dateRange?.to) {
      if (formData.dateRange.to <= formData.dateRange.from) {
        newErrors.dateRange = 'End date must be after start date';
      }
    }

    // Note: Due date can now be before start date - validation removed

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleDateChange = (field: string, date: Date) => {
    setFormData(prev => ({ ...prev, [field]: date }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleFeeHeadToggle = (feeHeadId: string) => {
    setFormData(prev => ({
      ...prev,
      feeHeadIds: prev.feeHeadIds.includes(feeHeadId)
        ? prev.feeHeadIds.filter(id => id !== feeHeadId)
        : [...prev.feeHeadIds, feeHeadId]
    }));
  };

  const removeFeeHead = (feeHeadId: string) => {
    setFormData(prev => ({
      ...prev,
      feeHeadIds: prev.feeHeadIds.filter(id => id !== feeHeadId)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    onSuccess({
      name: formData.name,
      description: formData.description || undefined,
      startDate: formData.dateRange!.from!,
      endDate: formData.dateRange!.to!,
      dueDate: formData.dueDate!,
      feeHeadIds: formData.feeHeadIds,
    });
  };

  const getSelectedFeeHeads = () => {
    return feeHeads.filter(fh => formData.feeHeadIds.includes(fh.id));
  };

  const getUnselectedFeeHeads = () => {
    return feeHeads.filter(fh => !formData.feeHeadIds.includes(fh.id));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        {/* Fee Term Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Fee Term Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Enter fee term name"
            disabled={isLoading}
          />
          {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Enter fee term description (optional)"
            disabled={isLoading}
            rows={3}
          />
          {errors.description && <p className="text-sm text-red-600">{errors.description}</p>}
        </div>

        {/* Date Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Term Period (Start - End Date) *</Label>
            <DateRangeSelector
              value={formData.dateRange}
              onChange={(range) => {
                setFormData(prev => ({ ...prev, dateRange: range }));
                if (errors.dateRange) {
                  setErrors(prev => ({ ...prev, dateRange: '' }));
                }
              }}
              placeholder="Select term period"
              disabled={isLoading}
            />
            {errors.dateRange && <p className="text-sm text-red-600">{errors.dateRange}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date *</Label>
            <DatePicker
              value={formData.dueDate || undefined}
              onChange={(date) => handleDateChange('dueDate', date)}
              placeholder="Select due date"
              disabled={isLoading}
            />
            {errors.dueDate && <p className="text-sm text-red-600">{errors.dueDate}</p>}
            <p className="text-xs text-muted-foreground">
              Due date can be before, during, or after the term period
            </p>
          </div>
        </div>

        {/* Fee Heads Association */}
        {feeHeads.length > 0 && (
          <div className="space-y-3">
            <Label>Associated Fee Heads</Label>
            
            {/* Selected Fee Heads */}
            {getSelectedFeeHeads().length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Selected:</p>
                <div className="flex flex-wrap gap-2">
                  {getSelectedFeeHeads().map((feeHead) => (
                    <Badge key={feeHead.id} variant="default" className="flex items-center gap-1">
                      {feeHead.name}
                      <button
                        type="button"
                        onClick={() => removeFeeHead(feeHead.id)}
                        className="ml-1 text-white hover:text-gray-200"
                        disabled={isLoading}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Available Fee Heads */}
            {getUnselectedFeeHeads().length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Available:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded p-3">
                  {getUnselectedFeeHeads().map((feeHead) => (
                    <div key={feeHead.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`feeHead-${feeHead.id}`}
                        checked={formData.feeHeadIds.includes(feeHead.id)}
                        onCheckedChange={() => handleFeeHeadToggle(feeHead.id)}
                        disabled={isLoading}
                      />
                      <Label 
                        htmlFor={`feeHead-${feeHead.id}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {feeHead.name}
                        {feeHead.isSystemDefined && (
                          <Badge variant="outline" className="ml-2 text-xs">System</Badge>
                        )}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {getUnselectedFeeHeads().length === 0 && getSelectedFeeHeads().length === 0 && (
              <p className="text-sm text-muted-foreground">No fee heads available</p>
            )}
          </div>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {feeTerm ? 'Update Fee Term' : 'Create Fee Term'}
        </Button>
      </div>
    </form>
  );
} 