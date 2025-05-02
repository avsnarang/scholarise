"use client";

import { useState, useEffect } from "react";
import { api } from "@/utils/api";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Edit, Trash, UserX, UserCheck } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";
import { useDeleteConfirm, useStatusChangeConfirm } from "@/utils/popup-utils";
import { Badge } from "@/components/ui/badge";

export default function TeacherDetailPage() {
  const params = useParams() || {};
  const teacherId = params.id as string;
  const router = useRouter();
  const { toast } = useToast();
  const deleteConfirm = useDeleteConfirm();
  const statusChangeConfirm = useStatusChangeConfirm();
  const [currentTab, setCurrentTab] = useState("overview");

  // Fetch teacher data
  const { data: teacher, isLoading, error } = api.teacher.getById.useQuery({ 
    id: teacherId 
  }, {
    enabled: !!teacherId,
    retry: 1
  }) as { data: any, isLoading: boolean, error: any };

  // Update document title when teacher data is loaded
  useEffect(() => {
    if (teacher) {
      document.title = `${teacher.firstName} ${teacher.lastName} - Teacher Details | ScholaRise ERP`;
    }
  }, [teacher]);

  const utils = api.useContext();

  // API mutations
  const deleteTeacherMutation = api.teacher.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "Teacher deleted",
        description: "Teacher has been successfully deleted.",
        variant: "success",
      });
      void utils.teacher.getAll.invalidate();
      void utils.teacher.getStats.invalidate();
      void router.push("/teachers");
    },
    onError: (error) => {
      toast({
        title: "Error deleting teacher",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleStatusMutation = api.teacher.toggleStatus.useMutation({
    onSuccess: () => {
      toast({
        title: `Teacher ${teacher?.isActive ? "deactivated" : "activated"}`,
        description: `Teacher has been ${teacher?.isActive ? "deactivated" : "activated"} successfully.`,
        variant: "success",
      });
      void utils.teacher.getById.invalidate({ id: teacherId });
      void utils.teacher.getAll.invalidate();
      void utils.teacher.getStats.invalidate();
    },
    onError: (error) => {
      toast({
        title: "Error updating teacher status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete handler
  const handleDelete = () => {
    if (!teacher) return;
    
    deleteConfirm("teacher", async () => {
      await deleteTeacherMutation.mutateAsync({ id: teacherId });
    });
  };

  // Toggle status handler
  const handleToggleStatus = () => {
    if (!teacher) return;
    
    statusChangeConfirm("teacher", !teacher.isActive, 1, async () => {
      await toggleStatusMutation.mutateAsync({
        id: teacherId,
        isActive: !teacher.isActive,
      });
    });
  };

  if (isLoading) {
    return (
      <div className="px-4 lg:px-6">
        <div className="space-y-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  if (error || !teacher) {
    return (
      <div className="px-4 lg:px-6">
        <div className="py-8 text-center">
          <p className="text-muted-foreground mb-4">
            Error: {error?.message || "Teacher not found"}
          </p>
          <Button asChild>
            <Link href="/teachers">Back to Teachers</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 lg:px-6">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button variant="outline" size="icon" asChild>
              <Link href="/teachers">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              {teacher.firstName} {teacher.lastName}
            </h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{teacher.employeeCode || ""}</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={teacher.isActive ? "outline" : "default"}
            className="flex items-center gap-1"
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
          <Button 
            asChild
            variant="outline"
            className="flex items-center gap-1"
          >
            <Link href={`/teachers/${teacherId}/edit`}>
              <Edit className="h-4 w-4" />
              <span>Edit</span>
            </Link>
          </Button>
          <Button 
            variant="destructive"
            className="flex items-center gap-1"
            onClick={handleDelete}
          >
            <Trash className="h-4 w-4" />
            <span>Delete</span>
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <Badge variant={teacher.isActive ? "default" : "secondary"} className={`text-sm ${teacher.isActive ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}`}>
          {teacher.isActive ? "Active" : "Inactive"}
        </Badge>
      </div>

      <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="classes">Classes</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Basic personal details of the teacher</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                <p>{teacher.firstName} {teacher.lastName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Employee Code</p>
                <p>{teacher.employeeCode || "Not assigned"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p>{teacher.email || "Not provided"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Phone</p>
                <p>{teacher.phone || "Not provided"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Branch</p>
                <p>{teacher.branch?.name || "Not assigned"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Join Date</p>
                <p>{teacher.joinDate ? new Date(teacher.joinDate).toLocaleDateString() : "Not specified"}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Qualifications</CardTitle>
              <CardDescription>Professional qualifications and specializations</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Qualification</p>
                <p>{teacher.qualification || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Specialization</p>
                <p>{teacher.specialization || "Not specified"}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="classes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assigned Classes</CardTitle>
              <CardDescription>Classes assigned to this teacher</CardDescription>
            </CardHeader>
            <CardContent>
              {teacher.classes && teacher.classes.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {teacher.classes.map((cls: any) => (
                    <div key={cls.id} className="rounded-md border p-4">
                      <p className="font-medium">{cls.name} {cls.section}</p>
                      <p className="text-sm text-muted-foreground">{cls.description || "No description"}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No classes assigned to this teacher.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="activities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activities</CardTitle>
              <CardDescription>Recent activities and logs for this teacher</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">No recent activities found.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
