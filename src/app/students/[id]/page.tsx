"use client";

import { useState, useEffect } from "react";
import { api } from "@/utils/api";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Edit, Trash, UserX, UserCheck, User, GraduationCap, Home, Users, FileText, Award, Calendar, Mail, Phone, MapPin, BookOpen, Heart, Globe, CreditCard, School, UserCircle, Clock, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";
import { useDeleteConfirm, useStatusChangeConfirm } from "@/utils/popup-utils";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import type { Metadata } from "next";

const InfoField = ({ icon: Icon, label, value, className = "" }: { 
  icon?: any, 
  label: string, 
  value: string | null | undefined, 
  className?: string 
}) => (
  <div className={`space-y-1 ${className}`}>
    <div className="flex items-center gap-2">
      {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
    </div>
    <p className="text-sm font-medium text-foreground pl-6">{value || "Not provided"}</p>
  </div>
);

const InfoSection = ({ title, icon: Icon, children, className = "" }: { 
  title: string, 
  icon?: any, 
  children: React.ReactNode, 
  className?: string 
}) => (
  <Card className={className}>
    <CardHeader className="pb-4">
      <CardTitle className="flex items-center gap-2 text-lg">
        {Icon && <Icon className="h-5 w-5" />}
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      {children}
    </CardContent>
  </Card>
);

export default function StudentDetailPage() {
  const params = useParams() || {};
  const studentId = params.id as string;
  const router = useRouter();
  const { toast } = useToast();
  const deleteConfirm = useDeleteConfirm();
  const statusChangeConfirm = useStatusChangeConfirm();
  const [currentTab, setCurrentTab] = useState("overview");

  // Validate student ID - should be a valid UUID or similar ID format
  if (!studentId || typeof studentId !== 'string' || studentId.length < 10 || 
      ['tc', 'transfer', 'create', 'list', 'assign-roll-number'].includes(studentId.toLowerCase())) {
    return (
      <div className="px-4 lg:px-6">
        <div className="py-8 text-center">
          <p className="text-muted-foreground mb-4">
            Error: Invalid student ID format
          </p>
          <Button asChild>
            <Link href="/students">Back to Students</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Fetch student data
  const { data: student, isLoading, error } = api.student.getById.useQuery({ 
    id: studentId,
    // Don't filter by branch to allow viewing students from any branch
  }, {
    enabled: !!studentId && studentId.length > 0,
    retry: 1
  }) as { data: any, isLoading: boolean, error: any };

  // Update document title when student data is loaded
  useEffect(() => {
    if (student) {
      document.title = `${student.firstName} ${student.lastName} - Student Details | ScholaRise ERP`;
    }
  }, [student]);

  const utils = api.useContext();

  // API mutations
  const deleteStudentMutation = api.student.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "Student deleted",
        description: "Student has been successfully deleted.",
        variant: "success",
      });
      void utils.student.getAll.invalidate();
      void utils.student.getStats.invalidate();
      void router.push("/students");
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting student",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleStatusMutation = api.student.toggleStatus.useMutation({
    onSuccess: () => {
      toast({
        title: `Student ${student?.isActive ? "deactivated" : "activated"}`,
        description: `Student has been ${student?.isActive ? "deactivated" : "activated"} successfully.`,
        variant: "success",
      });
      void utils.student.getById.invalidate({ id: studentId });
      void utils.student.getAll.invalidate();
      void utils.student.getStats.invalidate();
    },
    onError: (error: any) => {
      toast({
        title: "Error updating student status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete handler
  const handleDelete = () => {
    if (!student) return;
    
    deleteConfirm("student", async () => {
      await deleteStudentMutation.mutateAsync({ id: studentId });
    });
  };

  // Toggle status handler
  const handleToggleStatus = () => {
    if (!student) return;
    
    statusChangeConfirm("student", !student.isActive, 1, async () => {
      await toggleStatusMutation.mutateAsync({
        id: studentId,
        isActive: !student.isActive,
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

  if (error || !student) {
    return (
      <div className="px-4 lg:px-6">
        <div className="py-8 text-center">
          <p className="text-muted-foreground mb-4">
            Error: {error?.message || "Student not found"}
          </p>
          <Button asChild>
            <Link href="/students">Back to Students</Link>
          </Button>
        </div>
      </div>
    );
  }

  const formatDate = (date: string | null | undefined) => {
    if (!date) return "Not specified";
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getInitials = () => {
    return `${student.firstName?.[0] || ''}${student.lastName?.[0] || ''}`.toUpperCase();
  };

  return (
    <div className="px-4 lg:px-6 w-full">
      {/* Header Section with Student Photo and Basic Info */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="outline" size="icon" asChild>
            <Link href="/students">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Student Profile
            </h1>
            <p className="text-muted-foreground">Complete student information and records</p>
          </div>
        </div>

        <Card className="border-2">
          <CardContent className="p-6">
            <div className="flex flex-col xl:flex-row gap-6">
              {/* Student Avatar and Basic Info */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                  <AvatarFallback className="text-2xl font-semibold bg-primary text-primary-foreground">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold text-foreground">
                    {student.firstName} {student.lastName}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={student.isActive ? "default" : "secondary"} className="text-sm">
                      {student.isActive ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Active
                        </>
                      ) : (
                        "Inactive"
                      )}
                    </Badge>
                    {student.section && (
                      <Badge variant="outline" className="text-sm">
                        <GraduationCap className="h-3 w-3 mr-1" />
                        Class {student.section.class.name} - {student.section.name}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <CreditCard className="h-3 w-3" />
                      {student.admissionNumber || "Not assigned"}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Joined {formatDate(student.dateOfAdmission)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="xl:ml-auto flex flex-wrap gap-2">
                <Button 
                  variant={student.isActive ? "outline" : "default"}
                  onClick={handleToggleStatus}
                  className="flex items-center gap-2"
                >
                  {student.isActive ? (
                    <>
                      <UserX className="h-4 w-4" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-4 w-4" />
                      Activate
                    </>
                  )}
                </Button>
                <Button 
                  asChild
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Link href={`/students/${studentId}/edit`}>
                    <Edit className="h-4 w-4" />
                    Edit
                  </Link>
                </Button>
                <Button 
                  variant="destructive"
                  onClick={handleDelete}
                  className="flex items-center gap-2"
                >
                  <Trash className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Information Tabs */}
      <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Personal
          </TabsTrigger>
          <TabsTrigger value="academic" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Academic
          </TabsTrigger>
          <TabsTrigger value="address" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            Address
          </TabsTrigger>
          <TabsTrigger value="family" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Family
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documents
          </TabsTrigger>
        </TabsList>
        
        {/* Personal Information Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <InfoSection title="Basic Information" icon={User}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <InfoField icon={User} label="First Name" value={student.firstName} />
                <InfoField icon={User} label="Last Name" value={student.lastName} />
                <InfoField icon={Calendar} label="Date of Birth" value={formatDate(student.dateOfBirth)} />
                <InfoField icon={UserCircle} label="Gender" value={student.gender} />
                <InfoField icon={Heart} label="Blood Group" value={student.bloodGroup} />
                <InfoField icon={Globe} label="Nationality" value={student.nationality} />
                <InfoField icon={BookOpen} label="Religion" value={student.religion} />
                <InfoField icon={Award} label="Caste" value={student.caste} />
              </div>
            </InfoSection>

            <InfoSection title="Contact Information" icon={Phone}>
              <div className="space-y-4">
                <InfoField icon={Mail} label="School Email" value={student.email} />
                <InfoField icon={Mail} label="Personal Email" value={student.personalEmail} />
                <InfoField icon={Phone} label="Phone Number" value={student.phone} />
              </div>
            </InfoSection>

            <InfoSection title="Admission Details" icon={School}>
              <div className="space-y-4">
                <InfoField icon={CreditCard} label="Admission Number" value={student.admissionNumber} />
                <InfoField icon={Calendar} label="Date of Admission" value={formatDate(student.dateOfAdmission)} />
                <InfoField icon={Calendar} label="Date of Joining" value={formatDate(student.joinDate)} />
                <InfoField icon={UserCircle} label="Username" value={student.username} />
              </div>
            </InfoSection>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <InfoSection title="Government IDs" icon={CreditCard}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <InfoField icon={CreditCard} label="Aadhar Number" value={student.aadharNumber} />
                <InfoField icon={CreditCard} label="UDISE ID" value={student.udiseId} />
                <InfoField icon={Award} label="CBSE 10th Roll Number" value={student.cbse10RollNumber} />
                <InfoField icon={Award} label="CBSE 12th Roll Number" value={student.cbse12RollNumber} />
              </div>
            </InfoSection>

            <InfoSection title="Current Academic Status" icon={GraduationCap}>
              <div className="space-y-4">
                <InfoField 
                  icon={GraduationCap} 
                  label="Current Class" 
                  value={student.section ? `${student.section.class.name} - ${student.section.name}` : "Not assigned"} 
                />
                <InfoField icon={Award} label="Roll Number" value={student.rollNumber} />
                <InfoField icon={Calendar} label="Academic Session" value={student.section?.class?.session?.name} />
              </div>
            </InfoSection>
          </div>
        </TabsContent>
        
        {/* Academic Information Tab */}
        <TabsContent value="academic" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <InfoSection title="Current Academic Status" icon={GraduationCap}>
              <div className="space-y-4">
                <InfoField 
                  icon={GraduationCap} 
                  label="Current Class" 
                  value={student.section ? `${student.section.class.name} - ${student.section.name}` : "Not assigned"} 
                />
                <InfoField icon={Award} label="Roll Number" value={student.rollNumber} />
                <InfoField icon={Calendar} label="Academic Session" value={student.section?.class?.session?.name} />
              </div>
            </InfoSection>

            <InfoSection title="Previous Education" icon={School}>
              <div className="space-y-4">
                <InfoField icon={School} label="Previous School" value={student.previousSchool} />
                <InfoField icon={GraduationCap} label="Last Class Attended" value={student.lastClassAttended} />
                <InfoField icon={BookOpen} label="Medium of Instruction" value={student.mediumOfInstruction} />
                <InfoField icon={CheckCircle2} label="State Board Recognition" value={student.recognisedByStateBoard ? "Yes" : "No"} />
                <InfoField icon={MapPin} label="Previous School City" value={student.schoolCity} />
                <InfoField icon={MapPin} label="Previous School State" value={student.schoolState} />
                <InfoField icon={FileText} label="Reason for Leaving" value={student.reasonForLeaving} />
              </div>
            </InfoSection>
          </div>
        </TabsContent>

        {/* Address Information Tab */}
        <TabsContent value="address" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <InfoSection title="Permanent Address" icon={Home}>
              <div className="space-y-4">
                <InfoField icon={MapPin} label="Address" value={student.permanentAddress} />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <InfoField icon={MapPin} label="City" value={student.permanentCity} />
                  <InfoField icon={MapPin} label="State" value={student.permanentState} />
                  <InfoField icon={Globe} label="Country" value={student.permanentCountry} />
                  <InfoField icon={MapPin} label="ZIP Code" value={student.permanentZipCode} />
                </div>
              </div>
            </InfoSection>

            <InfoSection title="Correspondence Address" icon={Mail}>
              <div className="space-y-4">
                <InfoField icon={MapPin} label="Address" value={student.correspondenceAddress || "Same as permanent address"} />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <InfoField icon={MapPin} label="City" value={student.correspondenceCity} />
                  <InfoField icon={MapPin} label="State" value={student.correspondenceState} />
                  <InfoField icon={Globe} label="Country" value={student.correspondenceCountry} />
                  <InfoField icon={MapPin} label="ZIP Code" value={student.correspondenceZipCode} />
                </div>
              </div>
            </InfoSection>
          </div>
        </TabsContent>
        
        {/* Family Information Tab */}
        <TabsContent value="family" className="space-y-6">
          {student.parent ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              <InfoSection title="Father's Information" icon={User}>
                <div className="space-y-4">
                  <InfoField icon={User} label="Name" value={student.parent.fatherName} />
                  <InfoField icon={Calendar} label="Date of Birth" value={formatDate(student.parent.fatherDob)} />
                  <InfoField icon={GraduationCap} label="Education" value={student.parent.fatherEducation} />
                  <InfoField icon={Award} label="Occupation" value={student.parent.fatherOccupation} />
                  <InfoField icon={Phone} label="Mobile" value={student.parent.fatherMobile} />
                  <InfoField icon={Mail} label="Email" value={student.parent.fatherEmail} />
                </div>
              </InfoSection>

              <InfoSection title="Mother's Information" icon={User}>
                <div className="space-y-4">
                  <InfoField icon={User} label="Name" value={student.parent.motherName} />
                  <InfoField icon={Calendar} label="Date of Birth" value={formatDate(student.parent.motherDob)} />
                  <InfoField icon={GraduationCap} label="Education" value={student.parent.motherEducation} />
                  <InfoField icon={Award} label="Occupation" value={student.parent.motherOccupation} />
                  <InfoField icon={Phone} label="Mobile" value={student.parent.motherMobile} />
                  <InfoField icon={Mail} label="Email" value={student.parent.motherEmail} />
                </div>
              </InfoSection>

              <InfoSection title="Guardian's Information" icon={User} className="lg:col-span-2 xl:col-span-1">
                <div className="space-y-4">
                  <InfoField icon={User} label="Name" value={student.parent.guardianName} />
                  <InfoField icon={Calendar} label="Date of Birth" value={formatDate(student.parent.guardianDob)} />
                  <InfoField icon={GraduationCap} label="Education" value={student.parent.guardianEducation} />
                  <InfoField icon={Award} label="Occupation" value={student.parent.guardianOccupation} />
                  <InfoField icon={Phone} label="Mobile" value={student.parent.guardianMobile} />
                  <InfoField icon={Mail} label="Email" value={student.parent.guardianEmail} />
                </div>
              </InfoSection>
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Family Information</h3>
                <p className="text-muted-foreground">No parent or guardian information is available for this student.</p>
              </CardContent>
            </Card>
          )}

          {student.parent && (
            <InfoSection title="Additional Family Details" icon={Users}>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
                <InfoField icon={Calendar} label="Parents' Anniversary" value={formatDate(student.parent.parentAnniversary)} />
                <InfoField icon={CreditCard} label="Monthly Income" value={student.parent.monthlyIncome} />
              </div>
            </InfoSection>
          )}
        </TabsContent>

        {/* Documents and Records Tab */}
        <TabsContent value="documents" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            <InfoSection title="Academic Records" icon={FileText}>
              <div className="space-y-4">
                <InfoField icon={Award} label="CBSE 10th Roll Number" value={student.cbse10RollNumber} />
                <InfoField icon={Award} label="CBSE 12th Roll Number" value={student.cbse12RollNumber} />
                <InfoField icon={FileText} label="Transfer Certificate" value="Not available" />
                <InfoField icon={FileText} label="Character Certificate" value="Not available" />
              </div>
            </InfoSection>

            <InfoSection title="System Information" icon={Clock}>
              <div className="space-y-4">
                <InfoField icon={Calendar} label="Profile Created" value={formatDate(student.createdAt)} />
                <InfoField icon={Clock} label="Last Updated" value={formatDate(student.updatedAt)} />
                <InfoField icon={UserCircle} label="Clerk ID" value={student.clerkId} />
                <InfoField icon={CheckCircle2} label="Status" value={student.isActive ? "Active" : "Inactive"} />
              </div>
            </InfoSection>

            <InfoSection title="Additional Information" icon={FileText} className="lg:col-span-2 xl:col-span-1">
              <div className="space-y-4">
                <InfoField icon={CreditCard} label="Branch ID" value={student.branchId} />
                <InfoField icon={Users} label="Parent ID" value={student.parentId} />
                <InfoField icon={School} label="Section ID" value={student.sectionId} />
              </div>
            </InfoSection>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
