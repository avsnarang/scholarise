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
import { Check, Info, Mail, Save, Shield, ShieldAlert, User, X, PlusCircle, Trash } from "lucide-react";
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

type DbRole = RouterOutputs["role"]["getAll"][0];

// Role descriptions
const roleDescriptions: Record<Role, string> = {
  [Role.SUPER_ADMIN]: "System administrators with full access",
  [Role.ADMIN]: "School administrators with broad access",
  [Role.PRINCIPAL]: "School principals managing academic staff",
  [Role.TEACHER]: "Teaching staff with classroom access",
  [Role.ACCOUNTANT]: "Financial staff managing accounts & fees",
  [Role.RECEPTIONIST]: "Front desk staff handling admissions",
  [Role.TRANSPORT_MANAGER]: "Staff managing transportation services",
  [Role.STAFF]: "General support staff with basic access",
};

// Create Role Modal as a separate component to manage its own state
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
  // Local state management
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [copyFrom, setCopyFrom] = useState<string | null>(null);

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setName("");
      setDescription("");
      setCopyFrom(null);
    }
  }, [isOpen]);

  // Submit handler
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
            disabled={isCreating}
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
  
  // Fetch roles and permissions from the API
  const { data: dbRoles, isLoading: isLoadingRoles, refetch: refetchRoles } = api.role.getAll.useQuery();
  
  const { data: dbPermissions, isLoading: isLoadingPermissions } = api.role.getAllPermissions.useQuery();
  
  // Get the selected role's permissions
  const { data: rolePermissions, isLoading: isLoadingRolePermissions, refetch: refetchRolePermissions } = 
    api.role.getRolePermissions.useQuery({ roleId: activeTab }, {
      enabled: !!activeTab,
    });
  
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
        description: "The role has been deleted successfully",
      });
      refetchRoles();
      // Set active tab to first role
      if (dbRoles && dbRoles.length > 0) {
        setActiveTab(dbRoles[0].id);
      }
    },
    onError: (error) => {
      toast({
        title: "Error deleting role",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Track toggled permissions in state
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  
  // Initialize selected permissions when role permissions load
  useEffect(() => {
    if (rolePermissions) {
      setSelectedPermissions(rolePermissions.map((p: any) => p.id));
    }
  }, [rolePermissions]);
  
  // Group permissions by category if available
  const groupedPermissions = useMemo(() => {
    if (!dbPermissions) return {};
    
    const grouped: Record<string, typeof dbPermissions> = {};
    
    dbPermissions.forEach((permission: any) => {
      const category = permission.category || "General";
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(permission);
    });
    
    // Sort permissions within each category by functionality type (view, create, edit, delete)
    Object.keys(grouped).forEach(category => {
      grouped[category].sort((a: { name: string }, b: { name: string }) => {
        // Get permission type (view, create, edit, delete)
        const getType = (name: string) => {
          if (name.startsWith("view_")) return 1;
          if (name.startsWith("create_")) return 2;
          if (name.startsWith("edit_")) return 3;
          if (name.startsWith("delete_")) return 4;
          if (name.startsWith("manage_")) return 5;
          return 6;
        };
        
        const typeA = getType(a.name);
        const typeB = getType(b.name);
        
        return typeA - typeB;
      });
    });
    
    return grouped;
  }, [dbPermissions]);
  
  // Set initial active tab when data is loaded
  useEffect(() => {
    if (dbRoles?.length && !activeTab) {
      setActiveTab(dbRoles[0].id);
    }
  }, [dbRoles, activeTab]);
  
  // Handler for creating a new role from the modal
  const handleCreateRole = useCallback((name: string, description: string, copyFromRoleId?: string) => {
    if (!name.trim()) {
      toast({
        title: "Role name required",
        description: "Please provide a name for the custom role",
        variant: "destructive",
      });
      return;
    }
    
    createRoleMutation.mutate({
      name,
      description,
      copyFromRoleId,
    });
  }, [toast, createRoleMutation]);

  // Add handler for deleting a custom role
  const handleDeleteCustomRole = (roleId: string) => {
    const role = dbRoles?.find((r: any) => r.id === roleId);
    if (!role || role.isSystem) return;
    
    deleteRoleMutation.mutate({ id: roleId });
  };

  // Toggle permission for a role
  const togglePermission = (permissionId: string) => {
    if (selectedPermissions.includes(permissionId)) {
      setSelectedPermissions(selectedPermissions.filter(id => id !== permissionId));
    } else {
      setSelectedPermissions([...selectedPermissions, permissionId]);
    }
  };
  
  // Handle save permissions for a role
  const handleSavePermissions = () => {
    if (!activeTab) return;
    
    updateRolePermissionsMutation.mutate({
      roleId: activeTab,
      permissions: selectedPermissions,
    });
  };

  // Helper function to check if a permission is assigned to the selected role
  const hasPermission = (permissionId: string) => {
    return selectedPermissions.includes(permissionId);
  };
  
  // Helper to check if the active role is a system role
  const isSystemRole = useMemo(() => {
    if (!dbRoles || !activeTab) return false;
    const role = dbRoles.find((r: any) => r.id === activeTab);
    return role?.isSystem || false;
  }, [dbRoles, activeTab]);
  
  // Helper to get role name
  const getActiveRoleName = useMemo(() => {
    if (!dbRoles || !activeTab) return "";
    const role = dbRoles.find((r: any) => r.id === activeTab);
    return role?.name || "";
  }, [dbRoles, activeTab]);
  
  // Render role tiles including a delete button for custom roles
  const renderRoleTile = (role: DbRole) => {
    const isCustomRole = !role.isSystem;
    
    return (
      <div
        key={role.id}
        className={`rounded-lg p-4 cursor-pointer border transition-all ${
          activeTab === role.id 
            ? "bg-[#00501B] text-white border-[#00501B]" 
            : "hover:bg-gray-50"
        }`}
        onClick={() => setActiveTab(role.id)}
      >
        <div className="flex justify-between items-center">
          <Badge 
            variant="outline" 
            className={`${
              activeTab === role.id 
                ? "bg-white text-[#00501B] border-white" 
                : getRoleBadgeColor(role.name)
            } text-sm font-normal px-3 py-1`}
          >
            {role.name.toLowerCase().replace(/_/g, " ")}
            {isCustomRole && (
              <span className="ml-1 text-xs opacity-70">(Custom)</span>
            )}
          </Badge>
          <div className="flex items-center">
            {isCustomRole && (
              <Button
                variant="ghost"
                size="icon"
                className={`h-6 w-6 rounded-full ${activeTab === role.id ? 'text-white hover:text-white hover:bg-red-600' : 'hover:bg-red-100 hover:text-red-600'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteCustomRole(role.id);
                }}
                disabled={deleteRoleMutation.status === "pending"}
              >
                <Trash className="h-3 w-3" />
                <span className="sr-only">Delete</span>
              </Button>
            )}
            <span className={`text-sm ml-2 ${activeTab === role.id ? "text-white" : "text-gray-500"}`}>
              {role._count?.userRoles || 0} {role._count?.userRoles === 1 ? "user" : "users"}
            </span>
          </div>
        </div>
        <p className={`text-sm mt-2 ${activeTab === role.id ? "text-white/80" : "text-gray-500"}`}>
          {role.description}
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-[#00501B]">Staff Role Management</h1>
          <p className="text-gray-500 mt-1">
            Configure role permissions for different types of staff members
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PermissionsHelpDialog />
          <Link href="/settings/users">
            <Button variant="outline">
              <User className="mr-2 h-4 w-4" />
              Manage Staff
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Role selection panel */}
        <div className="col-span-1">
          <Card className="p-6">
            <CardHeader className="px-0 pt-0">
              <CardTitle>Staff Role Types</CardTitle>
              <CardDescription>
                Select a role to customize permissions
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[460px] pr-4 overflow-y-auto">
                <div className="space-y-4">
                  {isLoadingRoles ? (
                    // Loading skeleton
                    Array(8).fill(0).map((_, i) => (
                      <div key={i} className="rounded-lg p-4 border">
                        <div className="flex justify-between items-center mb-2">
                          <Skeleton className="h-8 w-32" />
                          <Skeleton className="h-4 w-16" />
                        </div>
                        <Skeleton className="h-4 w-full" />
                      </div>
                    ))
                  ) : (
                    <>
                      {dbRoles?.map(renderRoleTile)}
                      <Button 
                        variant="outline" 
                        className="w-full mt-4 border-dashed"
                        onClick={() => setIsCreateRoleOpen(true)}
                      >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create Custom Role
                      </Button>
                      <CreateRoleModal 
                        isOpen={isCreateRoleOpen}
                        onClose={() => setIsCreateRoleOpen(false)}
                        onCreateRole={handleCreateRole}
                        roles={dbRoles}
                        isCreating={createRoleMutation.status === "pending"}
                      />
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Permissions panel */}
        <div className="col-span-1 md:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center">
                    <Badge variant="outline" className={`${getRoleBadgeColor(getActiveRoleName)} mr-2`}>
                      {getActiveRoleName.replace(/_/g, " ")}
                    </Badge>
                    Role Permissions 
                    <PermissionsHelpDialog />
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Configure what a {getActiveRoleName.replace(/_/g, " ")} can access and modify
                  </CardDescription>
                </div>
                <Button 
                  onClick={handleSavePermissions}
                  className="bg-[#00501B] hover:bg-[#00401A]"
                  disabled={updateRolePermissionsMutation.status === "pending" || !activeTab}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateRolePermissionsMutation.status === "pending" ? "Saving..." : "Save Changes"}
                </Button>
              </div>
              
              {isSystemRole && (
                <Alert className="mt-3 bg-amber-50 text-amber-800 border-amber-200">
                  <Info className="h-4 w-4" />
                  <AlertTitle>System Role</AlertTitle>
                  <AlertDescription>
                    This is a system role. Modifications will be limited to protect system functionality.
                  </AlertDescription>
                </Alert>
              )}
            </CardHeader>
            <CardContent>
              {isLoadingPermissions || isLoadingRolePermissions ? (
                <div className="space-y-6">
                  {Array(4).fill(0).map((_, i) => (
                    <div key={i}>
                      <Skeleton className="h-6 w-32 mb-2" />
                      <Skeleton className="h-32 w-full" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-[calc(100vh-300px)] overflow-y-auto pr-4">
                  {Object.entries(groupedPermissions).map(([category, permissions]) => (
                    <div key={category} className="mb-8">
                      <div className="flex items-center mb-2">
                        <h3 className="font-medium text-[#00501B]">{category}</h3>
                        <Separator className="ml-4 flex-1" />
                      </div>
                      
                      {/* Add a module overview */}
                      <div className="mb-4 text-sm text-gray-500">
                        {category === "Classes" && "Manage school classes, sections and assign students to classes."}
                        {category === "Students" && "Manage student records, admissions and transfers."}
                        {category === "Teachers" && "Manage teaching staff and their details."}
                        {category === "Attendance" && "Manage attendance records for students and staff."}
                        {category === "Settings" && "Configure system settings, users and permissions."}
                        {/* Add more module descriptions as needed */}
                      </div>
                      
                      <div className="border rounded-md p-4">
                        {/* Group permissions by type within each category */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6">
                          {permissions.map((permission: any) => (
                            <div key={permission.id} className="flex items-center space-x-2">
                              <Checkbox 
                                id={`${activeTab}-${permission.id}`} 
                                checked={hasPermission(permission.id)}
                                onCheckedChange={() => togglePermission(permission.id)}
                                disabled={isSystemRole && getActiveRoleName === Role.SUPER_ADMIN}
                                className={isSystemRole && getActiveRoleName === Role.SUPER_ADMIN ? "opacity-60" : ""}
                              />
                              <Label 
                                htmlFor={`${activeTab}-${permission.id}`}
                                className="text-sm flex-1 cursor-pointer"
                              >
                                <span 
                                  className={`capitalize ${
                                    permission.name.startsWith("view_") ? "text-blue-600" : 
                                    permission.name.startsWith("create_") ? "text-green-600" : 
                                    permission.name.startsWith("edit_") ? "text-amber-600" : 
                                    permission.name.startsWith("delete_") ? "text-red-600" : 
                                    "text-gray-700"
                                  } dark:text-opacity-80`}
                                >
                                  {permission.description || permission.name.replace(/_/g, " ")}
                                </span>
                                {permission.name.startsWith("view_") && 
                                  <span className="ml-1 text-xs text-gray-500">(Required for basic access)</span>
                                }
                              </Label>
                              {isSystemRole && getActiveRoleName === Role.SUPER_ADMIN && (
                                <Badge variant="outline" className="bg-gray-100 text-gray-500 text-[10px]">
                                  Always Enabled
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 