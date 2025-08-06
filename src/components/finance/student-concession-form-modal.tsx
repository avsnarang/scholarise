"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { 
  X, 
  Search, 
  CalendarIcon, 
  AlertCircle,
  Loader2, 
  FileText,
  Percent,
  IndianRupee,
  Plus
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ConcessionTypeFormModal } from "./concession-type-form-modal";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { useToast } from "@/components/ui/use-toast";

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

interface FeeTerm {
  id: string;
  name: string;
  description?: string | null;
}

interface FeeHead {
  id: string;
  name: string;
  description?: string | null;
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
  feeTerms?: FeeTerm[];
  feeHeads?: FeeHead[];
  isLoading?: boolean;
  selectedStudentId?: string; // Pre-populate with this student
  editingConcession?: {
    id: string;
    studentId: string;
    concessionTypeId: string;
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
  feeTerms = [],
  feeHeads = [],
  isLoading = false,
  selectedStudentId,
  editingConcession,
}: StudentConcessionFormModalProps) {
  
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  const { toast } = useToast();

  // Get the utils for invalidating queries
  const utils = api.useContext();

  // Mutation for creating concession types
  const createConcessionTypeMutation = api.finance.createConcessionType.useMutation({
    onMutate: () => {
      // Mark that we're creating a concession type to prevent form resets
      isCreatingConcessionTypeRef.current = true;
    },
    onSuccess: (newConcessionType) => {
      toast({
        title: "Success",
        description: "Concession type created successfully",
      });
      
      // Automatically select the newly created concession type
      setSelectedConcessionType(newConcessionType as any);
      setFormData(prev => ({ ...prev, concessionTypeId: newConcessionType.id }));
      setConcessionSearchQuery(newConcessionType.name);
      setShowCreateConcessionTypeModal(false);
      
      // Add the new concession type to the filtered list for immediate availability
      setFilteredConcessionTypes(prev => [newConcessionType as any, ...prev]);
      
      // Reset the flag
      isCreatingConcessionTypeRef.current = false;
      
      // Note: We don't invalidate the query here to avoid form reset
      // The list will be updated when the user closes this modal or navigates away
    },
    onError: (error) => {
      // Reset the flag on error
      isCreatingConcessionTypeRef.current = false;
      
      toast({
        title: "Error",
        description: error.message || "Failed to create concession type",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Ensure flag is always reset
      isCreatingConcessionTypeRef.current = false;
    },
  });
  
  const [formData, setFormData] = useState<StudentConcessionFormData>({
    studentId: '',
    concessionTypeId: '',
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
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [concessionSearchQuery, setConcessionSearchQuery] = useState('');
  const [filteredConcessionTypes, setFilteredConcessionTypes] = useState<ConcessionType[]>([]);
  const [showConcessionDropdown, setShowConcessionDropdown] = useState(false);
  const [showCreateConcessionTypeModal, setShowCreateConcessionTypeModal] = useState(false);
  
  // Track if we're in the middle of creating/selecting a concession type to prevent unwanted resets
  const isCreatingConcessionTypeRef = useRef(false);
  
  // Timeout refs for cleanup
  const studentSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const concessionSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const studentBlurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const concessionBlurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Student search logic
  useEffect(() => {
    // Clear previous timeout
    if (studentSearchTimeoutRef.current) {
      clearTimeout(studentSearchTimeoutRef.current);
    }
    
    studentSearchTimeoutRef.current = setTimeout(() => {
      if (studentSearchQuery.trim()) {
        const filtered = students.filter(student => {
          const query = studentSearchQuery.toLowerCase();
          const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
          const admissionNumber = student.admissionNumber.toLowerCase();
          return fullName.includes(query) || admissionNumber.includes(query);
        });
        setFilteredStudents(filtered.slice(0, 20));
      } else {
        setFilteredStudents([]);
      }
    }, 150);

    return () => {
      if (studentSearchTimeoutRef.current) {
        clearTimeout(studentSearchTimeoutRef.current);
      }
    };
  }, [studentSearchQuery, students]);

  // Concession type search logic
  useEffect(() => {
    // Clear previous timeout
    if (concessionSearchTimeoutRef.current) {
      clearTimeout(concessionSearchTimeoutRef.current);
    }
    
    concessionSearchTimeoutRef.current = setTimeout(() => {
      if (concessionSearchQuery.trim()) {
        const filtered = concessionTypes.filter(concessionType => {
          const query = concessionSearchQuery.toLowerCase();
          const name = concessionType.name.toLowerCase();
          const description = (concessionType.description || '').toLowerCase();
          return name.includes(query) || description.includes(query);
        });
        setFilteredConcessionTypes(filtered.slice(0, 20));
      } else {
        setFilteredConcessionTypes([]);
      }
    }, 150);

    return () => {
      if (concessionSearchTimeoutRef.current) {
        clearTimeout(concessionSearchTimeoutRef.current);
      }
    };
  }, [concessionSearchQuery, concessionTypes]);

  // Cleanup effect for modal close
  useEffect(() => {
    if (!isOpen) {
      // Clear all timeouts when modal closes
      if (studentSearchTimeoutRef.current) {
        clearTimeout(studentSearchTimeoutRef.current);
      }
      if (concessionSearchTimeoutRef.current) {
        clearTimeout(concessionSearchTimeoutRef.current);
      }
      if (studentBlurTimeoutRef.current) {
        clearTimeout(studentBlurTimeoutRef.current);
      }
      if (concessionBlurTimeoutRef.current) {
        clearTimeout(concessionBlurTimeoutRef.current);
      }
      
      // Reset all dropdown states
      setShowStudentDropdown(false);
      setShowConcessionDropdown(false);
      setFilteredStudents([]);
      setFilteredConcessionTypes([]);
    }
  }, [isOpen]);

  // Component unmount cleanup
  useEffect(() => {
    return () => {
      // Cleanup all timeouts on component unmount
      if (studentSearchTimeoutRef.current) {
        clearTimeout(studentSearchTimeoutRef.current);
      }
      if (concessionSearchTimeoutRef.current) {
        clearTimeout(concessionSearchTimeoutRef.current);
      }
      if (studentBlurTimeoutRef.current) {
        clearTimeout(studentBlurTimeoutRef.current);
      }
      if (concessionBlurTimeoutRef.current) {
        clearTimeout(concessionBlurTimeoutRef.current);
      }
    };
  }, []);

  // Initialize form data - separate effects to avoid unnecessary resets
  useEffect(() => {
    if (isOpen) {
      setShowStudentDropdown(false);
      setShowConcessionDropdown(false);
      setErrors({});
      
      if (!editingConcession) {
        // For new concessions, only reset if we're not in the middle of creating
        if (!selectedConcessionType && !formData.reason.trim() && !isCreatingConcessionTypeRef.current) {
          // Check if a specific student should be pre-selected
          if (selectedStudentId) {
            const student = students.find(s => s.id === selectedStudentId);
            if (student) {
              setSelectedStudent(student);
              setStudentSearchQuery(`${student.firstName} ${student.lastName} (${student.admissionNumber})`);
              setFormData({
                studentId: selectedStudentId,
                concessionTypeId: '',
                reason: '',
                validFrom: new Date(),
                validUntil: undefined,
                notes: '',
              });
            } else {
              // Fallback if student not found
              setSelectedStudent(null);
              setStudentSearchQuery('');
              setFormData({
                studentId: '',
                concessionTypeId: '',
                reason: '',
                validFrom: new Date(),
                validUntil: undefined,
                notes: '',
              });
            }
          } else {
            setSelectedStudent(null);
            setStudentSearchQuery('');
            setFormData({
              studentId: '',
              concessionTypeId: '',
              reason: '',
              validFrom: new Date(),
              validUntil: undefined,
              notes: '',
            });
          }
          setSelectedConcessionType(null);
          setConcessionSearchQuery('');
        }
      }
    }
  }, [isOpen, selectedStudentId]);

  // Separate effect for editing concession to avoid dependencies on concessionTypes
  useEffect(() => {
    if (isOpen && editingConcession) {
      const student = students.find(s => s.id === editingConcession.studentId);
      setSelectedStudent(student || null);
      setStudentSearchQuery(student ? `${student.firstName} ${student.lastName} (${student.admissionNumber})` : '');
      
      const concessionType = concessionTypes.find(ct => ct.id === editingConcession.concessionTypeId);
      setSelectedConcessionType(concessionType || null);
      setConcessionSearchQuery(concessionType ? concessionType.name : '');
      
      setFormData({
        studentId: editingConcession.studentId,
        concessionTypeId: editingConcession.concessionTypeId,
        reason: editingConcession.reason || '',
        validFrom: editingConcession.validFrom || new Date(),
        validUntil: editingConcession.validUntil || undefined,
        notes: editingConcession.notes || '',
      });
    }
  }, [editingConcession]);

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

  const handleClearStudent = () => {
    setSelectedStudent(null);
    setFormData(prev => ({ ...prev, studentId: '' }));
    setStudentSearchQuery('');
    setShowStudentDropdown(false);
  };

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

  const handleInputFocus = () => {
    if (studentSearchQuery.trim() && filteredStudents.length > 0) {
      setShowStudentDropdown(true);
    } else if (!studentSearchQuery.trim()) {
      // Show all students when focusing on empty input
      setFilteredStudents(students.slice(0, 20));
      setShowStudentDropdown(true);
    }
  };

  // Helper functions
  const getActualConcessionValue = (concessionType: ConcessionType): number => {
    if (concessionType.type === 'FIXED' && concessionType.feeTermAmounts) {
      const termAmounts = Object.values(concessionType.feeTermAmounts);
      return termAmounts.reduce((sum, amount) => sum + amount, 0);
    }
    return concessionType.value;
  };

  const getFeeTermName = (termId: string): string => {
    const term = feeTerms.find(t => t.id === termId);
    return term ? term.name : `Term ${termId.slice(-4)}`;
  };

  const getFeeHeadName = (headId: string): string => {
    const head = feeHeads.find(h => h.id === headId);
    return head ? head.name : `Head ${headId.slice(-4)}`;
  };

  // Handle concession type selection from search
  const handleConcessionTypeSelection = (concessionType: ConcessionType) => {
    setSelectedConcessionType(concessionType);
    setFormData(prev => ({ ...prev, concessionTypeId: concessionType.id }));
    setConcessionSearchQuery(concessionType.name);
    setShowConcessionDropdown(false);
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.concessionTypeId;
      return newErrors;
    });
  };

  // Handle clearing concession type selection
  const handleClearConcessionType = () => {
    setSelectedConcessionType(null);
    setFormData(prev => ({ ...prev, concessionTypeId: '' }));
    setConcessionSearchQuery('');
    setShowConcessionDropdown(false);
  };

  // Handle concession type search input change
  const handleConcessionSearchChange = (value: string) => {
    setConcessionSearchQuery(value);
    if (value.trim()) {
      setShowConcessionDropdown(true);
    } else {
      setShowConcessionDropdown(false);
      if (selectedConcessionType) {
        handleClearConcessionType();
      }
    }
  };

  // Handle input focus to show dropdown if there are filtered results
  const handleConcessionInputFocus = () => {
    if (concessionSearchQuery.trim() && filteredConcessionTypes.length > 0) {
      setShowConcessionDropdown(true);
    } else if (!concessionSearchQuery.trim()) {
      // Show all concession types when focusing on empty input
      setFilteredConcessionTypes(concessionTypes.slice(0, 20));
      setShowConcessionDropdown(true);
    }
  };

  // Handle modal close
  const handleModalClose = (open: boolean) => {
    if (!open) {
      // Clear all timeouts immediately when closing
      if (studentSearchTimeoutRef.current) {
        clearTimeout(studentSearchTimeoutRef.current);
      }
      if (concessionSearchTimeoutRef.current) {
        clearTimeout(concessionSearchTimeoutRef.current);
      }
      if (studentBlurTimeoutRef.current) {
        clearTimeout(studentBlurTimeoutRef.current);
      }
      if (concessionBlurTimeoutRef.current) {
        clearTimeout(concessionBlurTimeoutRef.current);
      }
      
      // Reset all dropdown states immediately
      setShowStudentDropdown(false);
      setShowConcessionDropdown(false);
      setFilteredStudents([]);
      setFilteredConcessionTypes([]);
      
      // Refresh concession types list for next time (if any new ones were created)
      utils.finance.getConcessionTypes.invalidate();
      
      // Call the original onClose
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleModalClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader className="border-b border-gray-100 dark:border-gray-800 pb-4">
          <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {editingConcession ? 'Edit Student Concession' : 'Create Student Concession'}
          </DialogTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {editingConcession 
              ? 'Update the concession details for the selected student.'
              : 'Assign a new concession to a student with specific terms and validity period.'
            }
          </p>
        </DialogHeader>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Student Selection */}
            <div className="space-y-2">
              <Label htmlFor="student" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Student *
              </Label>
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="student"
                    type="text"
                    placeholder="Search by name or admission number"
                    value={studentSearchQuery}
                    onChange={(e) => handleStudentSearchChange(e.target.value)}
                    onFocus={handleInputFocus}
                    onBlur={() => {
                      if (studentBlurTimeoutRef.current) {
                        clearTimeout(studentBlurTimeoutRef.current);
                      }
                      studentBlurTimeoutRef.current = setTimeout(() => setShowStudentDropdown(false), 200);
                    }}
                    className={cn(
                      "pl-10 pr-10 border-gray-200 dark:border-gray-700",
                      errors.studentId && "border-red-300 dark:border-red-600"
                    )}
                    disabled={isLoading}
                  />
                  {selectedStudent && (
                    <button
                      type="button"
                      onClick={handleClearStudent}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                
                {showStudentDropdown && filteredStudents.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredStudents.map((student) => (
                      <div
                        key={student.id}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleStudentSelection(student);
                        }}
                        className="px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {student.firstName} {student.lastName}
                            </span>
                            <span className="text-gray-500 dark:text-gray-400 ml-2 text-sm">
                              {student.admissionNumber}
                            </span>
                          </div>
                          {student.section?.class && (
                            <Badge variant="outline" className="text-xs">
                              {student.section.class.name} {student.section.name}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {errors.studentId && (
                <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.studentId}
                </p>
              )}
            </div>

            {/* Concession Type Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="concessionType" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Concession Type *
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateConcessionTypeModal(true)}
                  className="flex items-center gap-1.5 text-xs h-7 px-2"
                >
                  <Plus className="h-3 w-3" />
                  Create New
                </Button>
              </div>
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="concessionType"
                    type="text"
                    placeholder="Search for concession type"
                    value={concessionSearchQuery}
                    onChange={(e) => handleConcessionSearchChange(e.target.value)}
                    onFocus={handleConcessionInputFocus}
                    onBlur={() => {
                      if (concessionBlurTimeoutRef.current) {
                        clearTimeout(concessionBlurTimeoutRef.current);
                      }
                      concessionBlurTimeoutRef.current = setTimeout(() => setShowConcessionDropdown(false), 200);
                    }}
                    className={cn(
                      "pl-10 pr-10 border-gray-200 dark:border-gray-700",
                      errors.concessionTypeId && "border-red-300 dark:border-red-600"
                    )}
                    disabled={isLoading}
                  />
                  {selectedConcessionType && (
                    <button
                      type="button"
                      onClick={handleClearConcessionType}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                
                {showConcessionDropdown && filteredConcessionTypes.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredConcessionTypes.map((concessionType) => (
                      <div
                        key={concessionType.id}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleConcessionTypeSelection(concessionType);
                        }}
                        className="px-3 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <span className="font-medium text-gray-900 dark:text-gray-100 block">
                              {concessionType.name}
                            </span>
                            {concessionType.description && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 block mt-1">
                                {concessionType.description}
                              </span>
                            )}
                          </div>
                          <div className="ml-3">
                            {concessionType.type === 'PERCENTAGE' ? (
                              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-700">
                                <div className="flex items-center gap-1">
                                  <Percent className="h-3 w-3 text-blue-600 dark:text-blue-300" />
                                  <span className="font-semibold">{concessionType.value}%</span>
                                </div>
                              </Badge>
                            ) : (
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200 dark:border-green-700">
                                <div className="flex items-center gap-1">
                                  <IndianRupee className="h-3 w-3 text-green-600 dark:text-green-300" />
                                  <span className="font-semibold">
                                    {getActualConcessionValue(concessionType).toLocaleString('en-IN')}
                                  </span>
                                </div>
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {errors.concessionTypeId && (
                <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.concessionTypeId}
                </p>
              )}
            </div>

            {/* Concession Details */}
            {selectedConcessionType && (
              <div className="space-y-4">
                {/* Primary Concession Info */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Concession Overview
                    </h3>
                    <Badge variant="outline" className="font-medium">
                      {selectedConcessionType.type === 'PERCENTAGE' ? 'Percentage Discount' : 'Fixed Amount'}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-3 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-600">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Concession Value</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {selectedConcessionType.type === 'PERCENTAGE' 
                          ? `${selectedConcessionType.value}%` 
                          : `₹${getActualConcessionValue(selectedConcessionType).toLocaleString('en-IN')}`
                        }
                      </p>
                      {selectedConcessionType.maxValue && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Max: {selectedConcessionType.type === 'PERCENTAGE' ? `${selectedConcessionType.maxValue}%` : `₹${selectedConcessionType.maxValue.toLocaleString('en-IN')}`}
                        </p>
                      )}
                    </div>

                    <div className="p-3 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-600">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Applied to Fee Heads</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {selectedConcessionType.appliedFeeHeads && selectedConcessionType.appliedFeeHeads.length > 0 
                          ? `${selectedConcessionType.appliedFeeHeads.length} Selected` 
                          : 'All Fee Heads'
                        }
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {selectedConcessionType.appliedFeeHeads && selectedConcessionType.appliedFeeHeads.length > 0 
                          ? 'Specific heads only' 
                          : 'No restrictions'
                        }
                      </p>
                    </div>

                    <div className="p-3 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-600">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Applied to Fee Terms</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {selectedConcessionType.appliedFeeTerms && selectedConcessionType.appliedFeeTerms.length > 0 
                          ? `${selectedConcessionType.appliedFeeTerms.length} Selected` 
                          : 'All Fee Terms'
                        }
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {selectedConcessionType.appliedFeeTerms && selectedConcessionType.appliedFeeTerms.length > 0 
                          ? 'Specific terms only' 
                          : 'No restrictions'
                        }
                      </p>
                    </div>
                  </div>

                  {selectedConcessionType.description && (
                    <div className="mt-3 p-3 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-600">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Description</p>
                      <p className="text-sm text-gray-900 dark:text-gray-100">{selectedConcessionType.description}</p>
                    </div>
                  )}
                </div>

                {/* Detailed Application Rules */}
                {((selectedConcessionType.appliedFeeHeads?.length ?? 0) > 0 || (selectedConcessionType.appliedFeeTerms?.length ?? 0) > 0 || (selectedConcessionType.type === 'FIXED' && selectedConcessionType.feeTermAmounts)) && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                      Application Details
                    </h4>
                    
                    <div className="space-y-3">
                      {/* Specific Fee Heads */}
                      {selectedConcessionType.appliedFeeHeads && selectedConcessionType.appliedFeeHeads.length > 0 && (
                        <div className="p-3 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-600">
                          <p className="text-xs font-medium text-gray-900 dark:text-gray-100 mb-2">
                            Applicable Fee Heads ({selectedConcessionType.appliedFeeHeads.length})
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {selectedConcessionType.appliedFeeHeads.map((headId) => (
                              <Badge key={headId} variant="secondary" className="text-xs">
                                {getFeeHeadName(headId)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Specific Fee Terms */}
                      {selectedConcessionType.appliedFeeTerms && selectedConcessionType.appliedFeeTerms.length > 0 && (
                        <div className="p-3 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-600">
                          <p className="text-xs font-medium text-gray-900 dark:text-gray-100 mb-2">
                            Applicable Fee Terms ({selectedConcessionType.appliedFeeTerms.length})
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {selectedConcessionType.appliedFeeTerms.map((termId) => (
                              <Badge key={termId} variant="secondary" className="text-xs">
                                {getFeeTermName(termId)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Per-Term Fixed Amounts */}
                      {selectedConcessionType.type === 'FIXED' && selectedConcessionType.feeTermAmounts && typeof selectedConcessionType.feeTermAmounts === 'object' && Object.keys(selectedConcessionType.feeTermAmounts).length > 0 && (
                        <div className="p-3 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-600">
                          <p className="text-xs font-medium text-gray-900 dark:text-gray-100 mb-2">
                            Per-Term Fixed Amounts
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                            {Object.entries(selectedConcessionType.feeTermAmounts).map(([termId, amount]) => (
                              <div key={termId} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs">
                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                  {getFeeTermName(termId)}
                                </span>
                                <span className="font-semibold text-gray-900 dark:text-gray-100">
                                  ₹{amount.toLocaleString('en-IN')}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                            <div className="flex justify-between items-center text-sm font-semibold text-gray-900 dark:text-gray-100">
                              <span>Total Concession Amount:</span>
                              <span>₹{Object.values(selectedConcessionType.feeTermAmounts).reduce((sum, amount) => sum + amount, 0).toLocaleString('en-IN')}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Reason for Concession *
              </Label>
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
                placeholder="Provide a clear reason for granting this concession"
                rows={3}
                disabled={isLoading}
                className={cn(
                  "border-gray-200 dark:border-gray-700 resize-none",
                  errors.reason && "border-red-300 dark:border-red-600"
                )}
              />
              {errors.reason && (
                <p className="text-xs text-red-600 dark:text-red-400">{errors.reason}</p>
              )}
            </div>

            {/* Validity Period */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Valid From *
                </Label>
                <Popover open={showValidFromCalendar} onOpenChange={setShowValidFromCalendar}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal border-gray-200 dark:border-gray-700",
                        !formData.validFrom && "text-gray-500 dark:text-gray-400",
                        errors.validFrom && "border-red-300 dark:border-red-600"
                      )}
                      disabled={isLoading}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.validFrom ? format(formData.validFrom, "PPP") : "Select date"}
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
                  <p className="text-xs text-red-600 dark:text-red-400">{errors.validFrom}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Valid Until (Optional)
                </Label>
                <Popover open={showValidUntilCalendar} onOpenChange={setShowValidUntilCalendar}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal border-gray-200 dark:border-gray-700",
                        !formData.validUntil && "text-gray-500 dark:text-gray-400",
                        errors.validUntil && "border-red-300 dark:border-red-600"
                      )}
                      disabled={isLoading}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.validUntil ? format(formData.validUntil, "PPP") : "Select end date"}
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
                  <p className="text-xs text-red-600 dark:text-red-400">{errors.validUntil}</p>
                )}
              </div>
            </div>

            {/* Additional Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Additional Notes
              </Label>
              <Textarea
                id="notes"
                value={formData.notes || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional notes or comments"
                rows={2}
                disabled={isLoading}
                className="border-gray-200 dark:border-gray-700 resize-none"
              />
            </div>

            {/* Required Documents */}
            {selectedConcessionType && selectedConcessionType.requiredDocuments.length > 0 && (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                      Required Documents
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mb-2">
                      Please collect and verify the following documents:
                    </p>
                    <ul className="text-xs text-amber-800 dark:text-amber-200 space-y-1">
                      {selectedConcessionType.requiredDocuments.map((doc, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <div className="w-1 h-1 bg-amber-600 dark:bg-amber-400 rounded-full flex-shrink-0" />
                          {doc}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Error Display */}
            {Object.keys(errors).length > 0 && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-900 dark:text-red-100">
                      Please fix the following errors:
                    </p>
                    <ul className="text-xs text-red-700 dark:text-red-300 mt-1 space-y-0.5">
                      {Object.entries(errors).map(([field, error]) => (
                        <li key={field}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
            {/* Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-800">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                className="border-gray-200 dark:border-gray-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !formData.studentId || !formData.concessionTypeId}
                className="bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 dark:text-gray-900"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? 'Saving...' : editingConcession ? 'Update Concession' : 'Send for Approval'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>

      {/* Create Concession Type Modal */}
      <ConcessionTypeFormModal
        isOpen={showCreateConcessionTypeModal}
        onClose={() => setShowCreateConcessionTypeModal(false)}
        onSuccess={(concessionTypeData) => {
          // Actually create the concession type via API
          if (!currentBranchId || !currentSessionId) {
            toast({
              title: "Error",
              description: "Branch and session information is required",
              variant: "destructive",
            });
            return;
          }

          createConcessionTypeMutation.mutate({
            ...concessionTypeData,
            branchId: currentBranchId,
            sessionId: currentSessionId,
          });
        }}
        feeHeads={feeHeads}
        feeTerms={feeTerms}
        isLoading={createConcessionTypeMutation.isPending}
      />
    </Dialog>
  );
}