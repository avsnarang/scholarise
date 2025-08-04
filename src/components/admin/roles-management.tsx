"use client";

import { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import { Permission, Role } from '@/types/permissions';
import type { RoleWithPermissions } from '@/services/rbac-service';
import { usePermissions } from '@/hooks/usePermissions';
import { 
  Shield, Users, Edit, Settings, Check, ChevronDown, ChevronRight, Plus, X,
  // Adding sidebar icons for consistency
  School, GraduationCap, Building, BookOpen, Clock, Calendar, CreditCard, 
  DollarSign, MessageSquare, Bus, ClipboardCheck, FileText, BarChart3, Trash2, Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from "@/components/ui/use-toast";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Filter, RotateCcw 
} from "lucide-react";

interface RoleFormData {
  name: string;
  description: string;
  permissions: Permission[];
  branchId?: string;
}

// Permission ordering and categorization
const PERMISSION_ORDER = ['view', 'create', 'edit', 'delete', 'manage', 'access', 'generate', 'export', 'import', 'assign', 'send', 'mark', 'collect', 'enter', 'clear', 'seed'];

// Direct mapping of database categories to modules
const CATEGORY_TO_MODULE_MAP = {
  // ERP Categories
  'dashboard': { type: 'ERP', module: 'Dashboard' },
  'students': { type: 'ERP', module: 'Student Management' },
  'admissions': { type: 'ERP', module: 'Admissions' },
  'teachers': { type: 'ERP', module: 'Staff Management' },
  'employees': { type: 'ERP', module: 'Staff Management' },
  'departments': { type: 'ERP', module: 'Staff Management' },
  'designations': { type: 'ERP', module: 'Staff Management' },
  'classes': { type: 'ERP', module: 'Classes & Sections' },
  'attendance': { type: 'ERP', module: 'Attendance' },
  'money_collection': { type: 'ERP', module: 'Finance & Money Collection' },
  'finance': { type: 'ERP', module: 'Finance & Money Collection' },
  'salary': { type: 'ERP', module: 'Salary Management' },
  'transport': { type: 'ERP', module: 'Transportation' },
  'communication': { type: 'ERP', module: 'Communication' },
  'reports': { type: 'ERP', module: 'Reports & Analytics' },
  'settings': { type: 'ERP', module: 'Settings & Configuration' },
  'rbac': { type: 'ERP', module: 'RBAC Management' },
  'courtesy_calls': { type: 'ERP', module: 'Courtesy Calls' },
  'admin': { type: 'ERP', module: 'Settings & Configuration' },
  
  // LMS Categories
  'subjects': { type: 'LMS', module: 'Subjects' },
  'examinations': { type: 'LMS', module: 'Examinations' },
  'examination': { type: 'LMS', module: 'Examinations' },
  'leaves': { type: 'LMS', module: 'Leave Management' },
  'leave': { type: 'LMS', module: 'Leave Management' },
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

    // Use direct category mapping
    const categoryKey = permission.category.toLowerCase();
    const categoryMap = categoryKey in CATEGORY_TO_MODULE_MAP ? CATEGORY_TO_MODULE_MAP[categoryKey as keyof typeof CATEGORY_TO_MODULE_MAP] : null;
    
    if (categoryMap) {
      const { type, module } = categoryMap;
      if (type === 'ERP') {
        if (!organized.ERP[module]) organized.ERP[module] = [];
        organized.ERP[module].push(permissionWithOrder);
      } else if (type === 'LMS') {
        if (!organized.LMS[module]) organized.LMS[module] = [];
        organized.LMS[module].push(permissionWithOrder);
      }
    } else {
      // If no direct mapping found, add to Other
      organized.Other.push(permissionWithOrder);
    }
  });

  // Sort permissions within each module by order
  Object.keys(organized.ERP).forEach(module => {
    if (organized.ERP[module]) {
      organized.ERP[module].sort((a, b) => a.order - b.order);
    }
  });
  Object.keys(organized.LMS).forEach(module => {
    if (organized.LMS[module]) {
      organized.LMS[module].sort((a, b) => a.order - b.order);
    }
  });
  organized.Other.sort((a, b) => a.order - b.order);

  return organized;
}

