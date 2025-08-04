"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import dynamic from "next/dynamic";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Save, 
  Copy, 
  Grid3X3, 
  Users, 
  RefreshCw,
  Minus,
  Plus,
  Info,
  Settings,
  X,
  BookOpen,
  Check,
  Calendar
} from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

interface ClassSectionSelection {
  classId: string;
  className: string;
  sectionIds: string[];
  sections: Array<{
    id: string;
    name: string;
    studentCount: number;
  }>;
}

interface FeeMatrixRow {
  feeHeadId: string;
  feeHeadName: string;
  feeHeadDescription?: string;
  [key: string]: any;
}

// Utility function to check if a fee head is associated with a fee term
const isFeeHeadInTerm = (feeHeadId: string, feeTerm: any): boolean => {
  if (!feeTerm.feeHeads || !Array.isArray(feeTerm.feeHeads)) {
    return false;
  }
  return feeTerm.feeHeads.some((fh: any) => fh.feeHead?.id === feeHeadId);
};

function EnhancedClasswiseFeePageContent() {
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  const { toast } = useToast();

  const [selectedClassSections, setSelectedClassSections] = useState<ClassSectionSelection[]>([]);
  const [feeMatrix, setFeeMatrix] = useState<Record<string, Record<string, number>>>({});
  const [copyFromClassId, setCopyFromClassId] = useState<string>('');
  const [showCopyPanel, setShowCopyPanel] = useState(false);
  
  // Ref to track last computed matrix to prevent infinite loops
  const lastMatrixRef = useRef<string>('');
  
  // Dropdown states
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>([]);
  const [sectionDropdownOpen, setSectionDropdownOpen] = useState(false);

  // Fetch classes
  const {
    data: classes = []
  } = api.class.getAll.useQuery(
    {
      branchId: currentBranchId!,
      sessionId: currentSessionId!,
      includeSections: true,
    },
    {
      enabled: !!currentBranchId && !!currentSessionId,
    }
  );

  // Fetch fee terms
  const {
    data: feeTerms = []
  } = api.finance.getFeeTerms.useQuery(
    {
      branchId: currentBranchId ?? undefined,
      sessionId: currentSessionId ?? undefined,
    },
    {
      enabled: !!currentBranchId && !!currentSessionId,
    }
  );

  // Fetch fee heads
  const {
    data: feeHeads = []
  } = api.finance.getFeeHeads.useQuery(
    {
      branchId: currentBranchId ?? undefined,
      sessionId: currentSessionId ?? undefined,
    },
    {
      enabled: !!currentBranchId && !!currentSessionId,
    }
  );

  // Fetch existing classwise fees (now section-level fees)
  const {
    data: existingClasswiseFees = [],
    refetch: refetchExistingFees
  } = api.finance.getClasswiseFees.useQuery(
    {
      branchId: currentBranchId ?? undefined,
      sessionId: currentSessionId ?? undefined,
    },
    {
      enabled: !!currentBranchId && !!currentSessionId && selectedClassSections.length > 0,
    }
  );

  // Mutations
  const saveClasswiseFeesMutation = api.finance.setClasswiseFees.useMutation({
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const copyClasswiseFeesMutation = api.finance.copyClasswiseFees.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Fee structure copied successfully",
      });
      void refetchExistingFees();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get available sections for selected class
  const availableSections = useMemo(() => {
    if (!selectedClassId) return [];
    const selectedClass = classes.find(c => c.id === selectedClassId);
    return selectedClass?.sections?.map((s: any) => ({
      id: s.id,
      name: s.name,
      studentCount: s.studentCount || s._count?.students || 0,
    })) || [];
  }, [selectedClassId, classes]);

  // Add class-section combination
  const handleAddClassSection = () => {
    if (!selectedClassId || selectedSectionIds.length === 0) {
      toast({
        title: "Selection Required",
        description: "Please select a class and at least one section",
        variant: "destructive",
      });
      return;
    }

    const classData = classes.find(c => c.id === selectedClassId);
    if (!classData) return;

    // Check if class already exists
    const existingIndex = selectedClassSections.findIndex(cs => cs.classId === selectedClassId);
    
    if (existingIndex >= 0) {
      // Update existing class with new sections
      setSelectedClassSections(prev => 
        prev.map((cs, index) => 
          index === existingIndex 
            ? { ...cs, sectionIds: [...new Set([...cs.sectionIds, ...selectedSectionIds])] }
            : cs
        )
      );
    } else {
      // Add new class-section combination
      const newSelection: ClassSectionSelection = {
        classId: selectedClassId,
        className: classData.name,
        sectionIds: selectedSectionIds,
        sections: availableSections,
      };
      setSelectedClassSections(prev => [...prev, newSelection]);
    }

    // Reset selections
    setSelectedClassId('');
    setSelectedSectionIds([]);
    setSectionDropdownOpen(false);
  };

  // Remove class-section combination
  const handleRemoveClassSection = (classId: string) => {
    setSelectedClassSections(prev => prev.filter(cs => cs.classId !== classId));
  };

  // Initialize fee matrix - Fixed to use class-level keys and show all terms
  useEffect(() => {
    // Create a stable key for comparison
    const stableKey = JSON.stringify({
      classes: selectedClassSections.map(cs => ({ classId: cs.classId, className: cs.className })),
      feeHeadIds: feeHeads.map(fh => fh.id),
      feeTermIds: feeTerms.map(ft => ft.id),
      existingFees: existingClasswiseFees.map(ef => ({ classId: ef.classId, feeHeadId: ef.feeHeadId, feeTermId: ef.feeTermId, amount: ef.amount })),
    });

    // Only update if the stable key has changed
    if (lastMatrixRef.current === stableKey) {
      return;
    }
    
    lastMatrixRef.current = stableKey;

    // Only update if we have actual data to work with
    if (selectedClassSections.length === 0 || feeHeads.length === 0 || feeTerms.length === 0) {
      setFeeMatrix({});
      return;
    }

    // Initialize fee matrix with class-level keys (not section-level)
    const matrix: Record<string, Record<string, number>> = {};
    
    selectedClassSections.forEach(cs => {
      // Use class ID as key, not class-section combination
      const key = cs.classId;
      matrix[key] = {};
      
              feeHeads.forEach(feeHead => {
        feeTerms.forEach(feeTerm => {
          const cellKey = `${feeHead.id}-${feeTerm.id}`;
          // Find existing fees for any section in this class
          const existing = existingClasswiseFees.find(ef => 
            cs.sectionIds.includes(ef.sectionId!) && 
            ef.feeHeadId === feeHead.id && 
            ef.feeTermId === feeTerm.id
          );
          matrix[key]![cellKey] = existing?.amount || 0;
        });
      });
    });
    
    setFeeMatrix(matrix);
  }, [selectedClassSections, feeHeads, feeTerms, existingClasswiseFees]);

  // Prepare table data - Show data for all terms and all classes
  const tableData: FeeMatrixRow[] = useMemo(() => {
    return feeHeads.map(feeHead => {
      const row: FeeMatrixRow = {
        feeHeadId: feeHead.id,
        feeHeadName: feeHead.name,
        feeHeadDescription: feeHead.description || undefined,
      };
      
      // Add columns for each class-term combination
      selectedClassSections.forEach(cs => {
        feeTerms.forEach(feeTerm => {
          const cellKey = `class_${cs.classId}_term_${feeTerm.id}`;
          const amount = feeMatrix[cs.classId]?.[`${feeHead.id}-${feeTerm.id}`] || 0;
          
          row[cellKey] = {
            amount,
            isConfigured: isFeeHeadInTerm(feeHead.id, feeTerm),
            feeTermId: feeTerm.id,
            feeHeadId: feeHead.id,
            classId: cs.classId,
          };
        });
      });
      
      return row;
    });
  }, [feeHeads, feeMatrix, selectedClassSections, feeTerms]);

  // Update individual class fee amount
  const updateClassFeeAmount = useCallback((classId: string, feeHeadId: string, feeTermId: string, amount: number) => {
    setFeeMatrix(prev => {
      const updated = { ...prev };
      if (!updated[classId]) {
        updated[classId] = {};
      }
      updated[classId][`${feeHeadId}-${feeTermId}`] = amount;
      return updated;
    });
  }, []);

  // Copy fee amounts across classes for a specific fee head and term
  const copyFeeAcrossClasses = useCallback((feeHeadId: string, feeTermId: string) => {
    const sourceClassId = selectedClassSections[0]?.classId;
    if (!sourceClassId) return;

    const sourceAmount = feeMatrix[sourceClassId]?.[`${feeHeadId}-${feeTermId}`] || 0;
    
    setFeeMatrix(prev => {
      const updated = { ...prev };
      selectedClassSections.forEach(cs => {
        if (!updated[cs.classId]) {
          updated[cs.classId] = {};
        }
        updated[cs.classId]![`${feeHeadId}-${feeTermId}`] = sourceAmount;
      });
      return updated;
    });
  }, [selectedClassSections, feeMatrix]);

  // Copy entire fee head across all terms and classes
  const copyFeeHeadAcrossAll = useCallback((feeHeadId: string) => {
    const sourceClassId = selectedClassSections[0]?.classId;
    if (!sourceClassId) return;

    setFeeMatrix(prev => {
      const updated = { ...prev };
      
      feeTerms.forEach(feeTerm => {
        const sourceAmount = updated[sourceClassId]?.[`${feeHeadId}-${feeTerm.id}`] || 0;
        
        selectedClassSections.forEach(cs => {
          if (!updated[cs.classId]) {
            updated[cs.classId] = {};
          }
          updated[cs.classId]![`${feeHeadId}-${feeTerm.id}`] = sourceAmount;
        });
      });
      
      return updated;
    });
  }, [selectedClassSections, feeTerms]);

  // Define table columns - Show columns for all class-term combinations
  const columns: ColumnDef<FeeMatrixRow>[] = useMemo(() => {
    const cols: ColumnDef<FeeMatrixRow>[] = [
      {
        accessorKey: 'feeHeadName',
        header: 'Fee Head',
        enableSorting: true,
        cell: ({ row }) => (
          <div className="py-2 min-w-[120px]">
            <div className="font-medium text-sm">{row.original.feeHeadName}</div>
            {row.original.feeHeadDescription && (
              <div className="text-xs text-muted-foreground mt-1">
                {row.original.feeHeadDescription}
              </div>
            )}
          </div>
        ),
      },
    ];

    // Add columns for each class-term combination
    selectedClassSections.forEach(cs => {
      feeTerms.forEach(feeTerm => {
        cols.push({
          accessorKey: `class_${cs.classId}_term_${feeTerm.id}`,
          header: () => (
            <div className="text-center min-w-[100px]">
              <div className="font-medium text-xs">{cs.className}</div>
              <div className="text-xs text-muted-foreground">{feeTerm.name}</div>
              <div className="text-xs text-muted-foreground">
                Due: {new Date(feeTerm.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            </div>
          ),
          enableSorting: false,
          cell: ({ row }) => {
            const cellData = row.original[`class_${cs.classId}_term_${feeTerm.id}`];
            
            if (!cellData?.isConfigured) {
              return (
                <div className="flex items-center justify-center py-3">
                  <div className="flex items-center gap-1 text-muted-foreground text-xs">
                    <Minus className="h-3 w-3" />
                    <span>Not configured</span>
                  </div>
                </div>
              );
            }

            return (
              <div className="py-2">
                <Input
                  type="number"
                  placeholder="0"
                  value={cellData.amount === 0 ? '' : cellData.amount.toString()}
                  onChange={(e) => updateClassFeeAmount(
                    cellData.classId,
                    cellData.feeHeadId,
                    cellData.feeTermId,
                    parseFloat(e.target.value) || 0
                  )}
                  className="text-center text-sm h-8 w-20"
                  min="0"
                  step="0.01"
                />
              </div>
            );
          },
        });
      });
    });

    // Add actions column for copying fees
    if (selectedClassSections.length > 0) {
      cols.push({
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyFeeHeadAcrossAll(row.original.feeHeadId)}
              className="h-7 px-2 text-xs"
              title="Copy this fee head across all classes and terms"
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        ),
      });
    }

    return cols;
  }, [selectedClassSections, feeTerms, updateClassFeeAmount, copyFeeHeadAcrossAll]);

  // Create table instance
  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      sorting: [{ id: 'feeHeadName', desc: false }],
    },
  });

  const handleSaveFeeStructure = async () => {
    try {
      let successCount = 0;
      
      for (const cs of selectedClassSections) {
        const classMatrix = feeMatrix[cs.classId];
        if (!classMatrix) continue;

        // Group fees by term
        const feesByTerm: Record<string, Array<{ feeHeadId: string; amount: number; }>> = {};
        
        feeTerms.forEach(feeTerm => {
          feesByTerm[feeTerm.id] = feeHeads
            .map(feeHead => {
              const amount = classMatrix[`${feeHead.id}-${feeTerm.id}`] || 0;
              return {
                feeHeadId: feeHead.id,
                amount,
              };
            })
            .filter(f => f.amount > 0);
        });

        // Save fees for each section within the class
        for (const sectionId of cs.sectionIds) {
          // Save fees for each term
          for (const [feeTermId, fees] of Object.entries(feesByTerm)) {
            if (fees.length > 0) {
              await saveClasswiseFeesMutation.mutateAsync({
                sectionId,
                feeTermId,
                fees,
                branchId: currentBranchId!,
                sessionId: currentSessionId!,
              });
            }
          }
        }
        successCount++;
      }
      
      toast({
        title: "Success",
        description: `Fee structure saved successfully for ${successCount} classes across all terms`,
      });
      
      // Refresh the existing fees data
      void refetchExistingFees();
    } catch (error) {
      console.error('Error saving fee structure:', error);
      toast({
        title: "Error",
        description: "Failed to save fee structure. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCopyFeeStructure = async () => {
    if (!copyFromClassId) {
      toast({
        title: "Selection Required",
        description: "Please select a class to copy from",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get the first section from the source class
      const sourceClass = classes.find(c => c.id === copyFromClassId);
      if (!sourceClass?.sections || sourceClass.sections.length === 0) {
        toast({
          title: "Error",
          description: "Source class has no sections available",
          variant: "destructive",
        });
        return;
      }

      const fromSectionId = sourceClass.sections[0]?.id;
      if (!fromSectionId) {
        toast({
          title: "Error",
          description: "No valid section found in source class",
          variant: "destructive",
        });
        return;
      }

      const copyPromises = selectedClassSections.flatMap(cs =>
        cs.sectionIds.flatMap(toSectionId =>
          feeTerms.map(feeTerm =>
            copyClasswiseFeesMutation.mutateAsync({
              fromSectionId,
              toSectionId,
              feeTermId: feeTerm.id,
              branchId: currentBranchId!,
              sessionId: currentSessionId!,
            })
          )
        )
      );

      await Promise.all(copyPromises);
      toast({
        title: "Success",
        description: `Fee structure copied to ${selectedClassSections.length} classes for all terms`,
      });
      setShowCopyPanel(false);
      setCopyFromClassId('');
    } catch (error) {
      console.error('Error copying fee structure:', error);
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    const totalClasses = selectedClassSections.length;
    const totalSections = selectedClassSections.reduce((sum, cs) => sum + cs.sectionIds.length, 0);
    const totalStudents = selectedClassSections.reduce((sum, cs) => 
      sum + cs.sectionIds.reduce((sectionSum, sectionId) => {
        const section = cs.sections.find(s => s.id === sectionId);
        return sectionSum + (section?.studentCount || 0);
      }, 0), 0
    );
    
    return { totalClasses, totalSections, totalStudents };
  }, [selectedClassSections]);

  if (!currentBranchId || !currentSessionId) {
    return (
      <PageWrapper title="Fee Assignment" subtitle="Assign fees across classes and sections">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Please select a branch and academic session to continue.</p>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Fee Assignment" subtitle="Assign fees across classes and sections">
      <div className="space-y-6">
        {/* Selection Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Class & Section Selection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              {/* Class Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Class</Label>
                <Select value={selectedClassId} onValueChange={(value) => {
                  setSelectedClassId(value);
                  setSelectedSectionIds([]);
                }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select class..." />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        <div className="flex items-center justify-between w-full">
                          <div>
                            <div className="font-medium">{cls.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {cls.sections?.length || 0} sections
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Section Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Sections</Label>
                <Popover open={sectionDropdownOpen} onOpenChange={setSectionDropdownOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                      disabled={!selectedClassId}
                    >
                      {selectedSectionIds.length > 0
                        ? `${selectedSectionIds.length} selected`
                        : "Select sections..."}
                      <Users className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="start">
                    <div className="p-4 space-y-4">
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Select Sections</h4>
                        <p className="text-xs text-muted-foreground">
                          Choose sections for {classes.find(c => c.id === selectedClassId)?.name}
                        </p>
                      </div>
                      
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {availableSections.length > 0 ? (
                          <>
                            <div className="flex items-center space-x-2 pb-2 border-b">
                              <Checkbox
                                id="select-all"
                                checked={selectedSectionIds.length === availableSections.length && availableSections.length > 0}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedSectionIds(availableSections.map(s => s.id));
                                  } else {
                                    setSelectedSectionIds([]);
                                  }
                                }}
                              />
                              <Label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                                Select All
                              </Label>
                            </div>
                            
                            {availableSections.map((section) => (
                              <div key={section.id} className="flex items-center space-x-2 py-1">
                                <Checkbox
                                  id={`section-${section.id}`}
                                  checked={selectedSectionIds.includes(section.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedSectionIds(prev => [...prev, section.id]);
                                    } else {
                                      setSelectedSectionIds(prev => prev.filter(id => id !== section.id));
                                    }
                                  }}
                                />
                                <Label 
                                  htmlFor={`section-${section.id}`} 
                                  className="flex-1 flex items-center justify-between cursor-pointer text-sm"
                                >
                                  <span>{section.name}</span>
                                  <Badge variant="secondary" className="text-xs h-5">
                                    {section.studentCount}
                                  </Badge>
                                </Label>
                              </div>
                            ))}
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No sections available
                          </p>
                        )}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Add Button */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-transparent">Add</Label>
                <Button 
                  onClick={handleAddClassSection}
                  disabled={!selectedClassId || selectedSectionIds.length === 0}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>

              {/* Copy Panel Toggle */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-transparent">Copy</Label>
                <Button
                  variant="outline"
                  onClick={() => setShowCopyPanel(!showCopyPanel)}
                  className="w-full"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Structure
                </Button>
              </div>
            </div>

            {/* Copy Panel */}
            {showCopyPanel && (
              <div className="mt-4 p-4 border rounded-lg bg-muted/30">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Copy From Class</Label>
                    <Select value={copyFromClassId} onValueChange={setCopyFromClassId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select source class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map(cls => (
                          <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button
                    onClick={handleCopyFeeStructure}
                    disabled={!copyFromClassId || stats.totalClasses === 0 || copyClasswiseFeesMutation.isPending}
                  >
                    {copyClasswiseFeesMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Copy
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => setShowCopyPanel(false)}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selected Classes Display */}
        {selectedClassSections.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{stats.totalClasses} classes</span>
                  </div>
                  <div>{stats.totalSections} sections</div>
                  <div>{stats.totalStudents} students</div>
                </div>
                
                <Button
                  onClick={handleSaveFeeStructure}
                  disabled={saveClasswiseFeesMutation.isPending || stats.totalClasses === 0}
                  className="gap-2"
                >
                  {saveClasswiseFeesMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Changes
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedClassSections.map((cs) => (
                  <div key={cs.classId} className="flex items-center gap-2 bg-background border rounded-lg p-2">
                    <div>
                      <div className="font-medium text-sm">{cs.className}</div>
                      <div className="text-xs text-muted-foreground">
                        {cs.sectionIds.map(sectionId => {
                          const section = cs.sections.find(s => s.id === sectionId);
                          return section?.name;
                        }).join(', ')}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveClassSection(cs.classId)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Fee Matrix */}
        {selectedClassSections.length > 0 ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Grid3X3 className="h-5 w-5" />
                  Fee Assignment Matrix
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {feeHeads.length} fee heads
                  </Badge>
                  <Badge variant="outline">
                    {feeTerms.length} terms
                  </Badge>
                  <Badge variant="outline">
                    {selectedClassSections.length} classes
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id} className="bg-muted/30">
                        {headerGroup.headers.map((header, index) => (
                          <TableHead 
                            key={header.id}
                            className={`${index === 0 ? 'text-left sticky left-0 bg-muted/30 z-10' : 'text-center'} font-medium h-16 px-2`}
                            onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                            style={{ cursor: header.column.getCanSort() ? 'pointer' : 'default' }}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows.map((row, index) => (
                      <TableRow 
                        key={row.id} 
                        className={index % 2 === 0 ? "bg-background" : "bg-muted/20"}
                      >
                        {row.getVisibleCells().map((cell, cellIndex) => (
                          <TableCell 
                            key={cell.id} 
                            className={`${cellIndex === 0 ? 'text-left sticky left-0 bg-inherit z-10' : 'text-center'} p-2`}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Info className="h-3 w-3" />
                  <span>
                    Fees are assigned at the class level and apply to all sections within that class. 
                    Each column represents a Class-Term combination. Use the copy button to duplicate a fee head across all classes and terms.
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="h-96 flex items-center justify-center">
            <div className="text-center">
              <Grid3X3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">Select classes and sections to start</p>
              <p className="text-xs text-muted-foreground">Use the dropdowns above to choose classes and sections</p>
            </div>
          </Card>
        )}
      </div>
    </PageWrapper>
  );
}
// Dynamically import to disable SSR completely
const DynamicEnhancedClasswiseFeePageContent = dynamic(() => Promise.resolve(EnhancedClasswiseFeePageContent), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center p-8">Loading...</div>
});

export default function EnhancedClasswiseFeePage() {
  return <DynamicEnhancedClasswiseFeePageContent />;
} 