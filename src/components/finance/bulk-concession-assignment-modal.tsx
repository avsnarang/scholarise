"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { 
  Search, 
  Users, 
  Award, 
  Calendar as CalendarIcon, 
  Filter, 
  X, 
  CheckCircle,
  AlertCircle,
  Info
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  section?: {
    name: string;
    class: {
      name: string;
    };
  } | null;
}

interface ConcessionType {
  id: string;
  name: string;
  description?: string | null;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  maxValue?: number | null;
  applicableStudentTypes?: string[];
}

interface BulkConcessionFormData {
  selectedStudentIds: string[];
  concessionTypeId: string;

  reason: string;
  validFrom: Date;
  validUntil?: Date;
  notes?: string;
}

interface BulkConcessionAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: BulkConcessionFormData) => Promise<void>;
  students: Student[];
  concessionTypes: ConcessionType[];
  isLoading?: boolean;
}

export function BulkConcessionAssignmentModal({
  isOpen,
  onClose,
  onSubmit,
  students,
  concessionTypes,
  isLoading = false,
}: BulkConcessionAssignmentModalProps) {
  const [formData, setFormData] = useState<BulkConcessionFormData>({
    selectedStudentIds: [],
    concessionTypeId: '',

    reason: '',
    validFrom: new Date(),
    validUntil: undefined,
    notes: '',
  });

  const [selectedConcessionType, setSelectedConcessionType] = useState<ConcessionType | null>(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [showValidFromCalendar, setShowValidFromCalendar] = useState(false);
  const [showValidUntilCalendar, setShowValidUntilCalendar] = useState(false);
  const [formProgress, setFormProgress] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Get unique classes for filtering
  const uniqueClasses = Array.from(
    new Set(
      students
        .filter(s => s.section?.class?.name)
        .map(s => s.section!.class.name)
    )
  ).sort();

  // Filter students based on search and class filter
  const filteredStudents = students.filter(student => {
    const searchMatch = !studentSearchQuery || 
      student.firstName.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
      student.lastName.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
      student.admissionNumber.toLowerCase().includes(studentSearchQuery.toLowerCase());
    
    const classMatch = classFilter === 'all' || student.section?.class?.name === classFilter;
    
    return searchMatch && classMatch;
  });

  // Calculate form completion progress
  const calculateProgress = useCallback(() => {
    let progress = 0;
    
    if (formData.selectedStudentIds.length > 0) progress += 40;
    if (formData.concessionTypeId) progress += 30;
    if (formData.reason.trim()) progress += 20;
    if (formData.validFrom) progress += 10;
    
    return Math.min(progress, 100);
  }, [formData.selectedStudentIds.length, formData.concessionTypeId, formData.reason, formData.validFrom]);

  useEffect(() => {
    setFormProgress(calculateProgress());
  }, [calculateProgress]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        selectedStudentIds: [],
        concessionTypeId: '',
    
        reason: '',
        validFrom: new Date(),
        validUntil: undefined,
        notes: '',
      });
      setSelectedConcessionType(null);
      setStudentSearchQuery('');
      setClassFilter('all');
      setErrors({});
    }
  }, [isOpen]);

  // Handle concession type selection
  const handleConcessionTypeChange = (concessionTypeId: string) => {
    const concessionType = concessionTypes.find(ct => ct.id === concessionTypeId);
    setSelectedConcessionType(concessionType || null);
    setFormData(prev => ({
      ...prev,
      concessionTypeId,
   // Reset custom value when changing type
    }));
  };

  // Handle student selection
  const handleStudentSelection = (studentId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      selectedStudentIds: checked
        ? [...prev.selectedStudentIds, studentId]
        : prev.selectedStudentIds.filter(id => id !== studentId)
    }));
  };

  // Handle select all students (filtered)
  const handleSelectAllFiltered = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      selectedStudentIds: checked
        ? [...new Set([...prev.selectedStudentIds, ...filteredStudents.map(s => s.id)])]
        : prev.selectedStudentIds.filter(id => !filteredStudents.map(s => s.id).includes(id))
    }));
  };

  // Clear all selections
  const handleClearAll = () => {
    setFormData(prev => ({ ...prev, selectedStudentIds: [] }));
  };

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (formData.selectedStudentIds.length === 0) {
      newErrors.students = 'Please select at least one student';
    }

    if (!formData.concessionTypeId) {
      newErrors.concessionType = 'Please select a concession type';
    }

    if (!formData.reason.trim()) {
      newErrors.reason = 'Please provide a reason for the concession';
    }



    if (formData.validUntil && formData.validUntil <= formData.validFrom) {
      newErrors.validUntil = 'Valid until date must be after valid from date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Failed to assign bulk concessions:', error);
    }
  };

  // Get selected students for display
  const selectedStudents = students.filter(s => formData.selectedStudentIds.includes(s.id));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Bulk Concession Assignment
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-6 overflow-hidden">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Form Progress</span>
              <span>{formProgress}%</span>
            </div>
            <Progress value={formProgress} className="h-2" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            {/* Left Side - Student Selection */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Select Students ({formData.selectedStudentIds.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Search and Filters */}
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search students..."
                        value={studentSearchQuery}
                        onChange={(e) => setStudentSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Select value={classFilter} onValueChange={setClassFilter}>
                        <SelectTrigger className="w-full">
                          <Filter className="h-4 w-4 mr-2" />
                          <SelectValue placeholder="Filter by class" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Classes</SelectItem>
                          {uniqueClasses.map(className => (
                            <SelectItem key={className} value={className}>
                              Class {className}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleSelectAllFiltered(true)}
                        className="flex-1"
                      >
                        Select All Filtered
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleClearAll}
                        className="flex-1"
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>

                  {errors.students && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{errors.students}</AlertDescription>
                    </Alert>
                  )}

                  {/* Student List */}
                  <ScrollArea className="h-64 border rounded-md">
                    <div className="p-2 space-y-1">
                      {filteredStudents.map(student => (
                        <div
                          key={student.id}
                          className="flex items-center space-x-3 p-2 rounded-sm hover:bg-muted"
                        >
                          <Checkbox
                            checked={formData.selectedStudentIds.includes(student.id)}
                            onCheckedChange={(checked) => 
                              handleStudentSelection(student.id, checked as boolean)
                            }
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {student.firstName} {student.lastName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {student.admissionNumber}
                              {student.section && (
                                <span className="ml-2">
                                  Class {student.section.class.name}-{student.section.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {filteredStudents.length === 0 && (
                        <div className="text-center py-4 text-muted-foreground">
                          No students found
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Right Side - Concession Details */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    Concession Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Concession Type */}
                  <div className="space-y-2">
                    <Label htmlFor="concessionType">Concession Type *</Label>
                    <Select
                      value={formData.concessionTypeId}
                      onValueChange={handleConcessionTypeChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select concession type" />
                      </SelectTrigger>
                      <SelectContent>
                        {concessionTypes.map(type => (
                          <SelectItem key={type.id} value={type.id}>
                            <div className="flex items-center gap-2">
                              <span>{type.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {type.type === 'PERCENTAGE' ? `${type.value}%` : `₹${type.value}`}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.concessionType && (
                      <p className="text-sm text-destructive">{errors.concessionType}</p>
                    )}
                  </div>



                  {/* Reason */}
                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason *</Label>
                    <Textarea
                      id="reason"
                      value={formData.reason}
                      onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                      placeholder="Enter reason for assigning this concession"
                      rows={3}
                    />
                    {errors.reason && (
                      <p className="text-sm text-destructive">{errors.reason}</p>
                    )}
                  </div>

                  {/* Valid From */}
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

                  {/* Valid Until */}
                  <div className="space-y-2">
                    <Label>Valid Until (Optional)</Label>
                    <Popover open={showValidUntilCalendar} onOpenChange={setShowValidUntilCalendar}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.validUntil && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.validUntil ? format(formData.validUntil, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.validUntil}
                          onSelect={(date) => {
                            setFormData(prev => ({ ...prev, validUntil: date }));
                            setShowValidUntilCalendar(false);
                          }}
                          disabled={(date) => date <= formData.validFrom}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {errors.validUntil && (
                      <p className="text-sm text-destructive">{errors.validUntil}</p>
                    )}
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Additional notes about this concession"
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Selected Students Summary */}
          {selectedStudents.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Selected Students ({selectedStudents.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                  {selectedStudents.map(student => (
                    <Badge key={student.id} variant="secondary" className="text-xs">
                      {student.firstName} {student.lastName}
                      <button
                        onClick={() => handleStudentSelection(student.id, false)}
                        className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                      >
                        <X className="h-2 w-2" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Information Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              This will assign the selected concession type to all {formData.selectedStudentIds.length} selected students. 
              Each assignment will be created individually and may require approval based on your concession settings.
            </AlertDescription>
          </Alert>
        </div>

        {/* Footer Actions */}
        <Separator />
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading || formData.selectedStudentIds.length === 0}
            className="min-w-32"
          >
            {isLoading ? "Assigning..." : `Assign to ${formData.selectedStudentIds.length} Students`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}