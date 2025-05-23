"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
  Phone, 
  Mail, 
  Calendar, 
  Download,
  Filter
} from "lucide-react";
import { AdmissionStatus } from "@/server/api/routers/admission";
import { format } from "date-fns";
import { LeadDialog } from "./lead-dialog";

export default function LeadsPage() {
  const router = useRouter();
  const { currentBranchId } = useBranchContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<AdmissionStatus | "ALL">("ALL");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  
  // Fetch lead sources for dropdown
  const { data: leadSources, isLoading: isLoadingLeadSources } = api.admission.getLeadSources.useQuery(
    { isActive: true },
    { enabled: !!currentBranchId }
  );
  
  // Fetch staff members for assignment dropdown
  const { data: staffMembers, isLoading: isLoadingStaff } = api.admission.getStaffMembers.useQuery(
    { isActive: true },
    { enabled: !!currentBranchId }
  );
  
  // Fetch lead data
  const { data: leadsData, isLoading: isLoadingLeads } = api.admission.getLeads.useQuery(
    {
      branchId: currentBranchId!,
      status: statusFilter === "ALL" ? undefined : (statusFilter as AdmissionStatus),
      searchTerm: searchTerm || undefined,
      limit: 50,
    },
    {
      enabled: !!currentBranchId,
      refetchOnWindowFocus: false,
    }
  );
  
  // Handle creating a new lead
  const createLeadMutation = api.admission.createLead.useMutation({
    onSuccess: () => {
      // Refetch leads after creating a new one
      void refetchLeads();
      setIsAddDialogOpen(false);
    },
  });
  
  // Handle updating a lead
  const updateLeadMutation = api.admission.updateLead.useMutation({
    onSuccess: () => {
      // Refetch leads after updating
      void refetchLeads();
      setSelectedLeadId(null);
    },
  });
  
  // Refetch leads data
  const { refetch: refetchLeads } = api.admission.getLeads.useQuery(
    {
      branchId: currentBranchId!,
      status: statusFilter === "ALL" ? undefined : (statusFilter as AdmissionStatus),
      searchTerm: searchTerm || undefined,
      limit: 50,
    },
    {
      enabled: false,
    }
  );
  
  // Status badge colors
  const getStatusBadgeColor = (status: AdmissionStatus) => {
    const statusColors: Record<AdmissionStatus, string> = {
      NEW: "bg-blue-500",
      CONTACTED: "bg-sky-500",
      ENGAGED: "bg-cyan-500",
      FEE_PAID: "bg-lime-500",
      TOUR_SCHEDULED: "bg-teal-500",
      TOUR_COMPLETED: "bg-emerald-500",
      APPLICATION_SENT: "bg-green-500",
      APPLICATION_RECEIVED: "bg-lime-500",
      ASSESSMENT_SCHEDULED: "bg-yellow-500",
      ASSESSMENT_COMPLETED: "bg-amber-500",
      INTERVIEW_SCHEDULED: "bg-orange-500",
      INTERVIEW_COMPLETED: "bg-red-500",
      DECISION_PENDING: "bg-pink-500",
      OFFERED: "bg-rose-500",
      ACCEPTED: "bg-purple-500",
      REJECTED: "bg-gray-500",
      WAITLISTED: "bg-indigo-500",
      ENROLLED: "bg-violet-500",
      CLOSED_LOST: "bg-stone-500",
      ARCHIVE: "bg-slate-400",
    };
    
    return statusColors[status] || "bg-gray-500";
  };
  
  // Create a new lead
  const handleCreateLead = (data: any) => {
    if (currentBranchId) {
      createLeadMutation.mutate({
        ...data,
        branchId: currentBranchId,
      });
    }
  };
  
  // Update an existing lead
  const handleUpdateLead = (id: string, data: any) => {
    updateLeadMutation.mutate({
      id,
      ...data,
    });
  };
  
  // Open lead detail page
  const handleViewLead = (id: string) => {
    router.push(`/admissions/leads/${id}`);
  };
  
  // Handle creating application for lead
  const handleCreateApplication = (leadId: string) => {
    router.push(`/admissions/applications/new?leadId=${leadId}`);
  };

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Admission Leads</h2>
        <Button 
          onClick={() => setIsAddDialogOpen(true)}
          className="flex items-center gap-1"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Add Lead</span>
        </Button>
      </div>
      
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 md:items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <div className="w-full md:w-[180px]">
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as AdmissionStatus | "ALL")}
              >
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <SelectValue placeholder="All Statuses" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="NEW">New</SelectItem>
                  <SelectItem value="CONTACTED">Contacted</SelectItem>
                  <SelectItem value="ENGAGED">Engaged</SelectItem>
                  <SelectItem value="TOUR_SCHEDULED">Tour Scheduled</SelectItem>
                  <SelectItem value="TOUR_COMPLETED">Tour Completed</SelectItem>
                  <SelectItem value="APPLICATION_SENT">Application Sent</SelectItem>
                  <SelectItem value="APPLICATION_RECEIVED">Application Received</SelectItem>
                  <SelectItem value="ASSESSMENT_SCHEDULED">Assessment Scheduled</SelectItem>
                  <SelectItem value="ASSESSMENT_COMPLETED">Assessment Completed</SelectItem>
                  <SelectItem value="INTERVIEW_SCHEDULED">Interview Scheduled</SelectItem>
                  <SelectItem value="INTERVIEW_COMPLETED">Interview Completed</SelectItem>
                  <SelectItem value="DECISION_PENDING">Decision Pending</SelectItem>
                  <SelectItem value="OFFERED">Offered</SelectItem>
                  <SelectItem value="ACCEPTED">Accepted</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="WAITLISTED">Waitlisted</SelectItem>
                  <SelectItem value="ENROLLED">Enrolled</SelectItem>
                  <SelectItem value="CLOSED_LOST">Closed (Lost)</SelectItem>
                  <SelectItem value={AdmissionStatus.ARCHIVE}>Archive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Leads Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Created Date</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingLeads ? (
              // Loading skeletons
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  {Array.from({ length: 8 }).map((_, cellIndex) => (
                    <TableCell key={cellIndex}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : leadsData?.items && leadsData.items.length > 0 ? (
              // Actual data
              leadsData.items.map((lead: any) => (
                <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleViewLead(lead.id)}>
                  <TableCell className="font-medium">
                    {lead.firstName} {lead.lastName}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      {lead.phone && (
                        <div className="flex items-center text-xs">
                          <Phone className="h-3 w-3 mr-1" />
                          <span>{lead.phone}</span>
                        </div>
                      )}
                      {lead.email && (
                        <div className="flex items-center text-xs">
                          <Mail className="h-3 w-3 mr-1" />
                          <span>{lead.email}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{lead.gradeApplyingFor || "N/A"}</TableCell>
                  <TableCell>{lead.source?.name || "N/A"}</TableCell>
                  <TableCell>
                    <Badge className={getStatusBadgeColor(lead.status)}>
                      {lead.status.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>{lead.assignedTo?.name || "Unassigned"}</TableCell>
                  <TableCell>
                    <div className="flex items-center text-xs">
                      <Calendar className="h-3 w-3 mr-1" />
                      <span>{format(new Date(lead.createdAt), "MMM d, yyyy")}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLeadId(lead.id);
                        }}>
                          Edit Lead
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleCreateApplication(lead.id);
                        }}>
                          Create Application
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              // No data
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No leads found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Add Lead Dialog */}
      <LeadDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onSubmit={handleCreateLead}
        leadSources={leadSources || []}
        staffMembers={staffMembers || []}
        title="Add New Lead"
      />
      
      {/* Edit Lead Dialog */}
      {selectedLeadId && (
        <LeadDialog
          isOpen={!!selectedLeadId}
          onClose={() => setSelectedLeadId(null)}
          onSubmit={(data) => handleUpdateLead(selectedLeadId, data)}
          leadSources={leadSources || []}
          staffMembers={staffMembers || []}
          title="Edit Lead"
          leadId={selectedLeadId}
        />
      )}
    </div>
  );
} 