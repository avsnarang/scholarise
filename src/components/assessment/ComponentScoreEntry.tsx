"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Save, Search, Check, X, User, Hash, IdCard, Calculator, Target, BarChart3, Copy, MoreHorizontal, Eye, EyeOff, ToggleLeft, ToggleRight, Users, TrendingUp, CheckCircle, Clock, AlertCircle, Snowflake, Trash2, UserCheck, UserX, UserMinus, Award } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useDefaultGradeScale } from "@/hooks/useGradeScales";
import { AssessmentCalculator } from "@/lib/assessment-calculator";

// Custom debounce function
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

interface Student {
  id: string;
  name: string;
  rollNumber?: string;
  admissionNumber?: string;
}

interface SubCriteria {
  id: string;
  name: string;
  description?: string;
  maxScore: number;
  order: number;
}

interface Component {
  id: string;
  name: string;
  maxScore: number;
  rawMaxScore?: number;
  subCriteria?: SubCriteria[];
}

interface Schema {
  id: string;
  name: string;
  term: string;
  classId: string;
  subjectId: string;
  totalMarks: number;
  isActive: boolean;
  isPublished: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  branchId: string;
  components: Component[];
}

interface ScoreData {
  studentId: string;
  assessmentSchemaId?: string;
  assessmentConfigId?: string;
  componentId?: string;
  marksObtained: number;
  comments?: string;
  subCriteriaScores?: { [subCriteriaId: string]: number };
  // Attendance tracking fields
  attendanceStatus?: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'LEAVE';
  attendanceReason?: string;
  attendanceNotes?: string;
}

interface ExistingScore {
  studentId: string;
  assessmentSchemaId?: string;
  assessmentConfigId?: string;
  componentId?: string;
  marksObtained: number;
  comments?: string;
  subCriteriaScores?: { [subCriteriaId: string]: number };
}

interface ComponentScoreEntryProps {
  schema: Schema;
  component: Component;
  students: Student[];
  existingScores: ExistingScore[];
  onSave: (scores: ScoreData[]) => Promise<void>;
  onRefresh?: () => Promise<void>;
  branchId: string;
}

