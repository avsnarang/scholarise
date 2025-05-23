"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  PlusCircle, 
  Search, 
  MoreHorizontal, 
  FileText, 
  ClipboardCheck, 
  Pencil, 
  Eye
} from "lucide-react";
import { ApplicationStatus } from "@/server/api/routers/admission";
import { format } from "date-fns";

// Define a type for the application item based on the query's return structure
// This is a simplified version; a more accurate type could be inferred or generated
type ApplicationItem = {
  id: string;
  applicationNumber: string;
  applicationDate: string | Date;
  status: ApplicationStatus;
  currentStage?: string | null;
  lead: {
    firstName: string;
    lastName: string;
  };
  assignedTo?: {
    name: string;
  } | null;
};

export default function ApplicationsPage() {
  const router = useRouter();
  const { currentBranchId } = useBranchContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "ALL">("ALL");
  
  // Get staff members for assignment dropdown
  const { data: staffMembers } = api.admission.getStaffMembers.useQuery(
    { isActive: true },
    { enabled: !!currentBranchId }
  );
  
  // Fetch applications data
  const { data: applications, isLoading } = api.admission.getApplications.useQuery(
    {
      branchId: currentBranchId!,
      status: statusFilter === "ALL" ? undefined : (statusFilter as ApplicationStatus),
      searchTerm: searchTerm || undefined,
      limit: 50,
    },
    {
      enabled: !!currentBranchId,
      refetchOnWindowFocus: false,
    }
  );
  
  // Status badge colors
  const getStatusBadgeColor = (status: ApplicationStatus) => {
    const statusColors: Record<ApplicationStatus, string> = {
      SUBMITTED: "bg-blue-500",
      IN_REVIEW: "bg-amber-500",
      ACCEPTED: "bg-green-500",
      REJECTED: "bg-red-500",
      WAITLISTED: "bg-purple-500",
      ENROLLED: "bg-emerald-500",
      WITHDRAWN: "bg-gray-500"
    };
    
    return statusColors[status] || "bg-gray-500";
  };
  
  // Create a new application
  const handleCreateApplication = (leadId?: string) => {
    router.push(`/admissions/applications/new${leadId ? `?leadId=${leadId}` : ''}`);
  };
  
  // View application details
  const handleViewApplication = (id: string) => {
    router.push(`/admissions/applications/${id}`);
  };
  
  // Edit application
  const handleEditApplication = (id: string) => {
    router.push(`/admissions/applications/${id}/edit`);
  };
  
  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Admission Applications</h2>
        <Button 
          onClick={() => handleCreateApplication()}
          className="flex items-center gap-1"
        >
          <PlusCircle className="h-4 w-4" />
          <span>New Application</span>
        </Button>
      </div>
      
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 md:items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search applications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <div className="w-full md:w-[180px]">
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as ApplicationStatus | "ALL")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="SUBMITTED">Submitted</SelectItem>
                  <SelectItem value="IN_REVIEW">In Review</SelectItem>
                  <SelectItem value="ACCEPTED">Accepted</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="WAITLISTED">Waitlisted</SelectItem>
                  <SelectItem value="ENROLLED">Enrolled</SelectItem>
                  <SelectItem value="WITHDRAWN">Withdrawn</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Applications Table */}
      <Card>
        <CardHeader>
          <CardTitle>Applications</CardTitle>
          <CardDescription>
            Manage admission applications
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !applications || applications.items.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground">No applications found</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => handleCreateApplication()}
              >
                Create Application
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Application #</TableHead>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Current Stage</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.items.map((application: ApplicationItem) => (
                  <TableRow key={application.id}>
                    <TableCell className="font-medium">
                      {application.applicationNumber}
                    </TableCell>
                    <TableCell>
                      {application.lead.firstName} {application.lead.lastName}
                    </TableCell>
                    <TableCell>
                      {format(new Date(application.applicationDate), "PP")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`${getStatusBadgeColor(application.status as ApplicationStatus)} text-white`}
                      >
                        {application.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{application.currentStage || "—"}</TableCell>
                    <TableCell>
                      {application.assignedTo ? application.assignedTo.name : "—"}
                    </TableCell>
                    <TableCell className="text-right">
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
                          <DropdownMenuItem onClick={() => handleViewApplication(application.id)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditApplication(application.id)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <FileText className="mr-2 h-4 w-4" />
                            Add Document
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <ClipboardCheck className="mr-2 h-4 w-4" />
                            Update Status
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 