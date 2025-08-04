"use client";

import { useState } from "react";
import { api } from "@/utils/api";
import { Permission, Role } from "@/types/permissions";
import type { RoleWithPermissions } from "@/services/rbac-service";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Settings, Users, Shield, Edit, Trash2, Check, X, Search, Filter, RotateCcw } from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface RoleFormData {
  name: string;
  description: string;
  permissions: Permission[];
  branchId?: string;
}

// Permission ordering and categorization
const PERMISSION_ORDER = ['view', 'create', 'edit', 'delete', 'manage', 'access', 'generate', 'export', 'import', 'assign', 'send', 'mark', 'collect', 'enter', 'clear', 'seed'];

// ERP and LMS module categorization
const MODULE_CATEGORIES = {
  ERP: {
    'Dashboard': ['dashboard'],
    'Student Management': ['students'],
    'Admissions': ['admissions'],
    'Staff Management': ['teachers', 'employees', 'departments', 'designations'],
    'Classes & Sections': ['classes'],
    'Attendance': ['attendance'],
    'Finance': ['money_collection', 'finance', 'fees', 'concession', 'collection', 'salary'],
    'Transportation': ['transportation', 'transport'],
    'Communication': ['communication', 'whatsapp', 'chat'],
    'Reports & Analytics': ['reports'],
    'Settings & Configuration': ['settings', 'branches', 'academic', 'location', 'email', 'ai', 'background', 'system', 'data'],
    'RBAC Management': ['rbac', 'roles', 'permissions', 'user'],
    'Courtesy Calls': ['courtesy'],
  },
  LMS: {
    'Subjects': ['subjects'],
    'Examinations': ['examinations', 'exam'],
    'Question Papers': ['question'],
    'Assessment': ['assessment', 'marks', 'score'],
    'Report Cards': ['report_cards'],
    'Leave Management': ['leaves', 'leave'],
  }
};

// Helper function to categorize permissions
function categorizePermissions(permissions: Array<{ name: string; description: string; category: string }>) {
  const organized = {
    ERP: {} as Record<string, Array<{ name: string; description: string; category: string; order: number }>>,
    LMS: {} as Record<string, Array<{ name: string; description: string; category: string; order: number }>>,
    Other: [] as Array<{ name: string; description: string; category: string; order: number }>
  };

  permissions.forEach(permission => {
    // Add ordering information
    const permissionWithOrder = {
      ...permission,
      order: getPermissionOrder(permission.name)
    };

    let categorized = false;

    // Check ERP modules
    for (const [moduleName, keywords] of Object.entries(MODULE_CATEGORIES.ERP)) {
      if (keywords.some(keyword => permission.name.toLowerCase().includes(keyword.toLowerCase()) || permission.category.toLowerCase().includes(keyword.toLowerCase()))) {
        if (!organized.ERP[moduleName]) organized.ERP[moduleName] = [];
        organized.ERP[moduleName].push(permissionWithOrder);
        categorized = true;
        break;
      }
    }

    // Check LMS modules if not already categorized
    if (!categorized) {
      for (const [moduleName, keywords] of Object.entries(MODULE_CATEGORIES.LMS)) {
        if (keywords.some(keyword => permission.name.toLowerCase().includes(keyword.toLowerCase()) || permission.category.toLowerCase().includes(keyword.toLowerCase()))) {
          if (!organized.LMS[moduleName]) organized.LMS[moduleName] = [];
          organized.LMS[moduleName].push(permissionWithOrder);
          categorized = true;
          break;
        }
      }
    }

    // If not categorized, add to Other
    if (!categorized) {
      organized.Other.push(permissionWithOrder);
    }
  });

  // Sort permissions within each module by order
  Object.keys(organized.ERP).forEach(module => {
    organized.ERP[module]?.sort((a, b) => a.order - b.order);
  });
  Object.keys(organized.LMS).forEach(module => {
    organized.LMS[module]?.sort((a, b) => a.order - b.order);
  });
  organized.Other.sort((a, b) => a.order - b.order);

  return organized;
}

function getPermissionOrder(permissionName: string): number {
  const name = permissionName.toLowerCase();
  for (let i = 0; i < PERMISSION_ORDER.length; i++) {
    const orderPrefix = PERMISSION_ORDER[i];
    if (orderPrefix && name.startsWith(orderPrefix)) {
      return i;
    }
  }
  return 999; // Miscellaneous
}

