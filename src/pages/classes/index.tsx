import { useState } from "react";
import { type NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import {
  BookOpen,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash,
  Users,
  CheckCircle,
  UserPlus,
  RefreshCw
} from "lucide-react";
import { api } from "@/utils/api";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGlobalBranchFilter } from "@/hooks/useGlobalBranchFilter";
import { useGlobalSessionFilter } from "@/hooks/useGlobalSessionFilter";
import { ClassFormModal } from "@/components/classes/class-form-modal";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";


const ClassesPage: NextPage & { getLayout: (page: React.ReactNode) => React.ReactNode } = () => {
  const { toast } = useToast();
  const { branchId, withBranchFilter } = useGlobalBranchFilter();
  const { sessionId, withSessionFilter } = useGlobalSessionFilter();

  // State for UI
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Stats query
  const { data: stats, isLoading: isLoadingStats } = api.class.getStats.useQuery(
    withBranchFilter(withSessionFilter({})),
    { enabled: !!branchId && !!sessionId }
  );

  // Classes query with filtering
  const {
    data: classes,
    isLoading: isLoadingClasses,
    refetch: refetchClasses
  } = api.class.getAll.useQuery(
    withBranchFilter(withSessionFilter({
      isActive: activeTab === "active" ? true : activeTab === "inactive" ? false : undefined,
      search: searchQuery || undefined,
      includeTeacher: true,
      includeStudentCount: true,
    })),
    {
      enabled: !!branchId && !!sessionId,
    }
  );

  // Mutations
  const deleteMutation = api.class.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "Class deleted",
        description: "The class has been deleted successfully.",
        variant: "success",
      });
      setIsDeleteDialogOpen(false);
      void refetchClasses();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete class. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handlers
  const handleAddClass = () => {
    setSelectedClass(null);
    setIsFormModalOpen(true);
  };

  const handleEditClass = (classData: any) => {
    setSelectedClass(classData);
    setIsFormModalOpen(true);
  };

  const handleDeleteClass = (classData: any) => {
    setSelectedClass(classData);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedClass) {
      deleteMutation.mutate({ id: selectedClass.id });
    }
  };

  const handleFormSuccess = () => {
    setIsFormModalOpen(false);
    void refetchClasses();
  };

  // Filter classes based on search query
  const filteredClasses = classes || [];

  // Loading states
  const isLoading = isLoadingClasses || !sessionId;

  return (
    <>
      <Head>
        <title>Classes | ScholaRise ERP</title>
      </Head>

      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Classes</h1>
            <p className="text-sm text-gray-500">
              Manage classes, sections, and assign teachers
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleAddClass}
              className="bg-[#00501B] hover:bg-[#00501B]/90 text-white clickable"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Class
            </Button>
          </div>
        </div>

        {/* Search and refresh */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="search"
                placeholder="Search classes..."
                className="w-full pl-9 pr-4"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => void refetchClasses()}
            className="clickable"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
              <BookOpen className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              {isLoadingStats ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <div className="text-2xl font-bold">{stats?.totalClasses || 0}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Classes</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              {isLoadingStats ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <div className="text-2xl font-bold">{stats?.activeClasses || 0}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">With Teachers</CardTitle>
              <UserPlus className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              {isLoadingStats ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <div className="text-2xl font-bold">{stats?.classesWithTeachers || 0}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              {isLoadingStats ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <div className="text-2xl font-bold">{stats?.totalStudents || 0}</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabs and table */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 lg:w-auto">
            <TabsTrigger value="all" className="clickable">All Classes</TabsTrigger>
            <TabsTrigger value="active" className="clickable">Active</TabsTrigger>
            <TabsTrigger value="inactive" className="clickable">Inactive</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <ClassesTable
              classes={filteredClasses}
              isLoading={isLoading}
              onEdit={handleEditClass}
              onDelete={handleDeleteClass}
            />
          </TabsContent>

          <TabsContent value="active" className="mt-4">
            <ClassesTable
              classes={filteredClasses}
              isLoading={isLoading}
              onEdit={handleEditClass}
              onDelete={handleDeleteClass}
            />
          </TabsContent>

          <TabsContent value="inactive" className="mt-4">
            <ClassesTable
              classes={filteredClasses}
              isLoading={isLoading}
              onEdit={handleEditClass}
              onDelete={handleDeleteClass}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Class form modal */}
      {isFormModalOpen && (
        <ClassFormModal
          isOpen={isFormModalOpen}
          onClose={() => setIsFormModalOpen(false)}
          classData={selectedClass}
          onSuccess={handleFormSuccess}
          branchId={branchId || ""}
          sessionId={sessionId || ""}
        />
      )}

      {/* Delete confirmation dialog */}
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Class"
        description={`Are you sure you want to delete the class "${selectedClass?.name} - ${selectedClass?.section}"? This action cannot be undone.`}
        isDeleting={false}
      />
    </>
  );
};

interface ClassesTableProps {
  classes: any[];
  isLoading: boolean;
  onEdit: (classData: any) => void;
  onDelete: (classData: any) => void;
}

const ClassesTable = ({ classes, isLoading, onEdit, onDelete }: ClassesTableProps) => {
  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Class</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Teacher</TableHead>
              <TableHead>Students</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={index}>
                <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                <TableCell><Skeleton className="h-5 w-20 float-right" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-8 text-center">
        <BookOpen className="h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No classes found</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by creating a new class.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Class</TableHead>
            <TableHead>Section</TableHead>
            <TableHead>Capacity</TableHead>
            <TableHead>Teacher</TableHead>
            <TableHead>Students</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {classes.map((classItem) => (
            <TableRow key={classItem.id}>
              <TableCell className="font-medium">{classItem.name}</TableCell>
              <TableCell>{classItem.section}</TableCell>
              <TableCell>{classItem.capacity}</TableCell>
              <TableCell>
                {classItem.teacher ? (
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium">
                      {classItem.teacher.firstName?.[0]}{classItem.teacher.lastName?.[0]}
                    </div>
                    <span>{classItem.teacher.firstName} {classItem.teacher.lastName}</span>
                  </div>
                ) : (
                  <span className="text-gray-500 text-sm">Not assigned</span>
                )}
              </TableCell>
              <TableCell>
                <Link
                  href={`/classes/${classItem.id}/students`}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800 clickable"
                >
                  <Users className="h-4 w-4" />
                  <span>{classItem.studentCount || 0}</span>
                </Link>
              </TableCell>
              <TableCell>
                {classItem.isActive ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Active
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    Inactive
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="clickable">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(classItem)} className="clickable">
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => window.location.href = `/classes/${classItem.id}/students`}
                      className="clickable"
                    >
                      <Users className="mr-2 h-4 w-4" />
                      View Students
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(classItem)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 clickable"
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

ClassesPage.getLayout = (page: React.ReactNode) => {
  return <DashboardLayout>{page}</DashboardLayout>;
};

export default ClassesPage;
