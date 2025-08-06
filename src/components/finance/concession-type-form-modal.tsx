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
import { X, Plus, Award, Loader2, FileText, Calculator, Users, Settings, CheckCircle, Info, Trash2, Percent, IndianRupee, Target, Shield, BookOpen, AlertTriangle } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatIndianCurrency, cn } from "@/lib/utils";

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
  appliedFeeHeads?: string[]; // Keep as array for backward compatibility but use only first element
  appliedFeeTerms?: string[];
  feeTermAmounts?: Record<string, number>; // For FIXED type: feeTermId -> amount
}

interface FeeHead {
  id: string;
  name: string;
}

interface FeeTerm {
  id: string;
  name: string;
}

interface ConcessionTypeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: any) => void;
  concessionType?: ConcessionType | null;
  isLoading: boolean;
  feeHeads: FeeHead[];
  feeTerms: FeeTerm[];
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
  isLoading,
  feeHeads,
  feeTerms
}: ConcessionTypeFormModalProps) {
  
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
    appliedFeeHeads: [] as string[],
    appliedFeeTerms: [] as string[],
    feeTermAmounts: {} as Record<string, number>,
  });

  const [newDocument, setNewDocument] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formProgress, setFormProgress] = useState(0);

  // Calculate form completion progress
  const calculateProgress = () => {
    let progress = 0;
    
    if (formData.name.trim()) progress += 20;
    if (formData.type) progress += 15;
    
    // Value validation for PERCENTAGE type only
    if (formData.type === 'PERCENTAGE' && formData.value > 0) progress += 15;
    if (formData.type === 'FIXED') progress += 15; // No value needed for FIXED
    
    if (formData.appliedFeeHeads.length > 0 || formData.appliedFeeTerms.length > 0) progress += 20;
    
    // Fee term amounts for FIXED type
    if (formData.type === 'FIXED' && Object.values(formData.feeTermAmounts).some(amount => amount > 0)) progress += 15;
    if (formData.type === 'PERCENTAGE') progress += 15; // Auto-complete for percentage
    
    return Math.min(progress, 100);
  };

  // Reset form when modal state changes
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
          appliedFeeHeads: concessionType.appliedFeeHeads || [],
          appliedFeeTerms: concessionType.appliedFeeTerms || [],
          feeTermAmounts: concessionType.feeTermAmounts || {},
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
          appliedFeeHeads: [],
          appliedFeeTerms: [],
          feeTermAmounts: {},
        });
      }
      setErrors({});
      setNewDocument('');
    }
  }, [isOpen, concessionType]);

  // Update progress when form data changes
  useEffect(() => {
    setFormProgress(calculateProgress());
  }, [formData]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    // Only validate value for PERCENTAGE type
    if (formData.type === 'PERCENTAGE') {
      if (formData.value <= 0) {
        newErrors.value = 'Percentage must be greater than 0';
      }

      if (formData.value > 100) {
        newErrors.value = 'Percentage cannot exceed 100%';
      }

      if (formData.maxValue && formData.maxValue < formData.value) {
        newErrors.maxValue = 'Maximum value cannot be less than value';
      }

      if (formData.maxValue && formData.maxValue > 100) {
        newErrors.maxValue = 'Maximum percentage cannot exceed 100%';
      }
    }

    // For FIXED type, validate that at least one fee term has an amount
    if (formData.type === 'FIXED') {
      const hasValidAmounts = Object.values(formData.feeTermAmounts).some(amount => amount > 0);
      if (formData.appliedFeeTerms.length > 0 && !hasValidAmounts) {
        newErrors.feeTermAmounts = 'At least one fee term must have an amount greater than 0';
      }
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
      maxValue: formData.maxValue || undefined,
    };

    onSuccess(submitData);
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

  // Fee head toggle handler - removed since we now use single selection

  // Fee term toggle handler
  const handleFeeTermToggle = (feeTermId: string) => {
    setFormData(prev => {
      const newAppliedFeeTerms = prev.appliedFeeTerms.includes(feeTermId)
        ? prev.appliedFeeTerms.filter(id => id !== feeTermId)
        : [...prev.appliedFeeTerms, feeTermId];
      
      // For FIXED type, initialize amount for new fee terms
      let newFeeTermAmounts = { ...prev.feeTermAmounts };
      if (prev.type === 'FIXED') {
        if (newAppliedFeeTerms.includes(feeTermId) && !prev.feeTermAmounts[feeTermId]) {
          newFeeTermAmounts[feeTermId] = 0;
        } else if (!newAppliedFeeTerms.includes(feeTermId)) {
          delete newFeeTermAmounts[feeTermId];
        }
      }

      return {
        ...prev,
        appliedFeeTerms: newAppliedFeeTerms,
        feeTermAmounts: newFeeTermAmounts
      };
    });
  };

  // Update fee term amount for FIXED type
  const handleFeeTermAmountChange = (feeTermId: string, amount: number) => {
    setFormData(prev => ({
      ...prev,
      feeTermAmounts: {
        ...prev.feeTermAmounts,
        [feeTermId]: amount
      }
    }));
  };

  // Handle type change to clear FIXED-specific data when switching to PERCENTAGE
  const handleTypeChange = (newType: 'PERCENTAGE' | 'FIXED') => {
    setFormData(prev => ({
      ...prev,
      type: newType,
      feeTermAmounts: newType === 'PERCENTAGE' ? {} : prev.feeTermAmounts,
      value: newType === 'FIXED' ? 0 : prev.value, // Reset value for FIXED type
      maxValue: undefined, // Reset max value when changing type
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto p-0">
        <div className="sticky top-0 z-10 bg-background border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="flex items-center gap-2 text-xl">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg text-white">
                  <Award className="h-5 w-5" />
                </div>
                {concessionType ? 'Edit Concession Type' : 'Create New Concession Type'}
              </DialogTitle>
              <DialogDescription className="text-base">
                {concessionType 
                  ? 'Update the concession type details and fee application settings.'
                  : 'Create a new concession type with specific fee heads and terms configuration.'
                }
              </DialogDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  {formProgress}% Complete
                </div>
                <Progress value={formProgress} className="w-24 h-2 mt-1" />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">{/* Content will go here */}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Left Column */}
              <div className="space-y-6">
                
                {/* Basic Information Card */}
                <Card className="shadow-sm border-0 ring-1 ring-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <div className="p-1.5 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded-md">
                        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      Basic Information
                    </CardTitle>
                    <CardDescription>
                      Define the basic details and description for this concession type.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-medium">Concession Name *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g., Merit Scholarship, Sports Quota"
                          className={cn(
                            "h-10",
                            errors.name ? "border-red-500 focus-visible:ring-red-500" : ""
                          )}
                          disabled={isLoading}
                        />
                        {errors.name && <p className="text-xs text-red-600 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {errors.name}
                        </p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="type" className="text-sm font-medium">Concession Type *</Label>
                        <Select
                          value={formData.type}
                          onValueChange={handleTypeChange}
                          disabled={isLoading}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PERCENTAGE">
                              <div className="flex items-center gap-2">
                                <Percent className="h-3 w-3" />
                                Percentage Discount
                              </div>
                            </SelectItem>
                            <SelectItem value="FIXED">
                              <div className="flex items-center gap-2">
                                <IndianRupee className="h-3 w-3" />
                                Fixed Amount
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Brief description of this concession type and its purpose..."
                          rows={3}
                          className="resize-none"
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Value Configuration Card */}
                <Card className="shadow-sm border-0 ring-1 ring-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <div className="p-1.5 bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900 dark:to-emerald-800 rounded-md">
                        <Calculator className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      Value Configuration
                    </CardTitle>
                    <CardDescription>
                      Set the {formData.type === 'PERCENTAGE' ? 'percentage discount' : 'fixed amount'} for this concession type.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      {/* Only show the value field for PERCENTAGE type */}
                      {formData.type === 'PERCENTAGE' && (
                        <div className="space-y-2">
                          <Label htmlFor="value" className="text-sm font-medium">
                            Percentage (%) *
                          </Label>
                          <div className="relative">
                            <Input
                              id="value"
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={formData.value}
                              onChange={(e) => setFormData(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                              className={cn(
                                "h-10 pr-8",
                                errors.value ? "border-red-500 focus-visible:ring-red-500" : ""
                              )}
                              placeholder="e.g., 25"
                              disabled={isLoading}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                              %
                            </div>
                          </div>
                          {errors.value && <p className="text-xs text-red-600 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {errors.value}
                          </p>}
                        </div>
                      )}
                      
                      {/* For FIXED type, show info about fee term wise amounts */}
                      {formData.type === 'FIXED' && (
                        <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950 dark:to-orange-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                          <div className="flex items-start gap-3">
                            <div className="p-1 bg-yellow-600 rounded-full">
                              <Info className="h-3 w-3 text-white" />
                            </div>
                            <div className="text-sm flex-1">
                              <p className="font-medium text-yellow-900 dark:text-yellow-100 mb-1">Fixed Amount Configuration</p>
                              <p className="text-yellow-800 dark:text-yellow-200 text-xs">
                                For Fixed Amount concessions, you'll configure individual amounts for each fee term below. 
                                No single amount value is needed here.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="maxValue" className="text-sm font-medium">
                          Maximum {formData.type === 'PERCENTAGE' ? 'Percentage (%)' : 'Amount (₹)'}
                        </Label>
                        <div className="relative">
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
                            placeholder="Optional limit"
                            className={cn(
                              "h-10 pr-8",
                              errors.maxValue ? "border-red-500 focus-visible:ring-red-500" : ""
                            )}
                            disabled={isLoading}
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                            {formData.type === 'PERCENTAGE' ? '%' : '₹'}
                          </div>
                        </div>
                        {errors.maxValue && <p className="text-xs text-red-600 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {errors.maxValue}
                        </p>}
                      </div>
                    </div>

                    {/* Value Preview */}
                    {formData.value > 0 && (
                      <div className="p-3 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                        <div className="flex items-center gap-2 text-sm">
                          <Target className="h-4 w-4 text-emerald-600" />
                          <span className="font-medium text-emerald-900 dark:text-emerald-100">
                            Preview: {formData.type === 'PERCENTAGE' 
                              ? `${formData.value}% discount`
                              : `${formatIndianCurrency(formData.value)} fixed amount`
                            }
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

              </div>

              {/* Right Column */}
              <div className="space-y-6">

                {/* Fee Application Card */}
                <Card className="shadow-sm border-0 ring-1 ring-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <div className="p-1.5 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900 dark:to-purple-800 rounded-md">
                        <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      Fee Application
                    </CardTitle>
                    <CardDescription>
                      Configure which fee heads and terms this concession applies to.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Fee Head Selection */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-orange-600" />
                        <Label className="text-sm font-medium">Applicable Fee Head</Label>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Select which fee head this concession applies to
                      </p>
                      <div className="space-y-2">
                        <Select
                          value={formData.appliedFeeHeads[0] || undefined}
                          onValueChange={(value) => {
                            setFormData(prev => ({
                              ...prev,
                              appliedFeeHeads: value ? [value] : []
                            }));
                          }}
                          disabled={isLoading}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Select a fee head" />
                          </SelectTrigger>
                          <SelectContent>
                            {feeHeads.map((feeHead) => (
                              <SelectItem key={feeHead.id} value={feeHead.id}>
                                <div className="flex items-center gap-2">
                                  <Shield className="h-3 w-3 text-orange-600" />
                                  {feeHead.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {formData.appliedFeeHeads[0] && (
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  appliedFeeHeads: []
                                }));
                              }}
                              className="h-8 px-3 text-xs"
                              disabled={isLoading}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Clear Selection
                            </Button>
                          </div>
                        )}
                      </div>
                      {formData.appliedFeeHeads[0] && (
                        <div className="p-3 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950 border border-orange-200 dark:border-orange-800 rounded-lg">
                          <div className="flex items-center gap-2 text-sm">
                            <Shield className="h-4 w-4 text-orange-600" />
                            <span className="font-medium text-orange-900 dark:text-orange-100">
                              Selected: {feeHeads.find(fh => fh.id === formData.appliedFeeHeads[0])?.name}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Fee Terms Selection */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-indigo-600" />
                        <Label className="text-sm font-medium">Applicable Fee Terms</Label>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formData.type === 'PERCENTAGE' 
                          ? 'Select fee terms - the same percentage will apply to all selected terms'
                          : 'Select fee terms and set individual amounts for each term'
                        }
                      </p>
                      
                      {formData.type === 'PERCENTAGE' ? (
                        <div className="border rounded-lg p-4 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950 dark:to-blue-950">
                          <div className="grid grid-cols-1 gap-3 max-h-40 overflow-y-auto">
                            {feeTerms.map((feeTerm) => (
                              <div key={feeTerm.id} className="flex items-center space-x-3 p-2 hover:bg-white dark:hover:bg-gray-700 rounded-md transition-colors">
                                <Checkbox
                                  id={`feeTerm-${feeTerm.id}`}
                                  checked={formData.appliedFeeTerms.includes(feeTerm.id)}
                                  onCheckedChange={() => handleFeeTermToggle(feeTerm.id)}
                                  disabled={isLoading}
                                  className="data-[state=checked]:bg-indigo-600"
                                />
                                <Label 
                                  htmlFor={`feeTerm-${feeTerm.id}`} 
                                  className="text-sm cursor-pointer font-medium"
                                >
                                  {feeTerm.name}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3 border rounded-lg p-4 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950 dark:to-orange-950">
                          {feeTerms.map((feeTerm) => (
                            <div key={feeTerm.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
                              <div className="flex items-center space-x-3">
                                <Checkbox
                                  id={`feeTerm-${feeTerm.id}`}
                                  checked={formData.appliedFeeTerms.includes(feeTerm.id)}
                                  onCheckedChange={() => handleFeeTermToggle(feeTerm.id)}
                                  disabled={isLoading}
                                  className="data-[state=checked]:bg-yellow-600"
                                />
                                <Label 
                                  htmlFor={`feeTerm-${feeTerm.id}`} 
                                  className="font-medium cursor-pointer"
                                >
                                  {feeTerm.name}
                                </Label>
                              </div>
                              {formData.appliedFeeTerms.includes(feeTerm.id) && (
                                <div className="flex items-center gap-2">
                                  <Label className="text-sm font-medium">₹</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={formData.feeTermAmounts[feeTerm.id] || ''}
                                    onChange={(e) => handleFeeTermAmountChange(feeTerm.id, parseFloat(e.target.value) || 0)}
                                    placeholder="0"
                                    className="w-28 h-8"
                                    disabled={isLoading}
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {errors.feeTermAmounts && (
                        <p className="text-xs text-red-600 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {errors.feeTermAmounts}
                        </p>
                      )}
                    </div>

                    {/* Fee Application Summary */}
                    {(formData.appliedFeeHeads.length > 0 || formData.appliedFeeTerms.length > 0) && (
                      <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-start gap-3">
                          <div className="p-1 bg-blue-600 rounded-full">
                            <Info className="h-3 w-3 text-white" />
                          </div>
                          <div className="text-sm flex-1">
                            <p className="font-medium text-blue-900 dark:text-blue-100 mb-2">Application Summary</p>
                            <div className="space-y-1">
                              <p className="text-blue-800 dark:text-blue-200">
                                • {formData.appliedFeeHeads.length > 0 ? '1 fee head selected' : 'No fee head selected'}
                              </p>
                              <p className="text-blue-800 dark:text-blue-200">
                                • {formData.appliedFeeTerms.length} fee term(s) selected
                              </p>
                            </div>
                            {formData.type === 'FIXED' && Object.keys(formData.feeTermAmounts).length > 0 && (
                              <div className="mt-3 p-2 bg-blue-100 dark:bg-blue-900 rounded border">
                                <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">Fixed Amounts:</p>
                                <div className="grid grid-cols-1 gap-1">
                                  {Object.entries(formData.feeTermAmounts).map(([termId, amount]) => {
                                    const term = feeTerms.find(t => t.id === termId);
                                    return term && amount > 0 ? (
                                      <div key={termId} className="text-xs text-blue-700 dark:text-blue-300 flex justify-between">
                                        <span>{term.name}:</span>
                                        <span className="font-medium">{formatIndianCurrency(amount)}</span>
                                      </div>
                                    ) : null;
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

        {/* Student Applicability Card */}
        <Card className="shadow-sm border-0 ring-1 ring-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-1.5 bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900 dark:to-indigo-800 rounded-md">
                <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              Student Applicability
            </CardTitle>
            <CardDescription>
              Define which types of students are eligible for this concession.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Applicable Student Types *</Label>
              <div className="grid grid-cols-1 gap-3">
                {studentTypeOptions.map((option) => (
                  <div key={option.value} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
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
                      className="data-[state=checked]:bg-indigo-600"
                    />
                    <Label htmlFor={option.value} className="text-sm cursor-pointer font-medium flex-1">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="eligibilityCriteria" className="text-sm font-medium">Eligibility Criteria</Label>
              <Textarea
                id="eligibilityCriteria"
                value={formData.eligibilityCriteria}
                onChange={(e) => setFormData(prev => ({ ...prev, eligibilityCriteria: e.target.value }))}
                placeholder="Define specific criteria students must meet to be eligible..."
                rows={3}
                className="resize-none"
                disabled={isLoading}
              />
            </div>
          </CardContent>
        </Card>

        </div>
      </div>

      {/* Full Width Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Required Documents Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <FileText className="h-4 w-4 text-orange-600" />
              <h3 className="font-medium">Required Documents</h3>
            </div>
            
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

                        {/* Settings Card */}
              <Card className="shadow-sm border-0 ring-1 ring-border">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="p-1.5 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-md">
                      <Settings className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                    </div>
                    Settings & Configuration
                  </CardTitle>
                  <CardDescription>
                    Configure approval settings and status for this concession type.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800">
                      <div className="space-y-1">
                        <Label htmlFor="autoApproval" className="text-sm font-medium">Auto Approval</Label>
                        <p className="text-xs text-muted-foreground">Automatically approve concessions of this type</p>
                      </div>
                      <Switch
                        id="autoApproval"
                        checked={formData.autoApproval}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, autoApproval: checked }))}
                        disabled={isLoading}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 border-blue-200 dark:border-blue-800">
                      <div className="space-y-1">
                        <Label htmlFor="isActive" className="text-sm font-medium">Active Status</Label>
                        <p className="text-xs text-muted-foreground">Make this concession type available for assignment</p>
                      </div>
                      <Switch
                        id="isActive"
                        checked={formData.isActive}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-6 border-t bg-gray-50 dark:bg-gray-900 px-6 py-4 -mx-6 -mb-6 rounded-b-lg">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                className="h-10 px-6"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !formData.name.trim()}
                className="h-10 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? 'Saving...' : concessionType ? 'Update Concession Type' : 'Create Concession Type'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}