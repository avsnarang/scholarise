"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  PlusCircle, 
  Search, 
  Phone, 
  Mail, 
  Calendar, 
  Filter,
  Eye,
  Edit
} from "lucide-react";
import { format } from "date-fns";
import { RegistrationForm } from "@/components/admissions/registration-form";

const statusColors = {
  NEW: "bg-blue-500",
  CONTACTED: "bg-orange-500", 
  VISIT_SCHEDULED: "bg-purple-500",
  VISITED: "bg-indigo-500",
  FORM_SUBMITTED: "bg-yellow-500",
  ADMITTED: "bg-green-500",
  REJECTED: "bg-red-500",
  CLOSED: "bg-gray-500",
} as const;

export default function InquiriesPage() {
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<keyof typeof statusColors | "ALL">("ALL");
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
  const searchParams = useSearchParams();

  // Check for openModal query parameter and open modal automatically
  useEffect(() => {
    const openModal = searchParams.get('openModal');
    if (openModal === 'true') {
      setIsRegistrationModalOpen(true);
    }
  }, [searchParams]);

  const { data: inquiriesData, isLoading, refetch } = api.admissions.getInquiries.useQuery({
    branchId: currentBranchId || undefined,
    sessionId: currentSessionId || undefined,
    status: statusFilter === "ALL" ? undefined : statusFilter,
  });

  const inquiries = inquiriesData?.items || [];

  const filteredInquiries = inquiries.filter((inquiry: any) =>
    inquiry.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inquiry.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inquiry.parentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inquiry.parentPhone.includes(searchTerm) ||
    inquiry.classApplying.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRegistrationSuccess = () => {
    setIsRegistrationModalOpen(false);
    refetch(); // Refresh the inquiries list
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admission Inquiries</h1>
          <p className="text-muted-foreground">
            Manage and track admission inquiries and applications
          </p>
        </div>
        <Button onClick={() => setIsRegistrationModalOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Registration
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter inquiries by status, search terms, etc.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, phone, class..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as keyof typeof statusColors | "ALL")}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="NEW">New</SelectItem>
                <SelectItem value="CONTACTED">Contacted</SelectItem>
                <SelectItem value="VISIT_SCHEDULED">Visit Scheduled</SelectItem>
                <SelectItem value="VISITED">Visited</SelectItem>
                <SelectItem value="FORM_SUBMITTED">Form Submitted</SelectItem>
                <SelectItem value="ADMITTED">Admitted</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Inquiries Table */}
      <Card>
        <CardHeader>
          <CardTitle>Inquiries ({filteredInquiries.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00501B] mx-auto"></div>
                <p className="mt-2 text-sm text-muted-foreground">Loading inquiries...</p>
              </div>
            </div>
          ) : filteredInquiries.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No inquiries found</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Registration #</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Parent Details</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInquiries.map((inquiry: any) => (
                    <TableRow key={inquiry.id}>
                      <TableCell className="font-medium">
                        {inquiry.registrationNumber}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{inquiry.firstName} {inquiry.lastName}</p>
                          {inquiry.dateOfBirth && (
                            <p className="text-sm text-muted-foreground">
                              DOB: {format(new Date(inquiry.dateOfBirth), 'dd/MM/yyyy')}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{inquiry.parentName}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {inquiry.parentPhone}
                          </div>
                          {inquiry.parentEmail && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {inquiry.parentEmail}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{inquiry.classApplying}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary" 
                          className={`${statusColors[inquiry.status as keyof typeof statusColors] || "bg-gray-500"} text-white`}
                        >
                          {inquiry.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{format(new Date(inquiry.createdAt), 'dd/MM/yyyy')}</p>
                          <p className="text-muted-foreground">
                            {format(new Date(inquiry.createdAt), 'HH:mm')}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          <Button variant="outline" size="sm">
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Registration Modal */}
      <Dialog open={isRegistrationModalOpen} onOpenChange={setIsRegistrationModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Registration</DialogTitle>
          </DialogHeader>
          <RegistrationForm 
            onSuccess={handleRegistrationSuccess}
            className="max-w-none mx-0"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
} 