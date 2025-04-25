import { type NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/utils/api";
import { ArrowLeft, Edit, Trash, UserCheck, UserX, BookOpen } from "lucide-react";
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
import { useState } from "react";
import { ShareButton } from "@/components/shared/share-button";

const TeacherDetailPage: NextPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { data: teacher, isLoading } = api.teacher.getById.useQuery(
    { id: id as string },
    { enabled: !!id }
  );

  const utils = api.useContext();

  const deleteTeacherMutation = api.teacher.delete.useMutation({
    onSuccess: () => {
      void router.push("/teachers");
    },
  });

  const toggleStatusMutation = api.teacher.toggleStatus.useMutation({
    onSuccess: () => {
      void utils.teacher.getById.invalidate({ id: id as string });
    },
  });

  const handleDeleteTeacher = async () => {
    try {
      await deleteTeacherMutation.mutateAsync({ id: id as string });
    } catch (error) {
      console.error("Error deleting teacher:", error);
      alert("Failed to delete teacher. Please try again.");
    }
  };

  const handleToggleStatus = async () => {
    if (!teacher) return;
    
    try {
      await toggleStatusMutation.mutateAsync({
        id: id as string,
        isActive: !teacher.isActive,
      });
    } catch (error) {
      console.error("Error toggling teacher status:", error);
      alert("Failed to update teacher status. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-40" />
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-60" />
            <Skeleton className="h-60" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!teacher) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-12">
          <h1 className="text-2xl font-bold">Teacher not found</h1>
          <p className="text-gray-500">The teacher you are looking for does not exist.</p>
          <Link href="/teachers" className="mt-4">
            <Button>Back to Teachers</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <Head>
        <title>{`${teacher.firstName} ${teacher.lastName} | ScholaRise ERP`}</title>
        <meta name="description" content={`Teacher details for ${teacher.firstName} ${teacher.lastName}`} />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Layout>
        <div className="space-y-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div className="flex items-center gap-2">
              <Link href="/teachers">
                <Button variant="outline" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <h1 className="text-2xl font-bold">{teacher.firstName} {teacher.lastName}</h1>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${teacher.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {teacher.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className={`flex items-center gap-1 ${teacher.isActive ? 'text-red-500 hover:text-red-600' : 'text-green-500 hover:text-green-600'}`}
                onClick={handleToggleStatus}
              >
                {teacher.isActive ? (
                  <>
                    <UserX className="h-4 w-4" />
                    <span>Deactivate</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="h-4 w-4" />
                    <span>Activate</span>
                  </>
                )}
              </Button>
              <Link href={`/teachers/${id}/edit`}>
                <Button variant="outline" className="flex items-center gap-1">
                  <Edit className="h-4 w-4" />
                  <span>Edit</span>
                </Button>
              </Link>
              <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-1 text-red-500 hover:text-red-600">
                    <Trash className="h-4 w-4" />
                    <span>Delete</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action will permanently delete this teacher. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteTeacher}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <ShareButton
                resourceType="teacher"
                resourceId={id as string}
                resourceName={`Teacher: ${teacher.firstName} ${teacher.lastName}`}
              />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Teacher's personal details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">First Name</p>
                    <p>{teacher.firstName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Last Name</p>
                    <p>{teacher.lastName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Qualification</p>
                    <p>{teacher.qualification || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Specialization</p>
                    <p>{teacher.specialization || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Join Date</p>
                    <p>{teacher.joinDate ? new Date(teacher.joinDate).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Status</p>
                    <p className={teacher.isActive ? 'text-green-600' : 'text-red-600'}>
                      {teacher.isActive ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Assigned Classes</CardTitle>
                  <CardDescription>Classes assigned to this teacher</CardDescription>
                </div>
                <BookOpen className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {teacher.classes && teacher.classes.length > 0 ? (
                  <ul className="space-y-2">
                    {teacher.classes.map((cls) => (
                      <li key={cls.id} className="rounded-md border p-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{cls.name} - {cls.section}</p>
                            <p className="text-sm text-gray-500">Capacity: {cls.capacity}</p>
                          </div>
                          <Link href={`/classes/${cls.id}`}>
                            <Button variant="ghost" size="sm">View</Button>
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <BookOpen className="h-8 w-8 text-gray-400" />
                    <p className="mt-2 text-gray-500">No classes assigned yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    </>
  );
};

export default TeacherDetailPage;
