"use client";

import { StudentStatsCards } from "@/components/students/student-stats-cards"
import { PageWrapper } from "@/components/layout/page-wrapper"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { PlusCircle, FileDown, FileText, AlertTriangle, ExternalLink, Eye, Edit, Trash, UserCheck, UserX, ArrowUpDown, MoreHorizontal } from "lucide-react"
import Link from "next/link"
import { api } from "@/utils/api"
import { useState, useCallback, useEffect, useMemo } from "react"
import { useGlobalBranchFilter } from "@/hooks/useGlobalBranchFilter"
import { StudentBulkImport } from "@/components/students/student-bulk-import"
import { useToast } from "@/components/ui/use-toast"
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext"
import { useActionPermissions } from "@/utils/permission-utils"
import { Permission } from "@/types/permissions"
import AdvancedDataTable from "@/components/advanced-data-table"
import type { ColumnDef, Row } from "@tanstack/react-table"
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
import type { FilterCategory } from "@/components/ui/advanced-filter"
import type { Filter as UIFilter } from "@/components/ui/filters"
import { useRouter } from "next/navigation"
import { useDeleteConfirm, useStatusChangeConfirm } from "@/utils/popup-utils"

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

// Clerk Account Warning Component
function ClerkAccountWarning() {
  const { getBranchFilterParam } = useGlobalBranchFilter();
  
  const { data: clerkStats } = api.clerkManagement.getClerkAccountStats.useQuery({
    branchId: getBranchFilterParam(),
  });

  if (!clerkStats) return null;

  const totalMissing = (clerkStats.students.withoutClerk || 0) + (clerkStats.parents.withoutClerk || 0);
  
  if (totalMissing === 0) return null;

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Action Required: Missing Authentication Accounts</AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-2">
          Some users don't have Clerk authentication accounts and cannot log in to the system:
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm mb-3">
          {clerkStats.students.withoutClerk > 0 && (
            <li>{clerkStats.students.withoutClerk} student{clerkStats.students.withoutClerk !== 1 ? 's' : ''} missing authentication accounts</li>
          )}
          {clerkStats.parents.withoutClerk > 0 && (
            <li>{clerkStats.parents.withoutClerk} parent{clerkStats.parents.withoutClerk !== 1 ? 's' : ''} missing authentication accounts</li>
          )}
        </ul>
        <Link href="/settings/clerk-accounts">
          <Button variant="outline" size="sm" className="mt-2">
            <ExternalLink className="h-4 w-4 mr-2" />
            Manage Clerk Accounts
          </Button>
        </Link>
      </AlertDescription>
    </Alert>
  );
}