export function ComponentScoreEntry({
  schema,
  component,
  students,
  existingScores,
  onSave,
  onRefresh,
  branchId
}: ComponentScoreEntryProps) {
  const { toast } = useToast();
  const [scores, setScores] = useState<Record<string, string>>({});
  const [subCriteriaScores, setSubCriteriaScores] = useState<Record<string, Record<string, string>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [searchQuery, setSearchQuery] = useState("");
  const [showScaledMarks, setShowScaledMarks] = useState(false);
  const [selectedStudentForCopy, setSelectedStudentForCopy] = useState<string>("");
  
  // Attendance tracking state
  const [attendanceData, setAttendanceData] = useState<Record<string, string>>({});
  const [attendanceReasons, setAttendanceReasons] = useState<Record<string, string>>({});
  const [attendanceNotes, setAttendanceNotes] = useState<Record<string, string>>({});
  
  // Score removal state
  const [studentToRemove, setStudentToRemove] = useState<string>("");

  // Grade calculation functionality
  const { defaultGradeScale, isLoading: gradeScaleLoading, hasInactiveDefault } = useDefaultGradeScale();
  const assessmentCalculator = useMemo(() => new AssessmentCalculator(), []);

  // Check if schema is frozen (visible but not editable)
  const isSchemaFrozen = !schema.isActive && schema.isPublished;
  
  // Check if schema is in draft mode (not visible to teachers)
  const isSchemaInDraft = schema.isActive && !schema.isPublished;

  // Check if component has sub-criteria
  const hasSubCriteria = component.subCriteria && component.subCriteria.length > 0;
  const sortedSubCriteria = useMemo(() => {
    return hasSubCriteria && component.subCriteria
      ? [...component.subCriteria].sort((a, b) => a.order - b.order)
      : [];
  }, [hasSubCriteria, component.subCriteria]);

  // Filter students based on search query
  const filteredStudents = (students || []).filter(student => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      student.name.toLowerCase().includes(query) ||
      student.rollNumber?.toLowerCase().includes(query) ||
      student.admissionNumber?.toLowerCase().includes(query)
    );
  });

  // Track if we've initialized to prevent overwriting user input
  const [hasInitialized, setHasInitialized] = useState(false);

  // Initialize scores from existing data - only once or when component changes
  useEffect(() => {
    const shouldInitialize = !hasInitialized || 
      students.length > Object.keys(scores).length ||
      component.id !== (scores._componentId as any);

    if (!shouldInitialize) return;

    const initialScores: Record<string, string> = {};
    const initialSubScores: Record<string, Record<string, string>> = {};
    const initialAttendance: Record<string, string> = {};
    const initialReasons: Record<string, string> = {};
    const initialNotes: Record<string, string> = {};
    
    (students || []).forEach(student => {
      const existingScore = existingScores.find(score => 
        score.studentId === student.id && 
        (score.componentId === component.id || (!score.componentId && component.id === "main"))
      );
      
      initialScores[student.id] = existingScore ? existingScore.marksObtained.toString() : "";
      
      // Initialize attendance data
      initialAttendance[student.id] = (existingScore as any)?.attendanceStatus || 'PRESENT';
      initialReasons[student.id] = (existingScore as any)?.attendanceReason || '';
      initialNotes[student.id] = (existingScore as any)?.attendanceNotes || '';
      
      // Initialize sub-criteria scores
      if (hasSubCriteria) {
        initialSubScores[student.id] = {};
        sortedSubCriteria.forEach(subCriteria => {
          const subScore = existingScore?.subCriteriaScores?.[subCriteria.id];
          initialSubScores[student.id]![subCriteria.id] = subScore ? subScore.toString() : "";
        });
      }
    });
    
    // Add component ID to track which component these scores belong to
    (initialScores as any)._componentId = component.id;
    
    setScores(initialScores);
    setSubCriteriaScores(initialSubScores);
    setAttendanceData(initialAttendance);
    setAttendanceReasons(initialReasons);
    setAttendanceNotes(initialNotes);
    setHasInitialized(true);
  }, [students, component.id, hasSubCriteria, sortedSubCriteria, hasInitialized, scores, existingScores]);

  // Reset initialization flag when component changes
  useEffect(() => {
    setHasInitialized(false);
  }, [component.id]);

  // Calculate total score for a student (sum of sub-criteria if available)
  const calculateTotalScore = useCallback((studentId: string) => {
    if (!hasSubCriteria) return scores[studentId] || "";
    
    const studentSubScores = subCriteriaScores[studentId];
    if (!studentSubScores) return "";
    
    const total = sortedSubCriteria.reduce((sum, subCriteria) => {
      const score = parseFloat(studentSubScores[subCriteria.id] || "0");
      return sum + (isNaN(score) ? 0 : score);
    }, 0);
    
    return total > 0 ? total.toString() : "";
  }, [hasSubCriteria, subCriteriaScores, sortedSubCriteria, scores]);

  // Enhanced completion status calculation
  const getStudentCompletionStatus = useCallback((studentId: string) => {
    if (!hasSubCriteria) {
      const score = scores[studentId]?.trim() || "";
      return {
        isComplete: score !== "",
        isValid: score !== "" && !isNaN(parseFloat(score)) && parseFloat(score) >= 0,
        isEmpty: score === "",
        hasUnsavedChanges: false // Manual save required
      };
    }
    
    const studentSubScores = subCriteriaScores[studentId] || {};
    const completedSubCriteria = sortedSubCriteria.filter(sub => 
      studentSubScores[sub.id]?.trim() !== ""
    ).length;
    
    const allValid = sortedSubCriteria.every(sub => {
      const score = studentSubScores[sub.id]?.trim() || "";
      return score === "" || (!isNaN(parseFloat(score)) && parseFloat(score) >= 0 && parseFloat(score) <= sub.maxScore);
    });
    
    return {
      isComplete: completedSubCriteria === sortedSubCriteria.length,
      isValid: allValid,
      isEmpty: completedSubCriteria === 0,
      hasUnsavedChanges: false,
      progress: Math.round((completedSubCriteria / sortedSubCriteria.length) * 100)
    };
  }, [hasSubCriteria, scores, subCriteriaScores, sortedSubCriteria]);

  // Enhanced class statistics
  const enhancedClassStats = useMemo(() => {
    const studentList = students || [];
    const totalStudents = studentList.length;
    const completedStudents = studentList.filter(student => {
      const status = getStudentCompletionStatus(student.id);
      return status.isComplete && status.isValid;
    }).length;
    
    const partiallyCompletedStudents = studentList.filter(student => {
      const status = getStudentCompletionStatus(student.id);
      return !status.isComplete && !status.isEmpty;
    }).length;
    
    const pendingStudents = studentList.filter(student => {
      const status = getStudentCompletionStatus(student.id);
      return status.isEmpty;
    }).length;
    
    const averageScore = studentList.length > 0 ? studentList.reduce((sum, student) => {
      const score = parseFloat(calculateTotalScore(student.id) || "0");
      return sum + score;
    }, 0) / studentList.length : 0;
    
    // Calculate scaled average if applicable
    const scaledAverageScore = component.rawMaxScore && component.maxScore !== component.rawMaxScore 
      ? (averageScore / component.rawMaxScore) * component.maxScore
      : averageScore;
    
    const studentScores = studentList.map(s => parseFloat(calculateTotalScore(s.id) || "0"));
    const validScores = studentScores.filter(s => s > 0);
    
    return {
      totalStudents,
      completedStudents,
      partiallyCompletedStudents,
      pendingStudents,
      completionRate: totalStudents > 0 ? Math.round((completedStudents / totalStudents) * 100) : 0,
      partialCompletionRate: totalStudents > 0 ? Math.round((partiallyCompletedStudents / totalStudents) * 100) : 0,
      averageScore: Math.round(averageScore * 10) / 10,
      scaledAverageScore: Math.round(scaledAverageScore * 10) / 10,
      highestScore: validScores.length > 0 ? Math.max(...validScores) : 0,
      lowestScore: validScores.length > 0 ? Math.min(...validScores) : 0
    };
  }, [students, getStudentCompletionStatus, calculateTotalScore, component.rawMaxScore, component.maxScore]);

  // Calculate display score (raw or scaled)
  const calculateDisplayScore = useCallback((studentId: string) => {
    const rawScore = parseFloat(calculateTotalScore(studentId) || "0");
    if (!showScaledMarks || !component.rawMaxScore || component.maxScore === component.rawMaxScore) {
      return rawScore;
    }
    // Scale the score: (rawScore / rawMaxScore) * maxScore
    return (rawScore / component.rawMaxScore) * component.maxScore;
  }, [calculateTotalScore, showScaledMarks, component.rawMaxScore, component.maxScore]);

  // Calculate grade for a student
  const calculateGrade = useCallback((studentId: string) => {
    if (!defaultGradeScale || gradeScaleLoading) {
      return null;
    }

    const rawScore = parseFloat(calculateTotalScore(studentId) || "0");
    if (rawScore <= 0) {
      return null;
    }

    // Calculate percentage based on maximum marks
    const maxMarks = showScaledMarks && component.rawMaxScore ? component.maxScore : (component.rawMaxScore || component.maxScore);
    const percentage = (rawScore / maxMarks) * 100;

    try {
      const grade = assessmentCalculator.calculateGradeWithPoint(percentage, defaultGradeScale);
      return grade;
    } catch (error) {
      console.error('Error calculating grade:', error);
      return null;
    }
  }, [calculateTotalScore, defaultGradeScale, gradeScaleLoading, showScaledMarks, component.rawMaxScore, component.maxScore, assessmentCalculator]);

  // Handle sub-criteria score change
  const handleSubCriteriaScoreChange = (studentId: string, subCriteriaId: string, value: string) => {
    // Find the sub-criteria to get its max score
    const subCriteria = sortedSubCriteria.find(sc => sc.id === subCriteriaId);
    if (!subCriteria) return;
    
    // Allow empty values for clearing the input
    if (value === "") {
      const updatedSubScores = {
        ...subCriteriaScores,
        [studentId]: {
          ...(subCriteriaScores[studentId] || {}),
          [subCriteriaId]: value
        }
      };
      setSubCriteriaScores(updatedSubScores);
      return;
    }
    
    const numericValue = parseFloat(value);
    
    // Validate the score doesn't exceed maximum
    if (!isNaN(numericValue) && numericValue > subCriteria.maxScore) {
      toast({
        title: "Score exceeds maximum",
        description: `Score for "${subCriteria.name}" cannot exceed ${subCriteria.maxScore} marks.`,
        variant: "destructive",
      });
      return;
    }
    
    // Validate the score is not negative
    if (!isNaN(numericValue) && numericValue < 0) {
      toast({
        title: "Invalid score",
        description: "Score cannot be negative.",
        variant: "destructive",
      });
      return;
    }
    
    const updatedSubScores = {
      ...subCriteriaScores,
      [studentId]: {
        ...(subCriteriaScores[studentId] || {}),
        [subCriteriaId]: value
      }
    };
    
    setSubCriteriaScores(updatedSubScores);
  };

  // Handle main score change (for non-sub-criteria components)
  const handleScoreChange = (studentId: string, value: string) => {
    if (hasSubCriteria) return; // Don't allow manual total editing if sub-criteria exist
    
    // Allow empty values for clearing the input
    if (value === "") {
      const updatedScores = {
        ...scores,
        [studentId]: value
      };
      setScores(updatedScores);
      return;
    }
    
    const numericValue = parseFloat(value);
    
    // Validate the score doesn't exceed maximum
    if (!isNaN(numericValue) && numericValue > maxScore) {
      toast({
        title: "Score exceeds maximum",
        description: `Score cannot exceed ${maxScore} marks for this component.`,
        variant: "destructive",
      });
      return;
    }
    
    // Validate the score is not negative
    if (!isNaN(numericValue) && numericValue < 0) {
      toast({
        title: "Invalid score",
        description: "Score cannot be negative.",
        variant: "destructive",
      });
      return;
    }
    
    const updatedScores = {
      ...scores,
      [studentId]: value
    };
    
    setScores(updatedScores);
  };

  // Manual save function
  const handleManualSave = async () => {
    let scoresToSave: any[] = [];

    if (hasSubCriteria) {
      // For sub-criteria assessments, collect data from subCriteriaScores
      (students || []).forEach(student => {
        const studentSubScores = subCriteriaScores[student.id];
        if (!studentSubScores) return;
        
        // Check if student has any sub-criteria scores entered
        const hasAnySubScore = sortedSubCriteria.some(subCriteria => {
          const score = studentSubScores[subCriteria.id]?.trim();
          return score && score !== "" && !isNaN(parseFloat(score));
        });
        
        if (hasAnySubScore) {
          // Calculate total score from sub-criteria
          const total = sortedSubCriteria.reduce((sum, subCriteria) => {
            const score = parseFloat(studentSubScores[subCriteria.id] || "0");
            return sum + (isNaN(score) ? 0 : score);
          }, 0);
          
          // Prepare sub-criteria scores object
          const subCriteriaScoresObj = Object.fromEntries(
            Object.entries(studentSubScores)
              .map(([subId, subScore]) => [subId, parseFloat(subScore) || 0])
              .filter(([, score]) => {
                const numScore = score as number;
                return !isNaN(numScore) && numScore > 0;
              })
          );
          
          scoresToSave.push({
            studentId: student.id,
            assessmentSchemaId: schema.id,
            componentId: component.id === "main" ? undefined : component.id,
            marksObtained: total,
            branchId: branchId,
            subCriteriaScores: subCriteriaScoresObj,
            attendanceStatus: attendanceData[student.id] as any || 'PRESENT',
            attendanceReason: attendanceReasons[student.id],
            attendanceNotes: attendanceNotes[student.id],
          });
        }
      });
    } else {
      // For simple assessments, use the existing logic
      scoresToSave = Object.entries(scores)
        .filter(([studentId, score]) => {
          // Filter out internal tracking properties and empty scores
          return studentId !== '_componentId' && 
                 typeof score === 'string' && 
                 score.trim() !== "";
        })
        .map(([studentId, score]) => ({
          studentId,
          assessmentSchemaId: schema.id,
          componentId: component.id === "main" ? undefined : component.id,
          marksObtained: parseFloat(score) || 0,
          branchId: branchId,
          attendanceStatus: attendanceData[studentId] as any || 'PRESENT',
          attendanceReason: attendanceReasons[studentId],
          attendanceNotes: attendanceNotes[studentId],
        }));
    }

    if (scoresToSave.length === 0) {
      console.log('DEBUG: No scores to save. Raw scores data:', scores);
      console.log('DEBUG: Sub-criteria scores data:', subCriteriaScores);
      console.log('DEBUG: Students data:', students);
      console.log('DEBUG: Has sub criteria:', hasSubCriteria);
      
      toast({
        title: "No scores to save",
        description: hasSubCriteria 
          ? "Please enter at least one sub-criteria score before saving."
          : "Please enter at least one score before saving.",
        variant: "destructive",
      });
      return;
    }

    console.log('DEBUG: About to save scores:', scoresToSave);
    setIsSaving(true);
    try {
      console.log('DEBUG: Calling onSave function...');
      await onSave(scoresToSave);
      console.log('DEBUG: onSave completed successfully');
      toast({
        title: "Scores saved",
        description: `Successfully saved scores for ${scoresToSave.length} students.`,
      });
    } catch (error: any) {
      console.error('DEBUG: Error in save process:', error);
      console.error('Error saving scores:', error);
      
      // Check if error is related to maximum score validation
      const errorMessage = error?.message || error?.toString() || '';
      const isMaxScoreError = errorMessage.includes('exceeds maximum') || 
                             errorMessage.includes('cannot exceed') ||
                             errorMessage.includes('maximum allowed');
      
      toast({
        title: isMaxScoreError ? "Score validation error" : "Error saving scores",
        description: isMaxScoreError 
          ? errorMessage 
          : "Please check your scores and try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Copy scores from one student to another
  const copyStudentScores = (fromStudentId: string, toStudentId: string) => {
    if (hasSubCriteria) {
      const fromSubScores = subCriteriaScores[fromStudentId] || {};
      const updatedSubScores = {
        ...subCriteriaScores,
        [toStudentId]: { ...fromSubScores }
      };
      setSubCriteriaScores(updatedSubScores);
    } else {
      const fromScore = scores[fromStudentId] || "";
      const updatedScores = {
        ...scores,
        [toStudentId]: fromScore
      };
      setScores(updatedScores);
    }
    
    toast({
      title: "Scores copied",
      description: "Scores have been copied successfully.",
    });
  };

  // Handle attendance status change
  const handleAttendanceChange = (studentId: string, status: string) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  // Handle attendance reason change
  const handleAttendanceReasonChange = (studentId: string, reason: string) => {
    setAttendanceReasons(prev => ({
      ...prev,
      [studentId]: reason
    }));
  };

  // Handle attendance notes change
  const handleAttendanceNotesChange = (studentId: string, notes: string) => {
    setAttendanceNotes(prev => ({
      ...prev,
      [studentId]: notes
    }));
  };

  // Remove student scores
  const handleRemoveStudentScore = async (studentId: string) => {
    try {
      const response = await fetch(`/api/assessment-scores?studentId=${studentId}&assessmentSchemaId=${schema.id}&componentId=${component.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove score');
      }

      // Clear local state for this student
      setScores(prev => {
        const updated = { ...prev };
        delete updated[studentId];
        return updated;
      });

      if (hasSubCriteria) {
        setSubCriteriaScores(prev => {
          const updated = { ...prev };
          delete updated[studentId];
          return updated;
        });
      }

      // Reset attendance data to defaults
      setAttendanceData(prev => ({
        ...prev,
        [studentId]: 'PRESENT'
      }));
      setAttendanceReasons(prev => ({
        ...prev,
        [studentId]: ''
      }));
      setAttendanceNotes(prev => ({
        ...prev,
        [studentId]: ''
      }));

      // Trigger data refresh if callback is provided
      if (onRefresh) {
        await onRefresh();
      }

      toast({
        title: "Scores cleared",
        description: "Student's scores have been cleared successfully. You can now enter new scores.",
      });

      setStudentToRemove(""); // Close dialog
    } catch (error) {
      toast({
        title: "Error clearing scores",
        description: "Failed to clear the student's scores. Please try again.",
        variant: "destructive",
      });
    }
  };

  const maxScore = component.rawMaxScore || component.maxScore;
  const displayMaxScore = showScaledMarks && component.rawMaxScore && component.maxScore !== component.rawMaxScore 
    ? component.maxScore 
    : maxScore;
  
  const totalMaxScore = hasSubCriteria 
    ? sortedSubCriteria.reduce((sum, sub) => sum + sub.maxScore, 0)
    : maxScore;

  const canShowScaledMarks = component.rawMaxScore && component.maxScore !== component.rawMaxScore;

  return (
    <div className="space-y-4 max-w-full">
      {/* Frozen Schema Alert */}
      {isSchemaFrozen && (
        <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
          <Snowflake className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            <strong>Read-Only Mode:</strong> This assessment is frozen. You can view scores but cannot make changes.
          </AlertDescription>
        </Alert>
      )}

      {/* Minimal Header */}
      <div className="bg-background border border-border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-lg font-semibold">{component.name}</h2>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{hasSubCriteria ? `${sortedSubCriteria.length} Parts` : 'Single Test'}</span>
                <span>Max: {displayMaxScore}</span>
                {defaultGradeScale && <span>{defaultGradeScale.name}</span>}
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground">
              {enhancedClassStats.completedStudents}/{enhancedClassStats.totalStudents}
            </div>
            
            <Progress value={enhancedClassStats.completionRate} className="w-24 h-1.5" />
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{enhancedClassStats.completedStudents} Done</span>
              <span>{enhancedClassStats.pendingStudents} Pending</span>
              <span>Avg: {showScaledMarks && canShowScaledMarks ? enhancedClassStats.scaledAverageScore : enhancedClassStats.averageScore}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 h-8 w-40 text-xs"
              />
            </div>
            
            {canShowScaledMarks && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowScaledMarks(!showScaledMarks)}
                className="h-8 w-8 p-0"
              >
                {showScaledMarks ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </Button>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={isSchemaFrozen}>
                  <Copy className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              {!isSchemaFrozen && (
                <DropdownMenuContent>
                  <DropdownMenuLabel>Copy from</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {filteredStudents.map(student => {
                    const status = getStudentCompletionStatus(student.id);
                    if (status.isEmpty) return null;
                    
                    return (
                      <DropdownMenuItem
                        key={student.id}
                        onClick={() => setSelectedStudentForCopy(student.id)}
                      >
                        <span className="text-sm">{student.name}</span>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              )}
            </DropdownMenu>
            
            {!isSchemaFrozen && (
              <Button
                onClick={handleManualSave}
                disabled={isSaving}
                size="sm"
                className="h-8 px-3 text-xs"
              >
                <Save className="h-3 w-3 mr-1" />
                Save
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Compact Table Section */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-12 text-center text-xs font-medium">#</TableHead>
                <TableHead className="text-xs font-medium min-w-[140px]">Student</TableHead>
                <TableHead className="text-center text-xs font-medium w-16">Roll</TableHead>
                
                {hasSubCriteria ? (
                  <>
                    {sortedSubCriteria.map((subCriteria) => (
                      <TableHead key={subCriteria.id} className="text-center min-w-20">
                        <div className="space-y-1">
                          <div className="text-xs font-medium">{subCriteria.name}</div>
                          <Badge variant="secondary" className="text-xs px-1 py-0">
                            {subCriteria.maxScore}
                          </Badge>
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="text-center bg-primary/5 min-w-20">
                      <div className="space-y-1">
                        <div className="text-xs font-medium">Total</div>
                        <Badge className="text-xs px-1 py-0 bg-primary">
                          {displayMaxScore}
                        </Badge>
                      </div>
                    </TableHead>
                    <TableHead className="text-center text-xs font-medium min-w-16">Grade</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead className="text-center text-xs font-medium min-w-20">
                      <div className="space-y-1">
                        <div>Score</div>
                        <Badge variant="secondary" className="text-xs px-1 py-0">
                          {displayMaxScore}
                        </Badge>
                      </div>
                    </TableHead>
                    <TableHead className="text-center text-xs font-medium min-w-16">Grade</TableHead>
                  </>
                )}
                
                <TableHead className="text-center text-xs font-medium min-w-16">Status</TableHead>
                <TableHead className="text-center text-xs font-medium min-w-24">Attendance</TableHead>
                <TableHead className="text-center text-xs font-medium w-16">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredStudents.map((student, index) => {
                const status = getStudentCompletionStatus(student.id);
                const displayScore = calculateDisplayScore(student.id);
                
                return (
                  <TableRow 
                    key={student.id} 
                    className={`hover:bg-muted/30 transition-colors text-xs ${
                      status.isComplete && status.isValid ? 'bg-emerald-50/30 dark:bg-emerald-950/20' : 
                      !status.isEmpty && !status.isComplete ? 'bg-amber-50/30 dark:bg-amber-950/20' : 
                      !status.isValid ? 'bg-red-50/30 dark:bg-red-950/20' : ''
                    }`}
                  >
                    <TableCell className="text-center text-muted-foreground font-medium">
                      {index + 1}
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-xs truncate">{student.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{student.admissionNumber}</div>
                        </div>
                        {status.isComplete && status.isValid ? (
                          <CheckCircle className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                        ) : !status.isEmpty && !status.isComplete ? (
                          <Clock className="h-3 w-3 text-amber-500 flex-shrink-0" />
                        ) : !status.isValid ? (
                          <AlertCircle className="h-3 w-3 text-red-500 flex-shrink-0" />
                        ) : null}
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-xs px-1 py-0">
                        {student.rollNumber || 'N/A'}
                      </Badge>
                    </TableCell>
                    
                    {hasSubCriteria ? (
                      <>
                        {sortedSubCriteria.map((subCriteria) => {
                          const subScore = subCriteriaScores[student.id]?.[subCriteria.id] || "";
                          const numericSubScore = parseFloat(subScore);
                          const isValidSubScore = subScore.trim() !== "" && 
                            !isNaN(numericSubScore) && 
                            numericSubScore <= subCriteria.maxScore && 
                            numericSubScore >= 0;
                          const isExceedingMax = subScore.trim() !== "" && 
                            !isNaN(numericSubScore) && 
                            numericSubScore > subCriteria.maxScore;

                          return (
                            <TableCell key={subCriteria.id} className="text-center p-1">
                              <Input
                                type="number"
                                min="0"
                                max={subCriteria.maxScore}
                                step="0.5"
                                value={subScore}
                                onChange={(e) => handleSubCriteriaScoreChange(student.id, subCriteria.id, e.target.value)}
                                placeholder="0"
                                className={`w-16 h-8 text-center text-xs font-medium mx-auto transition-all ${
                                  isValidSubScore ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 focus:border-emerald-500' :
                                  isExceedingMax ? 'border-red-300 bg-red-50 dark:bg-red-950/20 focus:border-red-500' :
                                  subScore.trim() !== "" && !isValidSubScore ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/20 focus:border-amber-500' :
                                  'border-input focus:border-primary'
                                }`}
                                disabled={isSchemaFrozen}
                              />
                            </TableCell>
                          );
                        })}
                        
                        <TableCell className="text-center bg-primary/5 p-1">
                          <div className="w-16 mx-auto p-2 border border-primary/20 rounded bg-background">
                            <div className="font-bold text-primary text-xs">
                              {showScaledMarks && canShowScaledMarks ? displayScore.toFixed(1) : calculateTotalScore(student.id) || "0"}
                            </div>
                          </div>
                        </TableCell>
                        
                        <TableCell className="text-center p-1">
                          {(() => {
                            const grade = calculateGrade(student.id);
                            if (!grade) {
                              return (
                                <Badge variant="outline" className="text-xs px-1 py-0 text-muted-foreground">
                                  {gradeScaleLoading ? "..." : defaultGradeScale ? "No Score" : "No Scale"}
                                </Badge>
                              );
                            }
                            return (
                              <div className="space-y-1">
                                <Badge className="bg-primary text-primary-foreground text-xs px-1 py-0 font-semibold">
                                  {grade.grade}
                                </Badge>
                                {grade.gradePoint && (
                                  <div className="text-xs text-muted-foreground">
                                    {grade.gradePoint}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="text-center p-1">
                          <Input
                            type="number"
                            min="0"
                            max={maxScore}
                            step="0.5"
                            value={scores[student.id] || ""}
                            onChange={(e) => handleScoreChange(student.id, e.target.value)}
                            placeholder="0"
                            className={`w-20 h-8 text-center text-xs font-medium mx-auto transition-all ${
                              status.isValid && !status.isEmpty ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 focus:border-emerald-500' :
                              !status.isValid && !status.isEmpty ? 'border-red-300 bg-red-50 dark:bg-red-950/20 focus:border-red-500' :
                              'border-input focus:border-primary'
                            }`}
                            disabled={isSchemaFrozen}
                          />
                        </TableCell>
                        
                        <TableCell className="text-center p-1">
                          {(() => {
                            const grade = calculateGrade(student.id);
                            if (!grade) {
                              return (
                                <Badge variant="outline" className="text-xs px-1 py-0 text-muted-foreground">
                                  {gradeScaleLoading ? "..." : defaultGradeScale ? "No Score" : "No Scale"}
                                </Badge>
                              );
                            }
                            return (
                              <div className="space-y-1">
                                <Badge className="bg-primary text-primary-foreground text-xs px-1 py-0 font-semibold">
                                  {grade.grade}
                                </Badge>
                                {grade.gradePoint && (
                                  <div className="text-xs text-muted-foreground">
                                    {grade.gradePoint}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </TableCell>
                      </>
                    )}
                    
                    <TableCell className="text-center p-1">
                      {status.isComplete && status.isValid ? (
                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800 text-xs px-1 py-0">
                          Done
                        </Badge>
                      ) : !status.isEmpty && !status.isComplete ? (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 border-amber-200 dark:border-amber-800 text-xs px-1 py-0">
                          Partial
                        </Badge>
                      ) : !status.isValid ? (
                        <Badge variant="destructive" className="text-xs px-1 py-0">
                          Invalid
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs px-1 py-0 text-muted-foreground">
                          Pending
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-center p-2">
                      <div className="flex justify-center">
                        <Select
                          value={attendanceData[student.id] || 'PRESENT'}
                          onValueChange={(value) => handleAttendanceChange(student.id, value)}
                          disabled={isSchemaFrozen}
                        >
                          <SelectTrigger className="w-28 h-8 text-xs border-input text-center">
                            <SelectValue className="text-center" />
                          </SelectTrigger>
                        <SelectContent className="bg-background border border-border shadow-md">
                          <SelectItem value="PRESENT" className="cursor-pointer hover:bg-accent">
                            <div className="flex items-center gap-1">
                              <UserCheck className="h-3 w-3 text-emerald-500" />
                              <span className="text-xs">Present</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="ABSENT" className="cursor-pointer hover:bg-accent">
                            <div className="flex items-center gap-1">
                              <UserX className="h-3 w-3 text-red-500" />
                              <span className="text-xs">Absent</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="LEAVE" className="cursor-pointer hover:bg-accent">
                            <div className="flex items-center gap-1">
                              <UserMinus className="h-3 w-3 text-blue-500" />
                              <span className="text-xs">Leave</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="LATE" className="cursor-pointer hover:bg-accent">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-amber-500" />
                              <span className="text-xs">Late</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="HALF_DAY" className="cursor-pointer hover:bg-accent">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-orange-500" />
                              <span className="text-xs">Half Day</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-center p-1">
                      <div className="flex items-center justify-center gap-1">
                        {selectedStudentForCopy && selectedStudentForCopy !== student.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              copyStudentScores(selectedStudentForCopy, student.id);
                              setSelectedStudentForCopy("");
                            }}
                            className="h-6 w-6 p-0 hover:bg-blue-50 dark:hover:bg-blue-950"
                            disabled={isSchemaFrozen}
                          >
                            <Copy className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                          </Button>
                        )}
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-red-50 dark:hover:bg-red-950"
                              disabled={isSchemaFrozen || (!scores[student.id]?.trim() && !Object.values(subCriteriaScores[student.id] || {}).some(score => score?.trim()))}
                            >
                              <Trash2 className="h-3 w-3 text-red-600 dark:text-red-400" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Clear Student Scores</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to clear all scores for <strong>{student.name}</strong>? 
                                This will reset all scores for this student.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRemoveStudentScore(student.id)}
                                className="bg-red-500 hover:bg-red-600"
                              >
                                Clear Scores
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
} 