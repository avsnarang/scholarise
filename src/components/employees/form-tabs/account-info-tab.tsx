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
  
  // Check if the user has an existing clerk account
  const [hasExistingAccount, setHasExistingAccount] = useState(false);
  
  // Check when component mounts and when createUser changes
  useEffect(() => {
    if (isEdit && createUser) {
      setHasExistingAccount(true);
    }
  }, [isEdit, createUser]);
  
  // Fetch roles from the API
  const { data: dbRoles, isLoading: isLoadingRoles } = api.role.getAll.useQuery();
  
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
      {/* User Account */}
      <h3 className="text-xl font-medium text-[#00501B]">User Account</h3>
      <FormField
        control={control}
        name="createUser"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
            <div className="space-y-0.5">
              <FormLabel>Create Login Account</FormLabel>
              <FormDescription>
                Create a user account that can login to the system
              </FormDescription>
            </div>
            <FormControl>
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
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
                </FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Email address" type="email" />
                </FormControl>
                <FormDescription>This will be used for login</FormDescription>
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
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center">
                  Role <span className="text-red-500 ml-1">*</span>
                </FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value} 
                  value={field.value || undefined}
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
                <FormDescription>This determines what the user can access</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </div>
  );
} 