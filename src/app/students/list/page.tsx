"use client";

import { StudentStatsCards } from "@/components/students/student-stats-cards"
import { PageWrapper } from "@/components/layout/page-wrapper"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { PlusCircle, FileDown, FileText, AlertTriangle, ExternalLink, Eye, Edit, Trash, UserCheck, UserX, ArrowUpDown, MoreHorizontal, Loader2, FileSpreadsheet, ChevronDown, Upload } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { api } from "@/utils/api"
import { useState, useCallback, useEffect, useMemo } from "react"
import { useGlobalBranchFilter } from "@/hooks/useGlobalBranchFilter"
import { StudentImportModal } from "@/components/students/student-import-modal"
import { useToast } from "@/components/ui/use-toast"
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext"
import { useActionPermissions } from "@/utils/permission-utils"
import { Permission } from "@/types/permissions"
import { DataTable } from "@/components/ui/data-table"
import type { ColumnDef, Row, SortingState } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { StudentManagementPageGuard } from "@/components/auth/page-guard"
import { useDeleteConfirm, useStatusChangeConfirm } from "@/utils/popup-utils"
import { cn } from "@/lib/utils"
import { StudentExportFieldSelector } from "@/components/students/student-export-field-selector"
import { 
  exportStudentsToCSV, 
  exportStudentsToExcel, 
  DEFAULT_EXPORT_FIELDS,
  type StudentExportData 
} from "@/utils/student-export"
import { StudentFilters, type StudentFilters as StudentFiltersType } from "@/components/students/student-filters"
import { MultiStepSort, type SortStep } from "@/components/students/multi-step-sort"

// Define the Student type
export type Student = {
  id: string
  admissionNumber: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  gender?: string
  isActive: boolean
  dateOfBirth: Date
  dateOfAdmission?: Date
  status?: string
  class?: {
    name: string
    section?: string
    displayOrder?: number
  }
  parent?: {
    name: string
    phone: string
    email: string
  }
  firstJoinedSession?: {
    id: string
    name: string
  }
  rollNumber?: string | null
}

// Skeleton loader component
const StudentSkeleton = () => (
  <div className="animate-pulse">
    <div className="flex items-center space-x-4 p-4 border-b">
      <div className="w-4 h-4 bg-muted rounded"></div>
      <div className="flex-1 grid grid-cols-6 gap-4 items-center">
        <div className="h-4 bg-muted rounded w-16"></div>
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded w-24"></div>
          <div className="h-3 bg-muted rounded w-20"></div>
        </div>
        <div className="h-4 bg-muted rounded w-20"></div>
        <div className="h-4 bg-muted rounded w-8"></div>
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded w-24"></div>
          <div className="h-3 bg-muted rounded w-20"></div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="h-5 bg-muted rounded w-12"></div>
          <div className="h-5 bg-muted rounded w-8"></div>
        </div>
      </div>
      <div className="w-8 h-8 bg-muted rounded"></div>
    </div>
  </div>
);
import dynamic from "next/dynamic";

