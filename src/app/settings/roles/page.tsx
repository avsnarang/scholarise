"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RouteGuard } from "@/components/route-guard";
import { Permission, Role } from "@/types/permissions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Check, Info, Mail, Save, Shield, ShieldAlert, User, X, PlusCircle, Trash, Users, Eye, Plus, Edit, Minus, Settings } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { rolePermissions } from "@/utils/rbac";
import { usePermissions } from "@/hooks/usePermissions";
import Link from "next/link";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { RouterOutputs } from "@/utils/api";
import { PermissionsHelpDialog } from "./permissions-help";

export default function RolesPage() {
  return (
    <RouteGuard requiredPermissions={[Permission.MANAGE_USERS]}>
      <PageWrapper>
        <RoleManagement />
      </PageWrapper>
    </RouteGuard>
  );
}

// Role badge colors - Simplified material design colors
const roleBadgeColors: Record<string, string> = {
  [Role.SUPER_ADMIN]: "bg-red-500 text-white",
  [Role.ADMIN]: "bg-purple-500 text-white",
  [Role.PRINCIPAL]: "bg-blue-500 text-white",
  [Role.TEACHER]: "bg-green-500 text-white",
  [Role.ACCOUNTANT]: "bg-amber-500 text-white",
  [Role.RECEPTIONIST]: "bg-pink-500 text-white",
  [Role.TRANSPORT_MANAGER]: "bg-indigo-500 text-white",
  [Role.STAFF]: "bg-slate-500 text-white",
};

// Helper function to get badge color based on role
const getRoleBadgeColor = (role: string) => {
  return roleBadgeColors[role] || "bg-gray-500 text-white";
};

type DbRole = RouterOutputs["role"]["getAll"][0];

