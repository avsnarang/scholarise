import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { UserPlus, Users } from "lucide-react";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceType: string;
  resourceId: string;
  resourceName: string;
}

type ShareTarget = "user" | "group" | "role";

interface Permission {
  id: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

// Mock data
const mockRoles = [
  { id: "1", name: "SuperAdmin" },
  { id: "2", name: "Employee" },
  { id: "3", name: "Teacher" },
  { id: "4", name: "Parent" },
  { id: "5", name: "Student" },
];

const mockUsers = [
  { id: "1", name: "John Doe", email: "john@example.com", image: null },
  { id: "2", name: "Jane Smith", email: "jane@example.com", image: null },
  { id: "3", name: "Raj Patel", email: "raj@example.com", image: null },
];

const mockGroups = [
  { id: "1", name: "Administrators", description: "System administrators" },
  { id: "2", name: "Teachers", description: "All teachers" },
  { id: "3", name: "Class 10", description: "Class 10 students and teachers" },
];

export function ShareModal({
  isOpen,
  onClose,
  resourceType,
  resourceId,
  resourceName
}: ShareModalProps) {
  const [shareTarget, setShareTarget] = useState<ShareTarget>("user");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [permissions, setPermissions] = useState<Permission>({
    id: "",
    canView: true,
    canCreate: false,
    canEdit: false,
    canDelete: false,
  });

  // Using mock data
  const users = mockUsers;
  const groups = mockGroups;
  const roles = mockRoles;
  const currentPermissions = [];

  const handleAddPermission = async () => {
    if (!selectedId) return;

    // Mock implementation
    console.log("Adding permission:", {
      resourceType,
      resourceId,
      targetType: shareTarget,
      targetId: selectedId,
      ...permissions,
    });

    // Reset form
    setSelectedId("");
    setPermissions({
      id: "",
      canView: true,
      canCreate: false,
      canEdit: false,
      canDelete: false,
    });

    // Close modal
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Share {resourceName}</DialogTitle>
          <DialogDescription>
            Add users, groups, or roles to share this {resourceType.toLowerCase()}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant={shareTarget === "user" ? "default" : "outline"}
              onClick={() => setShareTarget("user")}
              className="flex items-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              <span>Users</span>
            </Button>
            <Button
              variant={shareTarget === "group" ? "default" : "outline"}
              onClick={() => setShareTarget("group")}
              className="flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              <span>Groups</span>
            </Button>
            <Button
              variant={shareTarget === "role" ? "default" : "outline"}
              onClick={() => setShareTarget("role")}
              className="flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              <span>Roles</span>
            </Button>
          </div>

          <div className="space-y-2">
            {shareTarget === "role" ? (
              <div className="space-y-2">
                <Label htmlFor="role">Select Role</Label>
                <Select value={selectedId} onValueChange={setSelectedId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles?.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="search">
                  Search {shareTarget === "user" ? "Users" : "Groups"}
                </Label>
                <Input
                  id="search"
                  placeholder={`Search by name or email...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="mt-2 max-h-40 overflow-y-auto rounded border p-2">
                  {shareTarget === "user" && users?.length === 0 && (
                    <p className="text-sm text-gray-500">No users found</p>
                  )}
                  {shareTarget === "group" && groups?.length === 0 && (
                    <p className="text-sm text-gray-500">No groups found</p>
                  )}
                  {shareTarget === "user" &&
                    users?.map((user) => (
                      <div
                        key={user.id}
                        className={`cursor-pointer rounded p-2 hover:bg-gray-100 ${
                          selectedId === user.id ? "bg-gray-100" : ""
                        }`}
                        onClick={() => setSelectedId(user.id)}
                      >
                        <div className="flex items-center gap-2">
                          {user.image && (
                            <img
                              src={user.image}
                              alt={user.name || "User"}
                              className="h-6 w-6 rounded-full"
                            />
                          )}
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-xs text-gray-500">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  {shareTarget === "group" &&
                    groups?.map((group) => (
                      <div
                        key={group.id}
                        className={`cursor-pointer rounded p-2 hover:bg-gray-100 ${
                          selectedId === group.id ? "bg-gray-100" : ""
                        }`}
                        onClick={() => setSelectedId(group.id)}
                      >
                        <p className="font-medium">{group.name}</p>
                        {group.description && (
                          <p className="text-xs text-gray-500">
                            {group.description}
                          </p>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div className="mt-4 space-y-2">
              <Label>Permissions</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="view"
                    checked={permissions.canView}
                    onCheckedChange={(checked) =>
                      setPermissions({
                        ...permissions,
                        canView: checked === true,
                      })
                    }
                  />
                  <Label htmlFor="view">Can view</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="create"
                    checked={permissions.canCreate}
                    onCheckedChange={(checked) =>
                      setPermissions({
                        ...permissions,
                        canCreate: checked === true,
                      })
                    }
                  />
                  <Label htmlFor="create">Can create</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit"
                    checked={permissions.canEdit}
                    onCheckedChange={(checked) =>
                      setPermissions({
                        ...permissions,
                        canEdit: checked === true,
                      })
                    }
                  />
                  <Label htmlFor="edit">Can edit</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="delete"
                    checked={permissions.canDelete}
                    onCheckedChange={(checked) =>
                      setPermissions({
                        ...permissions,
                        canDelete: checked === true,
                      })
                    }
                  />
                  <Label htmlFor="delete">Can delete</Label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleAddPermission}
            disabled={!selectedId}
          >
            Add Permission
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
