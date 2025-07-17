import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { EmployeeFormValues } from "@/server/api/employee-types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/utils/api";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";

interface AccountInfoTabProps {
  isEdit?: boolean;
}

export function AccountInfoTab({ isEdit = false }: AccountInfoTabProps) {
  const { control, watch, getValues } = useFormContext<EmployeeFormValues>();
  const createUser = watch("createUser");
  const currentEmail = watch("email");
  const currentRoleId = watch("roleId");
  
  // Check if the user has an existing clerk account
  const [hasExistingAccount, setHasExistingAccount] = useState(false);
  
  // Check when component mounts and when createUser changes
  useEffect(() => {
    if (isEdit && createUser) {
      setHasExistingAccount(true);
    }
  }, [isEdit, createUser]);
  
  // Fetch roles from the API
  const { data: dbRoles, isLoading: isLoadingRoles } = api.role.getAll.useQuery({});
  
  // Role badge colors helper
  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      "SUPER_ADMIN": "bg-red-100 text-red-800 border-red-200",
      "ADMIN": "bg-purple-100 text-purple-800 border-purple-200",
      "PRINCIPAL": "bg-blue-100 text-blue-800 border-blue-200",
      "TEACHER": "bg-green-100 text-green-800 border-green-200",
      "ACCOUNTANT": "bg-amber-100 text-amber-800 border-amber-200",
      "RECEPTIONIST": "bg-pink-100 text-pink-800 border-pink-200",
      "TRANSPORT_MANAGER": "bg-indigo-100 text-indigo-800 border-indigo-200",
      "STAFF": "bg-slate-100 text-slate-800 border-slate-200",
    };
    return colors[role] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  return (
    <div className="space-y-6 p-6">
      <h3 className="text-xl font-medium text-[#00501B] dark:text-[#7AAD8B]">User Account</h3>
      
      {isEdit && hasExistingAccount && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <h4 className="font-medium text-blue-900">Existing User Account</h4>
          </div>
          <p className="text-sm text-blue-700">
            This employee has an existing login account. You can update their email and role below.
          </p>
        </div>
      )}
      
      <FormField
        control={control}
        name="createUser"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
            <div className="space-y-0.5">
              <FormLabel>
                {hasExistingAccount ? "User Account Status" : "Create Login Account"}
              </FormLabel>
              <FormDescription>
                {hasExistingAccount 
                  ? "This employee has a login account that can access the system"
                  : "Create a user account that can login to the system"
                }
              </FormDescription>
            </div>
            <FormControl>
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
                disabled={hasExistingAccount} // Disable toggle for existing accounts
              />
            </FormControl>
          </FormItem>
        )}
      />
      {createUser && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 mt-4">
          {/* Email */}
          <FormField
            control={control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center">
                  Email <span className="text-red-500 ml-1">*</span>
                  {hasExistingAccount && currentEmail && (
                    <span className="ml-2 text-xs font-normal text-green-600">
                      (Current: {currentEmail})
                    </span>
                  )}
                </FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    placeholder={hasExistingAccount ? "Update email address" : "Email address"} 
                    type="email" 
                  />
                </FormControl>
                <FormDescription>
                  {hasExistingAccount 
                    ? "Current login email - update if needed" 
                    : "This will be used for login"
                  }
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Password */}
          <FormField
            control={control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center">
                  {hasExistingAccount ? "Update Password" : "Password"} <span className="text-red-500 ml-1">*</span>
                </FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    placeholder={hasExistingAccount ? "Leave blank to keep current password" : "Password"} 
                    type="password" 
                  />
                </FormControl>
                <FormDescription>
                  {hasExistingAccount 
                    ? "Enter new password only if you want to change it" 
                    : "Minimum 8 characters"}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Role */}
          <FormField
            control={control}
            name="roleId"
            render={({ field }) => {
              const currentRole = dbRoles?.find((role: any) => role.id === currentRoleId);
              
              return (
                <FormItem>
                  <FormLabel className="flex items-center">
                    Role <span className="text-red-500 ml-1">*</span>
                    {hasExistingAccount && currentRole && (
                      <span className="ml-2 text-xs font-normal text-green-600">
                        (Current: {currentRole.name.replace(/_/g, " ")})
                      </span>
                    )}
                  </FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value || ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {dbRoles?.map((role: any) => (
                        <SelectItem key={role.id} value={role.id}>
                          <div className="flex items-center">
                            <Badge 
                              variant="outline" 
                              className={`${getRoleBadgeColor(role.name)} text-xs font-normal mr-2`}
                            >
                              {role.name.replace(/_/g, " ")}
                            </Badge>
                            <span className="text-xs text-muted-foreground ml-2">
                              ({role.description || role.name})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {hasExistingAccount 
                      ? "Current user role - update if needed" 
                      : "This determines what the user can access"
                    }
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
        </div>
      )}
    </div>
  );
} 