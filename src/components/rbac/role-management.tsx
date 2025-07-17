"use client";

import { useState } from "react";
import { api } from "@/utils/api";
import { Permission, Role } from "@/types/permissions";
import type { RoleWithPermissions } from "@/services/rbac-service";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Settings, Users, Shield, Edit, Trash2, Check, X } from "lucide-react";
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
import { toast } from "sonner";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

interface RoleFormData {
  name: string;
  description: string;
  permissions: Permission[];
  branchId?: string;
}

export function RoleManagement() {
  const { can } = usePermissions();
  const [selectedRole, setSelectedRole] = useState<RoleWithPermissions | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [formData, setFormData] = useState<RoleFormData>({
    name: "",
    description: "",
    permissions: [],
  });

  // Queries
  const { data: roles = [], isLoading: isLoadingRoles, refetch: refetchRoles } = api.role.getAll.useQuery({});
  const { data: rawPermissions = [], isLoading: isLoadingPermissions } = api.permission.getAll.useQuery({});
  
  // Map permissions to ensure description is never null
  const permissions = rawPermissions.map(permission => ({
    ...permission,
    description: permission.description || ''
  }));

  // Mutations
  const createRoleMutation = api.role.create.useMutation({
    onSuccess: () => {
      toast.success("Role created successfully");
      refetchRoles();
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create role");
    },
  });

  // TODO: Implement these mutations in the role router
  // const updatePermissionsMutation = api.role.updatePermissions.useMutation({...});
  // const seedDefaultRolesMutation = api.role.seedDefaultRoles.useMutation({...});
  // const clearCacheMutation = api.role.clearCache.useMutation({...});

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
    // TODO: Implement update permissions API
    toast.error("Update permissions not yet implemented");
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
      <Card>
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
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Role Management</h2>
          <p className="text-muted-foreground">
            Manage user roles and permissions in your system
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => toast.info("Feature coming soon")}
            disabled={true}
          >
            Clear Cache
          </Button>
          <Button
            variant="outline"
            onClick={() => toast.info("Feature coming soon")}
            disabled={true}
          >
            Seed Default Roles
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="w-4 h-4 mr-2" />
                Create Role
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Role</DialogTitle>
                <DialogDescription>
                  Create a new role and assign permissions
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

      {/* Roles Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Roles
          </CardTitle>
          <CardDescription>
            Manage system roles and their permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingRoles ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>System Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell>
                      <div className="font-medium">{role.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {role.branchId ? "Branch-specific" : "Global"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate">
                        {role.description || "No description"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {role.permissions.length} permissions
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {role.isSystem ? (
                        <Badge variant="default">System</Badge>
                      ) : (
                        <Badge variant="outline">Custom</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {role.isActive ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">
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
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditRole(role)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {!role.isSystem && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
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
          )}
        </CardContent>
      </Card>

      {/* Edit Role Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Role Permissions</DialogTitle>
            <DialogDescription>
              Update permissions for {selectedRole?.name}
            </DialogDescription>
          </DialogHeader>
          <RoleForm
            formData={formData}
            permissions={permissions}
            onFormDataChange={setFormData}
            onPermissionToggle={handlePermissionToggle}
            onSave={handleUpdatePermissions}
            onCancel={() => setIsEditDialogOpen(false)}
            isLoading={false}
            isEdit={true}
          />
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
  const groupedPermissions = permissions.reduce((acc, perm) => {
    const category = perm.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(perm);
    return acc;
  }, {} as Record<string, typeof permissions>);

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="grid grid-cols-1 gap-4">
        <div>
          <Label htmlFor="name">Role Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => onFormDataChange({ ...formData, name: e.target.value })}
            placeholder="Enter role name"
            disabled={isEdit}
          />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => onFormDataChange({ ...formData, description: e.target.value })}
            placeholder="Enter role description"
            rows={3}
          />
        </div>
      </div>

      {/* Permissions */}
      <div>
        <Label>Permissions</Label>
        <div className="mt-2 space-y-4">
          {Object.entries(groupedPermissions).map(([category, categoryPermissions]) => (
            <Card key={category}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  {category}
                  <Badge variant="outline">
                    {categoryPermissions.filter(p => formData.permissions.includes(p.name as Permission)).length} / {categoryPermissions.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {categoryPermissions.map((permission) => (
                    <div key={permission.name} className="flex items-start space-x-2">
                      <Checkbox
                        id={permission.name}
                        checked={formData.permissions.includes(permission.name as Permission)}
                        onCheckedChange={() => onPermissionToggle(permission.name as Permission)}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <Label
                          htmlFor={permission.name}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {permission.name.split('_').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                          ).join(' ')}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {permission.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2">
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