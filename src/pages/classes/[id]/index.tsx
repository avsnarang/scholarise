import { useState } from "react";
import { type NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { 
  ChevronLeft, 
  Edit, 
  Trash, 
  Users, 
  BookOpen, 
  Calendar, 
  Building, 
  User,
  FileDown,
  Loader2
} from "lucide-react";
import { api } from "@/utils/api";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { ClassFormModal } from "@/components/classes/class-form-modal";
import { useGlobalBranchFilter } from "@/hooks/useGlobalBranchFilter";

// Import the NextPageWithLayout type instead of NextPage
import type { NextPageWithLayout } from "@/pages/_app";

const ClassDetailPage: NextPageWithLayout = () => {
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();
  const { branchId } = useGlobalBranchFilter();
  
  // State for UI
  const [activeTab, setActiveTab] = useState("overview");
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Get class details
  const { 
    data: classData, 
    isLoading: isLoadingClass,
    refetch: refetchClass
  } = api.class.getById.useQuery(
    { id: id as string, includeStudents: true },
    { enabled: !!id }
  );
  
  // Get student count
  const { data: studentCount } = api.class.getStudents.useQuery(
    { classId: id as string },
    { 
      enabled: !!id,
      select: (data) => data.length,
    }
  );
  
  // Delete mutation
  const deleteMutation = api.class.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "Class deleted",
        description: "The class has been deleted successfully.",
        variant: "success",
      });
      void router.push("/classes");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete class. Please try again.",
        variant: "destructive",
      });
      setIsDeleteDialogOpen(false);
    },
  });
  
  // Handlers
  const handleEdit = () => {
    setIsFormModalOpen(true);
  };
  
  const handleDelete = () => {
    setIsDeleteDialogOpen(true);
  };
  
  const confirmDelete = () => {
    if (id) {
      deleteMutation.mutate({ id: id as string });
    }
  };
  
  const handleFormSuccess = () => {
    setIsFormModalOpen(false);
    void refetchClass();
  };
  
  // Loading state
  const isLoading = isLoadingClass || !id;
  
  if (isLoading) {
    return (
      <PageWrapper>
        <Head>
          <title>Class Details | ScholaRise ERP</title>
        </Head>
        
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-1 p-0"
              asChild
            >
              <Link href="/classes">
                <ChevronLeft className="h-4 w-4" />
                Back to Classes
              </Link>
            </Button>
          </div>
          
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-5 w-48" />
          </div>
          
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
          
          <div className="rounded-md border p-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
          </div>
        </div>
      </PageWrapper>
    );
  }
  
  if (!classData) {
    return (
      <PageWrapper>
        <Head>
          <title>Class Not Found | ScholaRise ERP</title>
        </Head>
        
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <h1 className="text-2xl font-bold">Class Not Found</h1>
          <p className="text-gray-500">The class you are looking for does not exist.</p>
          <Button asChild>
            <Link href="/classes">Back to Classes</Link>
          </Button>
        </div>
      </PageWrapper>
    );
  }
  
  return (
    <PageWrapper>
      <Head>
        <title>{`${classData.name} ${classData.section} | ScholaRise ERP`}</title>
      </Head>
      
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-1 p-0 clickable"
            asChild
          >
            <Link href="/classes">
              <ChevronLeft className="h-4 w-4" />
              Back to Classes
            </Link>
          </Button>
        </div>
        
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              {classData.name} - {classData.section}
            </h1>
            <p className="text-sm text-gray-500">
              {classData.teacher ? (
                <>Class Teacher: {classData.teacher.firstName} {classData.teacher.lastName}</>
              ) : (
                <>No class teacher assigned</>
              )}
              {" • "}
              Capacity: {classData.capacity} students
              {" • "}
              {classData.isActive ? (
                <span className="text-green-600">Active</span>
              ) : (
                <span className="text-red-600">Inactive</span>
              )}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleEdit}
              className="clickable"
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="clickable"
            >
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
        
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 lg:w-auto">
            <TabsTrigger value="overview" className="clickable">Overview</TabsTrigger>
            <TabsTrigger value="students" className="clickable">Students</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="mt-4">
            <div className="rounded-md border p-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <h3 className="text-lg font-medium">Class Information</h3>
                  <div className="rounded-md border p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Name</p>
                        <p className="font-medium">{classData.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Section</p>
                        <p className="font-medium">{classData.section}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Capacity</p>
                        <p className="font-medium">{classData.capacity}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Status</p>
                        <p className={`font-medium ${classData.isActive ? "text-green-600" : "text-red-600"}`}>
                          {classData.isActive ? "Active" : "Inactive"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  <h3 className="text-lg font-medium">Branch & Session</h3>
                  <div className="rounded-md border p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Branch</p>
                        <p className="font-medium">{classData.branch.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Branch Code</p>
                        <p className="font-medium">{classData.branch.code}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Academic Session</p>
                        <p className="font-medium">{classData.session.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Session Period</p>
                        <p className="font-medium">
                          {new Date(classData.session.startDate).toLocaleDateString()} - {new Date(classData.session.endDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  <h3 className="text-lg font-medium">Class Teacher</h3>
                  <div className="rounded-md border p-4">
                    {classData.teacher ? (
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center text-lg font-medium">
                          {classData.teacher.firstName?.[0]}{classData.teacher.lastName?.[0]}
                        </div>
                        <div>
                          <p className="font-medium">{classData.teacher.firstName} {classData.teacher.lastName}</p>
                          <p className="text-sm text-gray-500">
                            {classData.teacher.qualification || "No qualification specified"}
                          </p>
                          <p className="text-sm text-gray-500">
                            {classData.teacher.specialization || "No specialization specified"}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-4 text-center">
                        <User className="h-12 w-12 text-gray-400" />
                        <p className="mt-2 text-sm font-medium text-gray-900">No class teacher assigned</p>
                        <p className="mt-1 text-sm text-gray-500">
                          Assign a teacher to this class by editing the class details.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  <h3 className="text-lg font-medium">Students</h3>
                  <div className="rounded-md border p-4">
                    <div className="flex flex-col items-center justify-center py-4 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                        <Users className="h-6 w-6" />
                      </div>
                      <p className="mt-2 text-2xl font-bold text-gray-900">{studentCount || 0}</p>
                      <p className="mt-1 text-sm text-gray-500">
                        {studentCount === 1 ? "Student" : "Students"} enrolled in this class
                      </p>
                      <Button
                        variant="outline"
                        className="mt-4 clickable"
                        asChild
                      >
                        <Link href={`/classes/${id}/students`}>
                          <Users className="mr-2 h-4 w-4" />
                          View Students
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="students" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Students in this Class</h3>
              <Button
                className="bg-[#00501B] hover:bg-[#00501B]/90 text-white clickable"
                asChild
              >
                <Link href={`/classes/${id}/students`}>
                  <Users className="mr-2 h-4 w-4" />
                  Manage Students
                </Link>
              </Button>
            </div>
            
            <div className="rounded-md border">
              {studentCount === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <Users className="h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No students found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    This class doesn't have any students yet.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4 clickable"
                    asChild
                  >
                    <Link href={`/students/admission?classId=${id}`}>
                      <Users className="mr-2 h-4 w-4" />
                      Add Students
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="p-4">
                  <p className="text-center text-sm text-gray-500">
                    This class has {studentCount} {studentCount === 1 ? "student" : "students"} enrolled.
                  </p>
                  <div className="mt-4 flex justify-center">
                    <Button
                      variant="outline"
                      className="clickable"
                      asChild
                    >
                      <Link href={`/classes/${id}/students`}>
                        <Users className="mr-2 h-4 w-4" />
                        View All Students
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Class form modal */}
      {isFormModalOpen && (
        <ClassFormModal
          isOpen={isFormModalOpen}
          onClose={() => setIsFormModalOpen(false)}
          classData={classData}
          onSuccess={handleFormSuccess}
          branchId={branchId || ""}
          sessionId={classData.sessionId}
        />
      )}
      
      {/* Delete confirmation dialog */}
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Class"
        description={`Are you sure you want to delete the class "${classData.name} - ${classData.section}"? This action cannot be undone.`}
        isDeleting={deleteMutation.isPending}
      />
    </PageWrapper>
  );
};

ClassDetailPage.getLayout = (page: React.ReactNode) => {
  return <DashboardLayout>{page}</DashboardLayout>;
};

export default ClassDetailPage;
