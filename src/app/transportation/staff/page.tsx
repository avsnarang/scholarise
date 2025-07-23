"use client";

import React, { useState } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Eye,
  MoreVertical,
  AlertTriangle,
  Calendar,
  Phone,
  IdCard,
  Heart,
  DollarSign,
  Search,
  Filter,
  UserCheck,
  UserX,
  Clock,
  CheckCircle,
} from "lucide-react";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { formatIndianCurrency } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

interface StaffFormData {
  employeeCode?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  address?: string;
  staffType: "DRIVER" | "CONDUCTOR";
  status: "ACTIVE" | "INACTIVE" | "ON_LEAVE" | "SUSPENDED";
  dateOfJoining?: Date;
  dateOfLeaving?: Date;
  
  // License Details
  licenseNumber?: string;
  licenseType?: string;
  licenseIssueDate?: Date;
  licenseExpiryDate?: Date;
  licenseIssuedBy?: string;
  
  // Medical Details
  medicalCertNumber?: string;
  medicalIssueDate?: Date;
  medicalExpiryDate?: Date;
  medicalIssuedBy?: string;
  bloodGroup?: string;
  medicalConditions?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  
  // Employment Details
  salary?: number;
  allowances?: number;
  bankAccountNumber?: string;
  bankName?: string;
  ifscCode?: string;
}

