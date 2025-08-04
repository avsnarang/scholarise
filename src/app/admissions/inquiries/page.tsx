"use client";

import { useState, useEffect, useCallback, useMemo, memo } from "react";
import dynamic from "next/dynamic";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { PageWrapper } from "@/components/layout/page-wrapper";
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
  Trash2,
  MoreHorizontal,
  ArrowUpDown,
  UserCheck,
  UserX,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from "lucide-react";
import { format, intervalToDuration, differenceInYears } from "date-fns";
import { RegistrationForm } from "@/components/admissions/registration-form";
import { useToast } from "@/components/ui/use-toast";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { EnhancedStudentForm } from "@/components/students/enhanced-student-form";
import { AdmissionsPageGuard } from "@/components/auth/page-guard";
import { cn } from "@/lib/utils";
import { useDeleteConfirm, useStatusChangeConfirm } from "@/utils/popup-utils";

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

// Define the Inquiry type
export type Inquiry = {
  id: string
  registrationNumber: string
  firstName: string
  lastName: string
  parentName: string
  parentPhone: string
  parentEmail?: string
  classApplying: string
  status: keyof typeof statusColors
  dateOfBirth?: Date
  gender?: string
  address?: string
  createdAt: Date
  updatedAt: Date
  contactMethod?: string
  visitScheduledDate?: Date
  interviewScheduledDate?: Date
  interviewMarks?: number
  notes?: string
  registrationSource?: string
  source?: string
  // New fields for age and admission number
  age?: string
  sessionYear?: number
  admissionNumber?: string
  session?: {
    name: string
  }
  student?: {
    admissionNumber: string
    firstName: string
    lastName: string
  }
}

// Skeleton loader component
const InquirySkeleton = () => (
  <div className="animate-pulse">
    <div className="flex items-center space-x-4 p-4 border-b">
      <div className="w-4 h-4 bg-muted rounded"></div>
      <div className="flex-1 grid grid-cols-7 gap-4 items-center">
        <div className="h-4 bg-muted rounded w-20"></div>
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded w-24"></div>
          <div className="h-3 bg-muted rounded w-20"></div>
        </div>
        <div className="h-4 bg-muted rounded w-20"></div>
        <div className="h-4 bg-muted rounded w-20"></div>
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded w-24"></div>
          <div className="h-3 bg-muted rounded w-20"></div>
        </div>
        <div className="h-5 bg-muted rounded w-16"></div>
        <div className="h-4 bg-muted rounded w-16"></div>
      </div>
      <div className="w-8 h-8 bg-muted rounded"></div>
    </div>
  </div>
);

