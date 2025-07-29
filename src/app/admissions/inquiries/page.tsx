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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  PlusCircle, 
  Search, 
  Phone, 
  Mail, 
  Calendar, 
  Filter,
  Eye,
  Edit,
  User,
  Users,
  MapPin,
  Clock,
  CheckCircle,
  GraduationCap,
  BookOpen,
  Trash2
} from "lucide-react";
import { format } from "date-fns";
import { RegistrationForm } from "@/components/admissions/registration-form";
import { useToast } from "@/components/ui/use-toast";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { EnhancedStudentForm } from "@/components/students/enhanced-student-form";
import { AdmissionsPageGuard } from "@/components/auth/page-guard";

const statusColors = {
  NEW: "bg-blue-500",
  CONTACTED: "bg-orange-500", 
  VISIT_SCHEDULED: "bg-purple-500",
  VISITED: "bg-indigo-500",
  FORM_SUBMITTED: "bg-yellow-500",
  INTERVIEW_SCHEDULED: "bg-cyan-500",
  INTERVIEW_CONCLUDED: "bg-teal-500",
  ADMITTED: "bg-green-500",
  REJECTED: "bg-red-500",
  CLOSED: "bg-gray-500",
} as const;

const statusOptions = [
  { value: "NEW", label: "New Registration" },
  { value: "CONTACTED", label: "Parent Contacted" },
  { value: "VISIT_SCHEDULED", label: "School Visit Scheduled" },
  { value: "VISITED", label: "Visited" },
  { value: "FORM_SUBMITTED", label: "Form Submitted" },
  { value: "INTERVIEW_SCHEDULED", label: "Interview/Test Scheduled" },
  { value: "INTERVIEW_CONCLUDED", label: "Interview/Test Concluded" },
  { value: "ADMITTED", label: "Admission Confirmed" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CLOSED", label: "Closed" },
];

function InquiriesPageContent() {
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<keyof typeof statusColors | "ALL">("ALL");
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editStatus, setEditStatus] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editSource, setEditSource] = useState("");
  const [editAssignedToId, setEditAssignedToId] = useState("");
  const [editFollowUpDate, setEditFollowUpDate] = useState<Date | undefined>(undefined);
  const [editContactMethod, setEditContactMethod] = useState("");
  const [editContactNotes, setEditContactNotes] = useState("");
  const [editVisitDate, setEditVisitDate] = useState<Date | undefined>(undefined);
  const [editInterviewDate, setEditInterviewDate] = useState<Date | undefined>(undefined);
  const [editInterviewMode, setEditInterviewMode] = useState("");
  const [editInterviewNotes, setEditInterviewNotes] = useState("");
  const [editInterviewRemarks, setEditInterviewRemarks] = useState("");
  const [editInterviewMarks, setEditInterviewMarks] = useState("");
  
  // Student information fields
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editDateOfBirth, setEditDateOfBirth] = useState<Date | undefined>(undefined);
  const [editGender, setEditGender] = useState("");
  const [editClassApplying, setEditClassApplying] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editParentName, setEditParentName] = useState("");
  const [editParentPhone, setEditParentPhone] = useState("");
  const [editParentEmail, setEditParentEmail] = useState("");
  
  // Additional detailed information fields
  const [editMotherName, setEditMotherName] = useState("");
  const [editMotherMobile, setEditMotherMobile] = useState("");
  const [editMotherEmail, setEditMotherEmail] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editState, setEditState] = useState("");
  const [editCountry, setEditCountry] = useState("");
  const [editClassLastAttended, setEditClassLastAttended] = useState("");
  const [editSchoolLastAttended, setEditSchoolLastAttended] = useState("");
  const [editPercentageObtained, setEditPercentageObtained] = useState("");
  
  // Workflow modals state
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
  const [isInterviewScheduleModalOpen, setIsInterviewScheduleModalOpen] = useState(false);
  const [isInterviewConcludeModalOpen, setIsInterviewConcludeModalOpen] = useState(false);
  const [isAdmissionModalOpen, setIsAdmissionModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isStudentFormModalOpen, setIsStudentFormModalOpen] = useState(false);
  
  // Workflow form data state
  const [contactMethod, setContactMethod] = useState("");
  const [contactNotes, setContactNotes] = useState("");
  const [visitDate, setVisitDate] = useState<Date | undefined>(undefined);
  const [visitTime, setVisitTime] = useState("");
  const [interviewDate, setInterviewDate] = useState<Date | undefined>(undefined);
  const [interviewTime, setInterviewTime] = useState("");
  const [interviewMode, setInterviewMode] = useState("");
  const [interviewNotes, setInterviewNotes] = useState("");
  const [interviewRemarks, setInterviewRemarks] = useState("");
  const [interviewMarks, setInterviewMarks] = useState("");
  
  const searchParams = useSearchParams();
  const { toast } = useToast();

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

  const updateInquiry = api.admissions.updateInquiry.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Registration details updated successfully",
      });
      refetch();
      setIsEditModalOpen(false);
      // Reset edit form
      setEditFirstName("");
      setEditLastName("");
      setEditDateOfBirth(undefined);
      setEditGender("");
      setEditClassApplying("");
      setEditAddress("");
      setEditParentName("");
      setEditParentPhone("");
      setEditParentEmail("");
      setEditMotherName("");
      setEditMotherMobile("");
      setEditMotherEmail("");
      setEditCity("");
      setEditState("");
      setEditCountry("");
      setEditClassLastAttended("");
      setEditSchoolLastAttended("");
      setEditPercentageObtained("");
    },
    onError: (error) => {
      toast({
        title: "Error", 
        description: error.message || "Failed to update registration details",
        variant: "destructive",
      });
    },
  });

  // Workflow mutations
  const markAsContacted = api.admissions.markAsContacted.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Marked as contacted successfully",
      });
      refetch();
      setIsContactModalOpen(false);
      resetContactForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark as contacted",
        variant: "destructive",
      });
    },
  });

  const scheduleVisit = api.admissions.scheduleVisit.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Visit scheduled successfully",
      });
      refetch();
      setIsVisitModalOpen(false);
      resetVisitForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to schedule visit",
        variant: "destructive",
      });
    },
  });

  const scheduleInterview = api.admissions.scheduleInterview.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Interview/Test scheduled successfully",
      });
      refetch();
      setIsInterviewScheduleModalOpen(false);
      resetInterviewScheduleForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to schedule interview/test",
        variant: "destructive",
      });
    },
  });

  const concludeInterview = api.admissions.concludeInterview.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Interview/Test concluded successfully",
      });
      refetch();
      setIsInterviewConcludeModalOpen(false);
      resetInterviewConcludeForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to conclude interview/test",
        variant: "destructive",
      });
    },
  });

  const confirmAdmission = api.admissions.confirmAdmission.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Admission confirmed successfully",
      });
      refetch();
      setIsAdmissionModalOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to confirm admission",
        variant: "destructive",
      });
    },
  });

  const deleteInquiry = api.admissions.deleteInquiry.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Inquiry archived successfully",
      });
      refetch();
      setIsDeleteModalOpen(false);
      setSelectedInquiry(null);
      setIsViewModalOpen(false);
      setIsEditModalOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to archive inquiry",
        variant: "destructive",
      });
    },
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

  // Transform inquiry data to student form format
  const transformInquiryToStudentData = (inquiry: any) => {
    return {
      firstName: inquiry.firstName || "",
      lastName: inquiry.lastName || "",
      dateOfBirth: inquiry.dateOfBirth ? format(new Date(inquiry.dateOfBirth), 'yyyy-MM-dd') : "",
      gender: inquiry.gender || "Male",
      classId: "", // Will need to be selected - user must pick the actual class/section
      permanentAddress: inquiry.address || "",
      permanentCity: inquiry.city || "",
      permanentState: inquiry.state || "",
      permanentCountry: inquiry.country || "India",
      nationality: inquiry.country || "Indian",
      fatherName: inquiry.parentName || "",
      fatherMobile: inquiry.parentPhone || "",
      fatherEmail: inquiry.parentEmail || "",
      motherName: inquiry.motherName || "",
      motherMobile: inquiry.motherMobile || "",
      motherEmail: inquiry.motherEmail || "",
      previousSchool: inquiry.schoolLastAttended || "",
      lastClassAttended: inquiry.classLastAttended || "",
      // Set default dates for admission and joining to today
      dateOfAdmission: new Date().toISOString().split('T')[0],
      dateOfJoining: new Date().toISOString().split('T')[0],
      // Map additional fields if available
      personalEmail: inquiry.parentEmail || "", // Use parent email as backup
      correspondenceAddress: inquiry.address || "",
      correspondenceCity: inquiry.city || "",
      correspondenceState: inquiry.state || "",
      correspondenceCountry: inquiry.country || "India",
      sameAsPermAddress: true, // Default to same as permanent address
    };
  };

  const handleViewInquiry = (inquiry: any) => {
    setSelectedInquiry(inquiry);
    setIsViewModalOpen(true);
  };

  const handleEditInquiry = (inquiry: any) => {
    setSelectedInquiry(inquiry);
    
    // Populate student information fields
    setEditFirstName(inquiry.firstName || "");
    setEditLastName(inquiry.lastName || "");
    setEditDateOfBirth(inquiry.dateOfBirth ? new Date(inquiry.dateOfBirth) : undefined);
    setEditGender(inquiry.gender || "");
    setEditClassApplying(inquiry.classApplying || "");
    setEditAddress(inquiry.address || "");
    setEditParentName(inquiry.parentName || "");
    setEditParentPhone(inquiry.parentPhone || "");
    setEditParentEmail(inquiry.parentEmail || "");
    
    // Populate detailed information fields
    setEditMotherName(inquiry.motherName || "");
    setEditMotherMobile(inquiry.motherMobile || "");
    setEditMotherEmail(inquiry.motherEmail || "");
    setEditCity(inquiry.city || "");
    setEditState(inquiry.state || "");
    setEditCountry(inquiry.country || "");
    setEditClassLastAttended(inquiry.classLastAttended || "");
    setEditSchoolLastAttended(inquiry.schoolLastAttended || "");
    setEditPercentageObtained(inquiry.percentageObtained || "");
    
    setIsEditModalOpen(true);
  };

  const handleUpdateInquiry = () => {
    if (!selectedInquiry) return;
    
    // Prepare the update data with registration information
    const updateData: any = {
      id: selectedInquiry.id,
      // Student information
      firstName: editFirstName || undefined,
      lastName: editLastName || undefined,
      dateOfBirth: editDateOfBirth || undefined,
      gender: editGender || undefined,
      classApplying: editClassApplying || undefined,
      address: editAddress || undefined,
      // Parent information  
      parentName: editParentName || undefined,
      parentPhone: editParentPhone || undefined,
      parentEmail: editParentEmail || undefined,
      // Mother's information
      motherName: editMotherName || undefined,
      motherMobile: editMotherMobile || undefined,
      motherEmail: editMotherEmail || undefined,
      // Address breakdown
      city: editCity || undefined,
      state: editState || undefined,
      country: editCountry || undefined,
      // Previous school information
      classLastAttended: editClassLastAttended || undefined,
      schoolLastAttended: editSchoolLastAttended || undefined,
      percentageObtained: editPercentageObtained || undefined,
    };
    
    updateInquiry.mutate(updateData);
  };

  // Form reset functions
  const resetContactForm = () => {
    setContactMethod("");
    setContactNotes("");
  };

  const resetVisitForm = () => {
    setVisitDate(undefined);
    setVisitTime("");
  };

  const resetInterviewScheduleForm = () => {
    setInterviewDate(undefined);
    setInterviewTime("");
    setInterviewMode("");
  };

  const resetInterviewConcludeForm = () => {
    setInterviewNotes("");
    setInterviewRemarks("");
    setInterviewMarks("");
  };

  // Workflow action handlers
  const handleMarkAsContacted = () => {
    if (!selectedInquiry || !contactMethod) return;
    
    markAsContacted.mutate({
      id: selectedInquiry.id,
      contactMethod: contactMethod as "CALL" | "EMAIL" | "WHATSAPP",
      contactNotes: contactNotes || undefined,
    });
  };

  const handleScheduleVisit = () => {
    if (!selectedInquiry || !visitDate || !visitTime) return;
    
    // Combine the date with the time
    const visitDateTime = new Date(visitDate);
    const timeParts = visitTime.split(':');
    if (timeParts.length >= 2) {
      const hours = parseInt(timeParts[0] || '0');
      const minutes = parseInt(timeParts[1] || '0');
      visitDateTime.setHours(hours, minutes, 0, 0);
    }
    
    scheduleVisit.mutate({
      id: selectedInquiry.id,
      visitScheduledDate: visitDateTime,
    });
  };

  const handleScheduleInterview = () => {
    if (!selectedInquiry || !interviewDate || !interviewTime || !interviewMode) return;
    
    // Combine the date with the time
    const interviewDateTime = new Date(interviewDate);
    const timeParts = interviewTime.split(':');
    if (timeParts.length >= 2) {
      const hours = parseInt(timeParts[0] || '0');
      const minutes = parseInt(timeParts[1] || '0');
      interviewDateTime.setHours(hours, minutes, 0, 0);
    }
    
    scheduleInterview.mutate({
      id: selectedInquiry.id,
      interviewScheduledDate: interviewDateTime,
      interviewMode: interviewMode as "ONLINE" | "OFFLINE",
    });
  };

  const handleConcludeInterview = () => {
    if (!selectedInquiry) return;
    
    concludeInterview.mutate({
      id: selectedInquiry.id,
      interviewNotes: interviewNotes || undefined,
      interviewRemarks: interviewRemarks || undefined,
      interviewMarks: interviewMarks ? parseInt(interviewMarks) : undefined,
    });
  };

  const handleConfirmAdmission = () => {
    if (!selectedInquiry) return;
    
    // Close admission modal and open student form modal
    setIsAdmissionModalOpen(false);
    setIsStudentFormModalOpen(true);
  };

  const handleStudentFormSuccess = () => {
    // After student is created successfully, update inquiry status to admitted
    if (selectedInquiry) {
      confirmAdmission.mutate({
        id: selectedInquiry.id,
      });
    }
    setIsStudentFormModalOpen(false);
    setSelectedInquiry(null);
  };

  const handleDeleteInquiry = () => {
    if (!selectedInquiry) return;
    
    deleteInquiry.mutate({
      id: selectedInquiry.id,
    });
  };

  // Function to get status change dropdown
  const getStatusChangeDropdown = (inquiry: any) => {
    // Don't show dropdown for final states
    if (inquiry.status === "ADMITTED" || inquiry.status === "REJECTED" || inquiry.status === "CLOSED") {
      return null;
    }

    return (
      <Select
        onValueChange={(newStatus) => handleStatusChange(inquiry, newStatus)}
        defaultValue=""
      >
        <SelectTrigger className="w-[180px] border-[0.5px] border-gray-200 dark:border-[#807cc5] dark:text-[#807cc5] dark:hover:border-[#807cc5] dark:hover:bg-[#807cc5]/15 cursor-pointer">
          <SelectValue placeholder="Change Status" />
        </SelectTrigger>
        <SelectContent className="w-[180px] cursor-pointer dark:bg-[#252525] dark:text-white">
          <SelectItem value="CONTACTED" className="cursor-pointer">Mark as Contacted</SelectItem>
          <SelectItem value="VISIT_SCHEDULED" className="cursor-pointer">Schedule Visit</SelectItem>
          <SelectItem value="INTERVIEW_SCHEDULED" className="cursor-pointer">
            Schedule Interview
          </SelectItem>
          <SelectItem value="INTERVIEW_CONCLUDED" className="cursor-pointer">
            Conclude Interview
          </SelectItem>
          <SelectItem value="ADMITTED" className="cursor-pointer">Confirm Admission</SelectItem>
          <SelectItem value="REJECTED" className="cursor-pointer">Mark as Rejected</SelectItem>
          <SelectItem value="CLOSED" className="cursor-pointer">Mark as Closed</SelectItem>
        </SelectContent>
      </Select>
    );
  };

  // Handle status change from dropdown
  const handleStatusChange = (inquiry: any, newStatus: string) => {
    setSelectedInquiry(inquiry);
    
    switch (newStatus) {
      case "CONTACTED":
        setIsContactModalOpen(true);
        break;
      case "VISIT_SCHEDULED":
        setIsVisitModalOpen(true);
        break;
      case "INTERVIEW_SCHEDULED":
        setIsInterviewScheduleModalOpen(true);
        break;
      case "INTERVIEW_CONCLUDED":
        setIsInterviewConcludeModalOpen(true);
        break;
      case "ADMITTED":
        setIsAdmissionModalOpen(true);
        break;
      case "REJECTED":
      case "CLOSED":
        // For simple status changes, update directly
        updateInquiry.mutate({
          id: inquiry.id,
          status: newStatus as any,
        });
        break;
      default:
        break;
    }
  };

  return (
    <div className="space-y-6 p-6">
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
          <CardDescription>
            Filter inquiries by status, search terms, etc.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
                <Input
                  placeholder="Search by name, phone, class..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as keyof typeof statusColors | "ALL")
              }
            >
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="NEW">New Registration</SelectItem>
                <SelectItem value="CONTACTED">Parent Contacted</SelectItem>
                <SelectItem value="VISIT_SCHEDULED">
                  School Visit Scheduled
                </SelectItem>
                <SelectItem value="VISITED">Visited</SelectItem>
                <SelectItem value="FORM_SUBMITTED">Form Submitted</SelectItem>
                <SelectItem value="INTERVIEW_SCHEDULED">
                  Interview/Test Scheduled
                </SelectItem>
                <SelectItem value="INTERVIEW_CONCLUDED">
                  Interview/Test Concluded
                </SelectItem>
                <SelectItem value="ADMITTED">Admission Confirmed</SelectItem>
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
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-[#00501B]"></div>
                <p className="text-muted-foreground mt-4 text-sm">
                  Loading inquiries...
                </p>
              </div>
            </div>
          ) : filteredInquiries.length === 0 ? (
            <div className="py-12 text-center">
              <div className="bg-muted mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full">
                <User className="text-muted-foreground h-8 w-8" />
              </div>
              <h3 className="mb-2 text-lg font-medium text-gray-900">
                No inquiries found
              </h3>
              <p className="text-muted-foreground mb-6">
                Get started by creating a new registration or adjust your
                filters.
              </p>
              <Button onClick={() => setIsRegistrationModalOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                New Registration
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredInquiries.map((inquiry: any) => (
                <div
                  key={inquiry.id}
                  className="rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md dark:border-[#606060] dark:bg-[#303030] dark:text-white"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      {/* Left Section - Student & Parent Info */}
                      <div className="flex flex-1 items-start space-x-4">
                        <Avatar className="h-12 w-12 border-2 border-[#00501B]/10">
                          <AvatarImage
                            src={`https://api.dicebear.com/7.x/initials/svg?seed=${inquiry.firstName} ${inquiry.lastName}`}
                          />
                          <AvatarFallback className="bg-[#00501B]/5 font-medium text-[#00501B]">
                            {inquiry.firstName.charAt(0)}
                            {inquiry.lastName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">
                                {inquiry.firstName} {inquiry.lastName}
                              </h3>
                              <div className="text-muted-foreground mb-2 flex items-center gap-4 text-sm">
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {inquiry.registrationNumber}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {format(
                                    new Date(inquiry.createdAt),
                                    "dd/MM/yyyy",
                                  )}
                                </span>
                                <span className="flex items-center gap-1 rounded-md border-[0.5px] border-gray-200 bg-[#00501B]/5 px-2 py-1 font-medium text-[#00501B] dark:border-[#7AAD8B] dark:bg-[#202020] dark:text-[#7AAD8B]">
                                  <GraduationCap className="h-3 w-3 text-[#00501B] dark:text-[#7AAD8B]" />
                                  {inquiry.classApplying}
                                </span>
                              </div>

                              {/* Parent Information */}
                              <div className="mb-3 rounded-md bg-gray-50 p-3 dark:bg-[#252525] dark:text-white">
                                <p className="mb-1 text-sm font-medium text-gray-700 dark:text-white">
                                  Parent Details
                                </p>
                                <div className="space-y-1">
                                  <p className="text-sm font-medium text-gray-600 dark:text-white">
                                    {inquiry.parentName}
                                  </p>
                                  <div className="text-muted-foreground flex items-center gap-4 text-sm">
                                    <span className="flex items-center gap-1">
                                      <Phone className="h-3 w-3" />
                                      {inquiry.parentPhone}
                                    </span>
                                    {inquiry.parentEmail && (
                                      <span className="flex items-center gap-1">
                                        <Mail className="h-3 w-3" />
                                        {inquiry.parentEmail}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Additional Info Row */}
                              <div className="text-muted-foreground flex items-center gap-4 text-sm">
                                {inquiry.dateOfBirth && (
                                  <span>
                                    DOB:{" "}
                                    {format(
                                      new Date(inquiry.dateOfBirth),
                                      "dd/MM/yyyy",
                                    )}
                                  </span>
                                )}
                                {inquiry.gender && (
                                  <span>Gender: {inquiry.gender}</span>
                                )}
                                {inquiry.registrationSource && (
                                  <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                                    {inquiry.registrationSource === "ONLINE"
                                      ? "Online Registration"
                                      : `Offline Registration${inquiry.registeredByName ? ` (${inquiry.registeredByName})` : ""}`}
                                  </span>
                                )}
                                {inquiry.source && (
                                  <span>Source: {inquiry.source}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Section - Status & Actions */}
                      <div className="ml-6 flex flex-col items-end space-y-3">
                        <Badge
                          variant="secondary"
                          className={`${statusColors[inquiry.status as keyof typeof statusColors] || "bg-gray-500"} px-3 py-1 text-white`}
                        >
                          {statusOptions.find(
                            (opt) => opt.value === inquiry.status,
                          )?.label || inquiry.status.replace("_", " ")}
                        </Badge>

                        <div className="text-muted-foreground text-right text-sm">
                          <p>
                            Created:{" "}
                            {format(new Date(inquiry.createdAt), "dd/MM/yyyy")}
                          </p>
                          <p className="text-xs">
                            at {format(new Date(inquiry.createdAt), "HH:mm")}
                          </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex min-w-[180px] flex-col gap-2">
                          {getStatusChangeDropdown(inquiry)}
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 border-[0.5px] border-gray-200 dark:border-[#7AAD8B] dark:text-[#7AAD8B] dark:hover:border-[#7AAD8B] dark:hover:bg-[#7AAD8B]/15"
                              onClick={() => handleViewInquiry(inquiry)}
                            >
                              <Eye className="mr-1 h-3 w-3" />
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 border-[0.5px] border-gray-200 dark:border-[#C27C54] dark:text-[#C27C54] dark:hover:border-[#C27C54] dark:hover:bg-[#C27C54]/15"
                              onClick={() => handleEditInquiry(inquiry)}
                            >
                              <Edit className="mr-1 h-3 w-3" />
                              Edit
                            </Button>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-[0.5px] border-gray-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700 dark:border-[#F87171] dark:text-[#F87171] dark:hover:border-[#F87171] dark:hover:bg-[#F87171]/15"
                            onClick={() => {
                              setSelectedInquiry(inquiry);
                              setIsDeleteModalOpen(true);
                            }}
                          >
                            <Trash2 className="mr-1 h-3 w-3" />
                            Archive
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Workflow Information */}
                    {(inquiry.contactMethod ||
                      inquiry.visitScheduledDate ||
                      inquiry.interviewScheduledDate ||
                      inquiry.interviewNotes) && (
                      <div className="mt-4 border-t border-gray-100 pt-4">
                        <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2 lg:grid-cols-4">
                          {inquiry.contactMethod && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-[#00501B]" />
                              <span className="text-muted-foreground">
                                Contact:
                              </span>
                              <span className="font-medium">
                                {inquiry.contactMethod}
                              </span>
                            </div>
                          )}
                          {inquiry.visitScheduledDate && (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-[#00501B]" />
                              <span className="text-muted-foreground">
                                Visit:
                              </span>
                              <span className="font-medium">
                                {format(
                                  new Date(inquiry.visitScheduledDate),
                                  "dd/MM/yyyy HH:mm",
                                )}
                              </span>
                            </div>
                          )}
                          {inquiry.interviewScheduledDate && (
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-[#00501B]" />
                              <span className="text-muted-foreground">
                                Interview:
                              </span>
                              <span className="font-medium">
                                {format(
                                  new Date(inquiry.interviewScheduledDate),
                                  "dd/MM/yyyy HH:mm",
                                )}
                              </span>
                            </div>
                          )}
                          {inquiry.interviewMarks && (
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-[#00501B]" />
                              <span className="text-muted-foreground">
                                Score:
                              </span>
                              <span className="font-medium">
                                {inquiry.interviewMarks}%
                              </span>
                            </div>
                          )}
                        </div>
                        {inquiry.notes && (
                          <div className="mt-3 rounded-md bg-blue-50 p-3">
                            <p className="text-sm text-blue-800">
                              <strong>Notes:</strong> {inquiry.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Registration Modal */}
      <Dialog
        open={isRegistrationModalOpen}
        onOpenChange={setIsRegistrationModalOpen}
      >
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Registration</DialogTitle>
          </DialogHeader>
          <RegistrationForm
            onSuccess={handleRegistrationSuccess}
            className="mx-0 max-w-none"
            isInternalRegistration={true}
          />
        </DialogContent>
      </Dialog>

      {/* View Inquiry Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto dark:bg-[#202020] dark:text-white">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Inquiry Details</DialogTitle>
          </DialogHeader>
          {selectedInquiry && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Left Column - Basic Information */}
              <div className="space-y-4">
                {/* Student Information */}
                <Card className="dark:bg-[#252525] dark:border-[#606060]">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base font-medium dark:text-white">
                      <User className="h-4 w-4 text-[#00501B] dark:text-[#7AAD8B]" />
                      Student Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Student Header with Avatar */}
                    <div className="flex items-center gap-3 rounded-lg bg-[#00501B]/5 p-3 dark:bg-[#303030]">
                      <Avatar className="h-16 w-16 border-2 border-[#00501B]/20 dark:border-[#7AAD8B]/30">
                        <AvatarImage
                          src={`https://api.dicebear.com/7.x/initials/svg?seed=${selectedInquiry.firstName} ${selectedInquiry.lastName}`}
                        />
                        <AvatarFallback className="bg-[#00501B]/10 text-lg font-semibold text-[#00501B] dark:bg-[#7AAD8B]/20 dark:text-[#7AAD8B]">
                          {selectedInquiry.firstName.charAt(0)}
                          {selectedInquiry.lastName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-xl font-semibold text-[#00501B] dark:text-[#7AAD8B]">
                          {selectedInquiry.firstName} {selectedInquiry.lastName}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Registration: {selectedInquiry.registrationNumber}
                        </p>
                        <Badge
                          variant="secondary"
                          className={`${statusColors[selectedInquiry.status as keyof typeof statusColors] || "bg-gray-500"} mt-1 text-white`}
                        >
                          {statusOptions.find(
                            (opt) => opt.value === selectedInquiry.status,
                          )?.label || selectedInquiry.status.replace("_", " ")}
                        </Badge>
                      </div>
                    </div>

                    {/* Student Details */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Class Applying For
                        </p>
                        <p className="font-medium dark:text-white">
                          {selectedInquiry.classApplying}
                        </p>
                      </div>
                      {selectedInquiry.dateOfBirth && (
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Date of Birth</p>
                          <p className="font-medium dark:text-white">
                            {format(
                              new Date(selectedInquiry.dateOfBirth),
                              "dd/MM/yyyy",
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                    {selectedInquiry.gender && (
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Gender</p>
                        <p className="font-medium dark:text-white">{selectedInquiry.gender}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Parent Information */}
                <Card className="dark:bg-[#252525] dark:border-[#606060]">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base font-medium dark:text-white">
                      <Users className="h-4 w-4 text-[#00501B] dark:text-[#7AAD8B]" />
                      Parent/Guardian Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Father Information */}
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-[#4A90E2]/30 dark:bg-[#303030]">
                      <div className="mb-3 flex items-center gap-2">
                        <User className="h-4 w-4 text-blue-600 dark:text-[#4A90E2]" />
                        <h4 className="text-sm font-semibold text-blue-800 dark:text-[#4A90E2]">
                          Father's Information
                        </h4>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs tracking-wide text-blue-600 uppercase dark:text-[#4A90E2]">
                            Name
                          </p>
                          <p className="font-medium text-blue-900 dark:text-white">
                            {selectedInquiry.parentName}
                          </p>
                        </div>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <div>
                            <p className="text-xs tracking-wide text-blue-600 uppercase dark:text-[#4A90E2]">
                              Phone
                            </p>
                            <p className="font-medium text-blue-900 dark:text-white">
                              {selectedInquiry.parentPhone}
                            </p>
                          </div>
                          {selectedInquiry.parentEmail && (
                            <div>
                              <p className="text-xs tracking-wide text-blue-600 uppercase dark:text-[#4A90E2]">
                                Email
                              </p>
                              <p className="font-medium text-blue-900 dark:text-white">
                                {selectedInquiry.parentEmail}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Mother Information */}
                    {selectedInquiry.motherName ||
                    selectedInquiry.motherMobile ||
                    selectedInquiry.motherEmail ? (
                      <div className="rounded-lg border border-pink-200 bg-pink-50 p-4 dark:border-[#EC4899]/30 dark:bg-[#303030]">
                        <div className="mb-3 flex items-center gap-2">
                          <User className="h-4 w-4 text-pink-600 dark:text-[#EC4899]" />
                          <h4 className="text-sm font-semibold text-pink-800 dark:text-[#EC4899]">
                            Mother's Information
                          </h4>
                        </div>
                        <div className="space-y-2">
                          {selectedInquiry.motherName && (
                            <div>
                              <p className="text-xs tracking-wide text-pink-600 uppercase dark:text-[#EC4899]">
                                Name
                              </p>
                              <p className="font-medium text-pink-900 dark:text-white">
                                {selectedInquiry.motherName}
                              </p>
                            </div>
                          )}
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            {selectedInquiry.motherMobile && (
                              <div>
                                <p className="text-xs tracking-wide text-pink-600 uppercase dark:text-[#EC4899]">
                                  Phone
                                </p>
                                <p className="font-medium text-pink-900 dark:text-white">
                                  {selectedInquiry.motherMobile}
                                </p>
                              </div>
                            )}
                            {selectedInquiry.motherEmail && (
                              <div>
                                <p className="text-xs tracking-wide text-pink-600 uppercase dark:text-[#EC4899]">
                                  Email
                                </p>
                                <p className="font-medium text-pink-900 dark:text-white">
                                  {selectedInquiry.motherEmail}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center dark:border-[#606060] dark:bg-[#303030]">
                        <User className="mx-auto mb-2 h-8 w-8 text-gray-400 dark:text-gray-500" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Mother's information not provided
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Address Information */}
                <Card className="dark:bg-[#252525] dark:border-[#606060]">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base font-medium dark:text-white">
                      <MapPin className="h-4 w-4 text-[#00501B] dark:text-[#7AAD8B]" />
                      Address Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedInquiry.address ? (
                      <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-[#22C55E]/30 dark:bg-[#303030]">
                        <div className="mb-3 flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-green-600 dark:text-[#22C55E]" />
                          <h4 className="text-sm font-semibold text-green-800 dark:text-[#22C55E]">
                            Residential Address
                          </h4>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs tracking-wide text-green-600 uppercase dark:text-[#22C55E]">
                              Complete Address
                            </p>
                            <p className="leading-relaxed text-green-900 dark:text-white">
                              {selectedInquiry.address}
                            </p>
                          </div>

                          {/* Address breakdown */}
                          {(selectedInquiry.city ||
                            selectedInquiry.state ||
                            selectedInquiry.country) && (
                            <div className="grid grid-cols-1 gap-3 border-t border-green-200 pt-2 md:grid-cols-3 dark:border-[#22C55E]/30">
                              {selectedInquiry.city && (
                                <div>
                                  <p className="text-xs tracking-wide text-green-600 uppercase dark:text-[#22C55E]">
                                    City
                                  </p>
                                  <p className="font-medium text-green-900 dark:text-white">
                                    {selectedInquiry.city}
                                  </p>
                                </div>
                              )}
                              {selectedInquiry.state && (
                                <div>
                                  <p className="text-xs tracking-wide text-green-600 uppercase dark:text-[#22C55E]">
                                    State
                                  </p>
                                  <p className="font-medium text-green-900 dark:text-white">
                                    {selectedInquiry.state}
                                  </p>
                                </div>
                              )}
                              {selectedInquiry.country && (
                                <div>
                                  <p className="text-xs tracking-wide text-green-600 uppercase dark:text-[#22C55E]">
                                    Country
                                  </p>
                                  <p className="font-medium text-green-900 dark:text-white">
                                    {selectedInquiry.country}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center dark:border-[#606060] dark:bg-[#303030]">
                        <MapPin className="mx-auto mb-2 h-8 w-8 text-gray-400 dark:text-gray-500" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          No address information provided
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Previous School Information */}
                {(selectedInquiry.classLastAttended ||
                  selectedInquiry.schoolLastAttended ||
                  selectedInquiry.percentageObtained) && (
                  <Card className="dark:bg-[#252525] dark:border-[#606060]">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base font-medium dark:text-white">
                        <BookOpen className="h-4 w-4 text-[#00501B] dark:text-[#7AAD8B]" />
                        Previous School Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-[#F97316]/30 dark:bg-[#303030]">
                        <div className="mb-3 flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-orange-600 dark:text-[#F97316]" />
                          <h4 className="text-sm font-semibold text-orange-800 dark:text-[#F97316]">
                            Academic Background
                          </h4>
                        </div>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                          {selectedInquiry.classLastAttended && (
                            <div>
                              <p className="text-xs tracking-wide text-orange-600 uppercase dark:text-[#F97316]">
                                Last Class Attended
                              </p>
                              <p className="font-medium text-orange-900 dark:text-white">
                                {selectedInquiry.classLastAttended}
                              </p>
                            </div>
                          )}
                          {selectedInquiry.schoolLastAttended && (
                            <div>
                              <p className="text-xs tracking-wide text-orange-600 uppercase dark:text-[#F97316]">
                                School Name
                              </p>
                              <p className="font-medium text-orange-900 dark:text-white">
                                {selectedInquiry.schoolLastAttended}
                              </p>
                            </div>
                          )}
                          {selectedInquiry.percentageObtained && (
                            <div>
                              <p className="text-xs tracking-wide text-orange-600 uppercase dark:text-[#F97316]">
                                Percentage/Grade
                              </p>
                              <p className="font-medium text-orange-900 dark:text-white">
                                {selectedInquiry.percentageObtained}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Additional Information */}
                <Card className="dark:bg-[#252525] dark:border-[#606060]">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base font-medium dark:text-white">
                      <User className="h-4 w-4 text-[#00501B] dark:text-[#7AAD8B]" />
                      Additional Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedInquiry.registrationSource && (
                      <div className="flex justify-between rounded-md bg-green-50 p-2 dark:bg-[#303030]">
                        <span className="text-sm font-medium text-green-700 dark:text-[#22C55E]">
                          Registration Type:
                        </span>
                        <span className="text-sm font-medium text-green-800 dark:text-white">
                          {selectedInquiry.registrationSource === "ONLINE"
                            ? "Online Registration"
                            : `Offline Registration${selectedInquiry.registeredByName ? ` (${selectedInquiry.registeredByName})` : ""}`}
                        </span>
                      </div>
                    )}
                    {selectedInquiry.source && (
                      <div className="flex justify-between rounded-md bg-blue-50 p-2 dark:bg-[#303030]">
                        <span className="text-sm font-medium text-blue-700 dark:text-[#4A90E2]">
                          Source:
                        </span>
                        <span className="text-sm font-medium text-blue-800 dark:text-white">
                          {selectedInquiry.source}
                        </span>
                      </div>
                    )}
                    {selectedInquiry.assignedToId && (
                      <div className="flex justify-between rounded-md bg-green-50 p-2 dark:bg-[#303030]">
                        <span className="text-sm font-medium text-green-700 dark:text-[#22C55E]">
                          Assigned To:
                        </span>
                        <span className="text-sm font-medium text-green-800 dark:text-white">
                          {selectedInquiry.assignedToId}
                        </span>
                      </div>
                    )}
                    {selectedInquiry.followUpDate && (
                      <div className="flex justify-between rounded-md bg-yellow-50 p-2 dark:bg-[#303030]">
                        <span className="text-sm font-medium text-yellow-700 dark:text-[#FACC15]">
                          Follow-up Date:
                        </span>
                        <span className="text-sm font-medium text-yellow-800 dark:text-white">
                          {format(
                            new Date(selectedInquiry.followUpDate),
                            "dd/MM/yyyy",
                          )}
                        </span>
                      </div>
                    )}

                    {/* Timeline at bottom of left column */}
                    <div className="mt-4 border-t pt-3 dark:border-[#606060]">
                      <div className="mb-2 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-[#00501B] dark:text-[#7AAD8B]" />
                        <span className="text-sm font-medium text-gray-700 dark:text-white">
                          Timeline
                        </span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Created:</span>
                          <span className="font-medium dark:text-white">
                            {format(
                              new Date(selectedInquiry.createdAt),
                              "dd/MM/yyyy HH:mm",
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Last Updated:</span>
                          <span className="font-medium dark:text-white">
                            {format(
                              new Date(selectedInquiry.updatedAt),
                              "dd/MM/yyyy HH:mm",
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Workflow & Notes */}
              <div className="space-y-4">
                {/* Workflow Progress */}
                <Card className="dark:bg-[#252525] dark:border-[#606060]">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base font-medium dark:text-white">
                      <CheckCircle className="h-4 w-4 text-[#00501B] dark:text-[#7AAD8B]" />
                      Workflow Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Contact Information */}
                    {selectedInquiry.contactMethod && (
                      <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-[#F97316]/30 dark:bg-[#303030]">
                        <div className="mb-3 flex items-center gap-2">
                          <Phone className="h-5 w-5 text-orange-600 dark:text-[#F97316]" />
                          <h4 className="font-semibold text-orange-800 dark:text-[#F97316]">
                            Contact Details
                          </h4>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <p className="text-xs tracking-wide text-orange-600 uppercase dark:text-[#F97316]">
                              Contact Method
                            </p>
                            <p className="font-medium text-orange-800 dark:text-white">
                              {selectedInquiry.contactMethod}
                            </p>
                          </div>
                          {selectedInquiry.contactNotes && (
                            <div>
                              <p className="text-xs tracking-wide text-orange-600 uppercase dark:text-[#F97316]">
                                Notes
                              </p>
                              <p className="text-sm text-orange-700 dark:text-white">
                                {selectedInquiry.contactNotes}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Visit Information */}
                    {selectedInquiry.visitScheduledDate && (
                      <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <Calendar className="h-5 w-5 text-purple-600" />
                          <h4 className="font-semibold text-purple-800">
                            School Visit
                          </h4>
                        </div>
                        <div>
                          <p className="text-xs tracking-wide text-purple-600 uppercase">
                            Scheduled Date & Time
                          </p>
                          <p className="font-medium text-purple-800">
                            {format(
                              new Date(selectedInquiry.visitScheduledDate),
                              "dd/MM/yyyy HH:mm",
                            )}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Interview Information */}
                    {selectedInquiry.interviewScheduledDate && (
                      <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <GraduationCap className="h-5 w-5 text-cyan-600" />
                          <h4 className="font-semibold text-cyan-800">
                            Interview/Test Details
                          </h4>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs tracking-wide text-cyan-600 uppercase">
                              Scheduled Date & Time
                            </p>
                            <p className="font-medium text-cyan-800">
                              {format(
                                new Date(
                                  selectedInquiry.interviewScheduledDate,
                                ),
                                "dd/MM/yyyy HH:mm",
                              )}
                            </p>
                          </div>
                          {selectedInquiry.interviewMode && (
                            <div>
                              <p className="text-xs tracking-wide text-cyan-600 uppercase">
                                Mode
                              </p>
                              <p className="font-medium text-cyan-800">
                                {selectedInquiry.interviewMode === "ONLINE"
                                  ? "Online"
                                  : "In-Person"}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Interview Results */}
                    {(selectedInquiry.interviewNotes ||
                      selectedInquiry.interviewRemarks ||
                      selectedInquiry.interviewMarks) && (
                      <div className="rounded-lg border border-teal-200 bg-teal-50 p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-teal-600" />
                          <h4 className="font-semibold text-teal-800">
                            Interview/Test Results
                          </h4>
                        </div>
                        <div className="space-y-3">
                          {selectedInquiry.interviewMarks && (
                            <div className="rounded-md bg-teal-100 p-3 text-center">
                              <p className="text-xs tracking-wide text-teal-600 uppercase">
                                Marks/Score
                              </p>
                              <p className="text-2xl font-bold text-teal-800">
                                {selectedInquiry.interviewMarks}%
                              </p>
                            </div>
                          )}
                          {selectedInquiry.interviewNotes && (
                            <div>
                              <p className="text-xs tracking-wide text-teal-600 uppercase">
                                Interview Notes
                              </p>
                              <p className="text-sm text-teal-700">
                                {selectedInquiry.interviewNotes}
                              </p>
                            </div>
                          )}
                          {selectedInquiry.interviewRemarks && (
                            <div>
                              <p className="text-xs tracking-wide text-teal-600 uppercase">
                                Remarks
                              </p>
                              <p className="text-sm text-teal-700">
                                {selectedInquiry.interviewRemarks}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Show message if no workflow data */}
                    {!selectedInquiry.contactMethod &&
                      !selectedInquiry.visitScheduledDate &&
                      !selectedInquiry.interviewScheduledDate &&
                      !selectedInquiry.interviewNotes && (
                        <div className="rounded-lg border-2 border-dashed border-gray-200 py-8 text-center dark:border-[#606060]">
                          <CheckCircle className="mx-auto mb-2 h-12 w-12 text-gray-400 dark:text-gray-500" />
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            No workflow progress recorded yet
                          </p>
                          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                            Use the status dropdown to update progress
                          </p>
                        </div>
                      )}
                  </CardContent>
                </Card>

                {/* General Notes */}
                {selectedInquiry.notes && (
                  <Card className="dark:bg-[#252525] dark:border-[#606060]">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base font-medium dark:text-white">
                        <Edit className="h-4 w-4 text-[#00501B] dark:text-[#7AAD8B]" />
                        General Notes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-[#4A90E2]/30 dark:bg-[#303030]">
                        <p className="leading-relaxed text-blue-800 dark:text-white">
                          {selectedInquiry.notes}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Registration Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Registration Details</DialogTitle>
          </DialogHeader>
          {selectedInquiry && (
            <div className="space-y-8">
              {/* Header */}
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#00501B]">
                  <GraduationCap className="h-6 w-6 text-white" />
                </div>
                <h2 className="mb-2 text-2xl font-semibold text-gray-900 dark:text-white">
                  Edit Registration Details
                </h2>
                <p className="text-gray-600 dark:text-gray-500">
                  Update the registration information for{" "}
                  <strong>
                    {selectedInquiry.firstName} {selectedInquiry.lastName}
                  </strong>
                </p>
                <div className="mt-2 text-sm text-gray-500 dark:text-gray-600">
                  Registration Number: {selectedInquiry.registrationNumber}
                </div>
              </div>

              {/* Student Information */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg font-medium">
                    <User className="h-5 w-5 text-[#00501B] dark:text-[#7AAD8B]" />
                    Student Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={editFirstName}
                        onChange={(e) => setEditFirstName(e.target.value)}
                        placeholder="Student's first name"
                        className="h-12 text-base border-[0.5px] border-gray-200 dark:border-[#606060] dark:bg-[#252525] dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={editLastName}
                        onChange={(e) => setEditLastName(e.target.value)}
                        placeholder="Student's last name"
                        className="h-12 text-base border-[0.5px] border-gray-200 dark:border-[#606060] dark:bg-[#252525] dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Date of Birth <span className="text-red-500">*</span>
                      </label>
                      <DatePicker
                        value={editDateOfBirth}
                        onChange={(date) => setEditDateOfBirth(date)}
                        placeholder="Select date of birth"
                        className="border-[0.5px] border-gray-200 dark:border-[#606060] dark:bg-[#252525] dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Gender <span className="text-red-500">*</span>
                      </label>
                      <Select value={editGender} onValueChange={setEditGender}>
                        <SelectTrigger className="h-12 border-[0.5px] border-gray-200 dark:border-[#606060] dark:bg-[#252525] dark:text-white">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-[#252525] dark:text-white">
                          <SelectItem value="MALE">Male</SelectItem>
                          <SelectItem value="FEMALE">Female</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Class Applying For{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={editClassApplying}
                        onChange={(e) => setEditClassApplying(e.target.value)}
                        placeholder="Class applying for"
                        className="h-12 text-base border-[0.5px] border-gray-200 dark:border-[#606060] dark:bg-[#252525] dark:text-white"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Parent Information */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg font-medium">
                    <Users className="h-5 w-5 text-[#00501B] dark:text-[#7AAD8B]" />
                    Parent Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Father's Name <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={editParentName}
                        onChange={(e) => setEditParentName(e.target.value)}
                        placeholder="Father's full name"
                        className="h-10"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Mother's Name
                      </label>
                      <Input
                        value={editMotherName}
                        onChange={(e) => setEditMotherName(e.target.value)}
                        placeholder="Mother's full name"
                        className="h-10"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Father's Mobile <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={editParentPhone}
                        onChange={(e) => setEditParentPhone(e.target.value)}
                        placeholder="WhatsApp preferred"
                        type="tel"
                        className="h-10"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Mother's Mobile
                      </label>
                      <Input
                        value={editMotherMobile}
                        onChange={(e) => setEditMotherMobile(e.target.value)}
                        placeholder="WhatsApp preferred"
                        type="tel"
                        className="h-10"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Father's Email <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={editParentEmail}
                        onChange={(e) => setEditParentEmail(e.target.value)}
                        placeholder="Father's email address"
                        type="email"
                        className="h-10"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Mother's Email
                      </label>
                      <Input
                        value={editMotherEmail}
                        onChange={(e) => setEditMotherEmail(e.target.value)}
                        placeholder="Mother's email address"
                        type="email"
                        className="h-10"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Address Information */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg font-medium">
                    <MapPin className="h-5 w-5 text-[#00501B] dark:text-[#7AAD8B]" />
                    Address Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Residential Address{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      placeholder="Enter complete residential address"
                      className="min-h-[80px] w-full resize-none rounded-md border border-gray-300 p-3 focus:border-transparent focus:ring-2 focus:ring-[#00501B]"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        City
                      </label>
                      <Input
                        value={editCity}
                        onChange={(e) => setEditCity(e.target.value)}
                        placeholder="City"
                        className="h-10"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        State
                      </label>
                      <Input
                        value={editState}
                        onChange={(e) => setEditState(e.target.value)}
                        placeholder="State"
                        className="h-10"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Country
                      </label>
                      <Input
                        value={editCountry}
                        onChange={(e) => setEditCountry(e.target.value)}
                        placeholder="Country"
                        className="h-10"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Previous School Details */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg font-medium">
                    <BookOpen className="h-5 w-5 text-[#00501B] dark:text-[#7AAD8B]" />
                    Previous School Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Class Last Attended
                      </label>
                      <Input
                        value={editClassLastAttended}
                        onChange={(e) =>
                          setEditClassLastAttended(e.target.value)
                        }
                        placeholder="e.g., Class 9, Grade 10"
                        className="h-10"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Percentage/Grade Obtained
                      </label>
                      <Input
                        value={editPercentageObtained}
                        onChange={(e) =>
                          setEditPercentageObtained(e.target.value)
                        }
                        placeholder="e.g., 85%, A Grade"
                        className="h-10"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Name of School Last Attended
                      </label>
                      <Input
                        value={editSchoolLastAttended}
                        onChange={(e) =>
                          setEditSchoolLastAttended(e.target.value)
                        }
                        placeholder="Name of previous school"
                        className="h-10"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-3 border-t pt-4">
                <Button
                  onClick={handleUpdateInquiry}
                  disabled={updateInquiry.isPending}
                  className="px-6"
                >
                  {updateInquiry.isPending
                    ? "Saving Changes..."
                    : "Save Registration Details"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-6"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Contact Parent Modal */}
      <Dialog open={isContactModalOpen} onOpenChange={setIsContactModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Contact Parent</DialogTitle>
          </DialogHeader>
          {selectedInquiry && (
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium text-gray-700">
                  Student: {selectedInquiry.firstName}{" "}
                  {selectedInquiry.lastName}
                </p>
                <p className="text-sm text-gray-600">
                  Parent: {selectedInquiry.parentName}
                </p>
                <p className="text-sm text-gray-600">
                  Phone: {selectedInquiry.parentPhone}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Contact Method *
                </label>
                <Select value={contactMethod} onValueChange={setContactMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select contact method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CALL">Phone Call</SelectItem>
                    <SelectItem value="EMAIL">Email</SelectItem>
                    <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  value={contactNotes}
                  onChange={(e) => setContactNotes(e.target.value)}
                  placeholder="Add notes about the contact..."
                  className="w-full rounded-md border border-gray-300 p-3 focus:border-transparent focus:ring-2 focus:ring-[#00501B]"
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleMarkAsContacted}
                  disabled={markAsContacted.isPending || !contactMethod}
                >
                  {markAsContacted.isPending
                    ? "Marking..."
                    : "Mark as Contacted"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    // Skip to contacted status without details
                    updateInquiry.mutate({
                      id: selectedInquiry.id,
                      status: "CONTACTED" as any,
                    });
                    setIsContactModalOpen(false);
                    resetContactForm();
                  }}
                  disabled={updateInquiry.isPending}
                >
                  Skip Details
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsContactModalOpen(false);
                    resetContactForm();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Schedule Visit Modal */}
      <Dialog open={isVisitModalOpen} onOpenChange={setIsVisitModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule School Visit</DialogTitle>
          </DialogHeader>
          {selectedInquiry && (
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium text-gray-700">
                  Student: {selectedInquiry.firstName}{" "}
                  {selectedInquiry.lastName}
                </p>
                <p className="text-sm text-gray-600">
                  Parent: {selectedInquiry.parentName}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Date *
                  </label>
                  <DatePicker
                    value={visitDate}
                    onChange={(date) => setVisitDate(date)}
                    placeholder="Select visit date"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Time *
                  </label>
                  <TimePicker
                    value={visitTime}
                    onChange={(time) => setVisitTime(time)}
                    placeholder="Select visit time"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleScheduleVisit}
                  disabled={scheduleVisit.isPending || !visitDate || !visitTime}
                >
                  {scheduleVisit.isPending ? "Scheduling..." : "Schedule Visit"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    // Skip to visit scheduled status without details
                    updateInquiry.mutate({
                      id: selectedInquiry.id,
                      status: "VISIT_SCHEDULED" as any,
                    });
                    setIsVisitModalOpen(false);
                    resetVisitForm();
                  }}
                  disabled={updateInquiry.isPending}
                >
                  Skip Details
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsVisitModalOpen(false);
                    resetVisitForm();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Schedule Interview Modal */}
      <Dialog
        open={isInterviewScheduleModalOpen}
        onOpenChange={setIsInterviewScheduleModalOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Interview/Test</DialogTitle>
          </DialogHeader>
          {selectedInquiry && (
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium text-gray-700">
                  Student: {selectedInquiry.firstName}{" "}
                  {selectedInquiry.lastName}
                </p>
                <p className="text-sm text-gray-600">
                  Class: {selectedInquiry.classApplying}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Date *
                  </label>
                  <DatePicker
                    value={interviewDate}
                    onChange={(date) => setInterviewDate(date)}
                    placeholder="Select interview date"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Time *
                  </label>
                  <TimePicker
                    value={interviewTime}
                    onChange={(time) => setInterviewTime(time)}
                    placeholder="Select interview time"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Mode *
                </label>
                <Select value={interviewMode} onValueChange={setInterviewMode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select interview mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OFFLINE">In-Person</SelectItem>
                    <SelectItem value="ONLINE">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleScheduleInterview}
                  disabled={
                    scheduleInterview.isPending ||
                    !interviewDate ||
                    !interviewTime ||
                    !interviewMode
                  }
                >
                  {scheduleInterview.isPending
                    ? "Scheduling..."
                    : "Schedule Interview"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    // Skip to interview scheduled status without details
                    updateInquiry.mutate({
                      id: selectedInquiry.id,
                      status: "INTERVIEW_SCHEDULED" as any,
                    });
                    setIsInterviewScheduleModalOpen(false);
                    resetInterviewScheduleForm();
                  }}
                  disabled={updateInquiry.isPending}
                >
                  Skip Details
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsInterviewScheduleModalOpen(false);
                    resetInterviewScheduleForm();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Conclude Interview Modal */}
      <Dialog
        open={isInterviewConcludeModalOpen}
        onOpenChange={setIsInterviewConcludeModalOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Conclude Interview/Test</DialogTitle>
          </DialogHeader>
          {selectedInquiry && (
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium text-gray-700">
                  Student: {selectedInquiry.firstName}{" "}
                  {selectedInquiry.lastName}
                </p>
                <p className="text-sm text-gray-600">
                  Class: {selectedInquiry.classApplying}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Interview Notes
                </label>
                <textarea
                  value={interviewNotes}
                  onChange={(e) => setInterviewNotes(e.target.value)}
                  placeholder="Add notes about the interview/test..."
                  className="w-full rounded-md border border-gray-300 p-3 focus:border-transparent focus:ring-2 focus:ring-[#00501B]"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Remarks
                </label>
                <textarea
                  value={interviewRemarks}
                  onChange={(e) => setInterviewRemarks(e.target.value)}
                  placeholder="Overall remarks and recommendations..."
                  className="w-full rounded-md border border-gray-300 p-3 focus:border-transparent focus:ring-2 focus:ring-[#00501B]"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Marks (if applicable)
                </label>
                <Input
                  type="number"
                  value={interviewMarks}
                  onChange={(e) => setInterviewMarks(e.target.value)}
                  placeholder="Enter marks or score"
                  min="0"
                  max="100"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleConcludeInterview}
                  disabled={concludeInterview.isPending}
                >
                  {concludeInterview.isPending
                    ? "Concluding..."
                    : "Conclude Interview"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    // Skip to interview concluded status without details
                    updateInquiry.mutate({
                      id: selectedInquiry.id,
                      status: "INTERVIEW_CONCLUDED" as any,
                    });
                    setIsInterviewConcludeModalOpen(false);
                    resetInterviewConcludeForm();
                  }}
                  disabled={updateInquiry.isPending}
                >
                  Skip Details
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsInterviewConcludeModalOpen(false);
                    resetInterviewConcludeForm();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Admission Modal */}
      <Dialog
        open={isAdmissionModalOpen}
        onOpenChange={setIsAdmissionModalOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Admission</DialogTitle>
          </DialogHeader>
          {selectedInquiry && (
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium text-gray-700">
                  Student: {selectedInquiry.firstName}{" "}
                  {selectedInquiry.lastName}
                </p>
                <p className="text-sm text-gray-600">
                  Class: {selectedInquiry.classApplying}
                </p>
                <p className="text-sm text-gray-600">
                  Parent: {selectedInquiry.parentName}
                </p>
              </div>

              <div className="rounded-md border border-green-200 bg-green-50 p-4">
                <div className="flex items-center">
                  <CheckCircle className="mr-2 h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      Ready for Admission
                    </p>
                    <p className="text-sm text-green-600">
                      This will open the student admission form. Admission will
                      be confirmed only after the form is successfully saved.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleConfirmAdmission}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Open Admission Form
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsAdmissionModalOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Archive Inquiry</DialogTitle>
          </DialogHeader>
          {selectedInquiry && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                  <Trash2 className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h4 className="font-medium text-orange-800">
                    Archive Inquiry
                  </h4>
                  <p className="text-sm text-orange-600">
                    The inquiry will be archived and registration number freed
                    up.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">
                  Are you sure you want to archive this inquiry?
                </p>
                <div className="rounded-md bg-gray-50 p-3">
                  <p className="text-sm">
                    <strong>Student:</strong> {selectedInquiry.firstName}{" "}
                    {selectedInquiry.lastName}
                  </p>
                  <p className="text-sm">
                    <strong>Registration:</strong>{" "}
                    {selectedInquiry.registrationNumber}
                  </p>
                  <p className="text-sm">
                    <strong>Class:</strong> {selectedInquiry.classApplying}
                  </p>
                  <p className="text-sm">
                    <strong>Parent:</strong> {selectedInquiry.parentName}
                  </p>
                </div>
                <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Archived inquiries won't appear in
                    the list, but the data will be preserved. The registration
                    number will be available for new inquiries.
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="destructive"
                  onClick={handleDeleteInquiry}
                  disabled={deleteInquiry.isPending}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                >
                  {deleteInquiry.isPending ? "Archiving..." : "Archive Inquiry"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Student Form Modal */}
      <Dialog
        open={isStudentFormModalOpen}
        onOpenChange={setIsStudentFormModalOpen}
      >
        <DialogContent className="max-h-[95vh] max-w-6xl overflow-y-auto p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>Add Student - Admission Confirmed</DialogTitle>
            {selectedInquiry && (
              <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <h4 className="font-medium text-green-800">
                    Admission Confirmed
                  </h4>
                </div>
                <p className="text-sm text-green-700">
                  Complete the student registration for{" "}
                  <strong>
                    {selectedInquiry.firstName} {selectedInquiry.lastName}
                  </strong>
                  . The form has been pre-filled with data from the inquiry.
                  Please review and add any missing information.
                </p>
              </div>
            )}
          </DialogHeader>

          {selectedInquiry && (
            <div className="flex-1 overflow-hidden">
              <EnhancedStudentForm
                initialData={transformInquiryToStudentData(selectedInquiry)}
                isEditing={false}
                onSuccess={handleStudentFormSuccess}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function InquiriesPage() {
  return (
    <AdmissionsPageGuard>
      <InquiriesPageContent />
    </AdmissionsPageGuard>
  );
} 