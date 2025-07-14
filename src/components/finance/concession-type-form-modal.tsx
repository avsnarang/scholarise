"use client";

import React, { useState, useEffect } from 'react';
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Plus, Award } from 'lucide-react';
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

interface ConcessionTypeFormModalProps {
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

export function ConcessionTypeFormModal({
  isOpen,
  onClose,
  onSuccess,
  concessionType,
  isLoading
}: ConcessionTypeFormModalProps) {
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
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
  });

  const [newDocument, setNewDocument] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (concessionType) {
      setFormData({
        name: concessionType.name,
        description: concessionType.description || '',
        type: concessionType.type,
        value: concessionType.value,
        maxValue: concessionType.maxValue,
        isActive: concessionType.isActive,
        applicableStudentTypes: concessionType.applicableStudentTypes,
        eligibilityCriteria: concessionType.eligibilityCriteria || '',
        requiredDocuments: [...concessionType.requiredDocuments],
        autoApproval: concessionType.autoApproval,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        type: 'PERCENTAGE',
        value: 0,
        maxValue: undefined,
        isActive: true,
        applicableStudentTypes: ['BOTH'],
        eligibilityCriteria: '',
        requiredDocuments: [],
        autoApproval: false,
      });
    }
    setErrors({});
  }, [concessionType, isOpen]);

  const validateForm = () => {
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
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const submitData = {
      ...formData,
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      eligibilityCriteria: formData.eligibilityCriteria.trim() || undefined,
    };

    onSuccess(submitData);
  };

  const handleStudentTypeChange = (type: string, checked: boolean) => {
    if (type === 'BOTH') {
      if (checked) {
        setFormData(prev => ({ ...prev, applicableStudentTypes: ['BOTH'] }));
      } else {
        setFormData(prev => ({ ...prev, applicableStudentTypes: [] }));
      }
    } else {
      setFormData(prev => {
        let newTypes = [...prev.applicableStudentTypes];
        
        // Remove 'BOTH' if selecting specific types
        newTypes = newTypes.filter(t => t !== 'BOTH');
        
        if (checked) {
          newTypes.push(type);
        } else {
          newTypes = newTypes.filter(t => t !== type);
        }
        
        // If both NEW_ADMISSION and OLD_STUDENT are selected, use BOTH
        if (newTypes.includes('NEW_ADMISSION') && newTypes.includes('OLD_STUDENT')) {
          newTypes = ['BOTH'];
        }
        
        // If no types selected, default to BOTH
        if (newTypes.length === 0) {
          newTypes = ['BOTH'];
        }
        
        return { ...prev, applicableStudentTypes: newTypes };
      });
    }
  };

  const addDocument = () => {
    if (newDocument.trim() && !formData.requiredDocuments.includes(newDocument.trim())) {
      setFormData(prev => ({
        ...prev,
        requiredDocuments: [...prev.requiredDocuments, newDocument.trim()]
      }));
      setNewDocument('');
    }
  };

  const removeDocument = (index: number) => {
    setFormData(prev => ({
      ...prev,
      requiredDocuments: prev.requiredDocuments.filter((_, i) => i !== index)
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
            <h3 className="text-sm font-medium">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Merit Scholarship"
                  className={errors.name ? "border-red-500" : ""}
                />
                {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: 'PERCENTAGE' | 'FIXED') => 
                    setFormData(prev => ({ ...prev, type: value, maxValue: undefined }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                    <SelectItem value="FIXED">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the concession type"
                rows={2}
              />
            </div>
          </div>

          {/* Value Configuration */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Value Configuration</h3>
            
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
                  onChange={(e) => setFormData(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                  className={errors.value ? "border-red-500" : ""}
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
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    maxValue: e.target.value ? parseFloat(e.target.value) : undefined 
                  }))}
                  placeholder="Optional"
                  className={errors.maxValue ? "border-red-500" : ""}
                />
                {errors.maxValue && <p className="text-sm text-red-500">{errors.maxValue}</p>}
              </div>
            </div>
          </div>

          {/* Applicability */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Applicability</h3>
            
            <div className="space-y-3">
              <Label>Applicable Student Types</Label>
              <div className="space-y-2">
                {studentTypeOptions.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={option.value}
                      checked={formData.applicableStudentTypes.includes(option.value)}
                      onCheckedChange={(checked) => 
                        handleStudentTypeChange(option.value, checked as boolean)
                      }
                    />
                    <Label htmlFor={option.value} className="text-sm cursor-pointer">
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
                onChange={(e) => setFormData(prev => ({ ...prev, eligibilityCriteria: e.target.value }))}
                placeholder="Describe the criteria for this concession"
                rows={2}
              />
            </div>
          </div>

          {/* Required Documents */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Required Documents</h3>
            
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={newDocument}
                  onChange={(e) => setNewDocument(e.target.value)}
                  placeholder="e.g., Income Certificate"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addDocument())}
                />
                <Button type="button" variant="outline" onClick={addDocument}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {formData.requiredDocuments.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.requiredDocuments.map((doc, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {doc}
                      <button
                        type="button"
                        onClick={() => removeDocument(index)}
                        className="ml-1 hover:bg-muted rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Settings</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto Approval</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically approve concessions of this type
                  </p>
                </div>
                <Switch
                  checked={formData.autoApproval}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, autoApproval: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Active Status</Label>
                  <p className="text-sm text-muted-foreground">
                    Make this concession type available for assignment
                  </p>
                </div>
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : (concessionType ? 'Update' : 'Create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 