// Create Role Modal
const CreateRoleModal = ({ 
  isOpen, 
  onClose, 
  onCreateRole,
  roles,
  isCreating
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onCreateRole: (name: string, description: string, copyFromRoleId?: string) => void;
  roles: any[] | undefined;
  isCreating: boolean;
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [copyFrom, setCopyFrom] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setName("");
      setDescription("");
      setCopyFrom(null);
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (!name.trim()) return;
    onCreateRole(
      name, 
      description, 
      copyFrom === "none" ? undefined : copyFrom || undefined
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Custom Role</DialogTitle>
          <DialogDescription>
            Define a new role with custom permissions
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Role Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              placeholder="e.g. Department Head"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Description
            </Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3"
              placeholder="Brief description of this role"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="base-role" className="text-right">
              Base Permissions
            </Label>
            <Select value={copyFrom || "none"} onValueChange={setCopyFrom}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Start from scratch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Start from scratch</SelectItem>
                {roles?.map((role: any) => (
                  <SelectItem key={role.id} value={role.id}>
                    Copy from {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            className="bg-[#00501B] hover:bg-[#00401A]"
            disabled={isCreating || !name.trim()}
          >
            {isCreating ? "Creating..." : "Create Role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

function RoleManagement() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("");
  const { currentBranchId } = useBranchContext();
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  
  // Fetch roles and permissions from the API
  const { data: dbRoles, isLoading: isLoadingRoles, refetch: refetchRoles } = api.role.getAll.useQuery();
  
  const { data: dbPermissions, isLoading: isLoadingPermissions } = api.role.getAllPermissions.useQuery();
  
  // Get the selected role's permissions
  const { data: rolePermissions, isLoading: isLoadingRolePermissions, refetch: refetchRolePermissions } = 
    api.role.getRolePermissions.useQuery({ roleId: activeTab }, {
      enabled: !!activeTab,
    });
  
  // Update selected permissions when role permissions load
  useEffect(() => {
    if (rolePermissions) {
      const permissionIds = new Set<string>(rolePermissions.map((p: any) => p.id as string));
      setSelectedPermissions(permissionIds);
    }
  }, [rolePermissions]);

  // Reset selected permissions when active tab changes
  useEffect(() => {
    if (activeTab && rolePermissions) {
      const permissionIds = new Set<string>(rolePermissions.map((p: any) => p.id as string));
      setSelectedPermissions(permissionIds);
    }
  }, [activeTab, rolePermissions]);
  
  // Mutation for updating role permissions
  const updateRolePermissionsMutation = api.role.updateRolePermissions.useMutation({
    onSuccess: () => {
      toast({
        title: "Permissions updated",
        description: "Role permissions have been saved successfully",
        duration: 3000,
      });
      refetchRolePermissions();
      refetchRoles();
    },
    onError: (error) => {
      toast({
        title: "Error updating permissions",
        description: error.message,
        variant: "destructive",
        duration: 3000,
      });
    }
  });
  
  // Mutation for creating a new role
  const createRoleMutation = api.role.create.useMutation({
    onSuccess: (newRole) => {
      toast({
        title: "Custom role created",
        description: `${newRole.name} has been created successfully.`,
      });
      refetchRoles();
      setActiveTab(newRole.id);
      setIsCreateRoleOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error creating role",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Mutation for deleting a role
  const deleteRoleMutation = api.role.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "Role deleted",
        description: "Custom role has been removed successfully",
      });
      refetchRoles();
      setActiveTab("");
    },
    onError: (error) => {
      toast({
        title: "Error deleting role",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Group permissions by category
  const groupedPermissions = useMemo(() => {
    if (!dbPermissions) return {};
    
    const filtered = dbPermissions.filter((p: any) => 
      searchTerm === "" || 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    return filtered.reduce((acc: any, permission: any) => {
      const category = permission.category || "Other";
      if (!acc[category]) acc[category] = [];
      acc[category].push(permission);
      return acc;
    }, {});
  }, [dbPermissions, searchTerm]);

  // Set default tab when roles load
  useEffect(() => {
    if (!activeTab && dbRoles && dbRoles.length > 0) {
      setActiveTab(dbRoles[0].id);
    }
  }, [dbRoles, activeTab]);

  // Helper functions
  const isSystemRole = useMemo(() => {
    if (!dbRoles || !activeTab) return false;
    const role = dbRoles.find((r: any) => r.id === activeTab);
    return role?.isSystem || false;
  }, [dbRoles, activeTab]);

  const handleCreateRole = (name: string, description: string, copyFromRoleId?: string) => {
    createRoleMutation.mutate({
      name,
      description,
      copyFromRoleId,
    });
  };

  const handleDeleteCustomRole = (roleId: string) => {
    if (confirm("Are you sure you want to delete this custom role? This action cannot be undone.")) {
      deleteRoleMutation.mutate({ id: roleId });
    }
  };

  const togglePermission = (permissionId: string) => {
    if (isSystemRole && getActiveRoleName === Role.SUPER_ADMIN) {
      return; // Prevent changes to super admin
    }
    
    setSelectedPermissions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(permissionId)) {
        newSet.delete(permissionId);
      } else {
        newSet.add(permissionId);
      }
      return newSet;
    });
  };

  const handleSavePermissions = () => {
    if (!activeTab) return;
    updateRolePermissionsMutation.mutate({
      roleId: activeTab,
      permissions: Array.from(selectedPermissions),
    });
  };

  const hasPermission = (permissionId: string) => {
    return selectedPermissions.has(permissionId);
  };
  
  // Helper to get role name
  const getActiveRoleName = useMemo(() => {
    if (!dbRoles || !activeTab) return "";
    const role = dbRoles.find((r: any) => r.id === activeTab);
    return role?.name || "";
  }, [dbRoles, activeTab]);

  // Get active role object
  const activeRole = useMemo(() => {
    if (!dbRoles || !activeTab) return null;
    return dbRoles.find((r: any) => r.id === activeTab);
  }, [dbRoles, activeTab]);
  
  // Simple role tile with material design
  const renderRoleTile = (role: DbRole) => {
    const isCustomRole = !role.isSystem;
    const isActive = activeTab === role.id;
    
    return (
      <div
        key={role.id}
        className={`p-4 cursor-pointer border rounded-lg transition-colors ${
          isActive 
            ? "border-[#00501B] bg-[#00501B] text-white" 
            : "border-gray-200 hover:border-gray-300 bg-white"
        }`}
        onClick={() => setActiveTab(role.id)}
      >
        <div className="flex justify-between items-start mb-2">
          <Badge 
            variant="outline" 
            className={`${
              isActive 
                ? "bg-white text-[#00501B] border-white" 
                : getRoleBadgeColor(role.name)
            } text-sm px-2 py-1`}
          >
            {role.name.toLowerCase().replace(/_/g, " ")}
            {isCustomRole && (
              <span className="ml-1 text-xs opacity-70">(Custom)</span>
            )}
          </Badge>
          {isCustomRole && (
            <Button
              variant="ghost"
              size="icon"
              className={`h-6 w-6 ${isActive ? 'text-white hover:bg-red-600' : 'text-gray-400 hover:text-red-600'}`}
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteCustomRole(role.id);
              }}
              disabled={deleteRoleMutation.status === "pending"}
            >
              <Trash className="h-3 w-3" />
            </Button>
          )}
        </div>
        
        <h3 className={`font-medium text-sm ${isActive ? 'text-white' : 'text-gray-900'}`}>
          {role.name.split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
        </h3>
        <p className={`text-xs mt-1 ${isActive ? 'text-white/80' : 'text-gray-600'}`}>
          {role.description}
        </p>
        
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/20">
          <div className="flex items-center space-x-1">
            <Users className={`h-3 w-3 ${isActive ? 'text-white/70' : 'text-gray-500'}`} />
            <span className={`text-xs ${isActive ? 'text-white' : 'text-gray-600'}`}>
              {role._count?.userRoles || 0} users
            </span>
          </div>
          {isActive && (
            <Check className="h-3 w-3 text-white" />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-[#00501B]">Role Management</h1>
          <p className="text-gray-500 mt-1">
            Configure permissions and access levels for different staff roles
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PermissionsHelpDialog />
          <Link href="/settings/users">
            <Button variant="outline">
              <Users className="mr-2 h-4 w-4" />
              Manage Staff
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Role Selection Panel */}
        <div className="col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Available Roles</CardTitle>
              <CardDescription>
                Select a role to configure permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mb-4">
                <Button 
                  variant="outline" 
                  className="w-full border-dashed"
                  onClick={() => setIsCreateRoleOpen(true)}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Custom Role
                </Button>
              </div>
              
              <div className="max-h-[500px] overflow-y-auto space-y-3">
                {isLoadingRoles ? (
                  Array(6).fill(0).map((_, i) => (
                    <div key={i} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-4 w-12" />
                      </div>
                      <Skeleton className="h-4 w-full mb-1" />
                      <Skeleton className="h-3 w-3/4" />
                    </div>
                  ))
                ) : (
                  dbRoles?.map(renderRoleTile)
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Permissions Panel */}
        <div className="col-span-1 md:col-span-2">
          {activeRole ? (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge 
                        variant="outline" 
                        className={`${getRoleBadgeColor(getActiveRoleName)} text-sm`}
                      >
                        {getActiveRoleName.replace(/_/g, " ")}
                      </Badge>
                      <CardTitle>Permission Configuration</CardTitle>
                      <PermissionsHelpDialog />
                    </div>
                    <CardDescription>
                      Configure what <strong>{getActiveRoleName.replace(/_/g, " ")}</strong> can access and modify in the system
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={handleSavePermissions}
                    className="bg-[#00501B] hover:bg-[#00401A]"
                    disabled={updateRolePermissionsMutation.status === "pending"}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateRolePermissionsMutation.status === "pending" ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
                
                {isSystemRole && (
                  <Alert className="mt-4 bg-amber-50 border-amber-200">
                    <ShieldAlert className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-800">System Role Protection</AlertTitle>
                    <AlertDescription className="text-amber-700">
                      This is a protected system role. Some modifications may be restricted to maintain system integrity.
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* Role Summary Stats */}
                <div className="mt-4 grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[#00501B]">{selectedPermissions.size}</div>
                    <div className="text-sm text-gray-600">Active Permissions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{activeRole._count?.userRoles || 0}</div>
                    <div className="text-sm text-gray-600">Assigned Users</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{Object.keys(groupedPermissions).length}</div>
                    <div className="text-sm text-gray-600">Module Categories</div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                {/* Search Bar */}
                <div className="mb-6">
                  <Input
                    placeholder="Search permissions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-md"
                  />
                </div>

                {isLoadingPermissions || isLoadingRolePermissions ? (
                  <div className="space-y-6">
                    {Array(4).fill(0).map((_, i) => (
                      <div key={i} className="space-y-3">
                        <Skeleton className="h-6 w-40" />
                        <div className="grid grid-cols-2 gap-4">
                          {Array(4).fill(0).map((_, j) => (
                            <Skeleton key={j} className="h-10 w-full" />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(groupedPermissions).map(([category, permissions]) => (
                      <div key={category} className="space-y-3">
                        <div className="flex items-center gap-3">
                          <h3 className="font-medium text-gray-900">{category}</h3>
                          <div className="flex-1 h-px bg-gray-200"></div>
                          <Badge variant="secondary" className="text-xs">
                            {(permissions as any[]).length} permissions
                          </Badge>
                        </div>
                        
                        {/* Module description */}
                        <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded border-l-4 border-blue-400">
                          {category === "Dashboard" && "📊 Overview of key metrics, statistics and quick access to important features"}
                          {category === "Students" && "👥 Manage student records, admissions, transfers and academic information"}
                          {category === "Teachers" && "👨‍🏫 Handle teaching staff profiles, assignments and academic responsibilities"}
                          {category === "Classes" && "📚 Organize school classes, sections, student assignments and classroom management"}
                          {category === "Attendance" && "✅ Track and manage attendance records for students and staff members"}
                          {category === "Leave Management" && "🏖️ Process leave applications, manage leave policies and track staff absences"}
                          {category === "Salary Management" && "💰 Handle salary structures, payments, increments and payroll processing"}
                          {category === "Transport" && "🚌 Manage transportation routes, stops, assignments and fleet operations"}
                          {category === "Fees" && "💳 Handle fee collection, payment tracking and financial transactions"}
                          {category === "Finance" && "🏦 Comprehensive financial management including fee heads, terms and reports"}
                          {category === "Question Papers" && "📝 Create and manage question papers, blueprints and examination materials"}
                          {category === "Examinations" && "🎓 Organize exams, schedules, seating plans, marks entry and grade management"}
                          {category === "Reports" && "📈 Generate and view various reports across different modules"}
                          {category === "Settings" && "⚙️ Configure system settings, manage users, branches and system administration"}
                          {category === "Employees" && "👔 Manage non-teaching staff records, departments and designations"}
                          {category === "Money Collection" && "💵 Track and manage money collection activities and transactions"}
                          {!["Dashboard", "Students", "Teachers", "Classes", "Attendance", "Leave Management", "Salary Management", "Transport", "Fees", "Finance", "Question Papers", "Examinations", "Reports", "Settings", "Employees", "Money Collection"].includes(category) && 
                            `📋 Manage ${category.toLowerCase()} related functionality and operations`}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {(permissions as any[]).map((permission: any) => (
                            <div 
                              key={permission.id} 
                              className={`p-3 border rounded cursor-pointer transition-colors ${
                                hasPermission(permission.id)
                                  ? 'border-[#00501B] bg-green-50' 
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                              onClick={() => !isSystemRole && togglePermission(permission.id)}
                            >
                              <div className="flex items-center space-x-3">
                                <Checkbox 
                                  id={`${activeTab}-${permission.id}`} 
                                  checked={hasPermission(permission.id)}
                                  onCheckedChange={() => togglePermission(permission.id)}
                                  disabled={isSystemRole && getActiveRoleName === Role.SUPER_ADMIN}
                                />
                                <div className="flex-1">
                                  <Label 
                                    htmlFor={`${activeTab}-${permission.id}`}
                                    className="text-sm font-medium cursor-pointer text-gray-900"
                                  >
                                    {permission.description || permission.name.replace(/_/g, " ")}
                                  </Label>
                                  {permission.name.startsWith("view_") && (
                                    <p className="text-xs text-blue-600 mt-1">Required for module access</p>
                                  )}
                                </div>
                                {isSystemRole && getActiveRoleName === Role.SUPER_ADMIN && (
                                  <Badge variant="outline" className="text-xs">
                                    Always On
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            // Empty state when no role is selected
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Shield className="h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Select a Role</h3>
                <p className="text-gray-500 max-w-md">
                  Choose a role from the sidebar to view and configure its permissions
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create Role Modal */}
      <CreateRoleModal 
        isOpen={isCreateRoleOpen}
        onClose={() => setIsCreateRoleOpen(false)}
        onCreateRole={handleCreateRole}
        roles={dbRoles}
        isCreating={createRoleMutation.status === "pending"}
      />
    </div>
  );
} 