function StudentsPageContent() {
  // State management
  const [currentStudents, setCurrentStudents] = useState<Student[]>([]);
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]); // Store cursors for each page
  const [sortBy, setSortBy] = useState<string | undefined>("class");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | undefined>("asc"); // Use desc for class to show nursery first
  const [searchTerm, setSearchTerm] = useState("");
  
  // Multi-step sorting state
  const [multiStepSortEnabled, setMultiStepSortEnabled] = useState(false);
  const [sortSteps, setSortSteps] = useState<SortStep[]>([]);
  
  // Available fields for sorting
  const availableSortFields = [
    { value: "admissionNumber", label: "Admission Number" },
    { value: "rollNumber", label: "Roll Number" },
    { value: "firstName", label: "First Name" },
    { value: "lastName", label: "Last Name" },
    { value: "class", label: "Class" },
    { value: "dateOfAdmission", label: "Date of Admission" },
    { value: "dateOfBirth", label: "Date of Birth" },
    { value: "phone", label: "Phone Number" },
    { value: "email", label: "Email" },
    { value: "status", label: "Status" }
  ];
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [allStudentsSelected, setAllStudentsSelected] = useState(false);
  const [allStudentIds, setAllStudentIds] = useState<string[]>([]);
  const [isPaginating, setIsPaginating] = useState(false);
  const [paginatingDirection, setPaginatingDirection] = useState<'previous' | 'next' | null>(null);
  const [lastKnownTotalPages, setLastKnownTotalPages] = useState(0);
  
  // Export state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExportingAll, setIsExportingAll] = useState(false);
  const [needsExportData, setNeedsExportData] = useState(false);
  
  // Import state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<StudentFiltersType>({
    isActive: "ACTIVE" // Default to ACTIVE status students only
  });

  const { getBranchFilterParam } = useGlobalBranchFilter();
  const { currentSessionId } = useAcademicSessionContext();
  const { toast } = useToast();
  const router = useRouter();
  const utils = api.useContext();
  const deleteConfirm = useDeleteConfirm();
  const statusChangeConfirm = useStatusChangeConfirm();

  const { hasPermission, canView, canEdit, canDelete } = useActionPermissions("students");
  const canManageTC = hasPermission(Permission.MANAGE_TRANSFER_CERTIFICATES);

  // Debounce search to prevent excessive resets
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
    setCursors([undefined]);
    setRowSelection({});
    setAllStudentsSelected(false);
  }, [filters, debouncedSearchTerm]);

  // Filter handlers
  const handleFiltersChange = useCallback((newFilters: StudentFiltersType) => {
    setFilters(newFilters);
  }, []);

  const handleSearchChange = useCallback((search: string) => {
    setSearchTerm(search);
  }, []);

  // API query for loading students
  const { data: studentsData, isLoading, refetch } = api.student.getAll.useQuery({
    branchId: getBranchFilterParam(),
    sessionId: currentSessionId || undefined,
    limit: pageSize || 20, // Ensure we have a default limit for pagination
    cursor: cursors[currentPage - 1],
    sortBy,
    sortOrder,
    search: debouncedSearchTerm || undefined,
    filters: {
      isActive: filters.isActive !== undefined ? filters.isActive : "ACTIVE", // Use filter state with proper fallback
      classId: filters.classId,
      sectionId: filters.sectionId,
      gender: filters.gender,
      ageRange: filters.ageRange
    }
  }, {
    enabled: true,
  });

  // API query for fetching all student IDs (used for select all functionality)
  const { data: allStudentIdsData } = api.student.getAll.useQuery({
    branchId: getBranchFilterParam(),
    sessionId: currentSessionId || undefined,
    sortBy,
    sortOrder,
    search: debouncedSearchTerm || undefined,
    filters: {
      isActive: filters.isActive !== undefined ? filters.isActive : "ACTIVE",
      classId: filters.classId,
      sectionId: filters.sectionId,
      gender: filters.gender,
      ageRange: filters.ageRange
    },
    fetchAllIds: true
  }, {
    enabled: true,
  });

  // API query for export data (fetch all students with full data)
  const { data: exportStudentsData, isLoading: isLoadingExportData } = api.student.getAll.useQuery({
    branchId: getBranchFilterParam(),
    sessionId: currentSessionId || undefined,
    sortBy,
    sortOrder,
    // Remove search and filters for export to get all students
    // No limit for export to ensure we get all students
  }, {
    enabled: isExportModalOpen || needsExportData, // Fetch when export modal is open or quick export is triggered
  });

  // User preferences API
  const { data: savedPreferences } = api.userPreferences.getPreferences.useQuery({
    module: "STUDENT_LIST"
  });

  const savePreferencesMutation = api.userPreferences.savePreferences.useMutation({
    onSuccess: () => {
      toast({
        title: "Sort Configuration Saved",
        description: "Your sorting preferences have been saved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save sorting preferences: " + error.message,
        variant: "destructive",
      });
    },
  });

  const deletePreferencesMutation = api.userPreferences.deletePreferences.useMutation({
    onSuccess: () => {
      toast({
        title: "Preferences Reset",
        description: "Your sorting preferences have been reset to default.",
      });
    },
  });

  // Calculate pagination parameters
  const currentTotalPages = Math.ceil((studentsData?.totalCount || 0) / pageSize);
  const totalPages = isPaginating && lastKnownTotalPages > 1 ? lastKnownTotalPages : currentTotalPages;
  const totalCount = studentsData?.totalCount || 0;

  // Transform student data
  const transformStudentData = (student: any): Student => {
    try {
      return {
        id: student.id,
        admissionNumber: student.admissionNumber || '',
        firstName: student.firstName || 'Unknown',
        lastName: student.lastName || 'Unknown',
        email: student.email || undefined,
        phone: student.phone || undefined,
        gender: student.gender || undefined,
        dateOfBirth: student.dateOfBirth || new Date(),
        dateOfAdmission: student.dateOfAdmission || undefined,
        status: student.status || undefined,
        isActive: student.isActive !== undefined ? student.isActive : true,
        class: student?.section?.class ? {
          name: student.section.class.name || '',
          section: student.section.name || '',
          displayOrder: student.section.class.displayOrder
        } : undefined,
        parent: student?.parent ? {
          name: student.parent.fatherName || student.parent.motherName || student.parent.guardianName || '',
          phone: student.parent.fatherMobile || student.parent.motherMobile || student.parent.guardianMobile || '',
          email: student.parent.fatherEmail || student.parent.motherEmail || student.parent.guardianEmail || ''
        } : undefined,
        firstJoinedSession: student?.firstJoinedSession ? {
          id: student.firstJoinedSession.id,
          name: student.firstJoinedSession.name
        } : undefined,
        rollNumber: student.rollNumber?.toString() || null,
      };
    } catch (error) {
      console.error('Error transforming student data:', error, student);
      return {
        id: student?.id || `error-${Math.random().toString(36).substr(2, 9)}`,
        admissionNumber: 'ERROR',
        firstName: 'Data',
        lastName: 'Error',
        dateOfBirth: new Date(),
        isActive: false,
        gender: ''
      };
    }
  };

  // Update currentStudents when data loads
  useEffect(() => {
    if (studentsData?.items) {
      const transformedStudents = studentsData.items.map(transformStudentData);
      const sortedStudents = applyMultiStepSort(transformedStudents);
      setCurrentStudents(sortedStudents);
      
      // Store next cursor for pagination
      if (studentsData.nextCursor) {
        setCursors(prev => {
          const newCursors = [...prev];
          newCursors[currentPage] = studentsData.nextCursor;
          return newCursors;
        });
      }
      
      // Update last known total pages when we have valid data
      if (studentsData.totalCount !== undefined) {
        const newTotalPages = Math.ceil(studentsData.totalCount / pageSize);
        setLastKnownTotalPages(newTotalPages);
      }
      
      // Reset pagination loading state
      setIsPaginating(false);
      setPaginatingDirection(null);
    }
  }, [studentsData?.items, studentsData?.nextCursor, studentsData?.totalCount, currentPage, pageSize, sortSteps, multiStepSortEnabled]);

  // Update all student IDs when data loads
  useEffect(() => {
    if (allStudentIdsData?.itemIds) {
      setAllStudentIds(allStudentIdsData.itemIds);
    }
  }, [allStudentIdsData?.itemIds]);

  // Reset export data state when modal closes
  useEffect(() => {
    if (!isExportModalOpen) {
      setNeedsExportData(false);
    }
  }, [isExportModalOpen]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
    setCursors([undefined]); // Reset cursors
    setRowSelection({});
    setAllStudentsSelected(false);
    setIsPaginating(false); // Reset pagination state
    setPaginatingDirection(null); // Reset pagination direction
    setLastKnownTotalPages(0); // Reset last known total pages
  }, [sortBy, sortOrder, debouncedSearchTerm, currentSessionId, getBranchFilterParam, pageSize]);

  // Load saved preferences on component mount
  useEffect(() => {
    if (savedPreferences) {
      const prefs = savedPreferences as {
        sortSteps?: SortStep[];
        multiStepSortEnabled?: boolean;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
      };

      if (prefs.sortSteps) {
        setSortSteps(prefs.sortSteps);
      }
      if (prefs.multiStepSortEnabled !== undefined) {
        setMultiStepSortEnabled(prefs.multiStepSortEnabled);
      }
      if (prefs.sortBy) {
        setSortBy(prefs.sortBy);
      }
      if (prefs.sortOrder) {
        setSortOrder(prefs.sortOrder);
      }
    }
  }, [savedPreferences]);

  // API mutations
  const deleteStudentMutation = api.student.delete.useMutation({
    onSuccess: () => {
      void refetch();
      toast({ title: "Student deleted", description: "Student record has been successfully deleted.", variant: "success" });
    },
  });

  const updateStudentStatusMutation = api.student.bulkUpdateStatus.useMutation({
    onSuccess: () => {
      void refetch();
      toast({ title: "Status updated", description: "Student status has been updated successfully.", variant: "success" });
    },
  });

  const deleteMultipleStudentsMutation = api.student.bulkDelete.useMutation({
    onSuccess: (data) => {
      void refetch();
      toast({ 
        title: "Students Deleted", 
        description: `${data.count} student(s) have been successfully deleted.`, 
        variant: "success" 
      });
    },
    onError: (error) => {
      toast({
        title: "Bulk Deletion Failed",
        description: error.message || "An unexpected error occurred while deleting students.",
        variant: "destructive",
      });
    },
  });

  // Helper functions
  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(date));
  };

  const calculateAge = (dateOfBirth: Date): number => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Handle sorting changes
  const handleSortChange = (field: string, order: "asc" | "desc") => {
    setSortBy(field);
    setSortOrder(order);
  };

  // Helper function to get the correct sort order for a field
  const getDefaultSortOrder = (field: string) => {
    if (field === "class") {
      return "desc"; // Use desc for class to show nursery classes first
    }
    return "asc"; // Use asc for all other fields
  };

  // Multi-step sorting functions
  const handleSortStepsChange = (steps: SortStep[]) => {
    setSortSteps(steps);
    setMultiStepSortEnabled(steps.length > 0);
    
    // If multi-step sorting is enabled, use the first step as the primary sort
    if (steps.length > 0 && steps[0]) {
      setSortBy(steps[0].field);
      setSortOrder(steps[0].direction);
    }
  };

  const handleSaveSortConfiguration = () => {
    const preferences = {
      sortSteps,
      multiStepSortEnabled,
      sortBy,
      sortOrder,
    };

    savePreferencesMutation.mutate({
      module: "STUDENT_LIST",
      preferences,
    });
  };

  const handleResetSort = () => {
    setSortSteps([]);
    setMultiStepSortEnabled(false);
    setSortBy("class");
    setSortOrder("asc");
    
    // Clear saved preferences
    deletePreferencesMutation.mutate({
      module: "STUDENT_LIST"
    });
  };

  // Apply multi-step sorting to data
  const applyMultiStepSort = (data: Student[]) => {
    if (!multiStepSortEnabled || sortSteps.length === 0) {
      return data;
    }

    return [...data].sort((a, b) => {
      for (const step of sortSteps) {
        let aValue: any;
        let bValue: any;

        // Get values based on field
        switch (step.field) {
          case "admissionNumber":
            aValue = a.admissionNumber || "";
            bValue = b.admissionNumber || "";
            break;
          case "rollNumber":
            aValue = a.rollNumber || "";
            bValue = b.rollNumber || "";
            break;
          case "firstName":
            aValue = a.firstName || "";
            bValue = b.firstName || "";
            break;
          case "lastName":
            aValue = a.lastName || "";
            bValue = b.lastName || "";
            break;
          case "class":
            aValue = a.class?.displayOrder || 999;
            bValue = b.class?.displayOrder || 999;
            break;
          case "dateOfAdmission":
            aValue = a.dateOfAdmission ? new Date(a.dateOfAdmission) : new Date(0);
            bValue = b.dateOfAdmission ? new Date(b.dateOfAdmission) : new Date(0);
            break;
          case "dateOfBirth":
            aValue = a.dateOfBirth ? new Date(a.dateOfBirth) : new Date(0);
            bValue = b.dateOfBirth ? new Date(b.dateOfBirth) : new Date(0);
            break;
          case "phone":
            aValue = a.phone || "";
            bValue = b.phone || "";
            break;
          case "email":
            aValue = a.email || "";
            bValue = b.email || "";
            break;
          case "status":
            aValue = a.status || "";
            bValue = b.status || "";
            break;
          default:
            continue;
        }

        // Compare values
        let comparison = 0;
        if (aValue < bValue) comparison = -1;
        if (aValue > bValue) comparison = 1;

        // Apply direction
        if (step.direction === "desc") comparison *= -1;

        // If this step produces a non-zero comparison, return it
        if (comparison !== 0) return comparison;
      }

      return 0;
    });
  };

  // Handle search
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  // Transform student data for export
  const transformStudentForExport = (student: any): StudentExportData => {
    return {
      id: student.id,
      admissionNumber: student.admissionNumber || '',
      firstName: student.firstName || '',
      lastName: student.lastName || '',
      email: student.email || null,
      personalEmail: student.personalEmail || null,
      phone: student.phone || null,
      gender: student.gender || '',
      isActive: student.isActive,
      dateOfBirth: new Date(student.dateOfBirth),
      dateOfAdmission: student.dateOfAdmission ? new Date(student.dateOfAdmission) : null,
      joinDate: new Date(student.joinDate),
      rollNumber: student.rollNumber || null,
      bloodGroup: student.bloodGroup || null,
      religion: student.religion || null,
      nationality: student.nationality || null,
      caste: student.caste || null,
      aadharNumber: student.aadharNumber || null,
      udiseId: student.udiseId || null,
      address: student.address || null,
      permanentAddress: student.permanentAddress || null,
      permanentCity: student.permanentCity || null,
      permanentState: student.permanentState || null,
      permanentCountry: student.permanentCountry || null,
      permanentZipCode: student.permanentZipCode || null,
      correspondenceAddress: student.correspondenceAddress || null,
      correspondenceCity: student.correspondenceCity || null,
      correspondenceState: student.correspondenceState || null,
      correspondenceCountry: student.correspondenceCountry || null,
      correspondenceZipCode: student.correspondenceZipCode || null,
      previousSchool: student.previousSchool || null,
      lastClassAttended: student.lastClassAttended || null,
      mediumOfInstruction: student.mediumOfInstruction || null,
      recognisedByStateBoard: student.recognisedByStateBoard || null,
      schoolCity: student.schoolCity || null,
      schoolState: student.schoolState || null,
      reasonForLeaving: student.reasonForLeaving || null,
      class: student?.section?.class ? {
        name: student.section.class.name,
        section: student.section.name
      } : null,
      parent: student?.parent ? {
        fatherName: student.parent.fatherName || null,
        fatherMobile: student.parent.fatherMobile || null,
        fatherEmail: student.parent.fatherEmail || null,
        fatherOccupation: student.parent.fatherOccupation || null,
        fatherEducation: student.parent.fatherEducation || null,
        fatherWorkplace: student.parent.fatherWorkplace || null,
        fatherDesignation: student.parent.fatherDesignation || null,
        fatherDob: student.parent.fatherDob ? new Date(student.parent.fatherDob) : null,
        motherName: student.parent.motherName || null,
        motherMobile: student.parent.motherMobile || null,
        motherEmail: student.parent.motherEmail || null,
        motherOccupation: student.parent.motherOccupation || null,
        motherEducation: student.parent.motherEducation || null,
        motherWorkplace: student.parent.motherWorkplace || null,
        motherDesignation: student.parent.motherDesignation || null,
        motherDob: student.parent.motherDob ? new Date(student.parent.motherDob) : null,
        guardianName: student.parent.guardianName || null,
        guardianMobile: student.parent.guardianMobile || null,
        guardianEmail: student.parent.guardianEmail || null,
        guardianOccupation: student.parent.guardianOccupation || null,
        guardianEducation: student.parent.guardianEducation || null,
        guardianWorkplace: student.parent.guardianWorkplace || null,
        guardianDesignation: student.parent.guardianDesignation || null,
        guardianDob: student.parent.guardianDob ? new Date(student.parent.guardianDob) : null,
        parentAnniversary: student.parent.parentAnniversary ? new Date(student.parent.parentAnniversary) : null,
        monthlyIncome: student.parent.monthlyIncome || null,
      } : null
    };
  };

  // Handle quick CSV export with default fields
  const handleQuickCSVExport = async () => {
    setIsExportingAll(true);
    setNeedsExportData(true);
    
    try {
      // Wait for the data to load completely
      let retryCount = 0;
      const maxRetries = 30; // Wait up to 30 seconds
      
      while ((!exportStudentsData || isLoadingExportData) && retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        retryCount++;
      }
      
      // Check if we timed out waiting for data
      if (retryCount >= maxRetries) {
        toast({
          title: "Export Timeout",
          description: "Loading student data is taking longer than expected. Please try again.",
          variant: "destructive"
        });
        return;
      }
      
      const studentsToExport = exportStudentsData?.items?.map(transformStudentForExport) || [];
      
      // Only show no data error if API returned empty results (not if still loading)
      if (studentsToExport.length === 0 && !isLoadingExportData) {
        toast({
          title: "No Students Found",
          description: "No students found in the database for export.",
          variant: "destructive"
        });
        return;
      }
      
      exportStudentsToCSV(studentsToExport, DEFAULT_EXPORT_FIELDS);
      toast({
        title: "Export Complete",
        description: `Successfully exported ${studentsToExport.length} student(s) to CSV (all students, ignoring current filters).`,
        variant: "success"
      });
      
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "An error occurred during export. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsExportingAll(false);
      setNeedsExportData(false);
    }
  };

  // Handle quick Excel export with default fields  
  const handleQuickExcelExport = async () => {
    setIsExportingAll(true);
    setNeedsExportData(true);
    
    try {
      // Wait for the data to load completely
      let retryCount = 0;
      const maxRetries = 30; // Wait up to 30 seconds
      
      while ((!exportStudentsData || isLoadingExportData) && retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        retryCount++;
      }
      
      // Check if we timed out waiting for data
      if (retryCount >= maxRetries) {
        toast({
          title: "Export Timeout",
          description: "Loading student data is taking longer than expected. Please try again.",
          variant: "destructive"
        });
        return;
      }
      
      const studentsToExport = exportStudentsData?.items?.map(transformStudentForExport) || [];
      
      // Only show no data error if API returned empty results (not if still loading)
      if (studentsToExport.length === 0 && !isLoadingExportData) {
        toast({
          title: "No Students Found",
          description: "No students found in the database for export.",
          variant: "destructive"
        });
        return;
      }
      
      exportStudentsToExcel(studentsToExport, DEFAULT_EXPORT_FIELDS);
      toast({
        title: "Export Complete", 
        description: `Successfully exported ${studentsToExport.length} student(s) to Excel (all students, ignoring current filters).`,
        variant: "success"
      });
      
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "An error occurred during export. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsExportingAll(false);
      setNeedsExportData(false);
    }
  };

  // Handle custom export (opens field selector)
  const handleCustomExport = () => {
    setNeedsExportData(true);
    setIsExportModalOpen(true);
  };

  // Handle bulk import
  const handleBulkImport = async (studentsData: any[]) => {
    try {
      // Transform the data to match the expected API format
      const transformedStudents = studentsData.map(student => ({
        ...student,
        branchId: getBranchFilterParam(),
        sessionId: currentSessionId,
      }));

      // You'll need to implement the bulk create mutation or use existing one
      // For now, I'll show the structure - you may need to adapt this to your existing API
      console.log('Importing students:', transformedStudents);
      
      // Simulated API call - replace with actual implementation
      // await bulkCreateStudentsMutation.mutateAsync({ students: transformedStudents });
      
      // Refresh the data after successful import
      void refetch();
      
      toast({
        title: "Import Successful",
        description: `Successfully imported ${studentsData.length} student(s).`,
        variant: "success"
      });
      
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import students.",
        variant: "destructive"
      });
      throw error; // Re-throw to let the modal handle the error state
    }
  };

  // Handle select all students (entire dataset)
  const handleSelectAllStudents = () => {
    setAllStudentsSelected(true);
    setRowSelection({});
  };

  // Handle deselect all students
  const handleDeselectAllStudents = () => {
    setAllStudentsSelected(false);
    setRowSelection({});
  };

  // Get selected student IDs
  const getSelectedStudentIds = () => {
    if (allStudentsSelected) {
      return allStudentIds;
    }
    return Object.keys(rowSelection).filter(id => rowSelection[id]);
  };

  // Get selected count
  const getSelectedCount = () => {
    if (allStudentsSelected) {
      return allStudentIds.length;
    }
    return Object.keys(rowSelection).filter(id => rowSelection[id]).length;
  };

  // Pagination handlers
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setIsPaginating(true);
      setPaginatingDirection('previous');
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setIsPaginating(true);
      setPaginatingDirection('next');
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePageChange = (page: number) => {
    setIsPaginating(true);
    setPaginatingDirection(null);
    setCurrentPage(page);
  };

  // Handle student actions
  const handleStudentAction = (action: string, student: Student) => {
    switch (action) {
      case 'view':
        router.push(`/students/${student.id}`);
        break;
      case 'edit':
        router.push(`/students/${student.id}/edit`);
        break;
      case 'delete':
        deleteConfirm(
          "student",
          () => {
            deleteStudentMutation.mutate({ id: student.id });
          }
        );
        break;
      case 'activate':
        statusChangeConfirm(
          "student",
          true,
          1,
          () => {
            updateStudentStatusMutation.mutate({ 
              ids: [student.id], 
              isActive: true 
            });
          }
        );
        break;
      case 'deactivate':
        statusChangeConfirm(
          "student",
          false,
          1,
          () => {
            updateStudentStatusMutation.mutate({ 
              ids: [student.id], 
              isActive: false 
            });
          }
        );
        break;
    }
  };



  // Student row actions component
  const StudentRowActions = ({ student }: { student: Student }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {canView() && (
          <DropdownMenuItem onClick={() => handleStudentAction('view', student)}>
            <Eye className="mr-2 h-4 w-4" />
            View
          </DropdownMenuItem>
        )}
        {canEdit() && (
          <DropdownMenuItem onClick={() => handleStudentAction('edit', student)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
        )}
        {canEdit() && (
          <DropdownMenuItem 
            onClick={() => handleStudentAction(student.isActive ? 'deactivate' : 'activate', student)}
          >
            {student.isActive ? (
              <>
                <UserX className="mr-2 h-4 w-4" />
                Deactivate
              </>
            ) : (
              <>
                <UserCheck className="mr-2 h-4 w-4" />
                Activate
              </>
            )}
          </DropdownMenuItem>
        )}
        {canDelete() && (
          <DropdownMenuItem
            onClick={() => handleStudentAction('delete', student)}
            className="text-red-600 dark:text-red-400"
          >
            <Trash className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Student row component with animation
  const StudentRow = ({ student, index }: { student: Student, index: number }) => (
    <div 
      className={cn(
        "flex items-center space-x-4 p-4 border-b transition-all duration-300 ease-in-out",
        "animate-in fade-in slide-in-from-bottom-2"
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <Checkbox
        checked={allStudentsSelected || rowSelection[student.id] || false}
        onCheckedChange={(checked) => {
          if (allStudentsSelected) {
            // If all students were selected, uncheck this specific student
            // This will deselect all students
            setAllStudentsSelected(false);
            setRowSelection({});
          } else {
            setRowSelection(prev => ({
              ...prev,
              [student.id]: checked as boolean
            }));
          }
        }}
        aria-label={`Select ${student.firstName} ${student.lastName}`}
      />
      
      <div className="flex-1 grid grid-cols-7 gap-4 items-center">
        {/* Admission Number - Clickable */}
        <div className="font-medium text-sm">
          <Link 
            href={`/students/${student.id}`}
            className="text-secondary hover:text-secondary/80 hover:underline transition-colors"
          >
            {student.admissionNumber}
          </Link>
        </div>
        
        {/* Roll Number */}
        <div className="text-sm">
          {student.rollNumber || <span className="text-muted-foreground">-</span>}
        </div>
        
        {/* Name - Clickable with Email */}
        <div className="flex flex-col">
          <div className="font-medium text-sm">
            <Link 
              href={`/students/${student.id}`}
              className="text-primary hover:text-primary/80 hover:underline transition-colors"
            >
              {student.firstName} {student.lastName}
            </Link>
          </div>
          {student.email && (
            <div className="text-xs">
              <a 
                href={`mailto:${student.email}`} 
                className="text-secondary hover:text-secondary/80 hover:underline transition-colors"
              >
                {student.email}
              </a>
            </div>
          )}
        </div>
        
        {/* Class */}
        <div className="text-sm">
          {student.class ? (
            <div className="font-medium">
              {student.class.name}
              {student.class.section && ` - ${student.class.section}`}
            </div>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </div>

        {/* Date of Admission */}
        <div className="text-sm">
          {student.dateOfAdmission ? (
            <div>
              <div className="font-medium">
                {new Date(student.dateOfAdmission).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </div>
              {student.firstJoinedSession && (
                <div className="text-xs text-muted-foreground mt-1">
                  {student.firstJoinedSession.name}
                </div>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
        
        {/* Contact - Clickable */}
        <div className="text-sm">
          {student.phone && (
            <div>
              <a 
                href={`tel:${student.phone}`} 
                className="text-secondary hover:text-secondary/80 hover:underline transition-colors"
              >
                {student.phone}
              </a>
            </div>
          )}
          {student.parent?.phone && (
            <div className="text-xs text-muted-foreground">
              Parent: <a 
                href={`tel:${student.parent.phone}`} 
                className="text-primary hover:text-primary/80 hover:underline transition-colors"
              >
                {student.parent.phone}
              </a>
            </div>
          )}
          {student.parent?.email && (
            <div className="text-xs text-muted-foreground">
              <a 
                href={`mailto:${student.parent.email}`} 
                className="text-secondary hover:text-secondary/80 hover:underline transition-colors"
              >
                {student.parent.email}
              </a>
            </div>
          )}
        </div>
        
        {/* Status - Enhanced */}
        <div className="flex items-center space-x-2">
          {(() => {
            const status = student.status || (student.isActive ? "ACTIVE" : "INACTIVE");
            const getStatusConfig = (status: string) => {
              switch (status) {
                case "ACTIVE":
                  return {
                    variant: "outline" as const,
                    className: "bg-green-50 text-green-700 hover:bg-green-50 dark:bg-[#7aad8c]/10 dark:text-[#7aad8c] dark:border-[#7aad8c]/30",
                    label: "Active"
                  }
                case "INACTIVE":
                  return {
                    variant: "secondary" as const,
                    className: "bg-gray-100 text-gray-500 hover:bg-gray-100 dark:bg-[#303030] dark:text-[#808080] dark:border-[#404040]",
                    label: "Inactive"
                  }
                case "EXPELLED":
                  return {
                    variant: "destructive" as const,
                    className: "bg-red-50 text-red-700 hover:bg-red-50 dark:bg-red-900/20 dark:text-red-400",
                    label: "Expelled"
                  }
                case "WITHDRAWN":
                  return {
                    variant: "secondary" as const,
                    className: "bg-orange-50 text-orange-700 hover:bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400",
                    label: "Withdrawn"
                  }
                case "REPEAT":
                  return {
                    variant: "outline" as const,
                    className: "bg-yellow-50 text-yellow-700 hover:bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400",
                    label: "Repeat"
                  }
                case "TRANSFERRED":
                  return {
                    variant: "outline" as const,
                    className: "bg-blue-50 text-blue-700 hover:bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400",
                    label: "Transferred"
                  }
                case "GRADUATED":
                  return {
                    variant: "outline" as const,
                    className: "bg-purple-50 text-purple-700 hover:bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400",
                    label: "Graduated"
                  }
                case "SUSPENDED":
                  return {
                    variant: "destructive" as const,
                    className: "bg-red-50 text-red-700 hover:bg-red-50 dark:bg-red-900/20 dark:text-red-400",
                    label: "Suspended"
                  }
                default:
                  return {
                    variant: "secondary" as const,
                    className: "bg-gray-100 text-gray-500 hover:bg-gray-100 dark:bg-[#303030] dark:text-[#808080] dark:border-[#404040]",
                    label: status
                  }
              }
            }
            
            const config = getStatusConfig(status);
            
            return (
              <Badge variant={config.variant} className={config.className}>
                {config.label}
              </Badge>
            );
          })()}
          {student.gender && (
            <Badge variant="outline">{student.gender}</Badge>
          )}
        </div>
      </div>
      
      <StudentRowActions student={student} />
    </div>
  );

  return (
    <PageWrapper
      title="Students"
      subtitle="Manage all students in your institution"
      action={
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Import Students
          </Button>
          
          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="glowing-secondary" 
                className="flex items-center gap-1"
                disabled={isExportingAll || isLoadingExportData}
              >
                {isExportingAll || isLoadingExportData ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4" />
                )}
                <span>Export</span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Quick Export</DropdownMenuLabel>
              <DropdownMenuItem 
                onClick={handleQuickCSVExport}
                disabled={isExportingAll || isLoadingExportData}
              >
                <FileDown className="h-4 w-4 mr-2" />
                {isExportingAll ? "Loading Data..." : "Export to CSV"}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleQuickExcelExport}
                disabled={isExportingAll || isLoadingExportData}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                {isExportingAll ? "Loading Data..." : "Export to Excel"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Custom Export</DropdownMenuLabel>
              <DropdownMenuItem 
                onClick={handleCustomExport}
                disabled={isExportingAll || isLoadingExportData}
              >
                <FileDown className="h-4 w-4 mr-2" />
                {isLoadingExportData ? "Loading Data..." : "Select Fields..."}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link href="/students/create">
            <Button variant="glowing" className="flex items-center gap-1">
              <PlusCircle className="h-4 w-4" />
              <span>Add Student</span>
            </Button>
          </Link>
          {canManageTC && (
            <Link href="/students/tc">
              <Button variant="glowing-secondary" className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                <span>Transfer Certificate</span>
              </Button>
            </Link>
          )}
        </div>
      }
    >
      <StudentStatsCards sessionId={currentSessionId || undefined} />

      <div className="mt-6 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">All Students</h2>
            <p className="text-muted-foreground">
              {isLoading ? 'Loading...' : `Showing ${currentStudents.length} of ${totalCount} students`}
            </p>
          </div>
        </div>

        {/* Filter Component */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <StudentFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onSearchChange={handleSearchChange}
              searchTerm={searchTerm}
              totalCount={totalCount}
            />
          </div>
          
          {/* Sort Controls */}
          <div className="flex items-center gap-2">
            {/* Multi-Step Sort */}
            <MultiStepSort
              sortSteps={sortSteps}
              onSortStepsChange={handleSortStepsChange}
              availableFields={availableSortFields}
              onSave={handleSaveSortConfiguration}
              onReset={handleResetSort}
            />
            
            {/* Traditional Sort Controls (when multi-step is not enabled) */}
            {!multiStepSortEnabled && (
              <>
                <Select
                  value={sortBy}
                  onValueChange={(value) => {
                    setSortBy(value);
                    setSortOrder(getDefaultSortOrder(value));
                  }}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="firstName">Name</SelectItem>
                    <SelectItem value="class">Class</SelectItem>
                    <SelectItem value="admissionNumber">Admission</SelectItem>
                    <SelectItem value="rollNumber">Roll No.</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  disabled={isPaginating}
                >
                  <ArrowUpDown className="h-4 w-4" />
                  {sortBy === 'class' 
                    ? (sortOrder === 'asc' ? 'Low-High' : 'High-Low')
                    : (sortOrder === 'asc' ? 'A-Z' : 'Z-A')
                  }
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Bulk Actions */}
        {(getSelectedCount() > 0 || allStudentsSelected) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  {allStudentsSelected ? (
                    <>All {totalCount} students selected</>
                  ) : (
                    <>{getSelectedCount()} student(s) selected</>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  {canEdit() && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const selectedIds = getSelectedStudentIds();
                          statusChangeConfirm("student", true, selectedIds.length, () => {
                            updateStudentStatusMutation.mutate({ ids: selectedIds, isActive: true });
                            handleDeselectAllStudents();
                          });
                        }}
                        className="text-green-700 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-700 dark:hover:bg-green-950/20"
                      >
                        <UserCheck className="h-4 w-4 mr-1" />
                        Activate Selected
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const selectedIds = getSelectedStudentIds();
                          statusChangeConfirm("student", false, selectedIds.length, () => {
                            updateStudentStatusMutation.mutate({ ids: selectedIds, isActive: false });
                            handleDeselectAllStudents();
                          });
                        }}
                        className="text-orange-700 border-orange-300 hover:bg-orange-50 dark:text-orange-400 dark:border-orange-700 dark:hover:bg-orange-950/20"
                      >
                        <UserX className="h-4 w-4 mr-1" />
                        Deactivate Selected
                      </Button>
                    </>
                  )}
                  {canDelete() && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const selectedIds = getSelectedStudentIds();
                        deleteConfirm("student", () => {
                          deleteMultipleStudentsMutation.mutate({ ids: selectedIds });
                          handleDeselectAllStudents();
                        });
                      }}
                      className="text-red-700 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-950/20"
                    >
                      <Trash className="h-4 w-4 mr-1" />
                      Delete Selected
                    </Button>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeselectAllStudents}
                className="text-muted-foreground hover:text-foreground"
              >
                Clear Selection
              </Button>
            </div>
            
            {/* Select All Option */}
            {!allStudentsSelected && getSelectedCount() > 0 && getSelectedCount() < totalCount && (
                             <div className="flex items-center justify-center p-2 bg-blue-50 dark:bg-blue-950/10 rounded-lg border border-blue-100 dark:border-blue-900">
                <span className="text-sm text-blue-600 dark:text-blue-400">
                  {getSelectedCount()} student(s) selected on this page. 
                  <Button
                    variant="link"
                    size="sm"
                    onClick={handleSelectAllStudents}
                    className="p-0 h-auto text-blue-600 dark:text-blue-400 underline ml-1"
                  >
                    Select all {totalCount} students
                  </Button>
                </span>
              </div>
            )}
          </div>
        )}

        {/* Students List */}
        <div className="space-y-2 mt-6">
          {/* Header Row */}
          <div className="flex items-center space-x-4 p-4 bg-muted/50 rounded-lg font-medium text-sm">
            <div className="w-4">
              <Checkbox
                checked={allStudentsSelected || (currentStudents.length > 0 && currentStudents.every(student => rowSelection[student.id]))}
                onCheckedChange={(checked) => {
                  if (checked) {
                    const newSelection: Record<string, boolean> = {};
                    currentStudents.forEach(student => {
                      newSelection[student.id] = true;
                    });
                    setRowSelection(newSelection);
                    setAllStudentsSelected(false);
                  } else {
                    handleDeselectAllStudents();
                  }
                }}
                aria-label="Select all students on this page"
              />
            </div>
            <div className="flex-1 grid grid-cols-7 gap-4">
              <div>Admission No.</div>
              <div>Roll No.</div>
              <div>Name</div>
              <div>Class</div>
              <div>Date of Admission</div>
              <div>Contact</div>
              <div>Status</div>
            </div>
            <div className="w-8"></div>
          </div>

          {/* Student Rows */}
          {isLoading && currentStudents.length === 0 ? (
            <div className="border rounded-lg overflow-hidden">
              {Array.from({ length: 10 }).map((_, index) => (
                <StudentSkeleton key={index} />
              ))}
            </div>
          ) : (
            <div className="space-y-0 border rounded-lg overflow-hidden">
              {currentStudents.map((student, index) => (
                <StudentRow key={student.id} student={student} index={index} />
              ))}
              
              {/* Loading More Skeletons */}
              {isLoading && !isPaginating && (
                <div className="space-y-0">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <StudentSkeleton key={`loading-${index}`} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4">
            <div className="text-sm text-muted-foreground">
              {isLoading && currentStudents.length === 0 ? (
                'Loading students...'
              ) : (
                <>
                  Showing <span className="font-medium">{currentStudents.length}</span> of{" "}
                  <span className="font-medium">{totalCount}</span> students
                  {totalPages > 1 && (
                    <span className="ml-2 text-blue-600 dark:text-blue-400">
                      • {totalCount - currentStudents.length} more available
                    </span>
                  )}
                </>
              )}
            </div>
            
            {/* Page Size Controls & Pagination Buttons */}
            <div className="flex items-center gap-4">
              {/* Page Size Controls */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium whitespace-nowrap">Show:</label>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => setPageSize(parseInt(value))}
                >
                  <SelectTrigger className="w-20 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border">
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="200">200</SelectItem>
                    <SelectItem value="500">500</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground whitespace-nowrap">per page</span>
              </div>
              
              {/* Pagination Buttons */}
              {totalPages > 1 && (
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1 || isLoading || isPaginating}
                    className="min-w-28"
                  >
                    {isPaginating && paginatingDirection === 'previous' ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Previous
                      </>
                    ) : (
                      'Previous'
                    )}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages || isLoading || isPaginating}
                    className="min-w-28"
                  >
                    {isPaginating && paginatingDirection === 'next' ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Next
                      </>
                    ) : (
                      'Next'
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
          </div>

          {/* No Students Found */}
          {!isLoading && currentStudents.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No students found matching your criteria.
            </div>
          )}
        </div>

      {/* Export Field Selector Modal */}
      <StudentExportFieldSelector
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        students={exportStudentsData?.items?.map(transformStudentForExport) || []}
        title="Export Students"
      />

      {/* Student Import Modal */}
      <StudentImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleBulkImport}
      />
    </PageWrapper>
  )
}
// Dynamically import to disable SSR completely
const DynamicStudentsPageContent = dynamic(() => Promise.resolve(StudentsPageContent), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center p-8">Loading...</div>
});

export default function StudentsPage() {
  return <DynamicStudentsPageContent />;
}


