"use client";

import { useState, useEffect } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Check, ChevronsUpDown, Filter, PlusCircle, Search, User, UserPlus, MoreHorizontal, CheckCircle, Edit, Trash2, ShieldAlert, Mail } from "lucide-react";
import { RouteGuard } from "@/components/route-guard";
import { Permission, Role } from "@/types/permissions";
import Link from "next/link";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { useToast } from "@/components/ui/use-toast";

interface UserType {
  id: string;
  name: string;
  email: string;
  role: string;
  roles: string[];
  status: "active" | "inactive";
  createdAt: string;
  lastLogin: string;
  branch: string;
}

interface RoleType {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  _count?: {
    userRoles: number;
  };
}

// Role badge colors
const roleBadgeColors: Record<string, string> = {
  [Role.SUPER_ADMIN]: "bg-red-100 text-red-800 border-red-200",
  [Role.ADMIN]: "bg-purple-100 text-purple-800 border-purple-200",
  [Role.PRINCIPAL]: "bg-blue-100 text-blue-800 border-blue-200",
  [Role.TEACHER]: "bg-green-100 text-green-800 border-green-200",
  [Role.ACCOUNTANT]: "bg-amber-100 text-amber-800 border-amber-200",
  [Role.RECEPTIONIST]: "bg-pink-100 text-pink-800 border-pink-200",
  [Role.TRANSPORT_MANAGER]: "bg-indigo-100 text-indigo-800 border-indigo-200",
  [Role.STAFF]: "bg-slate-100 text-slate-800 border-slate-200",
};

// Helper function to get badge color based on role
const getRoleBadgeColor = (role: string) => {
  return roleBadgeColors[role] || "bg-gray-100 text-gray-800 border-gray-200";
};

export default function UsersPage() {
  return (
    <RouteGuard requiredPermissions={[Permission.MANAGE_USERS]}>
      <PageWrapper>
        <UserManagement />
      </PageWrapper>
    </RouteGuard>
  );
}

function UserManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const { currentBranchId } = useBranchContext();
  const { toast } = useToast();
  
  // Fetch all roles
  const { data: roles = [], isLoading: isLoadingRoles } = api.role.getAll.useQuery();
  
  // Fetch teachers from the API
  const { data: teachersData, isLoading: isLoadingTeachers } = api.teacher.getAll.useQuery({
    branchId: currentBranchId || undefined,
    limit: 100
  });
  
  // Fetch employees from the API
  const { data: employeesData, isLoading: isLoadingEmployees } = api.employee.getAll.useQuery({
    branchId: currentBranchId || undefined,
    limit: 100
  });
  
  // Fetch branches for filtering
  const { data: branches = [] } = api.branch.getAll.useQuery();
  
  // Map teachers and employees to UserType array format
  const [users, setUsers] = useState<UserType[]>([]);
  
  useEffect(() => {
    const mappedUsers: UserType[] = [];
    
    // Map teachers to users
    if (teachersData?.items) {
      teachersData.items.forEach(teacher => {
        mappedUsers.push({
          id: teacher.id,
          name: `${teacher.firstName} ${teacher.lastName}`.trim(),
          email: 'teacher@school.edu', // Default email as it might not exist in the model
          role: Role.TEACHER,
          roles: [Role.TEACHER],
          status: teacher.isActive ? "active" : "inactive",
          createdAt: teacher.createdAt ? new Date(teacher.createdAt).toLocaleDateString() : '-',
          lastLogin: 'N/A', // We don't have this data from the API
          branch: teacher.branchId || '',
        });
      });
    }
    
    // Map employees to users
    if (employeesData?.items) {
      employeesData.items.forEach(employee => {
        let role = Role.STAFF;
        
        // Determine role based on employee designation
        if (employee.designation) {
          const designation = employee.designation.toLowerCase();
          if (designation.includes('admin')) role = Role.ADMIN;
          if (designation.includes('principal')) role = Role.PRINCIPAL;
          if (designation.includes('accountant')) role = Role.ACCOUNTANT;
          if (designation.includes('receptionist')) role = Role.RECEPTIONIST;
          if (designation.includes('transport')) role = Role.TRANSPORT_MANAGER;
        }
        
        mappedUsers.push({
          id: employee.id,
          name: `${employee.firstName} ${employee.lastName}`.trim(),
          email: 'employee@school.edu', // Default email as it might not exist in the model
          role: role,
          roles: [role],
          status: employee.isActive ? "active" : "inactive",
          createdAt: employee.createdAt ? new Date(employee.createdAt).toLocaleDateString() : '-',
          lastLogin: 'N/A', // We don't have this data
          branch: employee.branchId || '',
        });
      });
    }
    
    setUsers(mappedUsers);
  }, [teachersData, employeesData]);

  // Function to get unique branches from users
  const getBranchesFromUsers = () => {
    const branchIds = users.map(user => user.branch);
    const uniqueBranchIds = Array.from(new Set(branchIds));
    
    return branches
      .filter(branch => uniqueBranchIds.includes(branch.id))
      .map(branch => ({
        id: branch.id,
        name: branch.name
      }));
  };

  // Mutation for assigning roles
  const assignRoleMutation = api.role.assignRoleToUser.useMutation({
    onSuccess: () => {
      toast({
        title: "Role updated",
        description: "User role has been updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating role",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Handle role change
  const handleRoleChange = (userId: string, roleId: string) => {
    // Call the API to assign the role to the user
    assignRoleMutation.mutate({
      userId,
      roleId,
    });
    
    // Find the role name to update the UI
    const role = roles.find((r: RoleType) => r.id === roleId);
    if (role) {
      setUsers(
        users.map((user) =>
          user.id === userId ? { ...user, role: role.name, roles: [role.name] } : user
        )
      );
    }
  };

  // Filter users based on search term and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm ? 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) : 
      true;
      
    const matchesRole = selectedRole ? user.role === selectedRole : true;
    const matchesStatus = selectedStatus ? user.status === selectedStatus : true;
    const matchesBranch = selectedBranch ? user.branch === selectedBranch : true;
    
    return matchesSearch && matchesRole && matchesStatus && matchesBranch;
  });

  // Get branch name from id
  const getBranchName = (branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    return branch?.name || branchId;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-[#00501B]">Staff Management</h1>
          <p className="text-gray-500 mt-1">
            Manage teachers and staff accounts and assign appropriate roles
          </p>
        </div>
        <Button className="bg-[#00501B] hover:bg-[#00401A]">
          <UserPlus className="mr-2 h-4 w-4" />
          Add New Staff Member
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Staff & Teachers</CardTitle>
          <CardDescription>
            View and manage all staff members in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search teachers and staff..."
                className="pl-8 bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="border-dashed">
                  <Filter className="mr-2 h-4 w-4" />
                  Filter
                  {(selectedRole || selectedStatus || selectedBranch) && (
                    <Badge variant="secondary" className="ml-2 font-normal rounded-sm px-1">
                      {[
                        selectedRole && "Role",
                        selectedStatus && "Status",
                        selectedBranch && "Branch"
                      ].filter(Boolean).length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0" align="end">
                <Command>
                  <CommandInput placeholder="Filter users..." />
                  <CommandList>
                    <CommandEmpty>No results found</CommandEmpty>
                    <CommandGroup heading="Role">
                      <CommandItem onSelect={() => setSelectedRole(null)} className="justify-between">
                        All roles
                        {!selectedRole && <Check className="h-4 w-4" />}
                      </CommandItem>
                      {roles.map((role: RoleType) => (
                        <CommandItem
                          key={role.id}
                          onSelect={() => setSelectedRole(role.id)}
                          className="justify-between"
                        >
                          <div className="flex items-center">
                            <Badge variant="outline" className={`${getRoleBadgeColor(role.name)} text-xs font-normal mr-2`}>
                              {role.name.replace(/_/g, " ")}
                            </Badge>
                          </div>
                          {selectedRole === role.id && <Check className="h-4 w-4" />}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    <CommandGroup heading="Status">
                      <CommandItem onSelect={() => setSelectedStatus(null)} className="justify-between">
                        All statuses
                        {!selectedStatus && <Check className="h-4 w-4" />}
                      </CommandItem>
                      <CommandItem onSelect={() => setSelectedStatus("active")} className="justify-between">
                        Active
                        {selectedStatus === "active" && <Check className="h-4 w-4" />}
                      </CommandItem>
                      <CommandItem onSelect={() => setSelectedStatus("inactive")} className="justify-between">
                        Inactive
                        {selectedStatus === "inactive" && <Check className="h-4 w-4" />}
                      </CommandItem>
                    </CommandGroup>
                    <CommandGroup heading="Branch">
                      <CommandItem onSelect={() => setSelectedBranch(null)} className="justify-between">
                        All branches
                        {!selectedBranch && <Check className="h-4 w-4" />}
                      </CommandItem>
                      {getBranchesFromUsers().map((branch) => (
                        <CommandItem
                          key={branch.id}
                          onSelect={() => setSelectedBranch(branch.id)}
                          className="justify-between"
                        >
                          {branch.name}
                          {selectedBranch === branch.id && <Check className="h-4 w-4" />}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            
            <Link href="/settings/roles">
              <Button variant="outline">
                <ShieldAlert className="mr-2 h-4 w-4" />
                Manage Roles
              </Button>
            </Link>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingTeachers || isLoadingEmployees ? (
                  // Show loading skeleton UI while data is being loaded
                  Array(5).fill(0).map((_, index) => (
                    <TableRow key={`loading-${index}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-9 w-9 rounded-full" />
                          <div className="space-y-1">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-32" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-8 rounded-full ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src="" />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {user.name.split(" ").map((n) => n[0]).join("").substring(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          defaultValue={user.role}
                          onValueChange={(value) => handleRoleChange(user.id, value)}
                        >
                          <SelectTrigger className="w-[180px] h-8">
                            <SelectValue>
                              <div className="flex items-center">
                                <Badge variant="outline" className={`${getRoleBadgeColor(user.role)} text-xs font-normal`}>
                                  {user.role.replace("_", " ")}
                                </Badge>
                              </div>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectLabel>Roles</SelectLabel>
                              {roles.map((role: RoleType) => (
                                <SelectItem key={role.id} value={role.id}>
                                  <div className="flex items-center">
                                    <Badge variant="outline" className={`${getRoleBadgeColor(role.name)} text-xs font-normal mr-2`}>
                                      {role.name.replace(/_/g, " ")}
                                    </Badge>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.status === "active" ? "default" : "secondary"} className={`capitalize ${user.status === "active" ? "bg-green-100 text-green-800 border-green-200" : ""}`}>
                          {user.status === "active" ? (
                            <><CheckCircle className="mr-1 h-3 w-3" /> Active</>
                          ) : (
                            <>Inactive</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>{getBranchName(user.branch)}</TableCell>
                      <TableCell>{user.createdAt}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <User className="mr-2 h-4 w-4" />
                              <span>View Profile</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              <span>Edit User</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <Mail className="mr-2 h-4 w-4" />
                              <span>Send Email</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Delete User</span>
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

          <div className="flex items-center justify-end space-x-2 py-4">
            <div className="flex-1 text-sm text-muted-foreground">
              Showing <span className="font-medium">{filteredUsers.length}</span> of{" "}
              <span className="font-medium">{users.length}</span> users
            </div>
            <div className="space-x-2">
              <Button
                variant="outline"
                size="sm"
                disabled
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 