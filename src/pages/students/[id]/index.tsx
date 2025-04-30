import { AppLayout } from "@/components/layout/app-layout"
import { PageWrapper } from "@/components/layout/page-wrapper"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api } from "@/utils/api"
import { ChevronLeft, Edit, FileDown, Trash } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/router"
import { useState } from "react"
// import { usePermissions } from "@/hooks/usePermissions"
import { SiblingModal } from "@/components/students/sibling-modal"
import { SiblingList } from "@/components/students/sibling-list"
import type { NextPageWithLayout } from "../../_app"

const StudentDetailPage: NextPageWithLayout = () => {
  const router = useRouter();
  const { id } = router.query;
  // We're not using hasPermission for now, but will need it later
  // const { hasPermission } = usePermissions();
  const [activeTab, setActiveTab] = useState("student-info");
  const [isSiblingModalOpen, setIsSiblingModalOpen] = useState(false);

  // Fetch student data from API
  const { data: student, isLoading } = api.student.getById.useQuery(
    { id: id as string },
    { enabled: typeof id === 'string' }
  );

  // Function to refresh sibling data
  const refreshSiblings = () => {
    void utils.student.getSiblings.invalidate({ studentId: id as string });
  };

  // Check permissions
  const canEdit = true; // hasPermission("student", student.id, "edit");
  const canDelete = true; // hasPermission("student", student.id, "delete");

  // Delete student mutation
  const utils = api.useContext();
  const deleteStudentMutation = api.student.delete.useMutation({
    onSuccess: () => {
      void utils.student.getAll.invalidate();
      router.push("/students");
    },
  });

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this student? This action cannot be undone.")) {
      try {
        await deleteStudentMutation.mutateAsync({ id: id as string });
      } catch (error) {
        console.error("Error deleting student:", error);
        alert("Failed to delete student. Please try again.");
      }
    }
  };

  const handleExportPDF = () => {
    // Implementation for exporting to PDF
    console.log("Export to PDF");
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <h2 className="text-2xl font-bold">Student not found</h2>
        <p className="text-gray-500 dark:text-gray-400">The student you are looking for does not exist.</p>
        <Link href="/students">
          <Button className="mt-4">Back to Students</Button>
        </Link>
      </div>
    );
  }

  return (
    <PageWrapper
      title={`${student.firstName} ${student.lastName}`}
      subtitle={`Student details for ${student.admissionNumber}`}
      action={
        <div className="flex gap-2">
          <Link href="/students">
            <Button variant="outline" className="flex items-center gap-1">
              <ChevronLeft className="h-4 w-4" />
              <span>Back to Students</span>
            </Button>
          </Link>
          {canEdit && (
            <Link href={`/students/${student.id}/edit`}>
              <Button variant="outline" className="flex items-center gap-1">
                <Edit className="h-4 w-4" />
                <span>Edit</span>
              </Button>
            </Link>
          )}
          <Button
            variant="outline"
            className="flex items-center gap-1"
            onClick={handleExportPDF}
          >
            <FileDown className="h-4 w-4" />
            <span>Export PDF</span>
          </Button>
          {canDelete && (
            <Button
              variant="destructive"
              className="flex items-center gap-1"
              onClick={handleDelete}
            >
              <Trash className="h-4 w-4" />
              <span>Delete</span>
            </Button>
          )}
        </div>
      }
    >
      <Card className="mb-6">
        <CardHeader className="pb-0">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#00501B]/10 dark:bg-[#7aad8c]/10 text-2xl font-bold uppercase text-[#00501B] dark:text-[#7aad8c]">
              {student.firstName?.[0]}{student.lastName?.[0]}
            </div>
            <div>
              <CardTitle className="text-2xl">
                {student.firstName} {student.lastName}
              </CardTitle>
              <div className="mt-2 flex items-center gap-2">
                <span className="rounded-full bg-[#00501B]/10 dark:bg-[#7aad8c]/10 px-3 py-1 text-sm font-medium text-[#00501B] dark:text-[#7aad8c]">
                  {student.admissionNumber}
                </span>
                <span className="rounded-full bg-[#00501B]/10 dark:bg-[#7aad8c]/10 px-3 py-1 text-sm font-medium text-[#00501B] dark:text-[#7aad8c]">
                  {student.class?.name || 'No Class'} {student.class?.section ? `- ${student.class.section}` : ''}
                </span>
                <span className={`rounded-full px-3 py-1 text-sm font-medium ${
                  student.isActive 
                    ? 'bg-green-100 text-green-700 dark:bg-[#7aad8c]/20 dark:text-[#7aad8c]' 
                    : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                }`}>
                  {student.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="mb-6">
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="bg-white dark:bg-[#101010] px-6 py-4 border-b border-gray-200 dark:border-[#303030]">
              <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-[#e6e6e6]">Student Details</h2>

                <div className="flex w-full flex-wrap items-center gap-3 md:w-auto md:justify-end">
                  <div className="flex items-center gap-2 rounded-full bg-[#00501B]/10 dark:bg-[#7aad8c]/10 px-3 py-1.5 text-[#00501B] dark:text-[#7aad8c]">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    <span className="text-sm font-medium">Joined: {student.joinDate instanceof Date ? student.joinDate.toLocaleDateString('en-US', {month: 'short', year: 'numeric'}) : new Date(student.joinDate).toLocaleDateString('en-US', {month: 'short', year: 'numeric'})}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 dark:bg-[#101010]">
              <TabsList className="inline-flex h-10 items-center justify-center rounded-md bg-white dark:bg-[#101010] p-1 shadow-sm border border-gray-200 dark:border-[#303030]">
                <TabsTrigger
                  value="student-info"
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-4 py-2 text-sm font-medium ring-offset-white dark:ring-offset-[#202020] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00501B] dark:focus-visible:ring-[#7aad8c] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-[#00501B] dark:data-[state=active]:bg-[#7aad8c] data-[state=active]:text-white data-[state=active]:shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    <span>Student Info</span>
                  </div>
                </TabsTrigger>

                <TabsTrigger
                  value="address"
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-4 py-2 text-sm font-medium ring-offset-white dark:ring-offset-[#202020] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00501B] dark:focus-visible:ring-[#7aad8c] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-[#00501B] dark:data-[state=active]:bg-[#7aad8c] data-[state=active]:text-white data-[state=active]:shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                    <span>Address</span>
                  </div>
                </TabsTrigger>

                <TabsTrigger
                  value="parent-info"
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-4 py-2 text-sm font-medium ring-offset-white dark:ring-offset-[#202020] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00501B] dark:focus-visible:ring-[#7aad8c] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-[#00501B] dark:data-[state=active]:bg-[#7aad8c] data-[state=active]:text-white data-[state=active]:shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    <span>Parents</span>
                  </div>
                </TabsTrigger>

                <TabsTrigger
                  value="other-info"
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-4 py-2 text-sm font-medium ring-offset-white dark:ring-offset-[#202020] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00501B] dark:focus-visible:ring-[#7aad8c] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-[#00501B] dark:data-[state=active]:bg-[#7aad8c] data-[state=active]:text-white data-[state=active]:shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                    <span>Other Info</span>
                  </div>
                </TabsTrigger>

                <TabsTrigger
                  value="sibling-details"
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-4 py-2 text-sm font-medium ring-offset-white dark:ring-offset-[#202020] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00501B] dark:focus-visible:ring-[#7aad8c] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-[#00501B] dark:data-[state=active]:bg-[#7aad8c] data-[state=active]:text-white data-[state=active]:shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    <span>Siblings</span>
                  </div>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Student Information Tab */}
            <TabsContent value="student-info" className="p-6 bg-white dark:bg-[#101010] rounded-b-md">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="md:col-span-1">
                <div className="rounded-lg border border-gray-200 dark:border-[#303030] bg-white dark:bg-[#252525] p-6 shadow-sm">
                  <div className="flex flex-col items-center justify-center">
                    <div className="mb-4 flex h-32 w-32 items-center justify-center rounded-full bg-[#00501B]/10 dark:bg-[#7aad8c]/10 text-5xl font-bold uppercase text-[#00501B] dark:text-[#7aad8c]">
                      {student.firstName?.[0]}{student.lastName?.[0]}
                    </div>
                    <div className="mt-4 flex w-full flex-col gap-3">
                      <div className="flex items-center justify-between rounded-md bg-gray-50 dark:bg-[#303030] p-3">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Age</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-[#e6e6e6]">
                          {student.dateOfBirth ?
                            Math.floor((new Date().getTime() - new Date(student.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 'N/A'} years
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-md bg-gray-50 dark:bg-[#303030] p-3">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Gender</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-[#e6e6e6]">{student.gender || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-md bg-gray-50 dark:bg-[#303030] p-3">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Blood Group</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-[#e6e6e6]">{student.bloodGroup || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="rounded-lg border border-gray-200 dark:border-[#303030] bg-white dark:bg-[#252525] p-6 shadow-sm">
                  <div className="mb-4 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-5 w-5 text-[#00501B] dark:text-[#7aad8c]" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-[#e6e6e6]">Personal Information</h2>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-md bg-gray-50 dark:bg-[#303030] p-4">
                      <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Full Name</p>
                      <p className="mt-1 text-sm font-medium text-gray-900 dark:text-[#e6e6e6]">{student.firstName} {student.lastName}</p>
                    </div>
                    <div className="rounded-md bg-gray-50 dark:bg-[#303030] p-4">
                      <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Date of Birth</p>
                      <p className="mt-1 text-sm font-medium text-gray-900 dark:text-[#e6e6e6]">
                        {student.dateOfBirth instanceof Date
                          ? student.dateOfBirth.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
                          : new Date(student.dateOfBirth).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="rounded-md bg-gray-50 dark:bg-[#303030] p-4">
                      <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Religion</p>
                      <p className="mt-1 text-sm font-medium text-gray-900 dark:text-[#e6e6e6]">{student.religion || 'N/A'}</p>
                    </div>
                    <div className="rounded-md bg-gray-50 dark:bg-[#303030] p-4">
                      <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Nationality</p>
                      <p className="mt-1 text-sm font-medium text-gray-900 dark:text-[#e6e6e6]">{student.nationality || 'N/A'}</p>
                    </div>
                    <div className="rounded-md bg-gray-50 dark:bg-[#303030] p-4">
                      <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Caste</p>
                      <p className="mt-1 text-sm font-medium text-gray-900 dark:text-[#e6e6e6]">N/A</p>
                    </div>
                    <div className="rounded-md bg-gray-50 dark:bg-[#303030] p-4">
                      <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Category</p>
                      <p className="mt-1 text-sm font-medium text-gray-900 dark:text-[#e6e6e6]">N/A</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-lg border bg-white dark:bg-[#252525] p-6 shadow-sm">
                  <div className="mb-4 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-5 w-5 text-[#00501B] dark:text-[#7aad8c]" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Contact Information</h2>
                  </div>

                  <div className="mt-4 w-full">
                    <div className="flex items-center gap-2 rounded-md bg-gray-50 dark:bg-[#303030] p-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#00501B] dark:text-[#7aad8c]" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                      <span className="text-sm font-medium text-gray-900 dark:text-[#e6e6e6]">
                        {student.parent?.fatherMobile || student.parent?.motherMobile || 'N/A'}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-2 rounded-md bg-gray-50 dark:bg-[#303030] p-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#00501B] dark:text-[#e2bd8c]" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                      <span className="text-sm font-medium text-gray-900 dark:text-[#e6e6e6]">
                        {student.parent?.fatherEmail || student.parent?.motherEmail || 'N/A'}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-2 rounded-md bg-gray-50 dark:bg-[#303030] p-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#00501B] dark:text-[#7aad8c]" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                      <span className="text-sm font-medium text-gray-900 dark:text-[#e6e6e6]">
                        {'Same as student'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

            {/* Address Tab */}
            <TabsContent value="address" className="p-6 bg-white dark:bg-[#101010] rounded-b-md">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-lg border bg-white dark:bg-[#252525] dark:border-[#303030] p-6 shadow-sm">
                <div className="mb-4 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-5 w-5 text-[#00501B] dark:text-[#7aad8c]" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-[#e6e6e6]">Permanent Address</h2>
                </div>

                <div className="mb-6 rounded-lg bg-gray-50 dark:bg-[#303030] p-4">
                  <div className="mb-2 flex items-center">
                    <span className="rounded-full bg-[#00501B]/10 dark:bg-[#7aad8c]/10 px-2 py-1 text-xs font-medium text-[#00501B] dark:text-[#7aad8c]">Current</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-[#e6e6e6]">{student.address || 'No address provided'}</p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-md bg-gray-50 dark:bg-[#303030] p-4">
                    <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">City</p>
                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-[#e6e6e6]">N/A</p>
                  </div>
                  <div className="rounded-md bg-gray-50 dark:bg-[#303030] p-4">
                    <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">State</p>
                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-[#e6e6e6]">N/A</p>
                  </div>
                  <div className="rounded-md bg-gray-50 dark:bg-[#303030] p-4">
                    <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Country</p>
                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-[#e6e6e6]">India</p>
                  </div>
                  <div className="rounded-md bg-gray-50 dark:bg-[#303030] p-4">
                    <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Zip Code</p>
                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-[#e6e6e6]">N/A</p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border bg-white dark:bg-[#252525] dark:border-[#303030] p-6 shadow-sm">
                <div className="mb-4 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-5 w-5 text-[#00501B] dark:text-[#7aad8c]" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-[#e6e6e6]">Correspondence Address</h2>
                </div>

                <div className="mb-6 rounded-lg bg-gray-50 dark:bg-[#303030] p-4">
                  <div className="mb-2 flex items-center">
                    <span className="rounded-full bg-gray-200 dark:bg-[#404040] px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300">Mailing</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-[#e6e6e6]">Same as permanent address</p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-md bg-gray-50 dark:bg-[#303030] p-4">
                    <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">City</p>
                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-[#e6e6e6]">N/A</p>
                  </div>
                  <div className="rounded-md bg-gray-50 dark:bg-[#303030] p-4">
                    <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">State</p>
                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-[#e6e6e6]">N/A</p>
                  </div>
                  <div className="rounded-md bg-gray-50 dark:bg-[#303030] p-4">
                    <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Country</p>
                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-[#e6e6e6]">India</p>
                  </div>
                  <div className="rounded-md bg-gray-50 dark:bg-[#303030] p-4">
                    <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Zip Code</p>
                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-[#e6e6e6]">N/A</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

            {/* Parent Information Tab */}
            <TabsContent value="parent-info" className="p-6 bg-white dark:bg-[#101010] rounded-b-md">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="md:col-span-1">
                <div className="rounded-lg border dark:border-[#303030] bg-white dark:bg-[#252525] p-6 shadow-sm">
                  <div className="flex flex-col items-center justify-center">
                    <div className="mb-4 flex h-32 w-32 items-center justify-center rounded-full bg-[#A65A20]/10 dark:bg-[#e2bd8c]/10 text-5xl font-bold uppercase text-[#A65A20] dark:text-[#e2bd8c]">
                      {student.parent ? 
                        (student.parent.fatherName?.[0] || 
                         student.parent.motherName?.[0] || 
                         student.parent.guardianName?.[0] || '?') : '?'}
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-[#e6e6e6]">
                      {student.parent ? 
                        (student.parent.fatherName || 
                         student.parent.motherName || 
                         student.parent.guardianName || 'Parent') : 'Parent'}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Primary Contact</p>

                    <div className="mt-4 w-full">
                      <div className="flex items-center gap-2 rounded-md bg-gray-50 dark:bg-[#303030] p-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#00501B] dark:text-[#7aad8c]" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                        <span className="text-sm font-medium text-gray-900 dark:text-[#e6e6e6]">
                          {student.parent?.fatherMobile || student.parent?.motherMobile || 'N/A'}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center gap-2 rounded-md bg-gray-50 dark:bg-[#303030] p-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#00501B] dark:text-[#e2bd8c]" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                        <span className="text-sm font-medium text-gray-900 dark:text-[#e6e6e6]">
                          {student.parent?.fatherEmail || student.parent?.motherEmail || 'N/A'}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center gap-2 rounded-md bg-gray-50 dark:bg-[#303030] p-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#00501B] dark:text-[#7aad8c]" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        <span className="text-sm font-medium text-gray-900 dark:text-[#e6e6e6]">
                          {'Same as student'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="rounded-lg border dark:border-[#303030] bg-white dark:bg-[#252525] p-6 shadow-sm">
                  <div className="mb-4 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-5 w-5 text-[#00501B] dark:text-[#7aad8c]" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-[#e6e6e6]">Father's Information</h2>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-md bg-gray-50 p-4">
                      <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Name</p>
                      <p className="mt-1 text-sm font-medium text-gray-900 dark:text-[#e6e6e6]">{student.parent?.fatherName || 'N/A'}</p>
                    </div>
                    <div className="rounded-md bg-gray-50 p-4">
                      <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Occupation</p>
                      <p className="mt-1 text-sm font-medium text-gray-900 dark:text-[#e6e6e6]">{student.parent?.fatherOccupation || 'N/A'}</p>
                    </div>
                    <div className="rounded-md bg-gray-50 p-4">
                      <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Email</p>
                      {student.parent?.fatherEmail ? (
                        <a href={`mailto:${student.parent.fatherEmail}`} className="mt-1 block text-sm font-medium text-blue-600 hover:underline dark:text-[#e2bd8c]">
                          {student.parent.fatherEmail}
                        </a>
                      ) : (
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-[#e6e6e6]">N/A</p>
                      )}
                    </div>
                    <div className="rounded-md bg-gray-50 p-4">
                      <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Phone</p>
                      {student.parent?.fatherMobile ? (
                        <a href={`tel:${student.parent.fatherMobile}`} className="mt-1 block text-sm font-medium text-blue-600 hover:underline dark:text-[#7aad8c]">
                          {student.parent.fatherMobile}
                        </a>
                      ) : (
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-[#e6e6e6]">N/A</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-lg border dark:border-[#303030] bg-white dark:bg-[#252525] p-6 shadow-sm">
                  <div className="mb-4 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-5 w-5 text-[#00501B] dark:text-[#7aad8c]" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-[#e6e6e6]">Mother's Information</h2>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-md bg-gray-50 p-4">
                      <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Name</p>
                      <p className="mt-1 text-sm font-medium text-gray-900 dark:text-[#e6e6e6]">{student.parent?.motherName || 'N/A'}</p>
                    </div>
                    <div className="rounded-md bg-gray-50 p-4">
                      <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Occupation</p>
                      <p className="mt-1 text-sm font-medium text-gray-900 dark:text-[#e6e6e6]">{student.parent?.motherOccupation || 'N/A'}</p>
                    </div>
                    <div className="rounded-md bg-gray-50 p-4">
                      <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Email</p>
                      {student.parent?.motherEmail ? (
                        <a href={`mailto:${student.parent.motherEmail}`} className="mt-1 block text-sm font-medium text-blue-600 hover:underline dark:text-[#e2bd8c]">
                          {student.parent.motherEmail}
                        </a>
                      ) : (
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-[#e6e6e6]">N/A</p>
                      )}
                    </div>
                    <div className="rounded-md bg-gray-50 p-4">
                      <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Phone</p>
                      {student.parent?.motherMobile ? (
                        <a href={`tel:${student.parent.motherMobile}`} className="mt-1 block text-sm font-medium text-blue-600 hover:underline dark:text-[#7aad8c]">
                          {student.parent.motherMobile}
                        </a>
                      ) : (
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-[#e6e6e6]">N/A</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-lg border dark:border-[#303030] bg-white dark:bg-[#252525] p-6 shadow-sm">
                  <div className="mb-4 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-5 w-5 text-[#00501B] dark:text-[#7aad8c]" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-[#e6e6e6]">Additional Information</h2>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-md bg-gray-50 p-4">
                      <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Parent Anniversary</p>
                      <p className="mt-1 text-sm font-medium text-gray-900 dark:text-[#e6e6e6]">N/A</p>
                    </div>
                    <div className="rounded-md bg-gray-50 p-4">
                      <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Monthly Income</p>
                      <p className="mt-1 text-sm font-medium text-gray-900 dark:text-[#e6e6e6]">N/A</p>
                    </div>
                    <div className="rounded-md bg-gray-50 p-4">
                      <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Parent Username</p>
                      <p className="mt-1 text-sm font-medium text-gray-900 dark:text-[#e6e6e6]">N/A</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Other Information Tab */}
          <TabsContent value="other-info" className="p-6 bg-white dark:bg-[#101010] rounded-b-md">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-lg border bg-white dark:bg-[#252525] dark:border-[#303030] p-6 shadow-sm">
                <div className="mb-4 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-5 w-5 text-[#00501B] dark:text-[#7aad8c]" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-[#e6e6e6]">Previous School Information</h2>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-md bg-gray-50 p-4">
                    <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Previous School</p>
                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-[#e6e6e6]">N/A</p>
                  </div>
                  <div className="rounded-md bg-gray-50 p-4">
                    <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Last Class Attended</p>
                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-[#e6e6e6]">N/A</p>
                  </div>
                  <div className="rounded-md bg-gray-50 p-4">
                    <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Medium of Instruction</p>
                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-[#e6e6e6]">N/A</p>
                  </div>
                  <div className="rounded-md bg-gray-50 p-4">
                    <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Recognised by State Board</p>
                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-[#e6e6e6]">N/A</p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border bg-white dark:bg-[#252525] dark:border-[#303030] p-6 shadow-sm">
                <div className="mb-4 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-5 w-5 text-[#00501B] dark:text-[#7aad8c]" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-[#e6e6e6]">Previous School Location</h2>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-md bg-gray-50 p-4">
                    <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">School City</p>
                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-[#e6e6e6]">N/A</p>
                  </div>
                  <div className="rounded-md bg-gray-50 p-4">
                    <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">School State</p>
                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-[#e6e6e6]">N/A</p>
                  </div>
                  <div className="col-span-2 rounded-md bg-gray-50 p-4">
                    <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Reason for Leaving</p>
                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-[#e6e6e6]">N/A</p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border bg-white dark:bg-[#252525] dark:border-[#303030] p-6 shadow-sm">
                <div className="mb-4 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-5 w-5 text-[#00501B] dark:text-[#7aad8c]" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-[#e6e6e6]">Documents</h2>
                </div>

                <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No documents available</h3>
                  <p className="mt-1 text-sm text-gray-500">Student documents will appear here when uploaded</p>
                </div>
              </div>

              <div className="rounded-lg border bg-white dark:bg-[#252525] dark:border-[#303030] p-6 shadow-sm">
                <div className="mb-4 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-5 w-5 text-[#00501B] dark:text-[#7aad8c]" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-[#e6e6e6]">Additional Notes</h2>
                </div>

                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">No additional notes available for this student.</p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Sibling Details Tab */}
          <TabsContent value="sibling-details" className="p-6 bg-white dark:bg-[#101010] rounded-b-md">
            <div className="rounded-lg border bg-white dark:bg-[#252525] dark:border-[#303030] p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-5 w-5 text-[#00501B] dark:text-[#7aad8c]" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-[#e6e6e6]">Sibling Details</h2>
                </div>
                <button
                  className="flex items-center gap-1 rounded-md bg-[#00501B]/10 dark:bg-[#7aad8c]/10 px-3 py-1.5 text-sm font-medium text-[#00501B] dark:text-[#7aad8c] hover:bg-[#00501B]/20 dark:hover:bg-[#7aad8c]/20 transition-colors cursor-pointer clickable"
                  onClick={() => setIsSiblingModalOpen(true)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  <span>Add Sibling</span>
                </button>
              </div>

              <SiblingList
                studentId={id as string}
                onRefresh={refreshSiblings}
              />

              <div className="mt-6">
                <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">How to add siblings:</h3>
                <ol className="list-decimal pl-5 text-sm text-gray-500 dark:text-gray-400">
                  <li className="mb-1">Click the "Add Sibling" button above</li>
                  <li className="mb-1">Enter the admission number of the sibling</li>
                  <li className="mb-1">Select the relationship type</li>
                  <li>Click "Save" to establish the sibling relationship</li>
                </ol>
              </div>
            </div>

            {/* Sibling Modal */}
            <SiblingModal
              isOpen={isSiblingModalOpen}
              onClose={() => setIsSiblingModalOpen(false)}
              studentId={id as string}
              onSiblingAdded={refreshSiblings}
            />
          </TabsContent>
        </Tabs>
        </CardContent>
      </Card>
    </PageWrapper>
  );
};

StudentDetailPage.getLayout = (page) => {
  return <AppLayout title="Student Details" description="View student details">{page}</AppLayout>
};

export default StudentDetailPage;
