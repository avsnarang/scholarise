"use client";

import { useState } from "react";
import { api } from "@/utils/api";
import { Permission } from "@/types/permissions";
import type { UserRoleAssignment } from "@/services/rbac-service";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserPlus, User, Shield, Plus, X, Check, Trash2 } from "lucide-react";
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
import { toast } from "sonner";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface UserRoleFormData {
  userId: string;
  roleId: string;
  branchId?: string;
  teacherId?: string;
  employeeId?: string;
}

interface UserRoleAssignmentProps {
  userId?: string;
  showUserSelection?: boolean;
}

export function UserRoleAssignmentComponent({ 
  userId, 
  showUserSelection = true 
}: UserRoleAssignmentProps) {
  const { can } = usePermissions();
  const [selectedUserId, setSelectedUserId] = useState(userId || "");
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [formData, setFormData] = useState<UserRoleFormData>({
    userId: userId || "",
    roleId: "",
  });
  const [roleToRemove, setRoleToRemove] = useState<UserRoleAssignment | null>(null);

  // Queries
  const { data: rolesData = [] } = api.role.getAll.useQuery({});
  
  // Convert roles data to match expected interface
  const roles = rolesData.map(role => ({
    id: role.id,
    name: role.name,
    description: role.description || undefined,
    isSystem: role.isSystem,
    permissions: role.permissions || []
  }));

  const { data: userRoles = [], refetch: refetchUserRoles } = api.role.getUserRoles.useQuery(
    { userId: selectedUserId },
    { enabled: !!selectedUserId }
  );
  const { data: userPermissions = [] } = api.role.getUserPermissions.useQuery(
    { userId: selectedUserId },
    { enabled: !!selectedUserId }
  );

  // Get teachers and employees for selection
  const { data: teachers = [] } = api.teacher.getAll.useQuery();
  const { data: employees = [] } = api.employee.getAll.useQuery();

  // Mutations
  const assignRoleMutation = api.role.assignToUser.useMutation({
    onSuccess: () => {
      toast.success("Role assigned successfully");
      refetchUserRoles();
      setIsAssignDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to assign role");
    },
  });

  const removeRoleMutation = api.role.removeFromUser.useMutation({
    onSuccess: () => {
      toast.success("Role removed successfully");
      refetchUserRoles();
      setRoleToRemove(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to remove role");
    },
  });

  const resetForm = () => {
    setFormData({
      userId: selectedUserId,
      roleId: "",
    });
  };

  const handleAssignRole = () => {
    if (!formData.userId || !formData.roleId) return;
    
    assignRoleMutation.mutate({
      userId: formData.userId,
      roleId: formData.roleId,
      branchId: formData.branchId,
      teacherId: formData.teacherId,
      employeeId: formData.employeeId,
    });
  };

  const handleRemoveRole = (roleAssignment: any) => {
    removeRoleMutation.mutate({
      userId: roleAssignment.userId,
      roleId: roleAssignment.roleId,
      branchId: roleAssignment.branchId || undefined,
    });
  };

  const handleUserChange = (newUserId: string) => {
    setSelectedUserId(newUserId);
    setFormData(prev => ({ ...prev, userId: newUserId }));
  };

  // Get role details
  const getRoleDetails = (roleId: string) => {
    return roles.find(role => role.id === roleId);
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
            You don't have permission to manage user roles.
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
          <h2 className="text-2xl font-bold tracking-tight">User Role Assignment</h2>
          <p className="text-muted-foreground">
            Assign roles to users and manage their permissions
          </p>
        </div>
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()} disabled={!selectedUserId}>
              <Plus className="w-4 h-4 mr-2" />
              Assign Role
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Role to User</DialogTitle>
              <DialogDescription>
                Select a role to assign to the user
              </DialogDescription>
            </DialogHeader>
            <AssignRoleForm
              formData={formData}
              roles={roles}
              teachers={teachers as any}
              employees={employees as any}
              onFormDataChange={setFormData}
              onSave={handleAssignRole}
              onCancel={() => setIsAssignDialogOpen(false)}
              isLoading={assignRoleMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* User Selection */}
      {showUserSelection && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Select User
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="userId">User ID</Label>
                <Input
                  id="userId"
                  value={selectedUserId}
                  onChange={(e) => handleUserChange(e.target.value)}
                  placeholder="Enter user ID"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* User Roles */}
      {selectedUserId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              User Roles
            </CardTitle>
            <CardDescription>
              Roles assigned to user: {selectedUserId}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {userRoles.length === 0 ? (
              <div className="text-center py-8">
                <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No roles assigned to this user</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userRoles.map((roleAssignment) => {
                    const role = getRoleDetails(roleAssignment.roleId);
                    return (
                      <TableRow key={`${roleAssignment.roleId}-${roleAssignment.branchId || 'global'}`}>
                        <TableCell>
                          <div className="font-medium">{role?.name || 'Unknown Role'}</div>
                          <div className="text-sm text-muted-foreground">
                            {role?.isSystem ? 'System Role' : 'Custom Role'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate">
                            {role?.description || 'No description'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {role?.permissions?.length || 0} permissions
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {roleAssignment.branchId ? (
                            <Badge variant="outline">Branch-specific</Badge>
                          ) : (
                            <Badge variant="default">Global</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {roleAssignment.isActive ? (
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
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Role</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to remove the role "{role?.name}" from this user?
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRemoveRole(roleAssignment)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Remove Role
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* User Permissions Summary */}
      {selectedUserId && userPermissions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              User Permissions Summary
            </CardTitle>
            <CardDescription>
              All permissions granted to this user through their roles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {userPermissions.map((permission) => (
                <Badge key={permission} variant="outline">
                  {permission.split('_').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                  ).join(' ')}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface AssignRoleFormProps {
  formData: UserRoleFormData;
  roles: Array<{ id: string; name: string; description?: string; isSystem: boolean; permissions: any[] }>;
  teachers: Array<{ id: string; firstName: string; lastName: string }>;
  employees: Array<{ id: string; firstName: string; lastName: string }>;
  onFormDataChange: (data: UserRoleFormData) => void;
  onSave: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

function AssignRoleForm({
  formData,
  roles,
  teachers,
  employees,
  onFormDataChange,
  onSave,
  onCancel,
  isLoading,
}: AssignRoleFormProps) {
  const selectedRole = roles.find(role => role.id === formData.roleId);

  return (
    <div className="space-y-4">
      {/* Role Selection */}
      <div>
        <Label htmlFor="roleId">Role</Label>
        <Select
          value={formData.roleId}
          onValueChange={(value) => onFormDataChange({ ...formData, roleId: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            {roles.map((role) => (
              <SelectItem key={role.id} value={role.id}>
                <div className="flex items-center gap-2">
                  <span>{role.name}</span>
                  {role.isSystem && <Badge variant="secondary">System</Badge>}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Branch Selection */}
      <div>
        <Label htmlFor="branchId">Branch (Optional)</Label>
        <Input
          id="branchId"
          value={formData.branchId || ""}
          onChange={(e) => onFormDataChange({ ...formData, branchId: e.target.value || undefined })}
          placeholder="Leave empty for global role"
        />
      </div>

      {/* Teacher Selection */}
      <div>
        <Label htmlFor="teacherId">Teacher (Optional)</Label>
        <Select
          value={formData.teacherId || ""}
          onValueChange={(value) => onFormDataChange({ ...formData, teacherId: value || undefined })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a teacher" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">None</SelectItem>
            {teachers.map((teacher) => (
              <SelectItem key={teacher.id} value={teacher.id}>
                {teacher.firstName} {teacher.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Employee Selection */}
      <div>
        <Label htmlFor="employeeId">Employee (Optional)</Label>
        <Select
          value={formData.employeeId || ""}
          onValueChange={(value) => onFormDataChange({ ...formData, employeeId: value || undefined })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select an employee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">None</SelectItem>
            {employees.map((employee) => (
              <SelectItem key={employee.id} value={employee.id}>
                {employee.firstName} {employee.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Role Details */}
      {selectedRole && (
        <div className="p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">Role Details</h4>
          <p className="text-sm text-muted-foreground mb-2">
            {selectedRole.description || 'No description available'}
          </p>
          <div className="flex items-center gap-2">
            <Badge variant={selectedRole.isSystem ? "default" : "outline"}>
              {selectedRole.isSystem ? "System Role" : "Custom Role"}
            </Badge>
            <Badge variant="secondary">
              {selectedRole.permissions?.length || 0} permissions
            </Badge>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSave} disabled={isLoading || !formData.roleId}>
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Assigning...
            </>
          ) : (
            "Assign Role"
          )}
        </Button>
      </div>
    </div>
  );
} 