function InquiriesPageContent() {
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  
  // State management
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<string | undefined>("registrationNumber");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | undefined>("desc");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<keyof typeof statusColors | "ALL">("ALL");
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [allInquiriesSelected, setAllInquiriesSelected] = useState(false);
  
  // Modal states
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Edit form states
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
  const deleteConfirm = useDeleteConfirm();
  const statusChangeConfirm = useStatusChangeConfirm();

  // Check for openModal query parameter and open modal automatically
  useEffect(() => {
    const openModal = searchParams.get('openModal');
    if (openModal === 'true') {
      setIsRegistrationModalOpen(true);
    }
  }, [searchParams]);

  // Debounce search to prevent excessive resets
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
    setRowSelection({});
    setAllInquiriesSelected(false);
  }, [statusFilter, debouncedSearchTerm]);

  // State for all inquiries (fetched across multiple pages)
  const [allInquiries, setAllInquiries] = useState<any[]>([]);
  const [isFetchingAll, setIsFetchingAll] = useState(false);

  // API query parameters
  const apiParams = useMemo(() => ({
    branchId: currentBranchId || undefined,
    sessionId: currentSessionId || undefined,
    status: statusFilter === "ALL" ? undefined : statusFilter,
    limit: 100, // Maximum allowed by API
  }), [currentBranchId, currentSessionId, statusFilter]);

  const utils = api.useUtils();

  // Function to fetch all inquiries using cursor pagination
  const fetchAllInquiries = useCallback(async () => {
    setIsFetchingAll(true);
    setAllInquiries([]);
    
    try {
      let allItems: any[] = [];
      let cursor: string | undefined = undefined;
      
      // Keep fetching until we get all data
      do {
        const params = { ...apiParams, cursor };
        console.log('Fetching with cursor:', cursor);
        
        const result = await utils.admissions.getInquiries.fetch(params);
        
        if (result?.items) {
          allItems = [...allItems, ...result.items];
          cursor = result.nextCursor;
          console.log('Fetched batch:', result.items.length, 'items. Next cursor:', cursor);
        } else {
          break;
        }
      } while (cursor);
      
      console.log('Total inquiries fetched:', allItems.length);
      setAllInquiries(allItems);
    } catch (error) {
      console.error('Error fetching all inquiries:', error);
    } finally {
      setIsFetchingAll(false);
    }
  }, [apiParams, utils.admissions.getInquiries]);

  // Fetch all data when params change
  useEffect(() => {
    fetchAllInquiries();
  }, [fetchAllInquiries]);

  // For backward compatibility, create a mock inquiriesData object
  const inquiriesData = useMemo(() => {
    console.log('🔄 inquiriesData updated, allInquiries count:', allInquiries.length);
    return {
      items: allInquiries,
      nextCursor: null
    };
  }, [allInquiries]);

  const isLoading = isFetchingAll;
  const refetch = fetchAllInquiries;

  const updateInquiry = api.admissions.updateInquiry.useMutation({
    onMutate: async (updatedData) => {
      console.log('🔄 Optimistic update triggered for edit:', updatedData);
      
      // Cancel any outgoing refetches
      await utils.admissions.getInquiries.cancel();
      
      // Snapshot the previous value
      const previousInquiries = allInquiries;
      console.log('📊 Previous inquiries count:', previousInquiries.length);
      
      // Optimistically update the local state (raw API data)
      setAllInquiries(current => {
        console.log('🔍 Current inquiries before update:', current.length);
        const updated = current.map(inquiry => {
          if (inquiry.id === updatedData.id) {
            console.log('✏️ Updating raw inquiry:', inquiry.id, 'with data:', updatedData);
            // Update the raw API data structure, not the transformed structure
            const updatedInquiry = { ...inquiry };
            
            // Update raw fields (these match the API response structure)
            if (updatedData.firstName !== undefined) {
              console.log('📝 Updating firstName:', inquiry.firstName, '→', updatedData.firstName);
              updatedInquiry.firstName = updatedData.firstName;
            }
            if (updatedData.lastName !== undefined) {
              console.log('📝 Updating lastName:', inquiry.lastName, '→', updatedData.lastName);
              updatedInquiry.lastName = updatedData.lastName;
            }
            if (updatedData.parentName !== undefined) updatedInquiry.parentName = updatedData.parentName;
            if (updatedData.parentPhone !== undefined) updatedInquiry.parentPhone = updatedData.parentPhone;
            if (updatedData.parentEmail !== undefined) updatedInquiry.parentEmail = updatedData.parentEmail;
            if (updatedData.classApplying !== undefined) updatedInquiry.classApplying = updatedData.classApplying;
            if (updatedData.gender !== undefined) updatedInquiry.gender = updatedData.gender;
            if (updatedData.address !== undefined) updatedInquiry.address = updatedData.address;
            if (updatedData.dateOfBirth !== undefined) {
              // Store as ISO string to match API format
              updatedInquiry.dateOfBirth = updatedData.dateOfBirth?.toISOString ? updatedData.dateOfBirth.toISOString() : updatedData.dateOfBirth;
            }
            
            // Update additional fields if they exist in the update data
            if (updatedData.motherName !== undefined) updatedInquiry.motherName = updatedData.motherName;
            if (updatedData.motherMobile !== undefined) updatedInquiry.motherMobile = updatedData.motherMobile;
            if (updatedData.motherEmail !== undefined) updatedInquiry.motherEmail = updatedData.motherEmail;
            if (updatedData.city !== undefined) updatedInquiry.city = updatedData.city;
            if (updatedData.state !== undefined) updatedInquiry.state = updatedData.state;
            if (updatedData.country !== undefined) updatedInquiry.country = updatedData.country;
            if (updatedData.classLastAttended !== undefined) updatedInquiry.classLastAttended = updatedData.classLastAttended;
            if (updatedData.schoolLastAttended !== undefined) updatedInquiry.schoolLastAttended = updatedData.schoolLastAttended;
            if (updatedData.percentageObtained !== undefined) updatedInquiry.percentageObtained = updatedData.percentageObtained;
            
            // Update timestamps to indicate recent change
            updatedInquiry.updatedAt = new Date().toISOString();
            
            console.log('✅ Updated raw inquiry result:', updatedInquiry);
            return updatedInquiry;
          }
          return inquiry;
        });
        console.log('🎯 Final updated inquiries count:', updated.length);
        return updated;
      });
      
      // Return a context object with the snapshotted value
      return { previousInquiries };
    },
    onError: (err, newData, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousInquiries) {
        setAllInquiries(context.previousInquiries);
      }
      toast({
        title: "Error", 
        description: err.message || "Failed to update registration details",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Registration details updated successfully",
      });
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
    onSettled: () => {
      // Always refetch after error or success to sync with server
      fetchAllInquiries();
    },
  });

  // Workflow mutations
  const markAsContacted = api.admissions.markAsContacted.useMutation({
    onMutate: async (data) => {
      await utils.admissions.getInquiries.cancel();
      const previousInquiries = allInquiries;
      
      // Optimistically update status to CONTACTED
      setAllInquiries(current => 
        current.map(inquiry => 
          inquiry.id === data.id 
            ? { ...inquiry, status: 'CONTACTED', contactMethod: data.contactMethod, contactNotes: data.contactNotes }
            : inquiry
        )
      );
      
      return { previousInquiries };
    },
    onError: (err, newData, context) => {
      if (context?.previousInquiries) {
        setAllInquiries(context.previousInquiries);
      }
      toast({
        title: "Error",
        description: err.message || "Failed to mark as contacted",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Marked as contacted successfully",
      });
      setIsContactModalOpen(false);
      resetContactForm();
    },
    onSettled: () => {
      fetchAllInquiries();
    },
  });

  const scheduleVisit = api.admissions.scheduleVisit.useMutation({
    onMutate: async (data) => {
      await utils.admissions.getInquiries.cancel();
      const previousInquiries = allInquiries;
      
      // Optimistically update status to VISIT_SCHEDULED
      setAllInquiries(current => 
        current.map(inquiry => 
          inquiry.id === data.id 
            ? { ...inquiry, status: 'VISIT_SCHEDULED', visitScheduledDate: data.visitScheduledDate }
            : inquiry
        )
      );
      
      return { previousInquiries };
    },
    onError: (err, newData, context) => {
      if (context?.previousInquiries) {
        setAllInquiries(context.previousInquiries);
      }
      toast({
        title: "Error",
        description: err.message || "Failed to schedule visit",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Visit scheduled successfully",
      });
      setIsVisitModalOpen(false);
      resetVisitForm();
    },
    onSettled: () => {
      fetchAllInquiries();
    },
  });

  const scheduleInterview = api.admissions.scheduleInterview.useMutation({
    onMutate: async (data) => {
      await utils.admissions.getInquiries.cancel();
      const previousInquiries = allInquiries;
      
      // Optimistically update status to INTERVIEW_SCHEDULED
      setAllInquiries(current => 
        current.map(inquiry => 
          inquiry.id === data.id 
            ? { 
                ...inquiry, 
                status: 'INTERVIEW_SCHEDULED', 
                interviewScheduledDate: data.interviewScheduledDate,
                interviewMode: data.interviewMode 
              }
            : inquiry
        )
      );
      
      return { previousInquiries };
    },
    onError: (err, newData, context) => {
      if (context?.previousInquiries) {
        setAllInquiries(context.previousInquiries);
      }
      toast({
        title: "Error",
        description: err.message || "Failed to schedule interview/test",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Interview/Test scheduled successfully",
      });
      setIsInterviewScheduleModalOpen(false);
      resetInterviewScheduleForm();
    },
    onSettled: () => {
      fetchAllInquiries();
    },
  });

  const concludeInterview = api.admissions.concludeInterview.useMutation({
    onMutate: async (data) => {
      await utils.admissions.getInquiries.cancel();
      const previousInquiries = allInquiries;
      
      // Optimistically update status to INTERVIEW_CONCLUDED
      setAllInquiries(current => 
        current.map(inquiry => 
          inquiry.id === data.id 
            ? { 
                ...inquiry, 
                status: 'INTERVIEW_CONCLUDED',
                interviewNotes: data.interviewNotes,
                interviewRemarks: data.interviewRemarks,
                interviewMarks: data.interviewMarks
              }
            : inquiry
        )
      );
      
      return { previousInquiries };
    },
    onError: (err, newData, context) => {
      if (context?.previousInquiries) {
        setAllInquiries(context.previousInquiries);
      }
      toast({
        title: "Error",
        description: err.message || "Failed to conclude interview/test",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Interview/Test concluded successfully",
      });
      setIsInterviewConcludeModalOpen(false);
      resetInterviewConcludeForm();
    },
    onSettled: () => {
      fetchAllInquiries();
    },
  });

  const confirmAdmission = api.admissions.confirmAdmission.useMutation({
    onMutate: async (data) => {
      await utils.admissions.getInquiries.cancel();
      const previousInquiries = allInquiries;
      
      // Optimistically update status to ADMITTED and potentially add admission info
      setAllInquiries(current => 
        current.map(inquiry => 
          inquiry.id === data.id 
            ? { 
                ...inquiry, 
                status: 'ADMITTED',
                // The student data will be added when the mutation succeeds
              }
            : inquiry
        )
      );
      
      return { previousInquiries };
    },
    onError: (err, newData, context) => {
      if (context?.previousInquiries) {
        setAllInquiries(context.previousInquiries);
      }
      toast({
        title: "Error",
        description: err.message || "Failed to confirm admission",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Admission confirmed successfully",
      });
      setIsAdmissionModalOpen(false);
    },
    onSettled: () => {
      fetchAllInquiries();
    },
  });

  const deleteInquiry = api.admissions.deleteInquiry.useMutation({
    onMutate: async (data) => {
      await utils.admissions.getInquiries.cancel();
      const previousInquiries = allInquiries;
      
      // Optimistically remove the inquiry from the list (since archived inquiries don't show)
      setAllInquiries(current => 
        current.filter(inquiry => inquiry.id !== data.id)
      );
      
      return { previousInquiries };
    },
    onError: (err, newData, context) => {
      if (context?.previousInquiries) {
        setAllInquiries(context.previousInquiries);
      }
      toast({
        title: "Error",
        description: err.message || "Failed to archive inquiry",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Inquiry archived successfully",
      });
      setIsDeleteModalOpen(false);
      setSelectedInquiry(null);
      setIsViewModalOpen(false);
      setIsEditModalOpen(false);
    },
    onSettled: () => {
      fetchAllInquiries();
    },
  });

  const inquiries = inquiriesData?.items || [];
  


  // Function to calculate age as of April 1st of session year
  const calculateAge = useCallback((dateOfBirth: Date, sessionName: string): { ageText: string; sessionYear: number; ageInYears: number } | null => {
    if (!dateOfBirth || !sessionName) {
      return null;
    }
    
    // Extract year from session name (e.g., "2025-26" -> 2025)
    const sessionNameMatch = /(\d{4})/.exec(sessionName);
    
    if (!sessionNameMatch?.[1]) {
      return null;
    }
    
    const sessionYear = parseInt(sessionNameMatch[1]);
    const april1st = new Date(sessionYear, 3, 1); // April 1st of session year (month is 0-indexed)
    
    // Calculate detailed age breakdown
    const duration = intervalToDuration({
      start: dateOfBirth,
      end: april1st
    });
    
    // Build age text - simplified for minimal design
    const ageInYears = differenceInYears(april1st, dateOfBirth);
    const ageText = `${ageInYears} years`;
    if (duration.months && duration.months > 0) {
      return { ageText: `${ageInYears} years, ${duration.months} months`, sessionYear, ageInYears };
    }
    
    return { ageText, sessionYear, ageInYears };
  }, []);

  const filteredAndSortedInquiries = useMemo(() => {
    if (!inquiries || inquiries.length === 0) return [];
    
    // Filter inquiries - exclude archived inquiries and apply search filter
    let filtered = inquiries.filter((inquiry: any) => {
      // Never show archived inquiries
      if (inquiry.status === 'ARCHIVED') return false;
      
      // Apply search filter
      return inquiry.firstName?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        inquiry.lastName?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        inquiry.parentName?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        inquiry.parentPhone?.includes(debouncedSearchTerm) ||
        inquiry.classApplying?.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
    });

    // Sort inquiries
    if (sortBy && sortOrder) {
      filtered = [...filtered].sort((a: any, b: any) => {
        let aValue = a[sortBy];
        let bValue = b[sortBy];

        // Handle date sorting
        if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        }
        // Handle age sorting - extract numeric value from age text
        else if (sortBy === 'age') {
          // Extract the year value from age text like "5 years" or "5 years, 3 months"
          const aMatch = aValue?.match(/(\d+)\s*years?/);
          const bMatch = bValue?.match(/(\d+)\s*years?/);
          aValue = aMatch ? parseInt(aMatch[1]) : 0;
          bValue = bMatch ? parseInt(bMatch[1]) : 0;
        }
        // Handle string sorting
        else if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
        }
        
        if (typeof bValue === 'string' && sortBy !== 'age') {
          bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) {
          return sortOrder === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortOrder === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [debouncedSearchTerm, inquiries, sortBy, sortOrder]);

  // Transform inquiry data
  const transformInquiryData = useCallback((inquiry: any): Inquiry => {
    try {
      const dateOfBirth = inquiry.dateOfBirth ? new Date(inquiry.dateOfBirth) : undefined;
      const sessionName = inquiry.session?.name;
      
      // Calculate age if we have date of birth and session
      let ageInfo = null;
      if (dateOfBirth && sessionName) {
        ageInfo = calculateAge(dateOfBirth, sessionName);
      }
      
      return {
        id: inquiry.id,
        registrationNumber: inquiry.registrationNumber || '',
        firstName: inquiry.firstName || 'Unknown',
        lastName: inquiry.lastName || 'Unknown',
        parentName: inquiry.parentName || 'Unknown',
        parentPhone: inquiry.parentPhone || '',
        parentEmail: inquiry.parentEmail || undefined,
        classApplying: inquiry.classApplying || '',
        status: inquiry.status || 'NEW',
        dateOfBirth: dateOfBirth,
        gender: inquiry.gender || undefined,
        address: inquiry.address || undefined,
        createdAt: new Date(inquiry.createdAt),
        updatedAt: new Date(inquiry.updatedAt),
        contactMethod: inquiry.contactMethod || undefined,
        visitScheduledDate: inquiry.visitScheduledDate ? new Date(inquiry.visitScheduledDate) : undefined,
        interviewScheduledDate: inquiry.interviewScheduledDate ? new Date(inquiry.interviewScheduledDate) : undefined,
        interviewMarks: inquiry.interviewMarks || undefined,
        notes: inquiry.notes || undefined,
        registrationSource: inquiry.registrationSource || undefined,
        source: inquiry.source || undefined,
        // New fields
        age: ageInfo?.ageText || undefined,
        sessionYear: ageInfo?.sessionYear || undefined,
        admissionNumber: inquiry.student?.admissionNumber || undefined,
        session: inquiry.session || undefined,
        student: inquiry.student || undefined,
      };
    } catch (error) {
      console.error('Error transforming inquiry data:', error, inquiry);
      return {
        id: inquiry?.id || `error-${Math.random().toString(36).substr(2, 9)}`,
        registrationNumber: 'ERROR',
        firstName: 'Data',
        lastName: 'Error',
        parentName: 'Error',
        parentPhone: '',
        classApplying: '',
        status: 'NEW',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  }, [calculateAge]);

  // Transform and memoize inquiry data
  const transformedInquiries = useMemo(() => {
    console.log('🔄 transformedInquiries updating, filteredAndSortedInquiries count:', filteredAndSortedInquiries.length);
    if (filteredAndSortedInquiries.length > 0) {
      const result = filteredAndSortedInquiries.map(transformInquiryData);
      console.log('✅ transformedInquiries result count:', result.length);
      return result;
    }
    console.log('⚠️ No filteredAndSortedInquiries, returning empty array');
    return [];
  }, [filteredAndSortedInquiries, transformInquiryData]);

  // Memoize all inquiries and inquiry IDs
  const memoizedAllInquiries = useMemo(() => transformedInquiries, [transformedInquiries]);
  const memoizedAllInquiryIds = useMemo(() => transformedInquiries.map(inquiry => inquiry.id), [transformedInquiries]);
  
  // Apply pagination to get current page inquiries
  const memoizedCurrentInquiries = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return memoizedAllInquiries.slice(startIndex, endIndex);
  }, [memoizedAllInquiries, currentPage, pageSize]);
  
  // Calculate total pages
  const totalPages = useMemo(() => Math.ceil(memoizedAllInquiries.length / pageSize), [memoizedAllInquiries.length, pageSize]);

  const handleRegistrationSuccess = useCallback(() => {
    setIsRegistrationModalOpen(false);
    fetchAllInquiries(); // Refresh the inquiries list with new data
    toast({
      title: "Success",
      description: "New inquiry registered successfully",
    });
  }, [fetchAllInquiries, toast]);

  // Transform inquiry data to student form format
  const transformInquiryToStudentData = useCallback((inquiry: any) => {
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
  }, []);

  const handleViewInquiry = useCallback((inquiry: any) => {
    setSelectedInquiry(inquiry);
    setIsViewModalOpen(true);
  }, []);

  const handleEditInquiry = useCallback((inquiry: any) => {
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
  }, []);

  const handleUpdateInquiry = useCallback(() => {
    console.log('🚀 handleUpdateInquiry called');
    if (!selectedInquiry) {
      console.log('❌ No selectedInquiry');
      return;
    }
    
    console.log('📋 Selected inquiry:', selectedInquiry.id, selectedInquiry.firstName, selectedInquiry.lastName);
    
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
    
    console.log('📤 Sending update data:', updateData);
    updateInquiry.mutate(updateData);
  }, [selectedInquiry, editFirstName, editLastName, editDateOfBirth, editGender, editClassApplying, editAddress, editParentName, editParentPhone, editParentEmail, editMotherName, editMotherMobile, editMotherEmail, editCity, editState, editCountry, editClassLastAttended, editSchoolLastAttended, editPercentageObtained, updateInquiry]);

  // Form reset functions
  const resetContactForm = useCallback(() => {
    setContactMethod("");
    setContactNotes("");
  }, []);

  const resetVisitForm = useCallback(() => {
    setVisitDate(undefined);
    setVisitTime("");
  }, []);

  const resetInterviewScheduleForm = useCallback(() => {
    setInterviewDate(undefined);
    setInterviewTime("");
    setInterviewMode("");
  }, []);

  const resetInterviewConcludeForm = useCallback(() => {
    setInterviewNotes("");
    setInterviewRemarks("");
    setInterviewMarks("");
  }, []);

  // Helper functions
  const formatDate = useCallback((date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(date));
  }, []);

  // Handle sorting changes
  const handleSortChange = useCallback((field: string, order: "asc" | "desc") => {
    setSortBy(field);
    setSortOrder(order);
  }, []);

  // Helper function to get the correct sort order for a field
  const getDefaultSortOrder = useCallback((field: string) => {
    if (field === "createdAt") {
      return "desc"; // Use desc for dates to show newest first
    }
    return "asc"; // Use asc for all other fields
  }, []);

  // Handle search
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  // Handle sort field change
  const handleSortFieldChange = useCallback((value: string) => {
    setSortBy(value);
    setSortOrder(getDefaultSortOrder(value));
  }, [getDefaultSortOrder]);

  // Handle sort order toggle
  const handleSortOrderToggle = useCallback(() => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  }, [sortOrder]);

  // Handle status filter change
  const handleStatusFilterChange = useCallback((value: string) => {
    setStatusFilter(value as keyof typeof statusColors | "ALL");
  }, []);

  // Handle select all inquiries (entire dataset)
  const handleSelectAllInquiries = useCallback(() => {
    setAllInquiriesSelected(true);
    setRowSelection({});
  }, []);

  // Handle deselect all inquiries
  const handleDeselectAllInquiries = useCallback(() => {
    setAllInquiriesSelected(false);
    setRowSelection({});
  }, []);

  // Get selected inquiry IDs
  const getSelectedInquiryIds = useCallback(() => {
    if (allInquiriesSelected) {
      return memoizedAllInquiryIds;
    }
    return Object.keys(rowSelection).filter(id => rowSelection[id]);
  }, [allInquiriesSelected, memoizedAllInquiryIds, rowSelection]);

  // Get selected count
  const getSelectedCount = useCallback(() => {
    if (allInquiriesSelected) {
      return memoizedAllInquiryIds.length;
    }
    return Object.keys(rowSelection).filter(id => rowSelection[id]).length;
  }, [allInquiriesSelected, memoizedAllInquiryIds, rowSelection]);

  // Handle individual row selection
  const handleRowSelection = useCallback((inquiryId: string, checked: boolean) => {
    if (allInquiriesSelected) {
      // If all inquiries were selected, uncheck this specific inquiry
      // This will deselect all inquiries
      setAllInquiriesSelected(false);
      setRowSelection({});
    } else {
      setRowSelection(prev => ({
        ...prev,
        [inquiryId]: checked
      }));
    }
     }, [allInquiriesSelected]);

  // Handle header checkbox (select all visible)
  const handleHeaderCheckboxChange = useCallback((checked: boolean) => {
    if (checked) {
      const newSelection: Record<string, boolean> = {};
      memoizedCurrentInquiries.forEach(inquiry => {
        newSelection[inquiry.id] = true;
      });
      setRowSelection(newSelection);
      setAllInquiriesSelected(false);
    } else {
      handleDeselectAllInquiries();
    }
  }, [memoizedCurrentInquiries, handleDeselectAllInquiries]);

  // Pagination handlers
  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
    setRowSelection({}); // Clear selection when changing pages
    setAllInquiriesSelected(false);
  }, []);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
    setRowSelection({});
    setAllInquiriesSelected(false);
  }, []);

  // Workflow action handlers
  const handleMarkAsContacted = useCallback(() => {
    if (!selectedInquiry || !contactMethod) return;
    
    markAsContacted.mutate({
      id: selectedInquiry.id,
      contactMethod: contactMethod as "CALL" | "EMAIL" | "WHATSAPP",
      contactNotes: contactNotes || undefined,
    });
  }, [selectedInquiry, contactMethod, contactNotes, markAsContacted]);

  const handleScheduleVisit = useCallback(() => {
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
  }, [selectedInquiry, visitDate, visitTime, scheduleVisit]);

  const handleScheduleInterview = useCallback(() => {
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
  }, [selectedInquiry, interviewDate, interviewTime, interviewMode, scheduleInterview]);

  const handleConcludeInterview = useCallback(() => {
    if (!selectedInquiry) return;
    
    concludeInterview.mutate({
      id: selectedInquiry.id,
      interviewNotes: interviewNotes || undefined,
      interviewRemarks: interviewRemarks || undefined,
      interviewMarks: interviewMarks ? parseInt(interviewMarks) : undefined,
    });
  }, [selectedInquiry, interviewNotes, interviewRemarks, interviewMarks, concludeInterview]);

  const handleConfirmAdmission = useCallback(() => {
    if (!selectedInquiry) return;
    
    // Close admission modal and open student form modal
    setIsAdmissionModalOpen(false);
    setIsStudentFormModalOpen(true);
  }, [selectedInquiry]);

  const handleStudentFormSuccess = useCallback(() => {
    // After student is created successfully, update inquiry status to admitted
    if (selectedInquiry) {
      confirmAdmission.mutate({
        id: selectedInquiry.id,
      });
    }
    setIsStudentFormModalOpen(false);
    setSelectedInquiry(null);
  }, [selectedInquiry, confirmAdmission]);

  const handleDeleteInquiry = useCallback(() => {
    if (!selectedInquiry) return;
    
    deleteInquiry.mutate({
      id: selectedInquiry.id,
    });
  }, [selectedInquiry, deleteInquiry]);

  // Handle inquiry actions
  const handleInquiryAction = useCallback((action: string, inquiry: Inquiry) => {
    setSelectedInquiry(inquiry);
    
    switch (action) {
      case 'view':
        handleViewInquiry(inquiry);
        break;
      case 'edit':
        handleEditInquiry(inquiry);
        break;
      case 'delete':
        deleteConfirm(
          "inquiry",
          () => {
            handleDeleteInquiry();
          }
        );
        break;
      case 'contact':
        setIsContactModalOpen(true);
        break;
      case 'visit':
        setIsVisitModalOpen(true);
        break;
      case 'interview':
        setIsInterviewScheduleModalOpen(true);
        break;
      case 'conclude':
        setIsInterviewConcludeModalOpen(true);
        break;
      case 'admit':
        setIsAdmissionModalOpen(true);
        break;
      case 'reject':
        updateInquiry.mutate({
          id: inquiry.id,
          status: 'REJECTED' as any,
        });
        break;
      case 'close':
        updateInquiry.mutate({
          id: inquiry.id,
          status: 'CLOSED' as any,
        });
        break;
    }
  }, [deleteConfirm, updateInquiry, handleEditInquiry, handleDeleteInquiry, handleViewInquiry]);



  // Function to get status change dropdown - simplified to avoid circular dependencies
  const getStatusChangeDropdown = (inquiry: any) => {
    // Don't show dropdown for final states
    if (inquiry.status === "ADMITTED" || inquiry.status === "REJECTED" || inquiry.status === "CLOSED") {
      return null;
    }

    return (
      <Select
        onValueChange={(newStatus) => {
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
        }}
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

  // Inquiry row actions component
  const InquiryRowActions = memo(({ inquiry, onAction }: { inquiry: Inquiry; onAction: (action: string, inquiry: Inquiry) => void }) => (
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
        <DropdownMenuItem onClick={() => onAction('view', inquiry)}>
          <Eye className="mr-2 h-4 w-4" />
          View Details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAction('edit', inquiry)}>
          <Edit className="mr-2 h-4 w-4" />
          Edit Inquiry
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {inquiry.status !== "ADMITTED" && inquiry.status !== "REJECTED" && inquiry.status !== "CLOSED" && (
          <>
            <DropdownMenuItem onClick={() => onAction('contact', inquiry)}>
              <Phone className="mr-2 h-4 w-4" />
              Mark as Contacted
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction('visit', inquiry)}>
              <Calendar className="mr-2 h-4 w-4" />
              Schedule Visit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction('interview', inquiry)}>
              <User className="mr-2 h-4 w-4" />
              Schedule Interview
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction('conclude', inquiry)}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Conclude Interview
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction('admit', inquiry)}>
              <UserCheck className="mr-2 h-4 w-4" />
              Confirm Admission
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onAction('reject', inquiry)}>
              <UserX className="mr-2 h-4 w-4" />
              Mark as Rejected
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction('close', inquiry)}>
              <UserX className="mr-2 h-4 w-4" />
              Mark as Closed
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem
          onClick={() => onAction('delete', inquiry)}
          className="text-red-600 dark:text-red-400"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Archive
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ));
  
  InquiryRowActions.displayName = 'InquiryRowActions';

  // Inquiry row component with animation
  const InquiryRow = memo(({ 
    inquiry, 
    index, 
    isSelected, 
    onSelectionChange, 
    onAction, 
    formatDate 
  }: { 
    inquiry: Inquiry; 
    index: number; 
    isSelected: boolean; 
    onSelectionChange: (inquiryId: string, checked: boolean) => void; 
    onAction: (action: string, inquiry: Inquiry) => void;
    formatDate: (date: Date) => string;
  }) => (
    <div 
      className={cn(
        "flex items-center space-x-4 p-4 border-b transition-all duration-300 ease-in-out",
        "animate-in fade-in slide-in-from-bottom-2"
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={(checked) => onSelectionChange(inquiry.id, checked as boolean)}
        aria-label={`Select ${inquiry.firstName} ${inquiry.lastName}`}
      />
      
      <div className="flex-1 grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 md:gap-3 lg:gap-4 items-center">
        {/* Registration Number - Hidden on mobile, visible on md+ */}
        <div className="hidden md:block font-medium text-sm">
          {inquiry.registrationNumber}
        </div>
        
        {/* Student Name - Always visible */}
        <div className="min-w-0">
          <div className="font-medium text-sm truncate">
            {inquiry.firstName} {inquiry.lastName}
          </div>
          {inquiry.dateOfBirth && (
            <div className="text-xs text-muted-foreground truncate">
              Born: {formatDate(inquiry.dateOfBirth)}
            </div>
          )}
          {/* Show registration number on mobile */}
          <div className="md:hidden text-xs text-muted-foreground truncate">
            {inquiry.registrationNumber}
          </div>
        </div>
        
        {/* Age - Hidden on small screens, visible on lg+ */}
        <div className="hidden lg:block text-sm">
          {inquiry.age ? (
            <div className="font-medium text-sm">
              {inquiry.age}
            </div>
          ) : inquiry.dateOfBirth ? (
            <div className="text-xs text-muted-foreground">
              Age not available
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">
              No DOB
            </div>
          )}
          {inquiry.sessionYear && (
            <div className="text-xs text-muted-foreground">
              As of Apr 1, {inquiry.sessionYear}
            </div>
          )}
        </div>
        
        {/* Class - Always visible */}
        <div className="text-sm min-w-0">
          <div className="font-medium truncate">
            {inquiry.classApplying}
          </div>
          {inquiry.gender && (
            <div className="text-xs text-muted-foreground">
              {inquiry.gender}
            </div>
          )}
          {/* Show age on mobile/tablet when lg is hidden */}
          {inquiry.age && (
            <div className="lg:hidden text-xs text-muted-foreground">
              {inquiry.age?.split(' ')[0]} {inquiry.age?.split(' ')[1]}
            </div>
          )}
        </div>
        
        {/* Parent - Hidden on mobile, visible on md+ */}
        <div className="hidden md:block text-sm min-w-0">
          <div className="font-medium truncate">
            {inquiry.parentName}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {inquiry.parentPhone}
          </div>
        </div>
        
        {/* Date - Hidden on small screens, visible on lg+ */}
        <div className="hidden lg:block text-sm">
          <div className="font-medium">
            {formatDate(inquiry.createdAt)}
          </div>
          <div className="text-xs text-muted-foreground">
            {format(inquiry.createdAt, "HH:mm")}
          </div>
        </div>
        
        {/* Status with Admission Number below - Always visible */}
        <div className="min-w-0">
          <Badge 
            variant="secondary"
            className={`${statusColors[inquiry.status] || "bg-gray-500"} px-2 py-1 text-white text-xs mb-1 truncate`}
          >
            {statusOptions.find(
              (opt) => opt.value === inquiry.status,
            )?.label || inquiry.status.replace("_", " ")}
          </Badge>
          
          {/* Admission Number below status */}
          <div className="text-sm">
            {inquiry.admissionNumber ? (
              <div className="font-medium text-xs text-green-600 dark:text-green-400 truncate">
                {inquiry.admissionNumber}
              </div>
            ) : inquiry.status === "ADMITTED" ? (
              <div className="text-xs text-muted-foreground">
                Processing...
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">
                -
              </div>
            )}
          </div>
          
          {/* Show parent info on mobile when hidden */}
          <div className="md:hidden text-xs text-muted-foreground truncate mt-1">
            {inquiry.parentName}
          </div>
        </div>
        
        {/* Source - Hidden on small screens, visible on lg+ */}
        <div className="hidden lg:block text-sm">
          {inquiry.source && (
            <div className="text-xs text-muted-foreground">
              {inquiry.source}
            </div>
          )}
          {inquiry.registrationSource && (
            <div className="text-xs text-muted-foreground">
              {inquiry.registrationSource === "ONLINE" ? "Online" : "Offline"}
            </div>
          )}
        </div>
      </div>
      
      <InquiryRowActions inquiry={inquiry} onAction={onAction} />
    </div>
  ));
  
  InquiryRow.displayName = 'InquiryRow';

  return (
    <PageWrapper
      title="Admission Inquiries"
      subtitle="Manage and track admission inquiries and applications"
      action={
        <Button onClick={() => setIsRegistrationModalOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Registration
        </Button>
      }
    >
      <div className="mt-6 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">All Inquiries</h2>
            <p className="text-muted-foreground">
              {isLoading 
                ? 'Loading...' 
                : `Showing ${((currentPage - 1) * pageSize) + 1}-${Math.min(currentPage * pageSize, memoizedAllInquiries.length)} of ${memoizedAllInquiries.length} inquiries`
              }
            </p>

          </div>
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
                onValueChange={handleStatusFilterChange}
              >
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="cursor-pointer">All Status</SelectItem>
                  <SelectItem value="NEW" className="cursor-pointer">New Registration</SelectItem>
                  <SelectItem value="CONTACTED" className="cursor-pointer">Parent Contacted</SelectItem>
                  <SelectItem value="VISIT_SCHEDULED" className="cursor-pointer">
                    School Visit Scheduled
                  </SelectItem>
                  <SelectItem value="VISITED" className="cursor-pointer">Visited</SelectItem>
                  <SelectItem value="FORM_SUBMITTED" className="cursor-pointer">Form Submitted</SelectItem>
                  <SelectItem value="INTERVIEW_SCHEDULED" className="cursor-pointer">
                    Interview/Test Scheduled
                  </SelectItem>
                  <SelectItem value="INTERVIEW_CONCLUDED" className="cursor-pointer">
                    Interview/Test Concluded
                  </SelectItem>
                  <SelectItem value="ADMITTED" className="cursor-pointer">Admission Confirmed</SelectItem>
                  <SelectItem value="REJECTED" className="cursor-pointer">Rejected</SelectItem>
                  <SelectItem value="CLOSED" className="cursor-pointer">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex items-center gap-2">
              <Select
                value={sortBy}
                onValueChange={handleSortFieldChange}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="firstName" className="cursor-pointer">Name</SelectItem>
                  <SelectItem value="registrationNumber" className="cursor-pointer">Registration No.</SelectItem>
                  <SelectItem value="createdAt" className="cursor-pointer">Date</SelectItem>
                  <SelectItem value="status" className="cursor-pointer">Status</SelectItem>
                  <SelectItem value="classApplying" className="cursor-pointer">Class</SelectItem>
                  <SelectItem value="age" className="cursor-pointer">Age</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleSortOrderToggle}
              >
                <ArrowUpDown className="h-4 w-4" />
                {sortBy === 'createdAt' 
                  ? (sortOrder === 'asc' ? 'Old-New' : 'New-Old')
                  : (sortOrder === 'asc' ? 'A-Z' : 'Z-A')
                }
              </Button>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {(getSelectedCount() > 0 || allInquiriesSelected) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  {allInquiriesSelected ? (
                    <>All {memoizedAllInquiries.length} inquiries selected</>
                  ) : (
                    <>{getSelectedCount()} inquiry(ies) selected</>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Bulk archive selected inquiries
                      const selectedIds = getSelectedInquiryIds();
                      // Add bulk archive logic here
                      handleDeselectAllInquiries();
                    }}
                    className="text-red-700 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-950/20"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Archive Selected
                  </Button>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeselectAllInquiries}
                className="text-muted-foreground hover:text-foreground"
              >
                Clear Selection
              </Button>
            </div>
            
            {/* Select All Option */}
            {!allInquiriesSelected && getSelectedCount() > 0 && getSelectedCount() < memoizedAllInquiries.length && (
              <div className="flex items-center justify-center p-2 bg-blue-50 dark:bg-blue-950/10 rounded-lg border border-blue-100 dark:border-blue-900">
                <span className="text-sm text-blue-600 dark:text-blue-400">
                  {getSelectedCount()} inquiry(ies) selected on this page. 
                  <Button
                    variant="link"
                    size="sm"
                    onClick={handleSelectAllInquiries}
                    className="p-0 h-auto text-blue-600 dark:text-blue-400 underline ml-1"
                  >
                    Select all {memoizedAllInquiries.length} inquiries
                  </Button>
                </span>
              </div>
            )}
          </div>
        )}

        {/* Inquiries List */}
        <div className="space-y-2 overflow-x-auto">
          {/* Header Row */}
          <div className="flex items-center space-x-4 p-4 bg-muted/50 rounded-lg font-medium text-sm">
            <div className="w-4">
              <Checkbox
                checked={allInquiriesSelected || (memoizedCurrentInquiries.length > 0 && memoizedCurrentInquiries.every(inquiry => rowSelection[inquiry.id]))}
                onCheckedChange={handleHeaderCheckboxChange}
                aria-label="Select all inquiries on this page"
              />
            </div>
            <div className="flex-1 grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 md:gap-3 lg:gap-4">
              <div className="hidden md:block">Reg. No.</div>
              <div>Student</div>
              <div className="hidden lg:block">Age</div>
              <div>Class</div>
              <div className="hidden md:block">Parent</div>
              <div className="hidden lg:block">Date</div>
              <div>Status</div>
              <div className="hidden lg:block">Source</div>
            </div>
            <div className="w-8"></div>
          </div>

          {/* Inquiry Rows */}
          {isLoading && memoizedCurrentInquiries.length === 0 ? (
            <div className="border rounded-lg overflow-hidden">
              {Array.from({ length: 10 }).map((_, index) => (
                <InquirySkeleton key={index} />
              ))}
            </div>
          ) : (
            <div className="space-y-0 border rounded-lg overflow-hidden">
              {memoizedCurrentInquiries.map((inquiry, index) => (
                <InquiryRow 
                  key={inquiry.id} 
                  inquiry={inquiry} 
                  index={index} 
                  isSelected={allInquiriesSelected || rowSelection[inquiry.id] || false}
                  onSelectionChange={handleRowSelection}
                  onAction={handleInquiryAction}
                  formatDate={formatDate}
                />
              ))}
              
              {/* Loading More Skeletons */}
              {isLoading && (
                <div className="space-y-0">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <InquirySkeleton key={`loading-${index}`} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* No Inquiries Found */}
          {!isLoading && memoizedCurrentInquiries.length === 0 && memoizedAllInquiries.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
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
          )}

          {/* Pagination Controls */}
          {!isLoading && memoizedAllInquiries.length > 0 && (
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4 px-2 sm:px-4 py-3 border-t bg-muted/30">
              {/* Left side - Row count info and page size selector */}
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
                <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                  Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, memoizedAllInquiries.length)} of {memoizedAllInquiries.length} entries
                </div>
                
                {/* Page Size Controls */}
                <div className="flex items-center gap-2">
                  <label className="text-xs sm:text-sm font-medium whitespace-nowrap hidden sm:inline">Show:</label>
                  <Select
                    value={pageSize.toString()}
                    onValueChange={(value) => handlePageSizeChange(parseInt(value))}
                  >
                    <SelectTrigger className="w-16 sm:w-20 bg-background text-xs sm:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border">
                      <SelectItem value="10" className="cursor-pointer">10</SelectItem>
                      <SelectItem value="25" className="cursor-pointer">25</SelectItem>
                      <SelectItem value="50" className="cursor-pointer">50</SelectItem>
                      <SelectItem value="100" className="cursor-pointer">100</SelectItem>
                      <SelectItem value="200" className="cursor-pointer">200</SelectItem>
                      <SelectItem value="500" className="cursor-pointer">500</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap hidden sm:inline">per page</span>
                </div>
              </div>
              
              {/* Right side - Page navigation (only show if multiple pages) */}
              {totalPages > 1 && (
                <div className="flex items-center gap-2 sm:gap-3">
                  {/* Previous Page */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="h-8 px-3 text-xs sm:text-sm"
                    title="Previous page"
                  >
                    <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    Previous
                  </Button>
                  
                  {/* Page X of X */}
                  <div className="text-xs sm:text-sm text-muted-foreground font-medium px-2">
                    Page {currentPage} of {totalPages}
                  </div>
                  
                  {/* Next Page */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="h-8 px-3 text-xs sm:text-sm"
                    title="Next page"
                  >
                    Next
                    <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

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
                          <SelectItem value="MALE" className="cursor-pointer">Male</SelectItem>
                          <SelectItem value="FEMALE" className="cursor-pointer">Female</SelectItem>
                          <SelectItem value="OTHER" className="cursor-pointer">Other</SelectItem>
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
                    <SelectItem value="CALL" className="cursor-pointer">Phone Call</SelectItem>
                    <SelectItem value="EMAIL" className="cursor-pointer">Email</SelectItem>
                    <SelectItem value="WHATSAPP" className="cursor-pointer">WhatsApp</SelectItem>
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
                    <SelectItem value="OFFLINE" className="cursor-pointer">In-Person</SelectItem>
                    <SelectItem value="ONLINE" className="cursor-pointer">Online</SelectItem>
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
                    <p className="font-medium text-green-800">
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
    </PageWrapper>
  );
}
// Dynamically import to disable SSR completely
const DynamicInquiriesPageContent = dynamic(() => Promise.resolve(InquiriesPageContent), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center p-8">Loading...</div>
});

export default function InquiriesPage() {
  return <DynamicInquiriesPageContent />;
}

 