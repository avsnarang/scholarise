"use client";

import React, { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  MessageSquare,
  Users,
  Search,
  Filter,
  UserCheck,
  School,
  Eye,
} from "lucide-react";
import { api } from "@/utils/api";
import { useAuth } from "@/hooks/useAuth";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { CourtesyCallsDataTable } from "@/components/courtesy-calls/courtesy-calls-data-table";
import { CourtesyCallsStatsCards } from "@/components/courtesy-calls/courtesy-calls-stats-cards";
import { usePermissions } from "@/hooks/usePermissions";
import { Permission } from "@/types/permissions";

function HeadCourtesyCallsPageContent() {
  const { user } = useAuth();
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  const { can } = usePermissions();

  // State for search and filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [showStudents, setShowStudents] = useState(false);

  // Check permissions
  const canAdd = can(Permission.CREATE_COURTESY_CALL_FEEDBACK);
  const canEdit = can(Permission.EDIT_COURTESY_CALL_FEEDBACK);
  const canDelete = can(Permission.DELETE_COURTESY_CALL_FEEDBACK);
  const canViewAll = can(Permission.VIEW_ALL_COURTESY_CALL_FEEDBACK);

  // Get classes and sections
  const {
    data: sectionsData,
    isLoading: isLoadingSections,
  } = api.section.getAll.useQuery(
    {
      includeClass: true,
      isActive: true,
      branchId: currentBranchId || undefined,
      sessionId: currentSessionId || undefined,
    },
    {
      enabled: !!currentBranchId && !!currentSessionId,
    }
  );

  // Get students based on search or class selection
  const {
    data: studentsData,
    isLoading: isLoadingStudents,
    error: studentsError,
  } = api.student.getAll.useQuery(
    {
      branchId: currentBranchId || undefined,
      search: searchQuery || undefined,
      sectionId: selectedSectionId || undefined,
      limit: 500,
    },
    {
      enabled: (!!searchQuery || !!selectedSectionId) && !!currentBranchId,
    }
  );

  // Get feedback statistics
  const {
    data: stats,
    isLoading: isLoadingStats,
  } = api.courtesyCalls.getStats.useQuery(
    {
      branchId: currentBranchId || undefined,
      classId: selectedClassId || undefined,
    },
    {
      enabled: !!currentBranchId,
    }
  );

  // Process sections data
  const sections = sectionsData || [];
  const classes = useMemo(() => {
    const classMap = new Map();
    sections.forEach((section) => {
      if (section.class) {
        classMap.set(section.class.id, section.class);
      }
    });
    return Array.from(classMap.values()).sort((a, b) => {
      return (a.displayOrder || 0) - (b.displayOrder || 0);
    });
  }, [sections]);

  const sectionsForClass = useMemo(() => {
    if (!selectedClassId) return [];
    return sections
      .filter((section) => section.class?.id === selectedClassId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [sections, selectedClassId]);

  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
    setSelectedSectionId(""); // Reset section when class changes
    setShowStudents(false);
  };

  const handleSectionChange = (sectionId: string) => {
    setSelectedSectionId(sectionId);
    setShowStudents(true);
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setSelectedClassId("");
      setSelectedSectionId("");
      setShowStudents(true);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedClassId("");
    setSelectedSectionId("");
    setShowStudents(false);
  };

  const students = (studentsData?.items || []).map((student: any) => ({
    ...student,
    section: student.section ? {
      name: student.section.name,
      class: student.section.class ? {
        name: student.section.class.name
      } : undefined
    } : undefined
  }));
  const shouldShowStudents = showStudents && (searchQuery || selectedSectionId);

  return (
    <PageWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Courtesy Calls</h1>
            <p className="text-muted-foreground mt-1">
              Manage courtesy call feedback for all students
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            <UserCheck className="w-4 h-4 mr-2" />
            Head View
          </Badge>
        </div>

        {/* Statistics */}
        <CourtesyCallsStatsCards
          branchId={currentBranchId || undefined}
        />

        {/* Search and Filter Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Find Students
            </CardTitle>
            <CardDescription>
              Search for specific students or browse by class and section
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search by student */}
            <div className="space-y-2">
              <Label htmlFor="search">Search Students</Label>
              <div className="flex gap-2">
                <Input
                  id="search"
                  placeholder="Search by name or admission number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSearch();
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  onClick={handleSearch}
                  disabled={!searchQuery.trim()}
                  variant="outline"
                >
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="h-px bg-border flex-1" />
              <span className="text-sm text-muted-foreground">OR</span>
              <div className="h-px bg-border flex-1" />
            </div>

            {/* Browse by class */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="class">Select Class</Label>
                <Select
                  value={selectedClassId}
                  onValueChange={handleClassChange}
                  disabled={isLoadingSections}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        <div className="flex items-center gap-2">
                          <School className="w-4 h-4" />
                          {cls.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="section">Select Section</Label>
                <Select
                  value={selectedSectionId}
                  onValueChange={handleSectionChange}
                  disabled={!selectedClassId || sectionsForClass.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    {sectionsForClass.map((section) => (
                      <SelectItem key={section.id} value={section.id}>
                        {section.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <Button
                onClick={handleClearFilters}
                variant="outline"
                size="sm"
                disabled={!searchQuery && !selectedClassId}
              >
                <Filter className="w-4 h-4 mr-2" />
                Clear Filters
              </Button>
              {shouldShowStudents && (
                <Badge variant="secondary" className="ml-auto">
                  <Eye className="w-3 h-3 mr-1" />
                  Showing {students.length} students
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Students Data Table */}
        {shouldShowStudents && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Students
                {searchQuery && (
                  <Badge variant="outline" className="ml-2">
                    Search: "{searchQuery}"
                  </Badge>
                )}
                {selectedSectionId && selectedSectionId !== "all" && (
                  <Badge variant="outline" className="ml-2">
                    Section: {sectionsForClass.find(s => s.id === selectedSectionId)?.name}
                  </Badge>
                )}
                {selectedSectionId === "all" && selectedClassId && (
                  <Badge variant="outline" className="ml-2">
                    Class: {classes.find(c => c.id === selectedClassId)?.name}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Students with parent contact information and feedback options
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
                  canDelete={canDelete}
                  canViewAll={canViewAll}
                  pageSize={20}
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* Welcome message when no filters applied */}
        {!shouldShowStudents && (
          <Card>
            <CardContent className="pt-8 pb-8">
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Select Students</h3>
                  <p className="text-muted-foreground max-w-md">
                    Use the search bar above to find specific students, or select a
                    class and section to view all students in that group.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        {stats?.recentFeedback && stats.recentFeedback.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>
                Latest courtesy call feedback from your branch
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.recentFeedback.slice(0, 5).map((feedback: any) => (
                  <div
                    key={feedback.id}
                    className="flex items-start justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">
                          {feedback.student?.firstName} {feedback.student?.lastName}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {feedback.student?.section?.class?.name} - {feedback.student?.section?.name}
                        </Badge>
                        <Badge
                          variant={feedback.callerType === "TEACHER" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {feedback.callerType}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {feedback.feedback}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground ml-4">
                      {new Date(feedback.callDate).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

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
// Dynamically import to disable SSR completely
const DynamicHeadCourtesyCallsPageContent = dynamic(() => Promise.resolve(HeadCourtesyCallsPageContent), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center p-8">Loading...</div>
});

export default function HeadCourtesyCallsPage() {
  return <DynamicHeadCourtesyCallsPageContent />;
} 