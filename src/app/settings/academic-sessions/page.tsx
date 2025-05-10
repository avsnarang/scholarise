"use client";

import { useState } from "react";
import Link from "next/link";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  ChevronLeft,
  Calendar,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash,
  CheckCircle,
  RefreshCw,
} from "lucide-react";

import { api } from "@/utils/api";

// Simple date formatter function to avoid date-fns dependency issues
function formatShortDate(date: Date): string {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();

  return `${month} ${day}, ${year}`;
}

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { AcademicSessionFormModal } from "@/components/settings/academic-session-form-modal";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";

export default function AcademicSessionsPage() {
  const { toast } = useToast();

  // State for UI
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Fetch academic sessions with classes count
  const {
    data: sessions,
    isLoading,
    refetch: refetchSessions,
  } = api.academicSession.getAll.useQuery({ includeClassCount: true });

  // Mutations
  const deleteMutation = api.academicSession.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "Academic session deleted",
        description: "The academic session has been deleted successfully.",
        variant: "success",
      });
      setIsDeleteDialogOpen(false);
      void refetchSessions();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete academic session. Please try again.",
        variant: "destructive",
      });
    },
  });

  const setActiveMutation = api.academicSession.setActive.useMutation({
    onSuccess: () => {
      toast({
        title: "Academic session activated",
        description: "The academic session has been set as active.",
        variant: "success",
      });
      void refetchSessions();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to activate academic session. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handlers
  const handleAddSession = () => {
    setSelectedSession(null);
    setIsFormModalOpen(true);
  };

  const handleEditSession = (session: any) => {
    setSelectedSession(session);
    setIsFormModalOpen(true);
  };

  const handleDeleteSession = (session: any) => {
    setSelectedSession(session);
    setIsDeleteDialogOpen(true);
  };

  const handleSetActive = (sessionId: string) => {
    setActiveMutation.mutate({ id: sessionId });
  };

  const confirmDelete = () => {
    if (selectedSession) {
      deleteMutation.mutate({ id: selectedSession.id });
    }
  };

  const handleFormSuccess = () => {
    setIsFormModalOpen(false);
    void refetchSessions();
  };

  // Filter sessions based on search query
  const filteredSessions = sessions?.filter((session) => {
    if (!searchQuery) return true;

    const searchLower = searchQuery.toLowerCase();
    return (
      session.name.toLowerCase().includes(searchLower)
    );
  }) || [];

  return (
    <PageWrapper>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/settings">
            <Button variant="ghost" className="flex items-center gap-1 p-0">
              <ChevronLeft className="h-4 w-4" />
              <span>Back to Settings</span>
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-[#00501B]">Academic Session Management</h1>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
            <p className="text-sm text-gray-500">
              Manage academic sessions for your school. Academic sessions are used to organize classes and student records by academic year.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleAddSession}
              className="bg-[#00501B] hover:bg-[#00501B]/90 text-white clickable"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Session
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
                placeholder="Search sessions..."
                className="w-full pl-9 pr-4"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => void refetchSessions()}
            className="clickable"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Sessions table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Academic Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Classes</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 3 }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20 float-right" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Classes</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSessions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">
                          {searchQuery ? "No sessions found matching your search." : "No academic sessions found. Click the 'Add Session' button to create your first session."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSessions.map((session) => (
                        <TableRow key={session.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center">
                              <Calendar className="mr-2 h-4 w-4 text-gray-400" />
                              {session.name}
                            </div>
                          </TableCell>
                          <TableCell>
                            {session.startDate && session.endDate ? (
                              <span>
                                {formatShortDate(new Date(session.startDate))} - {formatShortDate(new Date(session.endDate))}
                              </span>
                            ) : (
                              <span className="text-gray-400">Not set</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {session.isActive ? (
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
                            ) : (
                              <Badge variant="outline" className="text-gray-500">Inactive</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{session._count?.classes || 0}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon" className="h-8 w-8 clickable">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {!session.isActive && (
                                  <>
                                    <DropdownMenuItem 
                                      onClick={() => handleSetActive(session.id)}
                                      className="clickable"
                                    >
                                      <CheckCircle className="mr-2 h-4 w-4" />
                                      <span>Set as Active</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                  </>
                                )}
                                <DropdownMenuItem 
                                  onClick={() => handleEditSession(session)}
                                  className="clickable"
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  <span>Edit</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteSession(session)}
                                  className="text-red-600 focus:text-red-600 clickable"
                                  disabled={session.isActive || !!(session._count?.classes && session._count.classes > 0)}
                                >
                                  <Trash className="mr-2 h-4 w-4" />
                                  <span>Delete</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
    </div>

      {/* Modals */}
      <AcademicSessionFormModal
        isOpen={isFormModalOpen}
        sessionData={selectedSession}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={handleFormSuccess}
      />

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        title="Delete Academic Session"
        description={`Are you sure you want to delete the academic session "${selectedSession?.name}"? This action cannot be undone.`}
        onConfirm={confirmDelete}
        onClose={() => setIsDeleteDialogOpen(false)}
        isDeleting={deleteMutation.isPending}
      />
    </PageWrapper>
  );
}
