"use client";

import { useState } from "react";
import Link from "next/link";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { 
  Loader2, 
  Users, 
  UserCheck, 
  UserX, 
  RefreshCw, 
  AlertTriangle,
  ChevronLeft,
  CheckCircle,
  XCircle,
  UserCog,
  GraduationCap,
  UsersIcon,
  Building,
  Eye
} from "lucide-react";
import { api } from "@/utils/api";
import { useGlobalBranchFilter } from "@/hooks/useGlobalBranchFilter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

interface UserWithoutClerk {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  admissionNumber?: string;
  employeeId?: string;
  // Parent-specific fields
  fatherName?: string;
  motherName?: string;
  guardianName?: string;
  fatherEmail?: string;
  motherEmail?: string;
  guardianEmail?: string;
  branch?: {
    code: string;
    name: string;
  };
  section?: {
    class: {
      name: string;
    };
  };
  students?: Array<{
    firstName: string;
    lastName: string;
    admissionNumber: string;
    branch: {
      code: string;
      name: string;
    };
  }>;
}

interface UserTableProps {
  users: UserWithoutClerk[];
  userType: "student" | "parent" | "teacher" | "employee";
  selectedUsers: string[];
  onSelectionChange: (userId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  isLoading?: boolean;
}

function UserTable({ users, userType, selectedUsers, onSelectionChange, onSelectAll, isLoading }: UserTableProps) {
  const allSelected = users.length > 0 && selectedUsers.length === users.length;
  const someSelected = selectedUsers.length > 0 && selectedUsers.length < users.length;

  const getTypeIcon = () => {
    switch (userType) {
      case "student": return <GraduationCap className="h-4 w-4" />;
      case "parent": return <Users className="h-4 w-4" />;
      case "teacher": return <UserCog className="h-4 w-4" />;
      case "employee": return <Building className="h-4 w-4" />;
    }
  };

  const getDisplayInfo = (user: UserWithoutClerk) => {
    switch (userType) {
      case "student":
        return {
          primaryId: user.admissionNumber || "N/A",
          secondaryInfo: user.section?.class?.name || "No Class"
        };
      case "parent":
        return {
          primaryId: `${user.students?.length || 0} children`,
          secondaryInfo: user.students?.[0]?.branch?.name || "No Branch"
        };
      case "teacher":
      case "employee":
        return {
          primaryId: user.employeeId || "N/A",
          secondaryInfo: user.branch?.name || "No Branch"
        };
      default:
        return { primaryId: "N/A", secondaryInfo: "N/A" };
    }
  };

  const getDisplayName = (user: UserWithoutClerk) => {
    if (userType === "parent") {
      // For parents, use fatherName, motherName, or guardianName
      const parent = user as any; // Type assertion since we know it's a parent
      if (parent.fatherName) return parent.fatherName;
      if (parent.motherName) return parent.motherName;
      if (parent.guardianName) return parent.guardianName;
      return "Parent/Guardian";
    }
    // For other user types, use firstName and lastName
    return `${user.firstName} ${user.lastName}`;
  };

  const getDisplayEmail = (user: UserWithoutClerk) => {
    if (userType === "parent") {
      // For parents, check fatherEmail, motherEmail, or guardianEmail
      const parent = user as any;
      return parent.fatherEmail || parent.motherEmail || parent.guardianEmail || "No email";
    }
    // For other user types, use the email field
    return user.email || "No email";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getTypeIcon()}
            {userType.charAt(0).toUpperCase() + userType.slice(1)}s
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (users.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getTypeIcon()}
            {userType.charAt(0).toUpperCase() + userType.slice(1)}s
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="text-lg font-medium text-green-700">All {userType}s have Clerk accounts!</p>
            <p className="text-sm text-muted-foreground mt-1">No action needed for this user type.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getTypeIcon()}
          {userType.charAt(0).toUpperCase() + userType.slice(1)}s Missing Clerk Accounts
          <Badge variant="destructive" className="ml-2">
            {users.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={onSelectAll}
                    ref={(el) => {
                      if (el && 'indeterminate' in el) {
                        (el as any).indeterminate = someSelected;
                      }
                    }}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>ID/Details</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Email</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const displayInfo = getDisplayInfo(user);
                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={(checked) => onSelectionChange(user.id, !!checked)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {getDisplayName(user)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{displayInfo.primaryId}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {displayInfo.secondaryInfo}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {getDisplayEmail(user)}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ClerkAccountsPage() {
  const { toast } = useToast();
  const { branch } = useGlobalBranchFilter();
  
  const [selectedUsers, setSelectedUsers] = useState<{
    students: string[];
    parents: string[];
    teachers: string[];
    employees: string[];
  }>({
    students: [],
    parents: [],
    teachers: [],
    employees: [],
  });

  // Fetch users without Clerk IDs
  const { data: usersData, isLoading, refetch } = api.clerkManagement.getUsersWithoutClerkIds.useQuery({
    branchId: branch?.id,
  });

  // Fetch statistics
  const { data: statsData, isLoading: isStatsLoading, refetch: refetchStats } = api.clerkManagement.getClerkAccountStats.useQuery({
    branchId: branch?.id,
  });

  // Use bulk retry mutation instead of the old one
  const bulkRetryMutation = api.clerkManagement.startBulkRetry.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Bulk task started",
        description: data.message,
      });
      void refetch();
      void refetchStats();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start bulk retry task.",
        variant: "destructive",
      });
    },
  });

  const handleSelectionChange = (userType: string, userId: string, selected: boolean) => {
    setSelectedUsers(prev => ({
      ...prev,
      [userType]: selected 
        ? [...prev[userType as keyof typeof prev], userId]
        : prev[userType as keyof typeof prev].filter(id => id !== userId)
    }));
  };

  const handleSelectAll = (userType: string, selected: boolean) => {
    const userData = usersData?.[userType as keyof typeof usersData] || [];
    setSelectedUsers(prev => ({
      ...prev,
      [userType]: selected ? userData.map((user: UserWithoutClerk) => user.id) : []
    }));
  };

  const handleRetrySelected = async (userType: "student" | "parent" | "teacher" | "employee") => {
    const userTypeMap = {
      student: "students",
      parent: "parents", 
      teacher: "teachers",
      employee: "employees"
    } as const;
    
    const selectedForType = selectedUsers[userTypeMap[userType]];
    if (selectedForType.length === 0) {
      toast({
        title: "No users selected",
        description: `Please select ${userType}s to retry account creation.`,
        variant: "destructive",
      });
      return;
    }

    // Prevent multiple submissions
    if (bulkRetryMutation.isPending) {
      toast({
        title: "Task already in progress",
        description: "Please wait for the current task to complete.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Use the new bulk retry endpoint
      await bulkRetryMutation.mutateAsync({
        userType,
        userIds: selectedForType,
      });

      // Clear selections after starting the task
      setSelectedUsers(prev => ({
        ...prev,
        [userTypeMap[userType]]: []
      }));
    } catch (error) {
      // Error is already handled in the mutation's onError
      console.error("Failed to start bulk retry:", error);
    }
  };

  const StatCard = ({ title, total, withClerk, withoutClerk, percentage, icon: Icon, isLoading }: any) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-2 w-full" />
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-2xl font-bold">{total}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <UserCheck className="h-3 w-3 mr-1 text-green-500" />
              {withClerk} with accounts
              <span className="mx-2">•</span>
              <UserX className="h-3 w-3 mr-1 text-red-500" />
              {withoutClerk} missing
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Completion Rate</span>
                <span>{percentage}%</span>
              </div>
              <Progress value={percentage} className="h-2" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <PageWrapper>
      <div className="space-y-6">
        {/* Header with Breadcrumbs */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Clerk Account Management</h1>
            <p className="text-muted-foreground">
              Manage and retry Clerk authentication account creation for users without accounts.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/settings">
              <Button variant="ghost" className="flex items-center gap-2">
                <ChevronLeft className="h-4 w-4" />
                Back to Settings
              </Button>
            </Link>
            <Button
              onClick={() => void refetch()}
              variant="outline"
              disabled={bulkRetryMutation.isPending}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Data
            </Button>
          </div>
        </div>

        {/* Statistics Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Students"
            total={statsData?.students.total || 0}
            withClerk={statsData?.students.withClerk || 0}
            withoutClerk={statsData?.students.withoutClerk || 0}
            percentage={statsData?.students.percentage || 0}
            icon={GraduationCap}
            isLoading={isStatsLoading}
          />
          <StatCard
            title="Parents"
            total={statsData?.parents.total || 0}
            withClerk={statsData?.parents.withClerk || 0}
            withoutClerk={statsData?.parents.withoutClerk || 0}
            percentage={statsData?.parents.percentage || 0}
            icon={Users}
            isLoading={isStatsLoading}
          />
          <StatCard
            title="Teachers"
            total={statsData?.teachers.total || 0}
            withClerk={statsData?.teachers.withClerk || 0}
            withoutClerk={statsData?.teachers.withoutClerk || 0}
            percentage={statsData?.teachers.percentage || 0}
            icon={UserCog}
            isLoading={isStatsLoading}
          />
          <StatCard
            title="Employees"
            total={statsData?.employees.total || 0}
            withClerk={statsData?.employees.withClerk || 0}
            withoutClerk={statsData?.employees.withoutClerk || 0}
            percentage={statsData?.employees.percentage || 0}
            icon={Building}
            isLoading={isStatsLoading}
          />
        </div>

        {/* Alert for missing accounts */}
        {!isLoading && usersData && (
          (usersData.students.length > 0 || usersData.parents.length > 0 || 
           usersData.teachers.length > 0 || usersData.employees.length > 0) && (
            <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
                  <AlertTriangle className="h-5 w-5" />
                  Action Required
                </CardTitle>
                <CardDescription className="text-orange-700 dark:text-orange-300">
                  Some users don't have Clerk authentication accounts. This means they cannot log in to the system.
                  Select users below and retry account creation.
                </CardDescription>
              </CardHeader>
            </Card>
          )
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="students" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="students" className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Students
              {(usersData?.students?.length || 0) > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs">
                  {usersData?.students?.length || 0}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="parents" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Parents
              {(usersData?.parents?.length || 0) > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs">
                  {usersData?.parents?.length || 0}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="teachers" className="flex items-center gap-2">
              <UserCog className="h-4 w-4" />
              Teachers
              {(usersData?.teachers?.length || 0) > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs">
                  {usersData?.teachers?.length || 0}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="employees" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Employees
              {(usersData?.employees?.length || 0) > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs">
                  {usersData?.employees?.length || 0}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="students" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold">Students Without Clerk Accounts</h2>
                <p className="text-sm text-muted-foreground">
                  Select students and retry account creation to allow them to log in.
                </p>
              </div>
              {selectedUsers.students.length > 0 && (
                <Button
                  onClick={() => handleRetrySelected("student")}
                  disabled={bulkRetryMutation.isPending}
                  className="flex items-center gap-2"
                >
                  {bulkRetryMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Retry Selected ({selectedUsers.students.length})
                </Button>
              )}
            </div>
            <UserTable
              users={usersData?.students || []}
              userType="student"
              selectedUsers={selectedUsers.students}
              onSelectionChange={(userId, selected) => handleSelectionChange("students", userId, selected)}
              onSelectAll={(selected) => handleSelectAll("students", selected)}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="parents" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold">Parents Without Clerk Accounts</h2>
                <p className="text-sm text-muted-foreground">
                  Select parents and retry account creation to allow them to access the parent portal.
                </p>
              </div>
              {selectedUsers.parents.length > 0 && (
                <Button
                  onClick={() => handleRetrySelected("parent")}
                  disabled={bulkRetryMutation.isPending}
                  className="flex items-center gap-2"
                >
                  {bulkRetryMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Retry Selected ({selectedUsers.parents.length})
                </Button>
              )}
            </div>
            <UserTable
              users={usersData?.parents || []}
              userType="parent"
              selectedUsers={selectedUsers.parents}
              onSelectionChange={(userId, selected) => handleSelectionChange("parents", userId, selected)}
              onSelectAll={(selected) => handleSelectAll("parents", selected)}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="teachers" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold">Teachers Without Clerk Accounts</h2>
                <p className="text-sm text-muted-foreground">
                  Select teachers and retry account creation to allow them to access the teacher portal.
                </p>
              </div>
              {selectedUsers.teachers.length > 0 && (
                <Button
                  onClick={() => handleRetrySelected("teacher")}
                  disabled={bulkRetryMutation.isPending}
                  className="flex items-center gap-2"
                >
                  {bulkRetryMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Retry Selected ({selectedUsers.teachers.length})
                </Button>
              )}
            </div>
            <UserTable
              users={usersData?.teachers || []}
              userType="teacher"
              selectedUsers={selectedUsers.teachers}
              onSelectionChange={(userId, selected) => handleSelectionChange("teachers", userId, selected)}
              onSelectAll={(selected) => handleSelectAll("teachers", selected)}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="employees" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold">Employees Without Clerk Accounts</h2>
                <p className="text-sm text-muted-foreground">
                  Select employees and retry account creation to allow them to access the system.
                </p>
              </div>
              {selectedUsers.employees.length > 0 && (
                <Button
                  onClick={() => handleRetrySelected("employee")}
                  disabled={bulkRetryMutation.isPending}
                  className="flex items-center gap-2"
                >
                  {bulkRetryMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Retry Selected ({selectedUsers.employees.length})
                </Button>
              )}
            </div>
            <UserTable
              users={usersData?.employees || []}
              userType="employee"
              selectedUsers={selectedUsers.employees}
              onSelectionChange={(userId, selected) => handleSelectionChange("employees", userId, selected)}
              onSelectAll={(selected) => handleSelectAll("employees", selected)}
              isLoading={isLoading}
            />
          </TabsContent>
        </Tabs>
      </div>
    </PageWrapper>
  );
} 