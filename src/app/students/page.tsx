"use client";

import { StudentStatsCards } from "@/components/students/student-stats-cards"
import { PageWrapper } from "@/components/layout/page-wrapper"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { PlusCircle, FileDown, FileText, AlertTriangle, ExternalLink, Eye, Edit, Trash, UserCheck, UserX, ArrowUpDown, MoreHorizontal, Loader2 } from "lucide-react"
import Link from "next/link"
import { api } from "@/utils/api"
import { useState, useCallback, useEffect, useMemo } from "react"
import { useGlobalBranchFilter } from "@/hooks/useGlobalBranchFilter"
import { StudentBulkImport } from "@/components/students/student-bulk-import"
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
import { useRouter } from "next/navigation"
import { useDeleteConfirm, useStatusChangeConfirm } from "@/utils/popup-utils"
import { cn } from "@/lib/utils"

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

// Helper component to show warning about missing Clerk accounts
function ClerkAccountWarning() {
  return (
    <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertTitle className="text-amber-800 dark:text-amber-200">
        Clerk Account Management
      </AlertTitle>
      <AlertDescription className="text-amber-700 dark:text-amber-300">
        Some students may not have Clerk accounts yet. You can create accounts for students by clicking "Create Clerk Account" in the student actions menu.
        <Link href="/admin/clerk-users" className="ml-1 underline">
          <ExternalLink className="inline h-3 w-3" />
          Manage Clerk Users
        </Link>
      </AlertDescription>
    </Alert>
  )
}

export default function StudentsPage() {
  // State management
  const [currentStudents, setCurrentStudents] = useState<Student[]>([]);
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]); // Store cursors for each page
  const [sortBy, setSortBy] = useState<string | undefined>("class");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | undefined>("asc"); // Use desc for class to show nursery first
  const [searchTerm, setSearchTerm] = useState("");
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [allStudentsSelected, setAllStudentsSelected] = useState(false);
  const [allStudentIds, setAllStudentIds] = useState<string[]>([]);
  const [isPaginating, setIsPaginating] = useState(false);
  const [paginatingDirection, setPaginatingDirection] = useState<'previous' | 'next' | null>(null);
  const [lastKnownTotalPages, setLastKnownTotalPages] = useState(0);

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

  // API query for loading students
  const { data: studentsData, isLoading, refetch } = api.student.getAll.useQuery({
    branchId: getBranchFilterParam(),
    sessionId: currentSessionId || undefined,
    limit: pageSize,
    cursor: cursors[currentPage - 1],
    sortBy,
    sortOrder,
    search: debouncedSearchTerm || undefined,
    filters: {
      isActive: "true" // Default filter for active students
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
      isActive: "true"
    },
    fetchAllIds: true
  }, {
    enabled: true,
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
      setCurrentStudents(transformedStudents);
      
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
  }, [studentsData?.items, studentsData?.nextCursor, studentsData?.totalCount, currentPage, pageSize]);

  // Update all student IDs when data loads
  useEffect(() => {
    if (allStudentIdsData?.itemIds) {
      setAllStudentIds(allStudentIdsData.itemIds);
    }
  }, [allStudentIdsData?.itemIds]);

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

  // Handle search
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

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

  // Handle bulk import success
  const handleBulkImportSuccess = () => {
    void refetch();
    toast({ title: "Import completed", description: "Students have been imported successfully.", variant: "success" });
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
      
      <div className="flex-1 grid grid-cols-6 gap-4 items-center">
        <div className="font-medium text-sm">
          {student.admissionNumber}
        </div>
        
        <div className="flex flex-col">
          <div className="font-medium text-sm">
            {student.firstName} {student.lastName}
          </div>
          {student.email && (
            <div className="text-xs text-muted-foreground">{student.email}</div>
          )}
        </div>
        
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
        
        <div className="text-sm">
          {student.rollNumber || <span className="text-muted-foreground">-</span>}
        </div>
        
        <div className="text-sm">
          {student.phone && (
            <div>{student.phone}</div>
          )}
          {student.parent?.phone && (
            <div className="text-xs text-muted-foreground">
              Parent: {student.parent.phone}
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant={student.isActive ? "success" : "secondary"}>
            {student.isActive ? "Active" : "Inactive"}
          </Badge>
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
          <StudentBulkImport onSuccess={handleBulkImportSuccess} />
          <Button variant="glowing-secondary" className="flex items-center gap-1">
            <FileDown className="h-4 w-4" />
            <span>Export</span>
          </Button>
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
      <ClerkAccountWarning />
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
          
                      <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-64"
                />
                
                <div className="flex items-center gap-2">
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
                </div>
              </div>
              
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
        <div className="space-y-2">
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
            <div className="flex-1 grid grid-cols-6 gap-4">
              <div>Admission No.</div>
              <div>Name</div>
              <div>Class</div>
              <div>Roll No.</div>
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



          {/* No Students Found */}
          {!isLoading && currentStudents.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No students found matching your criteria.
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  )
}
