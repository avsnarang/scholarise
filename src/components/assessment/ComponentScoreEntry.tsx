"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Save, Search, Check, X, User, Hash, IdCard, Calculator, Target, BarChart3, Copy, MoreHorizontal, Eye, EyeOff, ToggleLeft, ToggleRight, Users, TrendingUp, CheckCircle, Clock, AlertCircle } from "lucide-react";
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
  branchId: string;
}

export function ComponentScoreEntry({
  schema,
  component,
  students,
  existingScores,
  onSave,
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

  // Initialize scores from existing data
  useEffect(() => {
    const initialScores: Record<string, string> = {};
    const initialSubScores: Record<string, Record<string, string>> = {};
    
    (students || []).forEach(student => {
      const existingScore = existingScores.find(score => 
        score.studentId === student.id && 
        (score.componentId === component.id || (!score.componentId && component.id === "main"))
      );
      
      initialScores[student.id] = existingScore ? existingScore.marksObtained.toString() : "";
      
      // Initialize sub-criteria scores
      if (hasSubCriteria) {
        initialSubScores[student.id] = {};
        sortedSubCriteria.forEach(subCriteria => {
          const subScore = existingScore?.subCriteriaScores?.[subCriteria.id];
          initialSubScores[student.id]![subCriteria.id] = subScore ? subScore.toString() : "";
        });
      }
    });
    
    setScores(initialScores);
    setSubCriteriaScores(initialSubScores);
  }, [students, existingScores, component.id, hasSubCriteria, sortedSubCriteria]);

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

  // Handle sub-criteria score change
  const handleSubCriteriaScoreChange = (studentId: string, subCriteriaId: string, value: string) => {
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
            subCriteriaScores: subCriteriaScoresObj
          });
        }
      });
    } else {
      // For simple assessments, use the existing logic
      scoresToSave = Object.entries(scores)
        .filter(([, score]) => score.trim() !== "")
        .map(([studentId, score]) => ({
          studentId,
          assessmentSchemaId: schema.id,
          componentId: component.id === "main" ? undefined : component.id,
          marksObtained: parseFloat(score) || 0,
          branchId: branchId,
        }));
    }

    if (scoresToSave.length === 0) {
      toast({
        title: "No scores to save",
        description: hasSubCriteria 
          ? "Please enter at least one sub-criteria score before saving."
          : "Please enter at least one score before saving.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSave(scoresToSave);
      toast({
        title: "Scores saved",
        description: `Successfully saved scores for ${scoresToSave.length} students.`,
      });
    } catch (error) {
      toast({
        title: "Error saving scores",
        description: "Please try again later.",
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

  const maxScore = component.rawMaxScore || component.maxScore;
  const displayMaxScore = showScaledMarks && component.rawMaxScore && component.maxScore !== component.rawMaxScore 
    ? component.maxScore 
    : maxScore;
  
  const totalMaxScore = hasSubCriteria 
    ? sortedSubCriteria.reduce((sum, sub) => sum + sub.maxScore, 0)
    : maxScore;

  const canShowScaledMarks = component.rawMaxScore && component.maxScore !== component.rawMaxScore;

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Statistics */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">
                {component.name}
                {canShowScaledMarks && (
                  <Badge variant="secondary" className="ml-2">
                    {showScaledMarks ? `Scaled (${displayMaxScore})` : `Raw (${maxScore})`}
                  </Badge>
                )}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {hasSubCriteria ? `${sortedSubCriteria.length} sub-criteria` : "Single assessment"}
                {canShowScaledMarks && (
                  <span className="ml-2">
                    • Raw: {maxScore} marks → Scaled: {component.maxScore} marks
                  </span>
                )}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Raw vs Scaled Toggle */}
              {canShowScaledMarks && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowScaledMarks(!showScaledMarks)}
                        className="gap-2"
                      >
                        {showScaledMarks ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        {showScaledMarks ? "Show Raw" : "Show Scaled"}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Toggle between raw marks entered and scaled marks for reports</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
              {/* Manual Save Button */}
              <Button
                onClick={handleManualSave}
                disabled={isSaving}
                size="sm"
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save All"}
              </Button>
            </div>
          </div>

          {/* Enhanced Statistics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-4">
            <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Total</span>
              </div>
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {enhancedClassStats.totalStudents}
              </div>
            </div>
            
            <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800 dark:text-green-200">Completed</span>
              </div>
              <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                {enhancedClassStats.completedStudents}
              </div>
              <div className="text-xs text-green-600 dark:text-green-400">
                {enhancedClassStats.completionRate}%
              </div>
            </div>
            
            <div className="bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Partial</span>
              </div>
              <div className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                {enhancedClassStats.partiallyCompletedStudents}
              </div>
              <div className="text-xs text-yellow-600 dark:text-yellow-400">
                {enhancedClassStats.partialCompletionRate}%
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-950/20 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Pending</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {enhancedClassStats.pendingStudents}
              </div>
            </div>
            
            <div className="bg-purple-50 dark:bg-purple-950/20 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-800 dark:text-purple-200">Average</span>
              </div>
              <div className="text-lg font-bold text-purple-900 dark:text-purple-100">
                {showScaledMarks && canShowScaledMarks ? enhancedClassStats.scaledAverageScore : enhancedClassStats.averageScore}
              </div>
              <div className="text-xs text-purple-600 dark:text-purple-400">
                /{displayMaxScore}
              </div>
            </div>
            
            <div className="bg-indigo-50 dark:bg-indigo-950/20 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-indigo-600" />
                <span className="text-sm font-medium text-indigo-800 dark:text-indigo-200">Range</span>
              </div>
              <div className="text-sm font-bold text-indigo-900 dark:text-indigo-100">
                {enhancedClassStats.lowestScore === Infinity ? "N/A" : enhancedClassStats.lowestScore} - {enhancedClassStats.highestScore}
              </div>
            </div>
          </div>

          {/* Overall Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-muted-foreground">
                {enhancedClassStats.completedStudents}/{enhancedClassStats.totalStudents} completed
              </span>
            </div>
            <Progress value={enhancedClassStats.completionRate} className="h-2" />
          </div>
        </CardHeader>
      </Card>

      {/* Enhanced Data Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Student Scores</CardTitle>
            <div className="flex items-center gap-2">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              
              {/* Copy from Student Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Copy className="h-4 w-4" />
                    Copy Scores
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Copy from student</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {filteredStudents.map(student => {
                    const status = getStudentCompletionStatus(student.id);
                    if (status.isEmpty) return null;
                    
                    return (
                      <DropdownMenuItem
                        key={student.id}
                        onClick={() => setSelectedStudentForCopy(student.id)}
                      >
                        <div className="flex items-center gap-2">
                          {status.isComplete ? (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          ) : (
                            <Clock className="h-3 w-3 text-yellow-500" />
                          )}
                          <span>{student.name}</span>
                        </div>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead>Student</TableHead>
                <TableHead className="text-center">Roll No.</TableHead>
                
                {hasSubCriteria ? (
                  <>
                    {sortedSubCriteria.map((subCriteria) => (
                      <TableHead key={subCriteria.id} className="text-center min-w-24">
                        <div className="space-y-1">
                          <div className="font-medium text-xs">{subCriteria.name}</div>
                          <Badge variant="outline" className="text-xs">
                            {subCriteria.maxScore}
                          </Badge>
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="text-center font-semibold bg-primary/10">
                      <div className="space-y-1">
                        <div>Total</div>
                        <Badge variant="default" className="text-xs">
                          {displayMaxScore}
                        </Badge>
                      </div>
                    </TableHead>
                  </>
                ) : (
                  <TableHead className="text-center">
                    <div className="space-y-1">
                      <div>Score</div>
                      <Badge variant="outline" className="text-xs">
                        {displayMaxScore}
                      </Badge>
                    </div>
                  </TableHead>
                )}
                
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredStudents.map((student, index) => {
                const status = getStudentCompletionStatus(student.id);
                const displayScore = calculateDisplayScore(student.id);
                
                return (
                  <TableRow key={student.id} className={`transition-colors ${
                    status.isComplete && status.isValid ? 'bg-green-50/50 dark:bg-green-950/20' : 
                    !status.isEmpty && !status.isComplete ? 'bg-yellow-50/50 dark:bg-yellow-950/20' : 
                    !status.isValid ? 'bg-red-50/50 dark:bg-red-950/20' : 
                    'hover:bg-muted/50'
                  }`}>
                    <TableCell className="text-center text-muted-foreground font-medium">
                      {index + 1}
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="font-medium">{student.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {student.admissionNumber}
                          </div>
                        </div>
                        
                        {/* Status Icon */}
                        {status.isComplete && status.isValid ? (
                          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        ) : !status.isEmpty && !status.isComplete ? (
                          <Clock className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                        ) : !status.isValid ? (
                          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                        ) : null}
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-xs">
                        {student.rollNumber || 'N/A'}
                      </Badge>
                    </TableCell>
                    
                    {hasSubCriteria ? (
                      <>
                        {sortedSubCriteria.map((subCriteria) => {
                          const subScore = subCriteriaScores[student.id]?.[subCriteria.id] || "";
                          const isValidSubScore = subScore.trim() !== "" && 
                            !isNaN(parseFloat(subScore)) && 
                            parseFloat(subScore) <= subCriteria.maxScore && 
                            parseFloat(subScore) >= 0;

                          return (
                            <TableCell key={subCriteria.id} className="text-center">
                              <Input
                                type="number"
                                min="0"
                                max={subCriteria.maxScore}
                                step="0.5"
                                value={subScore}
                                onChange={(e) => handleSubCriteriaScoreChange(student.id, subCriteria.id, e.target.value)}
                                placeholder="0"
                                className={`w-20 text-center font-medium mx-auto ${
                                  isValidSubScore ? 'border-green-500 bg-green-50 dark:bg-green-950' :
                                  subScore.trim() !== "" && !isValidSubScore ? 'border-red-500 bg-red-50 dark:bg-red-950' :
                                  ''
                                }`}
                              />
                            </TableCell>
                          );
                        })}
                        
                        <TableCell className="text-center bg-primary/5">
                          <div className="w-20 mx-auto p-2 border rounded bg-background">
                            <div className="font-semibold text-sm">
                              {showScaledMarks && canShowScaledMarks ? displayScore.toFixed(1) : calculateTotalScore(student.id) || "0"}
                            </div>
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          min="0"
                          max={maxScore}
                          step="0.5"
                          value={scores[student.id] || ""}
                          onChange={(e) => handleScoreChange(student.id, e.target.value)}
                          placeholder="0"
                          className={`w-24 text-center font-medium mx-auto ${
                            status.isValid && !status.isEmpty ? 'border-green-500 bg-green-50 dark:bg-green-950' :
                            !status.isValid && !status.isEmpty ? 'border-red-500 bg-red-50 dark:bg-red-950' :
                            ''
                          }`}
                        />
                      </TableCell>
                    )}
                    
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        {status.isComplete && status.isValid ? (
                          <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            Complete
                          </Badge>
                        ) : !status.isEmpty && !status.isComplete ? (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                            Partial
                          </Badge>
                        ) : !status.isValid ? (
                          <Badge variant="destructive">
                            Invalid
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            Pending
                          </Badge>
                        )}
                        
                        {hasSubCriteria && (
                          <div className="flex items-center gap-1">
                            <Progress value={status.progress || 0} className="w-8 h-2" />
                            <span className="text-xs text-muted-foreground">{status.progress || 0}%</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {selectedStudentForCopy && selectedStudentForCopy !== student.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              copyStudentScores(selectedStudentForCopy, student.id);
                              setSelectedStudentForCopy("");
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 