export default function StudentsPage() {
  const [advancedFilters, setAdvancedFilters] = useState<UIFilter[]>([]);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<string | undefined>("class");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | undefined>("asc");

  const { getBranchFilterParam } = useGlobalBranchFilter();
  const { currentSessionId } = useAcademicSessionContext();
  const { toast } = useToast();
  const router = useRouter();
  const utils = api.useContext();
  const deleteConfirm = useDeleteConfirm();
  const statusChangeConfirm = useStatusChangeConfirm();

  const { hasPermission, canView, canEdit, canDelete } = useActionPermissions("students");
  const canManageTC = hasPermission(Permission.MANAGE_TRANSFER_CERTIFICATES);

  // Convert advanced filters to API format
  const apiFilters = useMemo(() => {
    const filters: Record<string, any> = {
      isActive: "true" // Default filter for active students
    };
    
    advancedFilters.forEach(filter => {
      const filterType = filter.type as string;
      const filterValue = filter.value[0];
      if (filterValue) {
        filters[filterType] = filterValue;
      }
    });
    
    return filters;
  }, [advancedFilters]);

  const { data: studentsData, isLoading } = api.student.getAll.useQuery({
    branchId: getBranchFilterParam(),
    sessionId: currentSessionId || undefined,
    limit: pageSize,
    sortBy,
    sortOrder,
    filters: apiFilters
  });

  // API mutations
  const deleteStudentMutation = api.student.delete.useMutation({
    onSuccess: () => {
      void utils.student.getAll.invalidate()
      void utils.student.getStats.invalidate()
      toast({ title: "Student deleted", description: "Student record has been successfully deleted.", variant: "success" });
    },
  });

  const updateStudentStatusMutation = api.student.bulkUpdateStatus.useMutation({
    onSuccess: () => {
      void utils.student.getAll.invalidate()
      void utils.student.getStats.invalidate()
      toast({ title: "Status updated", description: "Student status has been updated successfully.", variant: "success" });
    },
  });

  const deleteMultipleStudentsMutation = api.student.bulkDelete.useMutation({
    onSuccess: (data) => {
      void utils.student.getAll.invalidate()
      void utils.student.getStats.invalidate()
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

  // Transform API data to Student type
  const students: Student[] = useMemo(() => {
    return (studentsData?.items || []).map((student: any) => {
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
    });
  }, [studentsData?.items]);

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

  // Handle student actions
  const handleStudentAction = (action: string, row: Row<Student>) => {
    const student = row.original;
    
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

  // Handle bulk delete
  const handleDeleteRows = (selectedRows: Row<Student>[]) => {
    const studentIds = selectedRows.map(row => row.original.id);
    deleteConfirm(
      `${studentIds.length} student${studentIds.length > 1 ? 's' : ''}`,
      () => {
        deleteMultipleStudentsMutation.mutate({ ids: studentIds });
      }
    );
  };

  // Handle bulk import success
  const handleBulkImportSuccess = () => {
    void utils.student.getAll.invalidate();
    void utils.student.getStats.invalidate();
    toast({
      title: "Import successful",
      description: "Students have been imported successfully",
      variant: "success"
    });
  };

  // Custom row actions component
  const StudentRowActions = ({ row }: { row: Row<Student> }) => {
    const student = row.original;
    
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          {canView() && (
            <DropdownMenuItem onClick={() => handleStudentAction('view', row)}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
          )}
          {canEdit() && (
            <DropdownMenuItem onClick={() => handleStudentAction('edit', row)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {canEdit() && (
            <>
              {student.isActive ? (
                <DropdownMenuItem onClick={() => handleStudentAction('deactivate', row)}>
                  <UserX className="mr-2 h-4 w-4" />
                  Deactivate
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => handleStudentAction('activate', row)}>
                  <UserCheck className="mr-2 h-4 w-4" />
                  Activate
                </DropdownMenuItem>
              )}
            </>
          )}
          {canDelete() && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => handleStudentAction('delete', row)}
                className="text-destructive focus:text-destructive"
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  // Define columns for the data table
  const columns: ColumnDef<Student>[] = [
    {
      accessorKey: "admissionNumber",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium"
        >
          Admission No.
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("admissionNumber")}</div>
      ),
    },
    {
      accessorKey: "firstName",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium"
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const student = row.original;
        return (
          <div className="flex flex-col">
            <div className="font-medium">
              {student.firstName} {student.lastName}
            </div>
            {student.email && (
              <div className="text-sm text-muted-foreground">{student.email}</div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "class",
      header: "Class",
      cell: ({ row }) => {
        const classInfo = row.original.class;
        if (!classInfo) return <span className="text-muted-foreground">-</span>;
        return (
          <div className="font-medium">
            {classInfo.name}
            {classInfo.section && ` - ${classInfo.section}`}
          </div>
        );
      },
    },
    {
      accessorKey: "rollNumber",
      header: "Roll No.",
      cell: ({ row }) => {
        const rollNumber = row.getValue("rollNumber") as string;
        return rollNumber ? (
          <div className="font-medium">{rollNumber}</div>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
    },
    {
      accessorKey: "phone",
      header: "Contact",
      cell: ({ row }) => {
        const student = row.original;
        return (
          <div className="flex flex-col">
            {student.phone && (
              <div className="text-sm">{student.phone}</div>
            )}
            {student.parent?.phone && (
              <div className="text-sm text-muted-foreground">
                Parent: {student.parent.phone}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "dateOfBirth",
      header: "Age",
      cell: ({ row }) => {
        const dateOfBirth = row.getValue("dateOfBirth") as Date;
        const age = calculateAge(dateOfBirth);
        return (
          <div className="flex flex-col">
            <div className="font-medium">{age} years</div>
            <div className="text-sm text-muted-foreground">
              {formatDate(dateOfBirth)}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "gender",
      header: "Gender",
      cell: ({ row }) => {
        const gender = row.getValue("gender") as string;
        return gender ? (
          <Badge variant="outline">{gender}</Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => {
        const isActive = row.getValue("isActive") as boolean;
        return (
          <Badge variant={isActive ? "success" : "secondary"}>
            {isActive ? "Active" : "Inactive"}
          </Badge>
        );
      },
    },
  ];

  // Define filter categories for advanced filtering
  const filterCategories: FilterCategory[][] = [
    [
      {
        name: "Status",
        icon: <UserCheck className="h-4 w-4" />,
        options: [
          { name: "Active", icon: <UserCheck className="h-4 w-4" />, value: "true" },
          { name: "Inactive", icon: <UserX className="h-4 w-4" />, value: "false" },
        ]
      },
      {
        name: "Gender",
        icon: <div className="h-4 w-4 rounded-full bg-blue-500" />,
        options: [
          { name: "Male", icon: <div className="h-3 w-3 rounded-full bg-blue-500" /> },
          { name: "Female", icon: <div className="h-3 w-3 rounded-full bg-pink-500" /> },
          { name: "Other", icon: <div className="h-3 w-3 rounded-full bg-gray-500" /> },
        ]
      }
    ]
  ];

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

      <div className="mt-6">
        <AdvancedDataTable
          data={students}
          columns={columns}
          title="All Students"
          description={`Showing ${students.length} of ${studentsData?.totalCount || 0} students`}
          onAddClick={() => router.push('/students/create')}
          onDeleteRows={handleDeleteRows}
          onRowAction={handleStudentAction}
          addButtonText="Add Student"
          deleteButtonText="Delete Selected"
          searchPlaceholder="Search students..."
          searchColumns={['firstName', 'lastName', 'admissionNumber', 'email']}
          filterCategories={filterCategories}
          enableRowSelection={true}
          enableSearch={true}
          enableColumnVisibility={true}
          enablePagination={true}
          enableAdvancedFilter={true}
          initialPageSize={pageSize}
          pageSizeOptions={[5, 10, 25, 50, 100]}
          customRowActions={(row) => <StudentRowActions row={row} />}
          onFiltersChange={setAdvancedFilters}
          className="mt-4"
        />
      </div>
    </PageWrapper>
  )
}
