import { type Permission } from "@/types/permissions";
import { usePermissions } from "@/hooks/usePermissions";

/**
 * Custom hook to check if a user has access to perform specific actions
 * Returns functions to check permissions for viewing, creating, editing and deleting
 */
export function useActionPermissions(module: string) {
  const { can } = usePermissions();
  
  // Map module names to their corresponding permission prefixes
  const modulePermissionMap: Record<string, string> = {
    classes: "class",
    students: "student",
    teachers: "teacher",
    employees: "employee",
    attendance: "attendance",
    departments: "department",
    designations: "designation",
    leaves: "leave",
    transport: "transport",
    fees: "fee",
    subjects: "subject",
    users: "user",
  };
  
  const prefix = modulePermissionMap[module.toLowerCase()] || module.toLowerCase();
  
  return {
    // Check if user can view the module
    canView: () => {
      const viewPermission = `view_${prefix}s` as Permission;
      return can(viewPermission);
    },
    
    // Check if user can create in the module
    canCreate: () => {
      const createPermission = `create_${prefix}` as Permission;
      return can(createPermission);
    },
    
    // Check if user can edit in the module
    canEdit: () => {
      const editPermission = `edit_${prefix}` as Permission;
      return can(editPermission);
    },
    
    // Check if user can delete in the module
    canDelete: () => {
      const deletePermission = `delete_${prefix}` as Permission;
      return can(deletePermission);
    },
    
    // Check if user has a specific permission
    hasPermission: (permission: Permission) => {
      return can(permission);
    }
  };
} 