"use client";

import React, { useState, useEffect, useCallback } from 'react';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  X, 
  Search, 
  AlertTriangle, 
  CalendarIcon, 
  Award, 
  Info, 
  Loader2, 
  Users, 
  FileText, 
  Clock, 
  Target, 
  CheckCircle, 
  UserPlus 
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  section?: {
    name?: string;
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
  appliedFeeHeads?: string[];
  appliedFeeTerms?: string[];
  feeTermAmounts?: Record<string, number> | null;
}

interface StudentConcessionFormData {
  studentId: string;
  concessionTypeId: string;
  customValue?: number;
  reason: string;
  validFrom: Date;
  validUntil?: Date;
  notes: string;
}

interface StudentConcessionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: StudentConcessionFormData) => Promise<void>;
  students: Student[];
  concessionTypes: ConcessionType[];
  isLoading?: boolean;
  editingConcession?: {
    id: string;
    studentId: string;
    concessionTypeId: string;
    customValue?: number | null;
    reason?: string | null;
    validFrom?: Date | null;
    validUntil?: Date | null;
    notes?: string | null;
    student?: {
      firstName: string;
      lastName: string;
      admissionNumber: string;
    };
  } | null;
}

export function StudentConcessionFormModal({
  isOpen,
  onClose,
  onSubmit,
  students,
  concessionTypes,
  isLoading = false,
  editingConcession,
}: StudentConcessionFormModalProps) {
  
  const [formData, setFormData] = useState<StudentConcessionFormData>({
    studentId: '',
    concessionTypeId: '',
    customValue: undefined,
    reason: '',
    validFrom: new Date(),
    validUntil: undefined,
    notes: '',
  });

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedConcessionType, setSelectedConcessionType] = useState<ConcessionType | null>(null);
  const [showValidFromCalendar, setShowValidFromCalendar] = useState(false);
  const [showValidUntilCalendar, setShowValidUntilCalendar] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [formProgress, setFormProgress] = useState(0);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);

  // Calculate form completion progress - MEMOIZED TO PREVENT INFINITE LOOPS
  const calculateProgress = useCallback(() => {
    let progress = 0;
    
    if (formData.studentId) progress += 30;
    if (formData.concessionTypeId) progress += 30;
    if (formData.reason.trim()) progress += 20;
    if (formData.validFrom) progress += 10;
    if (formData.validUntil) progress += 10;
    
    return Math.min(progress, 100);
  }, [formData.studentId, formData.concessionTypeId, formData.reason, formData.validFrom, formData.validUntil]);

  useEffect(() => {
    setFormProgress(calculateProgress());
  }, [calculateProgress]);

  useEffect(() => {
    if (isOpen) {
      if (editingConcession) {
        const student = students.find(s => s.id === editingConcession.studentId);
        setSelectedStudent(student || null);
        setStudentSearchQuery(student ? `${student.firstName} ${student.lastName} (${student.admissionNumber})` : '');
        
        const concessionType = concessionTypes.find(ct => ct.id === editingConcession.concessionTypeId);
        setSelectedConcessionType(concessionType || null);
        
        setFormData({
          studentId: editingConcession.studentId,
          concessionTypeId: editingConcession.concessionTypeId,
          customValue: editingConcession.customValue || undefined,
          reason: editingConcession.reason || '',
          validFrom: editingConcession.validFrom || new Date(),
          validUntil: editingConcession.validUntil || undefined,
          notes: editingConcession.notes || '',
        });
      } else {
        setSelectedStudent(null);
        setStudentSearchQuery('');
        setSelectedConcessionType(null);
        setFormData({
          studentId: '',
          concessionTypeId: '',
          customValue: undefined,
          reason: '',
          validFrom: new Date(),
          validUntil: undefined,
          notes: '',
        });
      }
      setStudentSearchQuery('');
      setShowStudentDropdown(false);
      setErrors({});
    }
  }, [isOpen, editingConcession, students, concessionTypes]);

  // Student search logic with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (studentSearchQuery.trim()) {
        const filtered = students.filter(student => {
          const query = studentSearchQuery.toLowerCase();
          const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
          const admissionNumber = student.admissionNumber.toLowerCase();
          return fullName.includes(query) || admissionNumber.includes(query);
        });
        setFilteredStudents(filtered.slice(0, 25)); // Show up to 25 results
      } else {
        setFilteredStudents([]);
      }
    }, 150); // 150ms debounce

    return () => clearTimeout(timeoutId);
  }, [studentSearchQuery, students]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.studentId) {
      newErrors.studentId = 'Please select a student';
    }

    if (!formData.concessionTypeId) {
      newErrors.concessionTypeId = 'Please select a concession type';
    }

    if (!formData.reason.trim()) {
      newErrors.reason = 'Please provide a reason for the concession';
    }

    if (!formData.validFrom) {
      newErrors.validFrom = 'Please select a valid from date';
    }

    if (formData.validUntil && formData.validFrom && formData.validUntil <= formData.validFrom) {
      newErrors.validUntil = 'Valid until date must be after valid from date';
    }

    if (selectedConcessionType && formData.customValue !== undefined) {
      if (selectedConcessionType.type === 'PERCENTAGE' && formData.customValue > 100) {
        newErrors.customValue = 'Percentage cannot exceed 100%';
      }
      
      if (selectedConcessionType.maxValue && formData.customValue > selectedConcessionType.maxValue) {
        newErrors.customValue = `Value cannot exceed maximum of ${selectedConcessionType.maxValue}${selectedConcessionType.type === 'PERCENTAGE' ? '%' : ''}`;
      }
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

  // Handle student selection from search
  const handleStudentSelection = (student: Student) => {
    setSelectedStudent(student);
    setFormData(prev => ({ ...prev, studentId: student.id }));
    setStudentSearchQuery(`${student.firstName} ${student.lastName} (${student.admissionNumber})`);
    setShowStudentDropdown(false);
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.studentId;
      return newErrors;
    });
  };

  // Handle clearing student selection
  const handleClearStudent = () => {
    setSelectedStudent(null);
    setFormData(prev => ({ ...prev, studentId: '' }));
    setStudentSearchQuery('');
    setShowStudentDropdown(false);
  };

  // Handle student search input change
  const handleStudentSearchChange = (value: string) => {
    setStudentSearchQuery(value);
    if (value.trim()) {
      setShowStudentDropdown(true);
    } else {
      setShowStudentDropdown(false);
      if (selectedStudent) {
        handleClearStudent();
      }
    }
  };

  // Handle input focus to show dropdown if there are filtered results
  const handleInputFocus = () => {
    if (studentSearchQuery.trim() && filteredStudents.length > 0) {
      setShowStudentDropdown(true);
    }
  };

  const handleConcessionTypeChange = (concessionTypeId: string) => {
    const concessionType = concessionTypes.find(ct => ct.id === concessionTypeId);
    setSelectedConcessionType(concessionType || null);
    setFormData(prev => ({ 
      ...prev, 
      concessionTypeId,
      customValue: undefined, // Reset custom value when type changes
    }));
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.concessionTypeId;
      delete newErrors.customValue;
      return newErrors;
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto p-0">
        <div className="sticky top-0 z-10 bg-background border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="flex items-center gap-2 text-xl">
                <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg text-white">
                  <UserPlus className="h-5 w-5" />
                </div>
                {editingConcession ? 'Edit Student Concession' : 'Assign Student Concession'}
              </DialogTitle>
              <DialogDescription className="text-base">
                {editingConcession 
                  ? 'Update the concession details and terms for the selected student.'
                  : 'Assign a concession to a student with specific terms and validation period.'
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

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Left Column */}
              <div className="space-y-6">
                
                {/* Student Selection Card */}
                <Card className="shadow-sm border-0 ring-1 ring-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <div className="p-1.5 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded-md">
                        <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      Student Selection
                    </CardTitle>
                    <CardDescription>
                      Search and select the student to assign this concession to.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="student">Student *</Label>
                      <div className="relative">
                        <div className="relative">
                          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="student"
                            type="text"
                            placeholder="Search by name or admission number..."
                            value={studentSearchQuery}
                            onChange={(e) => handleStudentSearchChange(e.target.value)}
                            onFocus={handleInputFocus}
                            onBlur={() => setTimeout(() => setShowStudentDropdown(false), 200)}
                            className={cn(
                              "pl-10 pr-10",
                              errors.studentId ? "border-red-300" : ""
                            )}
                            disabled={isLoading}
                          />
                          {selectedStudent && (
                            <button
                              type="button"
                              onClick={handleClearStudent}
                              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        
                        {showStudentDropdown && filteredStudents.length > 0 && (
                          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-xl max-h-60 overflow-y-auto">
                            {filteredStudents.length > 20 && (
                              <div className="px-3 py-2 text-xs text-gray-500 border-b">
                                Showing first 25 of {students.filter(student => {
                                  const query = studentSearchQuery.toLowerCase();
                                  const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
                                  const admissionNumber = student.admissionNumber.toLowerCase();
                                  return fullName.includes(query) || admissionNumber.includes(query);
                                }).length} matches
                              </div>
                            )}
                            <ScrollArea className="h-full">
                              {filteredStudents.map((student) => (
                                <div
                                  key={student.id}
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => handleStudentSelection(student)}
                                  className="px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                                >
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <span className="font-medium text-gray-900 dark:text-gray-100">
                                        {student.firstName} {student.lastName}
                                      </span>
                                      <span className="text-gray-600 dark:text-gray-400 ml-2">
                                        ({student.admissionNumber})
                                      </span>
                                    </div>
                                    {student.section?.class && (
                                      <Badge variant="secondary" className="text-xs">
                                        {student.section.class.name} {student.section.name}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </ScrollArea>
                          </div>
                        )}
                      </div>
                      {errors.studentId && (
                        <p className="text-xs text-red-600 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {errors.studentId}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Concession Type Selection Card */}
                <Card className="shadow-sm border-0 ring-1 ring-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <div className="p-1.5 bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900 dark:to-emerald-800 rounded-md">
                        <Award className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      Concession Type
                    </CardTitle>
                    <CardDescription>
                      Choose the type of concession to apply for this student.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="concessionType">Select Concession Type *</Label>
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
                  </CardContent>
                </Card>

              </div>

              {/* Right Column */}
              <div className="space-y-6">

                {/* Concession Details Card */}
                {selectedConcessionType && (
                  <Card className="shadow-sm border-0 ring-1 ring-border">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <div className="p-1.5 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900 dark:to-purple-800 rounded-md">
                          <Target className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        Concession Details
                      </CardTitle>
                      <CardDescription>
                        Review and customize the concession value and terms.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Concession Type Info */}
                      <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
                        <div className="flex items-center gap-2 mb-2">
                          <Info className="h-4 w-4 text-purple-600" />
                          <span className="font-medium text-purple-900 dark:text-purple-100">Selected Concession Type</span>
                        </div>
                        <p className="text-sm text-purple-800 dark:text-purple-200 font-medium">{selectedConcessionType.name}</p>
                        <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                          Default value: {selectedConcessionType.type === 'PERCENTAGE' ? `${selectedConcessionType.value}%` : `₹${selectedConcessionType.value}`}
                        </p>
                      </div>

                      {/* Custom Value */}
                      <div className="space-y-2">
                        <Label htmlFor="customValue">
                          Custom Value ({selectedConcessionType.type === 'PERCENTAGE' ? '%' : '₹'}) - Optional
                          {selectedConcessionType.maxValue && (
                            <span className="text-xs text-gray-500 ml-1">
                              (Max: {selectedConcessionType.type === 'PERCENTAGE' ? `${selectedConcessionType.maxValue}%` : `₹${selectedConcessionType.maxValue}`})
                            </span>
                          )}
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
                            setErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors.customValue;
                              return newErrors;
                            });
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
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p>Override the default value if needed. Leave empty to use the concession type's configured value.</p>
                          <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded border">
                            <span className="font-medium">Default:</span>
                            {selectedConcessionType.type === 'PERCENTAGE' && 
                              <span className="text-blue-600 font-medium">{selectedConcessionType.value}%</span>}
                            {selectedConcessionType.type === 'FIXED' && selectedConcessionType.feeTermAmounts && typeof selectedConcessionType.feeTermAmounts === 'object' && Object.keys(selectedConcessionType.feeTermAmounts).length > 0 ? (
                              <span className="text-emerald-600 font-medium">Per-term amounts configured</span>
                            ) : selectedConcessionType.type === 'FIXED' && (
                              <span className="text-emerald-600 font-medium">₹{selectedConcessionType.value}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Reason */}
                      <div className="space-y-2">
                        <Label htmlFor="reason">Reason for Concession *</Label>
                        <Textarea
                          id="reason"
                          value={formData.reason}
                          onChange={(e) => {
                            setFormData(prev => ({ ...prev, reason: e.target.value }));
                            setErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors.reason;
                              return newErrors;
                            });
                          }}
                          placeholder="Provide a clear reason for granting this concession..."
                          rows={3}
                          disabled={isLoading}
                          className={errors.reason ? "border-red-300" : ""}
                        />
                        {errors.reason && (
                          <p className="text-sm text-red-600">{errors.reason}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Validity Period Card */}
                <Card className="shadow-sm border-0 ring-1 ring-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <div className="p-1.5 bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900 dark:to-orange-800 rounded-md">
                        <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      </div>
                      Validity Period
                    </CardTitle>
                    <CardDescription>
                      Set the start and end dates for this concession.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Valid From *</Label>
                        <Popover open={showValidFromCalendar} onOpenChange={setShowValidFromCalendar}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !formData.validFrom && "text-muted-foreground",
                                errors.validFrom ? "border-red-300" : ""
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
                                setFormData(prev => ({ ...prev, validFrom: date || new Date() }));
                                setShowValidFromCalendar(false);
                                setErrors(prev => {
                                  const newErrors = { ...prev };
                                  delete newErrors.validFrom;
                                  return newErrors;
                                });
                              }}
                              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        {errors.validFrom && (
                          <p className="text-sm text-red-600">{errors.validFrom}</p>
                        )}
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
                                errors.validUntil ? "border-red-300" : ""
                              )}
                              disabled={isLoading}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {formData.validUntil ? format(formData.validUntil, "PPP") : "Pick a date (optional)"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={formData.validUntil}
                              onSelect={(date) => {
                                setFormData(prev => ({ ...prev, validUntil: date }));
                                setShowValidUntilCalendar(false);
                                setErrors(prev => {
                                  const newErrors = { ...prev };
                                  delete newErrors.validUntil;
                                  return newErrors;
                                });
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
                  </CardContent>
                </Card>

              </div>
            </div>
            
            {/* Full Width Cards Below */}
            
            {/* Fee Application Rules Card */}
            {selectedConcessionType && (
              <Card className="shadow-sm border-0 ring-1 ring-border">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="p-1.5 bg-gradient-to-br from-cyan-100 to-cyan-200 dark:from-cyan-900 dark:to-cyan-800 rounded-md">
                      <Info className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    Fee Application Rules (Auto-Configured)
                  </CardTitle>
                  <CardDescription>
                    This concession will automatically apply based on the rules configured in the concession type.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                          Fee Application Rules
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
                          This concession type <strong>"{selectedConcessionType.name}"</strong> has pre-configured fee application rules. 
                          The concession will automatically apply to the designated fee heads and terms as defined in the concession type settings.
                        </p>
                        
                        <div className="grid grid-cols-1 gap-3 text-xs">
                          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded border">
                            <p className="font-medium text-blue-900 dark:text-blue-100">Concession Details</p>
                            <p className="text-blue-800 dark:text-blue-200">
                              {selectedConcessionType.type === 'PERCENTAGE' ? 
                                `${selectedConcessionType.value}% discount` : 
                                `₹${selectedConcessionType.value} fixed amount`
                              }
                              {selectedConcessionType.maxValue && (
                                <span className="ml-1 text-blue-600">(max: {selectedConcessionType.type === 'PERCENTAGE' ? `${selectedConcessionType.maxValue}%` : `₹${selectedConcessionType.maxValue}`})</span>
                              )}
                            </p>
                          </div>
                          
                          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded border">
                            <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">Applicable Fee Heads</p>
                            <p className="text-blue-800 dark:text-blue-200">
                              {selectedConcessionType.appliedFeeHeads && selectedConcessionType.appliedFeeHeads.length > 0 ? (
                                <span className="text-green-700 dark:text-green-300">
                                  {selectedConcessionType.appliedFeeHeads.length} specific fee head(s) selected
                                </span>
                              ) : (
                                <span className="text-amber-700 dark:text-amber-300">All fee heads (no restrictions)</span>
                              )}
                            </p>
                          </div>
                          
                          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded border">
                            <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">Applicable Fee Terms</p>
                            <p className="text-blue-800 dark:text-blue-200">
                              {selectedConcessionType.appliedFeeTerms && selectedConcessionType.appliedFeeTerms.length > 0 ? (
                                <span className="text-green-700 dark:text-green-300">
                                  {selectedConcessionType.appliedFeeTerms.length} specific fee term(s) selected
                                </span>
                              ) : (
                                <span className="text-amber-700 dark:text-amber-300">All fee terms (no restrictions)</span>
                              )}
                            </p>
                          </div>
                          
                          {selectedConcessionType.type === 'FIXED' && selectedConcessionType.feeTermAmounts && typeof selectedConcessionType.feeTermAmounts === 'object' && Object.keys(selectedConcessionType.feeTermAmounts).length > 0 && (
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded border">
                              <p className="font-medium text-emerald-900 dark:text-emerald-100 mb-1">Per-Term Fixed Amounts</p>
                              <div className="space-y-1">
                                {Object.entries(selectedConcessionType.feeTermAmounts).map(([termId, amount]) => (
                                  <div key={termId} className="flex justify-between text-emerald-800 dark:text-emerald-200">
                                    <span>Term {termId.slice(-4)}:</span>
                                    <span className="font-medium">₹{amount.toLocaleString('en-IN')}</span>
                                  </div>
                                ))}
                              </div>
                              <div className="mt-2 pt-2 border-t border-emerald-200 dark:border-emerald-700">
                                <div className="flex justify-between text-emerald-800 dark:text-emerald-200 font-medium">
                                  <span>Total Fixed Amount:</span>
                                  <span>₹{Object.values(selectedConcessionType.feeTermAmounts).reduce((sum, amount) => sum + amount, 0).toLocaleString('en-IN')}</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {selectedConcessionType.description && (
                          <div className="mt-3 p-2 bg-blue-100 dark:bg-blue-900 rounded border">
                            <p className="font-medium text-blue-900 dark:text-blue-100 text-xs">Description</p>
                            <p className="text-blue-800 dark:text-blue-200 text-xs">
                              {selectedConcessionType.description}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Additional Information Card */}
            <Card className="shadow-sm border-0 ring-1 ring-border">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="p-1.5 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800 rounded-md">
                    <FileText className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  </div>
                  Additional Information
                </CardTitle>
                <CardDescription>
                  Add any additional notes and review document requirements.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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

                {/* Required Documents Information */}
                {selectedConcessionType && selectedConcessionType.requiredDocuments.length > 0 && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-amber-900 dark:text-amber-100">Required Documents</p>
                        <p className="text-xs text-amber-700 dark:text-amber-300 mb-2">
                          Please ensure the following documents are collected and verified:
                        </p>
                        <ul className="text-xs text-amber-800 dark:text-amber-200 space-y-1">
                          {selectedConcessionType.requiredDocuments.map((doc, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 bg-amber-600 rounded-full flex-shrink-0" />
                              {doc}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Form Actions */}
            <div className="flex flex-col gap-4 pt-6 border-t">
              
              {/* Error Display */}
              {Object.keys(errors).length > 0 && (
                <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-900 dark:text-red-100">Please fix the following errors:</p>
                      <ul className="text-xs text-red-700 dark:text-red-300 mt-1 space-y-0.5">
                        {Object.entries(errors).map(([field, error]) => (
                          <li key={field}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isLoading}
                  className="min-w-[100px]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || !formData.studentId || !formData.concessionTypeId || Object.keys(errors).length > 0}
                  className="min-w-[140px]"
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isLoading ? 'Saving...' : editingConcession ? 'Update Concession' : 'Assign Concession'}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}