function getPermissionOrder(permissionName: string): number {
  const name = permissionName.toLowerCase();
  for (let i = 0; i < PERMISSION_ORDER.length; i++) {
    const orderItem = PERMISSION_ORDER[i];
    if (orderItem && name.startsWith(orderItem)) {
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

export function RolesManagement() {
  const { can } = usePermissions();
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<RoleWithPermissions | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'permissions'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
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

  // Filter and sort roles based on search term and sort preferences
  const filteredAndSortedRoles = filteredRoles.sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'permissions':
        comparison = (a.permissions?.length || 0) - (b.permissions?.length || 0);
        break;
      case 'created':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      default:
        comparison = 0;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

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
    updatePermissionsMutation.mutate({
      roleId: selectedRole.id,
      permissions: formData.permissions,
    });
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
    <div className="min-h-screen bg-background">
      <div className="mx-auto px-2 py-2 space-y-6 max-w-full">
        {/* Enhanced Header Section */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl -z-10" />
          <div className="p-6 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Role Management</h1>
                    <p className="text-sm text-muted-foreground">
                      Manage user roles and permissions across your ERP and LMS systems
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <span>{roles.length} Total Roles</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-secondary rounded-full" />
                    <span>{roles.filter(r => r.isActive).length} Active</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full" />
                    <span>{roles.filter(r => r.isSystem).length} System Roles</span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => clearCacheMutation.mutate()}
                  disabled={clearCacheMutation.isPending}
                  className="flex items-center gap-2 hover:bg-primary/5"
                >
                  <RotateCcw className="w-4 h-4" />
                  Clear Cache
                </Button>
                <Button
                  variant="outline"
                  onClick={() => seedDefaultRolesMutation.mutate()}
                  disabled={seedDefaultRolesMutation.isPending}
                  className="flex items-center gap-2 hover:bg-secondary/5"
                >
                  <Settings className="w-4 h-4" />
                  Seed Defaults
                </Button>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => resetForm()} className="flex items-center gap-2 bg-primary hover:bg-primary/90">
                      <Plus className="w-4 h-4" />
                      Create New Role
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create New Role</DialogTitle>
                      <DialogDescription>
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
          </div>
        </div>

        {/* Enhanced Search and Filters */}
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search roles by name, description, or permissions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 bg-background/50 border-border/50 focus:border-primary/50"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" className="flex items-center gap-2 h-10">
                  <Filter className="w-4 h-4" />
                  Filters
                  <Badge variant="secondary" className="ml-1 text-xs">0</Badge>
                </Button>
                <Select value={sortBy} onValueChange={(value: 'name' | 'created' | 'permissions') => setSortBy(value)}>
                  <SelectTrigger className="w-28 h-10">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="created">Created</SelectItem>
                    <SelectItem value="permissions">Permissions</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center border border-border rounded-lg bg-muted/30">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="h-8 px-3 rounded-l-md rounded-r-none"
                  >
                    <Building className="w-3 h-3" />
                  </Button>
                  <Button
                    variant={viewMode === 'table' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('table')}
                    className="h-8 px-3 rounded-r-md rounded-l-none"
                  >
                    <FileText className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Roles Display */}
        {isLoadingRoles ? (
          <div className="flex items-center justify-center h-32">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <p className="text-sm text-muted-foreground">Loading roles...</p>
            </div>
          </div>
        ) : filteredAndSortedRoles.length === 0 ? (
          <Card className="border-dashed border-2 border-border/50">
            <CardContent className="text-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="p-3 bg-muted/30 rounded-full">
                  <Users className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">No roles found</h3>
                  <p className="text-muted-foreground max-w-md">
                    {searchTerm 
                      ? 'Try adjusting your search criteria to find the roles you\'re looking for' 
                      : 'Get started by creating your first role to manage user permissions'}
                  </p>
                </div>
                {!searchTerm && (
                  <Button onClick={() => setIsCreateDialogOpen(true)} className="mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Role
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Results Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-foreground">System Roles</h2>
                <Badge variant="outline" className="text-sm">
                  {filteredAndSortedRoles.length} of {roles.length} roles
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {sortOrder === 'asc' ? '↑' : '↓'} Sort {sortBy}
                </Button>
              </div>
            </div>

            {/* Grid View */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {filteredAndSortedRoles.map((role) => (
                  <Card key={role.id} className="group hover:shadow-lg transition-all duration-200 border-border/50 hover:border-primary/20">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg ${role.isSystem ? 'bg-secondary/10' : 'bg-primary/10'}`}>
                            {role.isSystem ? (
                              <Shield className="w-3 h-3 text-secondary" />
                            ) : (
                              <Users className="w-3 h-3 text-primary" />
                            )}
                          </div>
                          <div className="space-y-1">
                            <h3 className="font-semibold text-sm text-foreground leading-none">{role.name}</h3>
                            <div className="flex items-center gap-1">
                              <Badge 
                                variant={role.isSystem ? "secondary" : "outline"} 
                                className="text-xs h-4 px-1"
                              >
                                {role.isSystem ? "System" : "Custom"}
                              </Badge>
                              <Badge 
                                variant={role.branchId ? "secondary" : "outline"} 
                                className="text-xs h-4 px-1"
                              >
                                {role.branchId ? "Branch" : "Global"}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className={`w-1.5 h-1.5 rounded-full ${role.isActive ? 'bg-primary' : 'bg-muted-foreground'}`} />
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-3 pt-0">
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground leading-relaxed overflow-hidden" 
                           style={{ 
                             display: '-webkit-box', 
                             WebkitLineClamp: 2, 
                             WebkitBoxOrient: 'vertical' 
                           }}>
                          {role.description || "No description provided"}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs h-4">
                              {role.permissions?.length || 0} permissions
                            </Badge>
                            {role.isActive ? (
                              <Badge variant="default" className="text-xs h-4 bg-primary/10 text-primary border-primary/20">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="text-xs h-4">
                                Inactive
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 pt-2 border-t border-border/50">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditRole(role)}
                          className="flex-1 h-7 text-xs hover:bg-primary/5"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        {!role.isSystem && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteRole(role)}
                            className="h-7 px-2 text-destructive hover:bg-destructive/5"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Table View */}
            {viewMode === 'table' && (
              <Card className="border-border/50 shadow-sm">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[250px]">
                          <Button 
                            variant="ghost" 
                            onClick={() => {
                              setSortBy('name');
                              setSortOrder(sortBy === 'name' && sortOrder === 'asc' ? 'desc' : 'asc');
                            }}
                            className="h-auto p-0 font-semibold hover:bg-transparent"
                          >
                            Role Details
                            {sortBy === 'name' && <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                          </Button>
                        </TableHead>
                        <TableHead className="min-w-[300px]">Description</TableHead>
                        <TableHead className="w-[120px] text-center">
                          <Button 
                            variant="ghost" 
                            onClick={() => {
                              setSortBy('permissions');
                              setSortOrder(sortBy === 'permissions' && sortOrder === 'asc' ? 'desc' : 'asc');
                            }}
                            className="h-auto p-0 font-semibold hover:bg-transparent"
                          >
                            Permissions
                            {sortBy === 'permissions' && <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                          </Button>
                        </TableHead>
                        <TableHead className="w-[100px] text-center">Type</TableHead>
                        <TableHead className="w-[100px] text-center">Scope</TableHead>
                        <TableHead className="w-[100px] text-center">Status</TableHead>
                        <TableHead className="w-[140px] text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAndSortedRoles.map((role) => (
                        <TableRow key={role.id} className="hover:bg-muted/50">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className={`p-1.5 rounded-lg ${role.isSystem ? 'bg-secondary/10' : 'bg-primary/10'}`}>
                                {role.isSystem ? (
                                  <Shield className="w-3 h-3 text-secondary" />
                                ) : (
                                  <Users className="w-3 h-3 text-primary" />
                                )}
                              </div>
                              <div>
                                <div className="font-semibold text-sm">{role.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  Created {new Date(role.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs">
                              <p className="text-sm leading-relaxed text-foreground">
                                {role.description || "No description provided"}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-xs">
                              {role.permissions?.length || 0}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              variant={role.isSystem ? "secondary" : "outline"}
                              className="text-xs"
                            >
                              {role.isSystem ? "System" : "Custom"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              variant={role.branchId ? "secondary" : "outline"}
                              className="text-xs"
                            >
                              {role.branchId ? "Branch" : "Global"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {role.isActive ? (
                              <Badge variant="default" className="text-xs bg-primary/10 text-primary border-primary/20">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="text-xs">
                                Inactive
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditRole(role)}
                                className="h-7 text-xs hover:bg-primary/5"
                              >
                                <Edit className="w-3 h-3 mr-1" />
                                Edit
                              </Button>
                              {!role.isSystem && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteRole(role)}
                                  className="h-7 px-2 text-destructive hover:bg-destructive/5"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Edit Role Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Role Permissions</DialogTitle>
            <DialogDescription>
              Update permissions for {selectedRole?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedRole && (
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
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
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
          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteRole}
              disabled={deleteRoleMutation.isPending}
            >
              {deleteRoleMutation.isPending ? "Deleting..." : "Delete Role"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
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
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("templates");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [searchFilter, setSearchFilter] = useState<"all" | "high_impact" | "commonly_used">("all");
  const [showDependencies, setShowDependencies] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  
  const organizedPermissions = categorizePermissions(permissions);
  const totalModules = Object.keys(organizedPermissions.ERP).length + Object.keys(organizedPermissions.LMS).length + 1; // Add 'Other'

  // Enhanced permission templates for quick selection
  const PERMISSION_TEMPLATES = {
    "Class Teacher": {
      description: "Perfect for teachers managing their own classes",
      permissions: ["view_dashboard", "view_own_students", "mark_attendance", "manage_roll_numbers", "view_report_cards", "enter_marks", "create_courtesy_call_feedback"]
    },
    "Transport Manager": {
      description: "Complete transport module access",
      permissions: ["view_transport", "manage_transport_routes", "manage_transport_vehicles", "manage_transport_drivers", "track_transport_vehicles", "collect_transport_fees", "generate_transport_reports"]
    },
    "Finance Officer": {
      description: "Financial operations and fee management",
      permissions: ["view_finance_module", "collect_fees", "manage_fee_heads", "manage_fee_terms", "view_collection_reports", "manage_student_concessions"]
    },
    "Subject Coordinator": {
      description: "Subject and curriculum management",
      permissions: ["view_subjects", "manage_subjects", "manage_subject_assignments", "view_own_students", "manage_roll_numbers", "view_examinations", "enter_marks"]
    },
    "Principal": {
      description: "School oversight and management",
      permissions: ["view_dashboard", "view_students", "view_teachers", "view_attendance_reports", "view_finance_reports", "view_exam_reports", "manage_admissions", "view_all_courtesy_call_feedback"]
    }
  };

  // Permission impact levels for better UX
  const PERMISSION_IMPACT = {
    "super_admin": { level: "critical", color: "red" },
    "manage_roles": { level: "high", color: "orange" },
    "delete_student": { level: "high", color: "orange" },
    "view_students": { level: "medium", color: "blue" },
    "mark_attendance": { level: "low", color: "green" }
  };

  // Smart permission dependencies
  const PERMISSION_DEPENDENCIES = {
    "collect_fees": ["view_finance_module"],
    "enter_marks": ["view_examinations"],
    "manage_roll_numbers": ["view_students"],
    "track_transport_vehicles": ["view_transport"]
  };

  // Filter permissions based on search and filters
  const filterPermissionsBySearch = (perms: Array<{ name: string; description: string; category: string; order: number }>) => {
    let filtered = perms;
    
    // Text search
    if (searchTerm) {
      filtered = filtered.filter(perm => 
        perm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        perm.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Impact filter
    if (searchFilter === "high_impact") {
      filtered = filtered.filter(perm => 
        PERMISSION_IMPACT[perm.name as keyof typeof PERMISSION_IMPACT]?.level === "high" ||
        PERMISSION_IMPACT[perm.name as keyof typeof PERMISSION_IMPACT]?.level === "critical"
      );
    }
    
    return filtered;
  };

  const applyTemplate = (templateKey: string) => {
    const template = PERMISSION_TEMPLATES[templateKey as keyof typeof PERMISSION_TEMPLATES];
    if (template) {
      onFormDataChange({ 
        ...formData, 
        permissions: template.permissions as Permission[] 
      });
      setSelectedTemplate(templateKey);
    }
  };

  const toggleModule = (moduleName: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleName)) {
      newExpanded.delete(moduleName);
    } else {
      newExpanded.add(moduleName);
    }
    setExpandedModules(newExpanded);
  };

  const expandAllModules = () => {
    const allModules = [
      ...Object.keys(organizedPermissions.ERP),
      ...Object.keys(organizedPermissions.LMS),
      "Other"
    ];
    setExpandedModules(new Set(allModules));
  };

  const collapseAllModules = () => {
    setExpandedModules(new Set());
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

  const clearAllPermissions = () => {
    onFormDataChange({ ...formData, permissions: [] });
    setSelectedTemplate("");
  };

  const getModuleIcon = (moduleName: string) => {
    const name = moduleName.toLowerCase();
    
    // Exact matches first
    if (name === 'student management' || name === 'students') return <GraduationCap className="w-4 h-4" />;
    if (name === 'admissions') return <School className="w-4 h-4" />;
    if (name === 'staff management' || name === 'staff') return <Users className="w-4 h-4" />;
    if (name === 'classes & sections' || name === 'classes') return <Building className="w-4 h-4" />;
    if (name === 'attendance') return <Clock className="w-4 h-4" />;
    if (name === 'leave management') return <Calendar className="w-4 h-4" />;
    if (name === 'finance & money collection' || name === 'finance') return <CreditCard className="w-4 h-4" />;
    if (name === 'salary management') return <DollarSign className="w-4 h-4" />;
    if (name === 'communication') return <MessageSquare className="w-4 h-4" />;
    if (name === 'transportation' || name === 'transport') return <Bus className="w-4 h-4" />;
    if (name === 'examination') return <ClipboardCheck className="w-4 h-4" />;
    if (name === 'reports & analytics' || name === 'dashboard') return <BarChart3 className="w-4 h-4" />;
    if (name === 'settings & configuration' || name === 'rbac management') return <Settings className="w-4 h-4" />;
    
    // Fallback pattern matches
    if (name.includes('student')) return <GraduationCap className="w-4 h-4" />;
    if (name.includes('transport')) return <Bus className="w-4 h-4" />;
    if (name.includes('finance') || name.includes('money')) return <CreditCard className="w-4 h-4" />;
    if (name.includes('salary')) return <DollarSign className="w-4 h-4" />;
    if (name.includes('attendance')) return <Clock className="w-4 h-4" />;
    if (name.includes('communication')) return <MessageSquare className="w-4 h-4" />;
    if (name.includes('examination') || name.includes('exam')) return <ClipboardCheck className="w-4 h-4" />;
    if (name.includes('subject')) return <BookOpen className="w-4 h-4" />;
    if (name.includes('report') || name.includes('dashboard') || name.includes('analytics')) return <BarChart3 className="w-4 h-4" />;
    if (name.includes('settings') || name.includes('rbac') || name.includes('admissions')) return <Settings className="w-4 h-4" />;
    if (name.includes('classes') || name.includes('courtesy')) return <Building className="w-4 h-4" />;
    if (name.includes('staff') || name.includes('teacher') || name.includes('employee')) return <Users className="w-4 h-4" />;
    if (name.includes('leave')) return <Calendar className="w-4 h-4" />;
    
    return <Shield className="w-4 h-4" />;
  };

  const getImpactColor = (permissionName: string) => {
    const impact = PERMISSION_IMPACT[permissionName as keyof typeof PERMISSION_IMPACT];
    if (!impact) return '';
    
    switch (impact.level) {
      case 'critical': return 'bg-destructive/10 dark:bg-destructive/20 border-destructive/20 dark:border-destructive/30';
      case 'high': return 'bg-secondary/10 dark:bg-secondary/20 border-secondary/20 dark:border-secondary/30';
      case 'medium': return 'bg-primary/10 dark:bg-primary/20 border-primary/20 dark:border-primary/30';
      case 'low': return 'bg-muted dark:bg-muted border-border dark:border-border';
      default: return '';
    }
  };

  const renderCollapsiblePermissionModule = (moduleName: string, modulePermissions: any[]) => {
    const filteredPerms = filterPermissionsBySearch(modulePermissions);
    if (filteredPerms.length === 0 && searchTerm) return null;
    
    const selectedCount = getSelectedCount(modulePermissions);
    const totalCount = modulePermissions.length;
    const allSelected = selectedCount === totalCount;
    const isExpanded = expandedModules.has(moduleName);
    const hasSelection = selectedCount > 0;
    
    return (
      <div key={moduleName} className="border border-border rounded-lg bg-card overflow-hidden h-fit">
        {/* Compact Collapsible Header */}
        <div 
          className={`px-4 py-3 cursor-pointer transition-all duration-200 hover:bg-muted/50 ${
            hasSelection ? 'bg-primary/10 dark:bg-primary/20 border-b border-primary/20 dark:border-primary/70' : 'border-b border-border'
          }`}
          onClick={() => toggleModule(moduleName)}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <button className="flex items-center text-gray-600 dark:text-gray-400">
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
              <div className="flex items-center justify-center w-6 h-6 text-gray-600 dark:text-gray-400">
                {getModuleIcon(moduleName.toLowerCase())}
              </div>
              <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 leading-tight">
                {moduleName}
              </h3>
            </div>
            
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
              selectedCount === 0 ? 'bg-gray-300 dark:bg-gray-600' : 
              allSelected ? 'bg-primary' : 'bg-yellow-500'
            }`} />
          </div>
          
          {/* Compact Stats Row */}
          <div className="flex items-center justify-between">
            <Badge 
              variant={hasSelection ? "default" : "outline"} 
              className="text-xs font-medium"
            >
              {selectedCount}/{totalCount}
            </Badge>
            <Button
              variant={allSelected ? "destructive" : "default"}
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleSelectAllModule(modulePermissions);
              }}
              className="text-xs h-6 px-2 py-0"
            >
              {allSelected ? "Clear" : "All"}
            </Button>
          </div>
          
        </div>
        
        {/* Collapsible Content */}
        {isExpanded && (
          <div className="p-3 space-y-2 bg-muted/30 max-h-96 overflow-y-auto">
            {filteredPerms.map((permission) => {
              const isSelected = formData.permissions.includes(permission.name as Permission);
              const dependencies = PERMISSION_DEPENDENCIES[permission.name as keyof typeof PERMISSION_DEPENDENCIES] || [];
              
              return (
                <div 
                  key={permission.name} 
                  className={`flex items-start gap-2 p-2 rounded-md border transition-all duration-200 cursor-pointer ${
                    isSelected ? getImpactColor(permission.name) : 'bg-card border-border hover:bg-muted/50'
                  }`}
                  onClick={() => onPermissionToggle(permission.name as Permission)}
                >
                  <Checkbox
                    id={permission.name}
                    checked={isSelected}
                    onCheckedChange={() => onPermissionToggle(permission.name as Permission)}
                    className="mt-0.5 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-1">
                      <Label
                        htmlFor={permission.name}
                        className="text-xs font-medium cursor-pointer block text-gray-900 dark:text-gray-100 leading-tight"
                      >
                        {formatPermissionName(permission.name)}
                      </Label>
                      {PERMISSION_IMPACT[permission.name as keyof typeof PERMISSION_IMPACT] && (
                        <Badge 
                          variant="outline" 
                          className={`text-xs px-1 py-0 h-4 ${
                            PERMISSION_IMPACT[permission.name as keyof typeof PERMISSION_IMPACT].level === 'critical' ? 'border-destructive/30 text-destructive dark:text-destructive' :
                            PERMISSION_IMPACT[permission.name as keyof typeof PERMISSION_IMPACT].level === 'high' ? 'border-secondary/30 text-secondary dark:text-secondary' :
                            PERMISSION_IMPACT[permission.name as keyof typeof PERMISSION_IMPACT].level === 'medium' ? 'border-primary/30 text-primary dark:text-primary' :
                            'border-muted-foreground/30 text-muted-foreground'
                          }`}
                        >
                          {PERMISSION_IMPACT[permission.name as keyof typeof PERMISSION_IMPACT].level.toUpperCase()}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-tight">
                      {permission.description}
                    </p>
                    {showDependencies && dependencies.length > 0 && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                        <span className="text-xs">Requires:</span>
                        {dependencies.map(dep => (
                          <Badge key={dep} variant="outline" className="text-xs px-1 py-0 h-4">
                            {formatPermissionName(dep).split(' ')[0]}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name" className="text-sm font-medium">Role Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => onFormDataChange({ ...formData, name: e.target.value })}
            placeholder="Enter role name"
            disabled={isEdit}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="description" className="text-sm font-medium">Description</Label>
          <Input
            id="description"
            value={formData.description}
            onChange={(e) => onFormDataChange({ ...formData, description: e.target.value })}
            placeholder="Enter role description"
            className="mt-1"
          />
        </div>
      </div>

      {/* Enhanced Permissions Header */}
      <div className="border-t pt-6">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Permissions
              </h3>
              <Badge variant="default" className="bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary">
                {formData.permissions.length} selected
              </Badge>
              {showDependencies && (
                <Badge variant="outline" className="border-primary/30 text-primary dark:border-primary/60 dark:text-primary">
                  Show Dependencies
                </Badge>
              )}
            </div>
            {selectedTemplate && (
              <Badge variant="default" className="bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary">
                Applied: {selectedTemplate}
              </Badge>
            )}
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDependencies(!showDependencies)}
                className="text-sm"
              >
                {showDependencies ? "Hide" : "Show"} Dependencies
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllPermissions}
                className="text-sm"
              >
                <X className="w-4 h-4 mr-1" />
                Clear All
              </Button>
            </div>
          </div>

          {/* Enhanced Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search permissions by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={searchFilter} onValueChange={(value: any) => setSearchFilter(value)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter permissions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Permissions</SelectItem>
                <SelectItem value="high_impact">High Impact Only</SelectItem>
                <SelectItem value="commonly_used">Commonly Used</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Enhanced Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
          {[
            { key: "templates", label: "Quick Templates", icon: <Settings className="w-4 h-4" /> },
            { key: "ERP", label: "ERP Modules", icon: <Building className="w-4 h-4" /> },
            { key: "LMS", label: "LMS Modules", icon: <BookOpen className="w-4 h-4" /> },
            { key: "Other", label: "Other", icon: <Shield className="w-4 h-4" /> }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === tab.key
                  ? "border-primary text-primary dark:border-primary dark:text-primary"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Enhanced Content Sections */}
        <div className="space-y-4">
          {/* Quick Templates Tab */}
          {activeTab === "templates" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(PERMISSION_TEMPLATES).map(([key, template]) => (
                <Card 
                  key={key} 
                  className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                    selectedTemplate === key ? 'ring-2 ring-primary/20 dark:ring-primary/10' : ''
                  }`}
                  onClick={() => applyTemplate(key)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-muted rounded-lg">
                        {getModuleIcon(key.toLowerCase())}
                      </div>
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100">{key}</h4>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {template.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {template.permissions.length} permissions
                      </Badge>
                      {selectedTemplate === key && (
                        <Badge variant="default" className="text-xs">
                          Applied
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          
          {/* Collapsible Module-based tabs */}
          {(activeTab === "ERP" || activeTab === "LMS" || activeTab === "Other") && (
            <div className="space-y-4">
              {/* Expand/Collapse All Controls */}
              <div className="flex items-center justify-between py-3 px-4 bg-muted/50 rounded-lg border border-border">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">Module Controls</span>
                  <Badge variant="outline" className="text-xs">
                    {expandedModules.size} of {totalModules} expanded
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={expandAllModules}
                    className="text-xs h-7 px-3"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Expand All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={collapseAllModules}
                    className="text-xs h-7 px-3"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Collapse All
                  </Button>
                </div>
              </div>

              {/* Multi-Column Collapsible Modules Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 auto-rows-start">
                {activeTab === "ERP" && 
                  Object.entries(organizedPermissions.ERP).map(([moduleName, modulePermissions]) =>
                    renderCollapsiblePermissionModule(moduleName, modulePermissions)
                  )
                }
                
                {activeTab === "LMS" && 
                  Object.entries(organizedPermissions.LMS).map(([moduleName, modulePermissions]) =>
                    renderCollapsiblePermissionModule(moduleName, modulePermissions)
                  )
                }
                
                {activeTab === "Other" && 
                  renderCollapsiblePermissionModule("Other", organizedPermissions.Other)
                }
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-6 border-t">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSave} disabled={isLoading || !formData.name.trim()}>
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