function StaffForm({ 
  staff, 
  isOpen, 
  onClose, 
  onSubmit 
}: { 
  staff?: any; 
  isOpen: boolean; 
  onClose: () => void; 
  onSubmit: (data: StaffFormData) => void; 
}) {
  const [formData, setFormData] = useState<StaffFormData>({
    employeeCode: staff?.employeeCode || "",
    firstName: staff?.firstName || "",
    lastName: staff?.lastName || "",
    phone: staff?.phone || "",
    email: staff?.email || "",
    address: staff?.address || "",
    staffType: staff?.staffType || "DRIVER",
    status: staff?.status || "ACTIVE",
    dateOfJoining: staff?.dateOfJoining ? new Date(staff.dateOfJoining) : new Date(),
    dateOfLeaving: staff?.dateOfLeaving ? new Date(staff.dateOfLeaving) : undefined,
    
    // License Details
    licenseNumber: staff?.licenseNumber || "",
    licenseType: staff?.licenseType || "",
    licenseIssueDate: staff?.licenseIssueDate ? new Date(staff.licenseIssueDate) : undefined,
    licenseExpiryDate: staff?.licenseExpiryDate ? new Date(staff.licenseExpiryDate) : undefined,
    licenseIssuedBy: staff?.licenseIssuedBy || "",
    
    // Medical Details
    medicalCertNumber: staff?.medicalCertNumber || "",
    medicalIssueDate: staff?.medicalIssueDate ? new Date(staff.medicalIssueDate) : undefined,
    medicalExpiryDate: staff?.medicalExpiryDate ? new Date(staff.medicalExpiryDate) : undefined,
    medicalIssuedBy: staff?.medicalIssuedBy || "",
    bloodGroup: staff?.bloodGroup || "",
    medicalConditions: staff?.medicalConditions || "",
    emergencyContact: staff?.emergencyContact || "",
    emergencyPhone: staff?.emergencyPhone || "",
    
    // Employment Details
    salary: staff?.salary || undefined,
    allowances: staff?.allowances || undefined,
    bankAccountNumber: staff?.bankAccountNumber || "",
    bankName: staff?.bankName || "",
    ifscCode: staff?.ifscCode || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleInputChange = (field: keyof StaffFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl">{staff ? "Edit Staff Member" : "Add New Staff Member"}</DialogTitle>
          <DialogDescription>
            {staff ? "Update staff member information" : "Add a new driver or conductor to your transportation team"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-8">
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="personal" className="cursor-pointer">Personal</TabsTrigger>
              <TabsTrigger value="license" className="cursor-pointer">License</TabsTrigger>
              <TabsTrigger value="medical" className="cursor-pointer">Medical</TabsTrigger>
              <TabsTrigger value="employment" className="cursor-pointer">Employment</TabsTrigger>
              <TabsTrigger value="emergency" className="cursor-pointer">Emergency</TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-sm font-medium">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange("firstName", e.target.value)}
                    placeholder="Enter first name"
                    className="cursor-text"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-sm font-medium">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange("lastName", e.target.value)}
                    placeholder="Enter last name"
                    className="cursor-text"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="employeeCode" className="text-sm font-medium">Employee Code</Label>
                  <Input
                    id="employeeCode"
                    value={formData.employeeCode}
                    onChange={(e) => handleInputChange("employeeCode", e.target.value)}
                    placeholder="Unique employee code"
                    className="cursor-text"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="staffType" className="text-sm font-medium">Staff Type *</Label>
                  <Select value={formData.staffType} onValueChange={(value) => handleInputChange("staffType", value)}>
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRIVER" className="cursor-pointer">Driver</SelectItem>
                      <SelectItem value="CONDUCTOR" className="cursor-pointer">Conductor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="Mobile number"
                    className="cursor-text"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="Email address"
                    className="cursor-text"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="text-sm font-medium">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder="Full address"
                  rows={3}
                  className="cursor-text"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-sm font-medium">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE" className="cursor-pointer">Active</SelectItem>
                      <SelectItem value="INACTIVE" className="cursor-pointer">Inactive</SelectItem>
                      <SelectItem value="ON_LEAVE" className="cursor-pointer">On Leave</SelectItem>
                      <SelectItem value="SUSPENDED" className="cursor-pointer">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfJoining" className="text-sm font-medium">Date of Joining</Label>
                  <DatePicker
                    value={formData.dateOfJoining}
                    onChange={(date) => handleInputChange("dateOfJoining", date)}
                    placeholder="Select joining date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfLeaving" className="text-sm font-medium">Date of Leaving</Label>
                  <DatePicker
                    value={formData.dateOfLeaving}
                    onChange={(date) => handleInputChange("dateOfLeaving", date)}
                    placeholder="Select leaving date"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="license" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="licenseNumber" className="text-sm font-medium">License Number</Label>
                  <Input
                    id="licenseNumber"
                    value={formData.licenseNumber}
                    onChange={(e) => handleInputChange("licenseNumber", e.target.value)}
                    placeholder="Driving license number"
                    className="cursor-text"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="licenseType" className="text-sm font-medium">License Type</Label>
                  <Input
                    id="licenseType"
                    value={formData.licenseType}
                    onChange={(e) => handleInputChange("licenseType", e.target.value)}
                    placeholder="e.g., Heavy Vehicle, Light Vehicle"
                    className="cursor-text"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="licenseIssueDate" className="text-sm font-medium">Issue Date</Label>
                  <DatePicker
                    value={formData.licenseIssueDate}
                    onChange={(date) => handleInputChange("licenseIssueDate", date)}
                    placeholder="Select issue date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="licenseExpiryDate" className="text-sm font-medium">Expiry Date</Label>
                  <DatePicker
                    value={formData.licenseExpiryDate}
                    onChange={(date) => handleInputChange("licenseExpiryDate", date)}
                    placeholder="Select expiry date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="licenseIssuedBy" className="text-sm font-medium">Issued By</Label>
                  <Input
                    id="licenseIssuedBy"
                    value={formData.licenseIssuedBy}
                    onChange={(e) => handleInputChange("licenseIssuedBy", e.target.value)}
                    placeholder="Issuing authority"
                    className="cursor-text"
                  />
                </div>
              </div>

              <Alert>
                <IdCard className="h-4 w-4" />
                <AlertDescription>
                  License information is crucial for compliance and safety. Ensure all details are accurate and up-to-date.
                </AlertDescription>
              </Alert>
            </TabsContent>

            <TabsContent value="medical" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="medicalCertNumber" className="text-sm font-medium">Medical Certificate Number</Label>
                  <Input
                    id="medicalCertNumber"
                    value={formData.medicalCertNumber}
                    onChange={(e) => handleInputChange("medicalCertNumber", e.target.value)}
                    placeholder="Medical certificate number"
                    className="cursor-text"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bloodGroup" className="text-sm font-medium">Blood Group</Label>
                  <Select value={formData.bloodGroup || ""} onValueChange={(value) => handleInputChange("bloodGroup", value)}>
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue placeholder="Select blood group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A+" className="cursor-pointer">A+</SelectItem>
                      <SelectItem value="A-" className="cursor-pointer">A-</SelectItem>
                      <SelectItem value="B+" className="cursor-pointer">B+</SelectItem>
                      <SelectItem value="B-" className="cursor-pointer">B-</SelectItem>
                      <SelectItem value="AB+" className="cursor-pointer">AB+</SelectItem>
                      <SelectItem value="AB-" className="cursor-pointer">AB-</SelectItem>
                      <SelectItem value="O+" className="cursor-pointer">O+</SelectItem>
                      <SelectItem value="O-" className="cursor-pointer">O-</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="medicalIssueDate" className="text-sm font-medium">Issue Date</Label>
                  <DatePicker
                    value={formData.medicalIssueDate}
                    onChange={(date) => handleInputChange("medicalIssueDate", date)}
                    placeholder="Select issue date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="medicalExpiryDate" className="text-sm font-medium">Expiry Date</Label>
                  <DatePicker
                    value={formData.medicalExpiryDate}
                    onChange={(date) => handleInputChange("medicalExpiryDate", date)}
                    placeholder="Select expiry date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="medicalIssuedBy" className="text-sm font-medium">Issued By</Label>
                  <Input
                    id="medicalIssuedBy"
                    value={formData.medicalIssuedBy}
                    onChange={(e) => handleInputChange("medicalIssuedBy", e.target.value)}
                    placeholder="Medical authority"
                    className="cursor-text"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="medicalConditions" className="text-sm font-medium">Medical Conditions</Label>
                <Textarea
                  id="medicalConditions"
                  value={formData.medicalConditions}
                  onChange={(e) => handleInputChange("medicalConditions", e.target.value)}
                  placeholder="Any medical conditions or restrictions"
                  rows={3}
                  className="cursor-text"
                />
              </div>

              <Alert>
                <Heart className="h-4 w-4" />
                <AlertDescription>
                  Medical fitness is mandatory for transportation staff. Regular health checkups are recommended.
                </AlertDescription>
              </Alert>
            </TabsContent>

            <TabsContent value="employment" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="salary" className="text-sm font-medium">Monthly Salary</Label>
                  <Input
                    id="salary"
                    type="number"
                    step="0.01"
                    value={formData.salary || ""}
                    onChange={(e) => handleInputChange("salary", e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="0.00"
                    className="cursor-text"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="allowances" className="text-sm font-medium">Monthly Allowances</Label>
                  <Input
                    id="allowances"
                    type="number"
                    step="0.01"
                    value={formData.allowances || ""}
                    onChange={(e) => handleInputChange("allowances", e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="0.00"
                    className="cursor-text"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="bankAccountNumber" className="text-sm font-medium">Bank Account Number</Label>
                  <Input
                    id="bankAccountNumber"
                    value={formData.bankAccountNumber}
                    onChange={(e) => handleInputChange("bankAccountNumber", e.target.value)}
                    placeholder="Account number"
                    className="cursor-text"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bankName" className="text-sm font-medium">Bank Name</Label>
                  <Input
                    id="bankName"
                    value={formData.bankName}
                    onChange={(e) => handleInputChange("bankName", e.target.value)}
                    placeholder="Bank name"
                    className="cursor-text"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ifscCode" className="text-sm font-medium">IFSC Code</Label>
                  <Input
                    id="ifscCode"
                    value={formData.ifscCode}
                    onChange={(e) => handleInputChange("ifscCode", e.target.value)}
                    placeholder="IFSC code"
                    className="cursor-text"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="emergency" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="emergencyContact" className="text-sm font-medium">Emergency Contact Name</Label>
                  <Input
                    id="emergencyContact"
                    value={formData.emergencyContact}
                    onChange={(e) => handleInputChange("emergencyContact", e.target.value)}
                    placeholder="Contact person name"
                    className="cursor-text"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyPhone" className="text-sm font-medium">Emergency Contact Phone</Label>
                  <Input
                    id="emergencyPhone"
                    value={formData.emergencyPhone}
                    onChange={(e) => handleInputChange("emergencyPhone", e.target.value)}
                    placeholder="Emergency contact number"
                    className="cursor-text"
                  />
                </div>
              </div>

              <Alert>
                <Phone className="h-4 w-4" />
                <AlertDescription>
                  Emergency contact information is crucial for staff safety and quick communication during emergencies.
                </AlertDescription>
              </Alert>
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose} className="cursor-pointer">
              Cancel
            </Button>
            <Button type="submit" className="cursor-pointer">
              {staff ? "Update Staff" : "Add Staff"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StaffDetailsDialog({ 
  staff, 
  isOpen, 
  onClose 
}: { 
  staff: any; 
  isOpen: boolean; 
  onClose: () => void; 
}) {
  if (!staff) return null;

  const getExpiryStatus = (expiryDate: string | Date | null) => {
    if (!expiryDate) return { color: "gray", text: "No date" };
    
    const expiry = new Date(expiryDate);
    const now = new Date();
    const daysDiff = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff < 0) return { color: "red", text: "Expired" };
    if (daysDiff <= 30) return { color: "orange", text: `${daysDiff} days left` };
    return { color: "green", text: "Valid" };
  };

  const licenseStatus = getExpiryStatus(staff.licenseExpiryDate);
  const medicalStatus = getExpiryStatus(staff.medicalExpiryDate);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {staff.firstName} {staff.lastName}
          </DialogTitle>
          <DialogDescription>
            Complete staff member information and status
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="employment">Employment</TabsTrigger>
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Employee Code</Label>
                      <p className="text-sm">{staff.employeeCode || "Not assigned"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Staff Type</Label>
                      <Badge variant="outline">{staff.staffType}</Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                      <p className="text-sm">{staff.phone || "Not provided"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                      <p className="text-sm">{staff.email || "Not provided"}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Address</Label>
                    <p className="text-sm">{staff.address || "Not provided"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                    <Badge variant={staff.status === "ACTIVE" ? "default" : "secondary"}>
                      {staff.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Medical Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Blood Group</Label>
                      <p className="text-sm font-bold text-red-600">{staff.bloodGroup || "Not provided"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Medical Status</Label>
                      <Badge variant={medicalStatus.color === "green" ? "default" : 
                                    medicalStatus.color === "orange" ? "outline" : "destructive"}>
                        {medicalStatus.text}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Emergency Contact</Label>
                    <p className="text-sm">{staff.emergencyContact || "Not provided"}</p>
                    {staff.emergencyPhone && (
                      <p className="text-sm text-muted-foreground">{staff.emergencyPhone}</p>
                    )}
                  </div>
                  {staff.medicalConditions && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Medical Conditions</Label>
                      <p className="text-sm">{staff.medicalConditions}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">License Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">License Number</Label>
                      <p className="text-sm font-medium">{staff.licenseNumber || "Not provided"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">License Type</Label>
                      <p className="text-sm">{staff.licenseType || "Not provided"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                      <Badge variant={licenseStatus.color === "green" ? "default" : 
                                    licenseStatus.color === "orange" ? "outline" : "destructive"}>
                        {licenseStatus.text}
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Issue Date</Label>
                      <p className="text-sm">
                        {staff.licenseIssueDate ? new Date(staff.licenseIssueDate).toLocaleDateString() : "Not provided"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Expiry Date</Label>
                      <p className="text-sm">
                        {staff.licenseExpiryDate ? new Date(staff.licenseExpiryDate).toLocaleDateString() : "Not provided"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Issued By</Label>
                      <p className="text-sm">{staff.licenseIssuedBy || "Not provided"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Medical Certificate</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Certificate Number</Label>
                      <p className="text-sm">{staff.medicalCertNumber || "Not provided"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Issue Date</Label>
                      <p className="text-sm">
                        {staff.medicalIssueDate ? new Date(staff.medicalIssueDate).toLocaleDateString() : "Not provided"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Expiry Date</Label>
                      <p className="text-sm">
                        {staff.medicalExpiryDate ? new Date(staff.medicalExpiryDate).toLocaleDateString() : "Not provided"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="employment" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Employment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Date of Joining</Label>
                    <p className="text-sm">
                      {staff.dateOfJoining ? new Date(staff.dateOfJoining).toLocaleDateString() : "Not provided"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Date of Leaving</Label>
                    <p className="text-sm">
                      {staff.dateOfLeaving ? new Date(staff.dateOfLeaving).toLocaleDateString() : "Still employed"}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Monthly Salary</Label>
                    <p className="text-lg font-bold text-green-600">
                      {staff.salary ? formatIndianCurrency(staff.salary) : "Not set"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Monthly Allowances</Label>
                    <p className="text-lg font-bold text-blue-600">
                      {staff.allowances ? formatIndianCurrency(staff.allowances) : "Not set"}
                    </p>
                  </div>
                </div>
                {staff.bankAccountNumber && (
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Bank Account</Label>
                      <p className="text-sm font-mono">{staff.bankAccountNumber}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Bank Name</Label>
                      <p className="text-sm">{staff.bankName}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">IFSC Code</Label>
                      <p className="text-sm font-mono">{staff.ifscCode}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assignments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Bus Assignments</CardTitle>
                <CardDescription>
                  Current and past bus assignments for this staff member
                </CardDescription>
              </CardHeader>
              <CardContent>
                {staff.busAssignments && staff.busAssignments.length > 0 ? (
                  <div className="space-y-4">
                    {staff.busAssignments.map((assignment: any) => (
                      <div key={assignment.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">{assignment.bus.busNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            {assignment.isPrimary ? "Primary" : "Secondary"} {assignment.staffType}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            From {new Date(assignment.startDate).toLocaleDateString()}
                            {assignment.endDate && ` to ${new Date(assignment.endDate).toLocaleDateString()}`}
                          </p>
                        </div>
                        <Badge variant={assignment.isActive ? "default" : "secondary"}>
                          {assignment.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No bus assignments found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default function TransportStaffPage() {
  const { currentBranchId } = useBranchContext();
  const { toast } = useToast();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: staff, isLoading, refetch } = api.transportation.getStaff.useQuery(
    {
      branchId: currentBranchId!,
      ...(filterType !== "all" && { staffType: filterType as any }),
      ...(filterStatus !== "all" && { status: filterStatus as any }),
    },
    {
      enabled: !!currentBranchId,
    }
  );

  const createStaffMutation = api.transportation.createStaff.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Staff member added successfully",
      });
      setIsFormOpen(false);
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateStaffMutation = api.transportation.updateStaff.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Staff member updated successfully",
      });
      setIsFormOpen(false);
      setSelectedStaff(null);
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteStaffMutation = api.transportation.deleteStaff.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Staff member deleted successfully",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddStaff = () => {
    setSelectedStaff(null);
    setIsFormOpen(true);
  };

  const handleEditStaff = (staff: any) => {
    setSelectedStaff(staff);
    setIsFormOpen(true);
  };

  const handleViewStaff = (staff: any) => {
    setSelectedStaff(staff);
    setIsDetailsOpen(true);
  };

  const handleDeleteStaff = (staff: any) => {
    if (confirm(`Are you sure you want to delete ${staff.firstName} ${staff.lastName}?`)) {
      deleteStaffMutation.mutate({ id: staff.id });
    }
  };

  const handleFormSubmit = (formData: StaffFormData) => {
    const data = {
      ...formData,
      branchId: currentBranchId!,
    };

    if (selectedStaff) {
      updateStaffMutation.mutate({ id: selectedStaff.id, data });
    } else {
      createStaffMutation.mutate(data);
    }
  };

  // Filter staff
  const filteredStaff = staff?.filter((member) => {
    const matchesSearch = 
      member.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (member.employeeCode && member.employeeCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (member.phone && member.phone.includes(searchTerm));

    return matchesSearch;
  });

  if (!currentBranchId) {
    return (
      <PageWrapper title="Transportation Staff" subtitle="Manage drivers and conductors">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please select a branch to access staff management features.
          </AlertDescription>
        </Alert>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Transportation Staff"
      subtitle="Manage drivers and conductors"
      action={
        <Button onClick={handleAddStaff} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Staff Member
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, employee code, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Staff Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="DRIVER">Drivers</SelectItem>
                <SelectItem value="CONDUCTOR">Conductors</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="ON_LEAVE">On Leave</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Statistics Cards */}
        {staff && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Total Staff</p>
                    <p className="text-2xl font-bold">{staff.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 text-green-600 dark:text-green-400">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Active Staff</p>
                    <p className="text-2xl font-bold">
                      {staff.filter(s => s.status === "ACTIVE").length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
                    <IdCard className="h-5 w-5" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Drivers</p>
                    <p className="text-2xl font-bold">
                      {staff.filter(s => s.staffType === "DRIVER").length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <UserX className="h-5 w-5" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Conductors</p>
                    <p className="text-2xl font-bold">
                      {staff.filter(s => s.staffType === "CONDUCTOR").length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Staff List */}
        <Card>
          <CardHeader>
            <CardTitle>Transportation Staff</CardTitle>
            <CardDescription>
              Manage your transportation team with complete staff records
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg animate-pulse">
                    <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="h-8 w-24 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : filteredStaff && filteredStaff.length > 0 ? (
              <div className="space-y-4">
                {filteredStaff.map((member) => {
                  const hasActiveAssignment = member.busAssignments?.some((a: any) => a.isActive);
                  const licenseExpiry = member.licenseExpiryDate ? new Date(member.licenseExpiryDate) : null;
                  const medicalExpiry = member.medicalExpiryDate ? new Date(member.medicalExpiryDate) : null;
                  const now = new Date();
                  
                  const licenseExpiring = licenseExpiry && (licenseExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24) <= 30;
                  const medicalExpiring = medicalExpiry && (medicalExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24) <= 30;

                  return (
                    <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                          {member.staffType === "DRIVER" ? <IdCard className="h-5 w-5" /> : <Users className="h-5 w-5" />}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{member.firstName} {member.lastName}</h3>
                            <Badge variant="outline">{member.staffType}</Badge>
                            <Badge variant={member.status === "ACTIVE" ? "default" : "secondary"}>
                              {member.status}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            {member.employeeCode && <span>ID: {member.employeeCode}</span>}
                            {member.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {member.phone}
                              </span>
                            )}
                          </div>
                          {(licenseExpiring || medicalExpiring) && (
                            <div className="flex items-center gap-2 mt-1">
                              {licenseExpiring && (
                                <Badge variant="destructive" className="text-xs">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  License Expiring
                                </Badge>
                              )}
                              {medicalExpiring && (
                                <Badge variant="destructive" className="text-xs">
                                  <Heart className="h-3 w-3 mr-1" />
                                  Medical Expiring
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {hasActiveAssignment && (
                          <Badge variant="outline" className="text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Assigned
                          </Badge>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleViewStaff(member)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewStaff(member)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditStaff(member)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Staff
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteStaff(member)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Staff
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="flex flex-col items-center gap-2">
                  <Users className="h-8 w-8 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {searchTerm || filterType !== "all" || filterStatus !== "all" 
                      ? "No staff members match your search criteria." 
                      : "No staff members added yet."}
                  </p>
                  {!searchTerm && filterType === "all" && filterStatus === "all" && (
                    <Button variant="outline" onClick={handleAddStaff}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Staff Member
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Forms and Dialogs */}
      <StaffForm
        staff={selectedStaff}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedStaff(null);
        }}
        onSubmit={handleFormSubmit}
      />

      <StaffDetailsDialog
        staff={selectedStaff}
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedStaff(null);
        }}
      />
    </PageWrapper>
  );
} 