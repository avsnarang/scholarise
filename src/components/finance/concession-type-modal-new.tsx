"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Plus, Award, Loader2 } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

interface ConcessionType {
  id: string;
  name: string;
  description?: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  maxValue?: number;
  isActive: boolean;
  applicableStudentTypes: string[];
  eligibilityCriteria?: string;
  requiredDocuments: string[];
  autoApproval: boolean;
}

interface ConcessionTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: any) => void;
  concessionType?: ConcessionType | null;
  isLoading: boolean;
}

const studentTypeOptions = [
  { value: 'NEW_ADMISSION', label: 'New Admissions' },
  { value: 'OLD_STUDENT', label: 'Existing Students' },
  { value: 'BOTH', label: 'All Students' },
];

const initialFormData = {
  name: '',
  description: '',
  type: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED',
  value: 0,
  maxValue: undefined as number | undefined,
  isActive: true,
  applicableStudentTypes: ['BOTH'],
  eligibilityCriteria: '',
  requiredDocuments: [] as string[],
  autoApproval: false,
};

export function ConcessionTypeModal({
  isOpen,
  onClose,
  onSuccess,
  concessionType,
  isLoading
}: ConcessionTypeModalProps) {
  const { toast } = useToast();
  
  const [formData, setFormData] = useState(initialFormData);
  const [newDocument, setNewDocument] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens/closes or concessionType changes
  useEffect(() => {
    if (isOpen) {
      if (concessionType) {
        setFormData({
          name: concessionType.name || '',
          description: concessionType.description || '',
          type: concessionType.type || 'PERCENTAGE',
          value: concessionType.value || 0,
          maxValue: concessionType.maxValue,
          isActive: concessionType.isActive ?? true,
          applicableStudentTypes: concessionType.applicableStudentTypes || ['BOTH'],
          eligibilityCriteria: concessionType.eligibilityCriteria || '',
          requiredDocuments: [...(concessionType.requiredDocuments || [])],
          autoApproval: concessionType.autoApproval ?? false,
        });
      } else {
        setFormData(initialFormData);
      }
      setErrors({});
      setNewDocument('');
    }
  }, [isOpen, concessionType]);

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (formData.value <= 0) {
      newErrors.value = 'Value must be greater than 0';
    }

    if (formData.type === 'PERCENTAGE' && formData.value > 100) {
      newErrors.value = 'Percentage cannot exceed 100%';
    }

    if (formData.maxValue && formData.maxValue < formData.value) {
      newErrors.maxValue = 'Maximum value cannot be less than value';
    }

    if (formData.type === 'PERCENTAGE' && formData.maxValue && formData.maxValue > 100) {
      newErrors.maxValue = 'Maximum percentage cannot exceed 100%';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!validateForm()) {
      return;
    }

    const submitData = {
      ...formData,
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      eligibilityCriteria: formData.eligibilityCriteria.trim() || undefined,
      maxValue: formData.maxValue || undefined,
    };

    try {
      onSuccess(submitData);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  }, [formData, validateForm, onSuccess]);

  const handleClose = useCallback(() => {
    setFormData(initialFormData);
    setErrors({});
    setNewDocument('');
    onClose();
  }, [onClose]);

  const addDocument = useCallback(() => {
    if (newDocument.trim() && !formData.requiredDocuments.includes(newDocument.trim())) {
      setFormData(prev => ({
        ...prev,
        requiredDocuments: [...prev.requiredDocuments, newDocument.trim()]
      }));
      setNewDocument('');
    }
  }, [newDocument, formData.requiredDocuments]);

  const removeDocument = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      requiredDocuments: prev.requiredDocuments.filter((_, i) => i !== index)
    }));
  }, []);

  const updateFormField = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Don't render anything if not open
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onEscapeKeyDown={handleClose}
        onPointerDownOutside={handleClose}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            {concessionType ? 'Edit Concession Type' : 'Add New Concession Type'}
          </DialogTitle>
          <DialogDescription>
            {concessionType 
              ? 'Update the concession type details below.'
              : 'Create a new concession type for student fee management.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => updateFormField('name', e.target.value)}
                  placeholder="e.g., Merit Scholarship"
                  className={errors.name ? "border-red-500" : ""}
                  disabled={isLoading}
                />
                {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: 'PERCENTAGE' | 'FIXED') => {
                    setFormData(prev => ({ ...prev, type: value, maxValue: undefined }));
                  }}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                    <SelectItem value="FIXED">Fixed Amount (₹)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => updateFormField('description', e.target.value)}
                placeholder="Brief description of the concession type"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Value Configuration */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Value Configuration</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="value">
                  {formData.type === 'PERCENTAGE' ? 'Percentage (%)' : 'Amount (₹)'} *
                </Label>
                <Input
                  id="value"
                  type="number"
                  min="0"
                  max={formData.type === 'PERCENTAGE' ? "100" : undefined}
                  step={formData.type === 'PERCENTAGE' ? "0.1" : "1"}
                  value={formData.value}
                  onChange={(e) => updateFormField('value', parseFloat(e.target.value) || 0)}
                  className={errors.value ? "border-red-500" : ""}
                  disabled={isLoading}
                />
                {errors.value && <p className="text-sm text-red-500">{errors.value}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxValue">
                  Maximum {formData.type === 'PERCENTAGE' ? 'Percentage (%)' : 'Amount (₹)'}
                </Label>
                <Input
                  id="maxValue"
                  type="number"
                  min="0"
                  max={formData.type === 'PERCENTAGE' ? "100" : undefined}
                  step={formData.type === 'PERCENTAGE' ? "0.1" : "1"}
                  value={formData.maxValue || ''}
                  onChange={(e) => updateFormField('maxValue', e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="Optional"
                  className={errors.maxValue ? "border-red-500" : ""}
                  disabled={isLoading}
                />
                {errors.maxValue && <p className="text-sm text-red-500">{errors.maxValue}</p>}
              </div>
            </div>
          </div>

          {/* Applicability */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Applicability</h3>
            
            <div className="space-y-3">
              <Label>Applicable Student Types *</Label>
              <div className="flex flex-wrap gap-3">
                {studentTypeOptions.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={option.value}
                      checked={formData.applicableStudentTypes.includes(option.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData(prev => ({
                            ...prev,
                            applicableStudentTypes: [...prev.applicableStudentTypes, option.value]
                          }));
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            applicableStudentTypes: prev.applicableStudentTypes.filter(type => type !== option.value)
                          }));
                        }
                      }}
                      disabled={isLoading}
                    />
                    <Label htmlFor={option.value} className="text-sm">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="eligibilityCriteria">Eligibility Criteria</Label>
              <Textarea
                id="eligibilityCriteria"
                value={formData.eligibilityCriteria}
                onChange={(e) => updateFormField('eligibilityCriteria', e.target.value)}
                placeholder="Criteria for students to be eligible for this concession"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Required Documents */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Required Documents</h3>
            
            <div className="flex gap-2">
              <Input
                value={newDocument}
                onChange={(e) => setNewDocument(e.target.value)}
                placeholder="Add required document"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addDocument())}
                disabled={isLoading}
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={addDocument}
                disabled={!newDocument.trim() || isLoading}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {formData.requiredDocuments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.requiredDocuments.map((doc, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {doc}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => removeDocument(index)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Settings</h3>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="autoApproval">Auto Approval</Label>
              <Switch
                id="autoApproval"
                checked={formData.autoApproval}
                onCheckedChange={(checked) => updateFormField('autoApproval', checked)}
                disabled={isLoading}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="isActive">Active Status</Label>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => updateFormField('isActive', checked)}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-4">
            <Button 
              type="submit" 
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {concessionType ? 'Update' : 'Create'} Concession Type
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}