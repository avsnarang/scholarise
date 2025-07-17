"use client";

import { useState } from "react";
import { api } from "@/utils/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Trash2, Users, Shield } from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";

interface CreateRoleFormData {
  name: string;
  description: string;
  permissionIds: string[];
}

export function RolesManagement() {
  const { hasPermission } = usePermissions();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateRoleFormData>({
    name: "",
    description: "",
    permissionIds: [],
  });

  // Check permissions
  const canManageRoles = hasPermission('manage_roles');

  // Queries
  const { data: roles = [], isLoading: isLoadingRoles, refetch: refetchRoles } = api.role.getAll.useQuery({
    includeSystem: true,
    includeInactive: false,
  });

  const { data: permissions = [], isLoading: isLoadingPermissions } = api.permission.getAll.useQuery({
    includeSystem: true,
    includeInactive: false,
  });

  const { data: categories = [] } = api.permission.getCategories.useQuery();

  // Mutations
  const createRoleMutation = api.role.create.useMutation({
    onSuccess: () => {
      toast.success("Role created successfully");
      setIsCreateDialogOpen(false);
      setFormData({ name: "", description: "", permissionIds: [] });
      refetchRoles();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateRoleMutation = api.role.update.useMutation({
    onSuccess: () => {
      toast.success("Role updated successfully");
      setEditingRole(null);
      setFormData({ name: "", description: "", permissionIds: [] });
      refetchRoles();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteRoleMutation = api.role.delete.useMutation({
    onSuccess: () => {
      toast.success("Role deleted successfully");
      refetchRoles();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Role name is required");
      return;
    }

    if (editingRole) {
      updateRoleMutation.mutate({
        id: editingRole,
        name: formData.name,
        description: formData.description,
        permissionIds: formData.permissionIds,
      });
    } else {
      createRoleMutation.mutate(formData);
    }
  };

  const handleEdit = (role: any) => {
    setEditingRole(role.id);
    setFormData({
      name: role.name,
      description: role.description || "",
      permissionIds: role.rolePermissions?.map((rp: any) => rp.permission.id) || [],
    });
    setIsCreateDialogOpen(true);
  };

  const handleDelete = (roleId: string) => {
    if (confirm("Are you sure you want to delete this role?")) {
      deleteRoleMutation.mutate({ id: roleId });
    }
  };

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissionIds: checked
        ? [...prev.permissionIds, permissionId]
        : prev.permissionIds.filter(id => id !== permissionId)
    }));
  };

  // Group permissions by category
  const groupedPermissions = permissions.reduce((acc, permission) => {
    const category = permission.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(permission);
    return acc;
  }, {} as Record<string, typeof permissions>);

  if (!canManageRoles) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            You don't have permission to manage roles.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Roles Management</h1>
          <p className="text-muted-foreground">
            Manage user roles and their permissions
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingRole(null);
              setFormData({ name: "", description: "", permissionIds: [] });
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Create Role
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingRole ? "Edit Role" : "Create New Role"}
              </DialogTitle>
              <DialogDescription>
                {editingRole ? "Update the role details and permissions" : "Create a new role with specific permissions"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Role Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter role name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Role description (optional)"
                    rows={3}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label>Permissions</Label>
                <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
                  {Object.entries(groupedPermissions).map(([category, categoryPermissions]) => (
                    <div key={category} className="mb-6">
                      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
                        {category.replace(/_/g, ' ')}
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        {categoryPermissions.map((permission) => (
                          <div key={permission.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={permission.id}
                              checked={formData.permissionIds.includes(permission.id)}
                              onCheckedChange={(checked) => 
                                handlePermissionChange(permission.id, checked as boolean)
                              }
                            />
                            <Label 
                              htmlFor={permission.id} 
                              className="text-sm font-normal cursor-pointer"
                              title={permission.description || permission.name}
                            >
                              {permission.name.replace(/_/g, ' ')}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createRoleMutation.isPending || updateRoleMutation.isPending}
                >
                  {editingRole ? "Update Role" : "Create Role"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {isLoadingRoles ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center">Loading roles...</div>
            </CardContent>
          </Card>
        ) : roles.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-muted-foreground">
                No roles found. Create your first role to get started.
              </div>
            </CardContent>
          </Card>
        ) : (
          roles.map((role) => (
            <Card key={role.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      {role.name}
                      {role.isSystem && <Badge variant="secondary">System</Badge>}
                    </CardTitle>
                    {role.description && (
                      <CardDescription>{role.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {role.userRoles?.length || 0} users
                    </Badge>
                    {!role.isSystem && (
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(role)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(role.id)}
                          disabled={deleteRoleMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">
                      Permissions ({role.rolePermissions?.length || 0})
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {role.rolePermissions?.slice(0, 10).map((rp: any) => (
                        <Badge key={rp.permission.id} variant="outline" className="text-xs">
                          {rp.permission.name.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                      {(role.rolePermissions?.length || 0) > 10 && (
                        <Badge variant="outline" className="text-xs">
                          +{(role.rolePermissions?.length || 0) - 10} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
} 