function formatPermissionName(permissionName: string): string {
  return permissionName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function RoleManagement() {
  const { can } = usePermissions();
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<RoleWithPermissions | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState<RoleFormData>({
    name: "",
    description: "",
    permissions: [],
  });

  // Queries
  const { data: roles = [], isLoading: isLoadingRoles, refetch: refetchRoles } = api.role.getAll.useQuery({});
  const { data: rawPermissions = [], isLoading: isLoadingPermissions } = api.permission.getAll.useQuery({});
  
  // Map permissions to ensure description is never null and add category
  const permissions = rawPermissions.map(permission => ({
    ...permission,
    description: permission.description || '',
    category: permission.category || 'Other'
  }));

  // Filter roles based on search term
  const filteredRoles = roles.filter(role => 
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (role.description && role.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Mutations
  const createRoleMutation = api.role.create.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Role created successfully",
        variant: "success",
      });
      refetchRoles();
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create role",
        variant: "destructive",
      });
    },
  });

  const updatePermissionsMutation = api.role.updatePermissions.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Role permissions updated successfully",
        variant: "success",
      });
      refetchRoles();
      setIsEditDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update role permissions",
        variant: "destructive",
      });
    },
  });

  const seedDefaultRolesMutation = api.role.seedDefaultRoles.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Default roles seeded successfully",
        variant: "success",
      });
      refetchRoles();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to seed default roles",
        variant: "destructive",
      });
    },
  });

  const clearCacheMutation = api.role.clearCache.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Cache cleared successfully",
        variant: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to clear cache",
        variant: "destructive",
      });
    },
  });

  const deleteRoleMutation = api.role.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Role deleted successfully",
        variant: "success",
      });
      refetchRoles();
      setIsDeleteDialogOpen(false);
      setRoleToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete role",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      permissions: [],
    });
    setSelectedRole(null);
  };

  const handleCreateRole = () => {
    createRoleMutation.mutate(formData);
  };

  const handleUpdatePermissions = () => {
    if (!selectedRole) return;
    if (updatePermissionsMutation.mutate) {
      updatePermissionsMutation.mutate({
        roleId: selectedRole.id,
        permissions: formData.permissions,
      });
    }
  };

  const handleDeleteRole = (role: any) => {
    setRoleToDelete(role);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteRole = () => {
    if (!roleToDelete) return;
    deleteRoleMutation.mutate({ id: roleToDelete.id });
  };

  const handleEditRole = (role: any) => {
    // Convert the role to match RoleWithPermissions interface
    const roleWithPermissions: RoleWithPermissions = {
      ...role,
      description: role.description || undefined,
    };
    setSelectedRole(roleWithPermissions);
    setFormData({
      name: role.name,
      description: role.description || "",
      permissions: role.permissions as Permission[],
    });
    setIsEditDialogOpen(true);
  };

  const handlePermissionToggle = (permission: Permission) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  // Permission check
  if (!can(Permission.MANAGE_ROLES)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              You don't have permission to manage roles and permissions.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/30 dark:bg-gray-900/30">
      <div className="container mx-auto px-4 py-8 max-w-full">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Role Management</h1>
            <p className="text-lg text-muted-foreground mt-2">
              Manage user roles and permissions across your ERP and LMS systems
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              onClick={() => clearCacheMutation.mutate()}
              disabled={clearCacheMutation.isPending}
              className="flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Clear Cache
            </Button>
            <Button
              variant="outline"
              onClick={() => seedDefaultRolesMutation.mutate()}
              disabled={seedDefaultRolesMutation.isPending}
              className="flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Seed Default Roles
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()} className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Create New Role
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-7xl max-h-[95vh] w-[95vw]">
                <DialogHeader>
                  <DialogTitle className="text-2xl">Create New Role</DialogTitle>
                  <DialogDescription className="text-base">
                    Create a new role and assign permissions across ERP and LMS modules
                  </DialogDescription>
                </DialogHeader>
                <RoleForm
                  formData={formData}
                  permissions={permissions}
                  onFormDataChange={setFormData}
                  onPermissionToggle={handlePermissionToggle}
                  onSave={handleCreateRole}
                  onCancel={() => setIsCreateDialogOpen(false)}
                  isLoading={createRoleMutation.isPending}
                  isEdit={false}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search and Filters */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search roles by name or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Roles Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6" />
                <div>
                  <CardTitle className="text-xl">System Roles</CardTitle>
                  <CardDescription className="text-base">
                    {filteredRoles.length} role{filteredRoles.length !== 1 ? 's' : ''} found
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-sm px-3 py-1">
                Total: {roles.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingRoles ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredRoles.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No roles found</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {searchTerm ? 'Try adjusting your search criteria' : 'Get started by creating your first role'}
                </p>
                {!searchTerm && (
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Role
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Role Details</TableHead>
                      <TableHead className="min-w-[300px]">Description</TableHead>
                      <TableHead className="text-center">Permissions</TableHead>
                      <TableHead className="text-center">Type</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRoles.map((role) => (
                      <TableRow key={role.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <TableCell>
                          <div>
                            <div className="font-semibold text-base">{role.name}</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                              <Badge variant={role.branchId ? "secondary" : "outline"} className="text-xs">
                                {role.branchId ? "Branch-specific" : "Global"}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-sm">
                            <p className="text-sm leading-relaxed">
                              {role.description || "No description provided"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="text-sm px-3 py-1">
                            {role.permissions?.length || 0} permissions
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {role.isSystem ? (
                            <Badge variant="default" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              System
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-green-200 text-green-800 dark:border-green-800 dark:text-green-200">
                              Custom
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {role.isActive ? (
                            <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              <Check className="w-3 h-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <X className="w-3 h-3 mr-1" />
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditRole(role)}
                              className="flex items-center gap-1"
                            >
                              <Edit className="w-4 h-4" />
                              Edit
                            </Button>
                            {!role.isSystem && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive hover:text-destructive border-destructive/20 hover:border-destructive/40"
                                onClick={() => handleDeleteRole(role)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
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

        {/* Edit Role Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-7xl max-h-[95vh] w-[95vw]">
            <DialogHeader>
              <DialogTitle className="text-2xl">Edit Role Permissions</DialogTitle>
              <DialogDescription className="text-base">
                Update permissions for <span className="font-semibold">{selectedRole?.name}</span>
              </DialogDescription>
            </DialogHeader>
            <RoleForm
              formData={formData}
              permissions={permissions}
              onFormDataChange={setFormData}
              onPermissionToggle={handlePermissionToggle}
              onSave={handleUpdatePermissions}
              onCancel={() => setIsEditDialogOpen(false)}
              isLoading={updatePermissionsMutation.isPending}
              isEdit={true}
            />
          </DialogContent>
        </Dialog>

        {/* Delete Role Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="w-5 h-5" />
                Delete Role
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete the role "{roleToDelete?.name}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-end gap-2 mt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setRoleToDelete(null);
                }}
                disabled={deleteRoleMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmDeleteRole}
                disabled={deleteRoleMutation.isPending}
              >
                {deleteRoleMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Role
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

interface RoleFormProps {
  formData: RoleFormData;
  permissions: Array<{ name: string; description: string; category: string }>;
  onFormDataChange: (data: RoleFormData) => void;
  onPermissionToggle: (permission: Permission) => void;
  onSave: () => void;
  onCancel: () => void;
  isLoading: boolean;
  isEdit: boolean;
}

function RoleForm({
  formData,
  permissions,
  onFormDataChange,
  onPermissionToggle,
  onSave,
  onCancel,
  isLoading,
  isEdit,
}: RoleFormProps) {
  const [selectedModule, setSelectedModule] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  
  const organizedPermissions = categorizePermissions(permissions);
  
  // Filter permissions based on search
  const filterPermissionsBySearch = (perms: Array<{ name: string; description: string; category: string; order: number }>) => {
    if (!searchTerm) return perms;
    return perms.filter(perm => 
      perm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      perm.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getSelectedCount = (modulePerms: Array<{ name: string; description: string; category: string; order: number }>) => {
    return modulePerms.filter(p => formData.permissions.includes(p.name as Permission)).length;
  };

  const handleSelectAllModule = (modulePerms: Array<{ name: string; description: string; category: string; order: number }>) => {
    const allSelected = modulePerms.every(p => formData.permissions.includes(p.name as Permission));
    const newPermissions = allSelected 
      ? formData.permissions.filter(p => !modulePerms.some(mp => mp.name === p))
      : [...formData.permissions, ...modulePerms.filter(p => !formData.permissions.includes(p.name as Permission)).map(p => p.name as Permission)];
    
    onFormDataChange({ ...formData, permissions: newPermissions });
  };

  return (
    <div className="flex flex-col h-[calc(95vh-200px)]">
      {/* Basic Information */}
      <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-lg mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="name" className="text-base font-medium">Role Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => onFormDataChange({ ...formData, name: e.target.value })}
              placeholder="Enter role name"
              disabled={isEdit}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="description" className="text-base font-medium">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => onFormDataChange({ ...formData, description: e.target.value })}
              placeholder="Enter role description"
              rows={3}
              className="mt-2"
            />
          </div>
        </div>
      </div>

      {/* Permissions Section */}
      <div className="flex-1 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <Label className="text-lg font-semibold">Permissions ({formData.permissions.length} selected)</Label>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search permissions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </div>

        <Tabs defaultValue="ERP" className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="ERP" className="text-base">ERP Modules</TabsTrigger>
            <TabsTrigger value="LMS" className="text-base">LMS Modules</TabsTrigger>
            <TabsTrigger value="Other" className="text-base">Other</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="ERP" className="h-full">
              <ScrollArea className="h-full pr-4">
                <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
                  {Object.entries(organizedPermissions.ERP).map(([moduleName, modulePermissions]) => {
                    const filteredPerms = filterPermissionsBySearch(modulePermissions);
                    if (filteredPerms.length === 0 && searchTerm) return null;
                    
                    const selectedCount = getSelectedCount(modulePermissions);
                    const totalCount = modulePermissions.length;
                    
                    return (
                      <Card key={moduleName} className="h-fit">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base font-semibold">{moduleName}</CardTitle>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {selectedCount}/{totalCount}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSelectAllModule(modulePermissions)}
                                className="text-xs px-2 py-1 h-auto"
                              >
                                {selectedCount === totalCount ? 'Deselect All' : 'Select All'}
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="space-y-3">
                            {filteredPerms.map((permission) => (
                              <div key={permission.name} className="flex items-start space-x-3">
                                <Checkbox
                                  id={permission.name}
                                  checked={formData.permissions.includes(permission.name as Permission)}
                                  onCheckedChange={() => onPermissionToggle(permission.name as Permission)}
                                  className="mt-1"
                                />
                                <div className="flex-1 min-w-0">
                                  <Label
                                    htmlFor={permission.name}
                                    className="text-sm font-medium leading-none cursor-pointer block"
                                  >
                                    {formatPermissionName(permission.name)}
                                  </Label>
                                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                    {permission.description}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="LMS" className="h-full">
              <ScrollArea className="h-full pr-4">
                <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
                  {Object.entries(organizedPermissions.LMS).map(([moduleName, modulePermissions]) => {
                    const filteredPerms = filterPermissionsBySearch(modulePermissions);
                    if (filteredPerms.length === 0 && searchTerm) return null;
                    
                    const selectedCount = getSelectedCount(modulePermissions);
                    const totalCount = modulePermissions.length;
                    
                    return (
                      <Card key={moduleName} className="h-fit">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base font-semibold">{moduleName}</CardTitle>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {selectedCount}/{totalCount}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSelectAllModule(modulePermissions)}
                                className="text-xs px-2 py-1 h-auto"
                              >
                                {selectedCount === totalCount ? 'Deselect All' : 'Select All'}
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="space-y-3">
                            {filteredPerms.map((permission) => (
                              <div key={permission.name} className="flex items-start space-x-3">
                                <Checkbox
                                  id={permission.name}
                                  checked={formData.permissions.includes(permission.name as Permission)}
                                  onCheckedChange={() => onPermissionToggle(permission.name as Permission)}
                                  className="mt-1"
                                />
                                <div className="flex-1 min-w-0">
                                  <Label
                                    htmlFor={permission.name}
                                    className="text-sm font-medium leading-none cursor-pointer block"
                                  >
                                    {formatPermissionName(permission.name)}
                                  </Label>
                                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                    {permission.description}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="Other" className="h-full">
              <ScrollArea className="h-full pr-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Miscellaneous Permissions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                      {filterPermissionsBySearch(organizedPermissions.Other).map((permission) => (
                        <div key={permission.name} className="flex items-start space-x-3">
                          <Checkbox
                            id={permission.name}
                            checked={formData.permissions.includes(permission.name as Permission)}
                            onCheckedChange={() => onPermissionToggle(permission.name as Permission)}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <Label
                              htmlFor={permission.name}
                              className="text-sm font-medium leading-none cursor-pointer block"
                            >
                              {formatPermissionName(permission.name)}
                            </Label>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                              {permission.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-6 border-t">
        <Button variant="outline" onClick={onCancel} className="px-6">
          Cancel
        </Button>
        <Button onClick={onSave} disabled={isLoading || !formData.name.trim()} className="px-6">
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {isEdit ? "Updating..." : "Creating..."}
            </>
          ) : (
            isEdit ? "Update Role" : "Create Role"
          )}
        </Button>
      </div>
    </div>
  );
} 