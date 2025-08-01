"use client";

import React from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquare, Users, BookOpen, Phone } from "lucide-react";
import { api } from "@/utils/api";
import { useAuth } from "@/hooks/useAuth";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { CourtesyCallsDataTable } from "@/components/courtesy-calls/courtesy-calls-data-table";
import { usePermissions } from "@/hooks/usePermissions";
import { Permission } from "@/types/permissions";

export default function TeacherCourtesyCallsPage() {
  const { user } = useAuth();
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  const { can } = usePermissions();

  // Check permissions
  const canAdd = can(Permission.CREATE_COURTESY_CALL_FEEDBACK);
  const canEdit = can(Permission.EDIT_COURTESY_CALL_FEEDBACK);
  const canDelete = can(Permission.DELETE_COURTESY_CALL_FEEDBACK);
  const canViewOwn = can(Permission.VIEW_OWN_COURTESY_CALL_FEEDBACK);

  // Get teacher's students
  const {
    data: studentsData,
    isLoading: isLoadingStudents,
    error: studentsError,
  } = api.courtesyCalls.getTeacherStudents.useQuery(
    {
      branchId: currentBranchId || undefined,
      sessionId: currentSessionId || undefined,
    },
    {
      enabled: !!currentBranchId && !!user,
    }
  );

  // Get teacher information
  const {
    data: teacherData,
    isLoading: isLoadingTeacher,
  } = api.teacher.getByUserId.useQuery(
    { userId: user?.id || "" },
    { enabled: !!user?.id }
  );

  // Get feedback statistics
  const {
    data: stats,
    isLoading: isLoadingStats,
  } = api.courtesyCalls.getStats.useQuery(
    {
      branchId: currentBranchId || undefined,
      teacherId: teacherData?.id || undefined,
    },
    {
      enabled: !!currentBranchId && !!teacherData?.id,
      staleTime: 5 * 60 * 1000, // 5 minutes - don't refetch if data is less than 5 minutes old
      refetchOnWindowFocus: false, // Don't refetch when window regains focus
    }
  );

  const students = (studentsData?.items || []).map((student: any) => ({
    ...student,
    section: student.section ? {
      name: student.section.name,
      class: student.section.class ? {
        name: student.section.class.name
      } : undefined
    } : undefined
  }));
  const totalStudents = studentsData?.totalCount || 0;

  if (isLoadingTeacher) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading teacher information...</p>
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (!teacherData) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
            <p className="text-muted-foreground">
              This page is only accessible to teachers. Please contact your administrator
              if you believe this is an error.
            </p>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Courtesy Calls</h1>
            <p className="text-muted-foreground mt-1">
              Manage courtesy call feedback for your students
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            <Users className="w-4 h-4 mr-2" />
            Teacher View
          </Badge>
        </div>

        {/* Teacher Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Your Teaching Assignment
            </CardTitle>
            <CardDescription>
              Students assigned to your classes for the current academic session
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-2xl font-bold text-primary">
                  {totalStudents}
                </div>
                <p className="text-sm text-muted-foreground">Total Students</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-secondary-foreground">
                  {teacherData.sections?.length || 0}
                </div>
                <p className="text-sm text-muted-foreground">Classes Assigned</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-accent-foreground">
                  {stats?.totalFeedback || 0}
                </div>
                <p className="text-sm text-muted-foreground">Feedback Records</p>
              </div>
            </div>

            {teacherData.sections && teacherData.sections.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Your Classes:</h4>
                <div className="flex flex-wrap gap-2">
                  {teacherData.sections.map((section: any) => (
                    <Badge key={section.id} variant="secondary">
                      {section.class?.name || "Unknown"} - {section.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>



        

        {/* Students Data Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Your Students
            </CardTitle>
            <CardDescription>
              Students assigned to your classes with parent contact information
            </CardDescription>
          </CardHeader>
          <CardContent>
            {studentsError ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 text-destructive mx-auto mb-2" />
                  <p className="text-destructive font-medium">Error loading students</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {studentsError.message || "Please try refreshing the page"}
                  </p>
                </div>
              </div>
            ) : (
              <CourtesyCallsDataTable
                students={students}
                isLoading={isLoadingStudents}
                canAdd={canAdd}
                canEdit={canEdit}
                canDelete={false} // Teachers typically can't delete feedback
                canViewAll={false} // Teachers only see their own feedback
                pageSize={15}
              />
            )}
          </CardContent>
        </Card>

        {/* Permissions Notice */}
        {!canAdd && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-yellow-800">
                <MessageSquare className="w-5 h-5" />
                <p className="text-sm">
                  <strong>Limited Access:</strong> You have view-only access to courtesy calls.
                  Contact your administrator if you need to add feedback.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageWrapper>
  );
} 