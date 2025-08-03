"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Award, Calendar as CalendarIcon, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  section?: {
    class?: {
      name: string;
    };
  } | null;
}

interface ConcessionType {
  id: string;
  name: string;
  type: string;
  value: number;
  maxValue?: number | null;
  description?: string | null;
  applicableStudentTypes: string[];
  eligibilityCriteria?: string | null;
  requiredDocuments: string[];
}

interface FeeHead {
  id: string;
  name: string;
}

interface FeeTerm {
  id: string;
  name: string;
}

interface StudentConcessionFormData {
  studentId: string;
  concessionTypeId: string;
  customValue?: number;
  reason?: string;
  validFrom: Date;
  validUntil?: Date;
  appliedFeeHeads: string[];
  appliedFeeTerms: string[];
  notes?: string;
}

interface StudentConcessionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: StudentConcessionFormData) => Promise<void>;
  students: Student[];
  concessionTypes: ConcessionType[];
  feeHeads: FeeHead[];
  feeTerms: FeeTerm[];
  isLoading?: boolean;
  editingConcession?: any;
}

interface FormErrors {
  studentId?: string;
  concessionTypeId?: string;
  customValue?: string;
  validUntil?: string;
}

export function StudentConcessionFormModal({
  isOpen,
  onClose,
  onSubmit,
  students,
  concessionTypes,
  feeHeads,
  feeTerms,
  isLoading = false,
  editingConcession,
}: StudentConcessionFormModalProps) {
  const [formData, setFormData] = useState<StudentConcessionFormData>({
    studentId: '',
    concessionTypeId: '',
    validFrom: new Date(),
    appliedFeeHeads: [],
    appliedFeeTerms: [],
  });
  
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedConcessionType, setSelectedConcessionType] = useState<ConcessionType | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showValidUntilCalendar, setShowValidUntilCalendar] = useState(false);
  const [showValidFromCalendar, setShowValidFromCalendar] = useState(false);

  // Reset form when modal state changes
  useEffect(() => {
    if (isOpen) {
      if (editingConcession) {
        setFormData({
          studentId: editingConcession.studentId,
          concessionTypeId: editingConcession.concessionTypeId,
          customValue: editingConcession.customValue,
          reason: editingConcession.reason,
          validFrom: new Date(editingConcession.validFrom),
          validUntil: editingConcession.validUntil ? new Date(editingConcession.validUntil) : undefined,
          appliedFeeHeads: editingConcession.appliedFeeHeads || [],
          appliedFeeTerms: editingConcession.appliedFeeTerms || [],
          notes: editingConcession.notes,
        });
        
        const student = students.find(s => s.id === editingConcession.studentId);
        setSelectedStudent(student || null);
        
        const concessionType = concessionTypes.find(ct => ct.id === editingConcession.concessionTypeId);
        setSelectedConcessionType(concessionType || null);
      } else {
        // Reset form for new concession
        setFormData({
          studentId: '',
          concessionTypeId: '',
          validFrom: new Date(),
          appliedFeeHeads: [],
          appliedFeeTerms: [],
        });
        setSelectedStudent(null);
        setSelectedConcessionType(null);
      }
    } else {
      // Reset form when modal closes
      setFormData({
        studentId: '',
        concessionTypeId: '',
        validFrom: new Date(),
        appliedFeeHeads: [],
        appliedFeeTerms: [],
      });
      setSelectedStudent(null);
      setSelectedConcessionType(null);
    }
    setErrors({});
  }, [isOpen, editingConcession, students, concessionTypes]);

  const validateForm = () => {
    const newErrors: FormErrors = {};
    
    if (!formData.studentId) {
      newErrors.studentId = "Please select a student";
    }

    if (!formData.concessionTypeId) {
      newErrors.concessionTypeId = "Please select a concession type";
    }

    if (formData.customValue !== undefined && selectedConcessionType) {
      if (selectedConcessionType.type === 'PERCENTAGE' && formData.customValue > 100) {
        newErrors.customValue = "Percentage value cannot exceed 100%";
      }

      if (selectedConcessionType.maxValue && formData.customValue > selectedConcessionType.maxValue) {
        newErrors.customValue = `Value cannot exceed maximum of ${selectedConcessionType.maxValue}`;
      }
    }

    if (formData.validUntil && formData.validUntil <= formData.validFrom) {
      newErrors.validUntil = "Valid until date must be after valid from date";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting concession:', error);
    }
  };

  const handleStudentChange = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    setSelectedStudent(student || null);
    setFormData(prev => ({ ...prev, studentId }));
    setErrors(prev => ({ ...prev, studentId: undefined }));
  };

  const handleConcessionTypeChange = (concessionTypeId: string) => {
    const concessionType = concessionTypes.find(ct => ct.id === concessionTypeId);
    setSelectedConcessionType(concessionType || null);
    setFormData(prev => ({ 
      ...prev, 
      concessionTypeId,
      customValue: undefined, // Reset custom value when type changes
    }));
    setErrors(prev => ({ ...prev, concessionTypeId: undefined, customValue: undefined }));
  };

  const handleFeeHeadToggle = (feeHeadId: string) => {
    setFormData(prev => ({
      ...prev,
      appliedFeeHeads: prev.appliedFeeHeads.includes(feeHeadId)
        ? prev.appliedFeeHeads.filter(id => id !== feeHeadId)
        : [...prev.appliedFeeHeads, feeHeadId]
    }));
  };

  const handleFeeTermToggle = (feeTermId: string) => {
    setFormData(prev => ({
      ...prev,
      appliedFeeTerms: prev.appliedFeeTerms.includes(feeTermId)
        ? prev.appliedFeeTerms.filter(id => id !== feeTermId)
        : [...prev.appliedFeeTerms, feeTermId]
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            {editingConcession ? 'Edit Student Concession' : 'Assign Student Concession'}
          </DialogTitle>
          <DialogDescription>
            {editingConcession 
              ? 'Update the concession details for the student'
              : 'Assign a concession/scholarship to a student'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Student Selection */}
            <div className="space-y-2">
              <Label htmlFor="student">Student *</Label>
              <Select 
                value={formData.studentId} 
                onValueChange={handleStudentChange}
                disabled={isLoading || !!editingConcession}
              >
                <SelectTrigger className={errors.studentId ? "border-red-300" : ""}>
                  <SelectValue placeholder="Select student..." />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {student.firstName} {student.lastName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {student.admissionNumber} • {student.section?.class?.name}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.studentId && (
                <p className="text-sm text-red-600">{errors.studentId}</p>
              )}
            </div>

            {/* Concession Type Selection */}
            <div className="space-y-2">
              <Label htmlFor="concessionType">Concession Type *</Label>
              <Select 
                value={formData.concessionTypeId} 
                onValueChange={handleConcessionTypeChange}
                disabled={isLoading}
              >
                <SelectTrigger className={errors.concessionTypeId ? "border-red-300" : ""}>
                  <SelectValue placeholder="Select concession type..." />
                </SelectTrigger>
                <SelectContent>
                  {concessionTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{type.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {type.type === 'PERCENTAGE' ? `${type.value}%` : `₹${type.value}`}
                          {type.description && ` • ${type.description}`}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.concessionTypeId && (
                <p className="text-sm text-red-600">{errors.concessionTypeId}</p>
              )}
            </div>
          </div>

          {/* Custom Value */}
          {selectedConcessionType && (
            <div className="space-y-2">
              <Label htmlFor="customValue">
                Custom Value ({selectedConcessionType.type === 'PERCENTAGE' ? '%' : '₹'})
              </Label>
              <Input
                id="customValue"
                type="number"
                value={formData.customValue || ''}
                onChange={(e) => {
                  setFormData(prev => ({ 
                    ...prev, 
                    customValue: parseFloat(e.target.value) || undefined 
                  }));
                  setErrors(prev => ({ ...prev, customValue: undefined }));
                }}
                placeholder={`Default: ${selectedConcessionType.value}`}
                min="0"
                max={selectedConcessionType.type === 'PERCENTAGE' ? 100 : selectedConcessionType.maxValue || undefined}
                step="0.01"
                disabled={isLoading}
                className={errors.customValue ? "border-red-300" : ""}
              />
              {errors.customValue && (
                <p className="text-sm text-red-600">{errors.customValue}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Leave empty to use default value of {selectedConcessionType.value}
                {selectedConcessionType.type === 'PERCENTAGE' ? '%' : '₹'}
              </p>
            </div>
          )}

          {/* Validity Period */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valid From *</Label>
              <Popover open={showValidFromCalendar} onOpenChange={setShowValidFromCalendar}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.validFrom && "text-muted-foreground"
                    )}
                    disabled={isLoading}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.validFrom ? format(formData.validFrom, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.validFrom}
                    onSelect={(date) => {
                      if (date) {
                        setFormData(prev => ({ ...prev, validFrom: date }));
                        setShowValidFromCalendar(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Valid Until</Label>
              <Popover open={showValidUntilCalendar} onOpenChange={setShowValidUntilCalendar}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.validUntil && "text-muted-foreground",
                      errors.validUntil && "border-red-300"
                    )}
                    disabled={isLoading}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.validUntil ? format(formData.validUntil, "PPP") : "No expiry"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.validUntil}
                    onSelect={(date) => {
                      setFormData(prev => ({ ...prev, validUntil: date }));
                      setShowValidUntilCalendar(false);
                      setErrors(prev => ({ ...prev, validUntil: undefined }));
                    }}
                    disabled={(date) => date <= formData.validFrom}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.validUntil && (
                <p className="text-sm text-red-600">{errors.validUntil}</p>
              )}
            </div>
          </div>

          {/* Fee Heads */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Applicable Fee Heads</Label>
            <p className="text-xs text-muted-foreground">
              Select specific fee heads or leave empty to apply to all fee heads
            </p>
            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded-lg p-3">
              {feeHeads.map((feeHead) => (
                <div key={feeHead.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`feeHead-${feeHead.id}`}
                    checked={formData.appliedFeeHeads.includes(feeHead.id)}
                    onCheckedChange={() => handleFeeHeadToggle(feeHead.id)}
                    disabled={isLoading}
                  />
                  <Label 
                    htmlFor={`feeHead-${feeHead.id}`} 
                    className="text-sm cursor-pointer"
                  >
                    {feeHead.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Fee Terms */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Applicable Fee Terms</Label>
            <p className="text-xs text-muted-foreground">
              Select specific fee terms or leave empty to apply to all fee terms
            </p>
            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded-lg p-3">
              {feeTerms.map((feeTerm) => (
                <div key={feeTerm.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`feeTerm-${feeTerm.id}`}
                    checked={formData.appliedFeeTerms.includes(feeTerm.id)}
                    onCheckedChange={() => handleFeeTermToggle(feeTerm.id)}
                    disabled={isLoading}
                  />
                  <Label 
                    htmlFor={`feeTerm-${feeTerm.id}`} 
                    className="text-sm cursor-pointer"
                  >
                    {feeTerm.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Concession</Label>
            <Textarea
              id="reason"
              value={formData.reason || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Enter reason for granting this concession..."
              rows={3}
              disabled={isLoading}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Any additional notes or comments..."
              rows={2}
              disabled={isLoading}
            />
          </div>

          {/* Required Documents Info */}
          {selectedConcessionType && selectedConcessionType.requiredDocuments.length > 0 && (
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Required Documents</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    {selectedConcessionType.requiredDocuments.map((doc, index) => (
                      <li key={index}>• {doc}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.studentId || !formData.concessionTypeId}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? 'Saving...' : editingConcession ? 'Update Concession' : 'Assign Concession'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}