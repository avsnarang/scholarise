import { useState, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { RefreshCw, Eye, EyeOff } from "lucide-react";
import type { TeacherFormValues } from "../enhanced-teacher-form";

// Helper function to generate a secure password
function generateSecurePassword(length = 14) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+';
  let password = '';
  
  // Ensure at least one character from each category
  password += chars.substring(0, 26).charAt(Math.floor(Math.random() * 26)); // Uppercase
  password += chars.substring(26, 52).charAt(Math.floor(Math.random() * 26)); // Lowercase
  password += chars.substring(52, 62).charAt(Math.floor(Math.random() * 10)); // Number
  password += chars.substring(62).charAt(Math.floor(Math.random() * (chars.length - 62))); // Special char
  
  // Fill the rest
  for (let i = 4; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // Shuffle the password characters
  return password.split('').sort(() => 0.5 - Math.random()).join('');
}

export function AccountInfoTab() {
  const { control, watch, setValue } = useFormContext<TeacherFormValues>();
  const [showPassword, setShowPassword] = useState(false);
  const createUser = watch("createUser");

  // Generate password automatically when createUser is toggled on
  useEffect(() => {
    if (createUser) {
      const currentPassword = watch("password");
      if (!currentPassword) {
        setValue("password", generateSecurePassword());
      }
    }
  }, [createUser, setValue, watch]);

  const handleRegeneratePassword = () => {
    setValue("password", generateSecurePassword());
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="space-y-6 p-6">
      <h3 className="text-xl font-medium text-[#00501B]">User Account</h3>

      <FormField
        control={control}
        name="createUser"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <FormLabel className="text-base">Create User Account</FormLabel>
              <FormDescription>
                Create login credentials for this teacher
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
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField
            control={control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center">
                  Email <span className="text-red-500 ml-1">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="teacher@example.com"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Will be used for login and communications
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center">
                  Password <span className="text-red-500 ml-1">*</span>
                </FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <div className="relative w-full">
                      <Input
                        type={showPassword ? "text" : "password"}
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={togglePasswordVisibility}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleRegeneratePassword}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                <FormDescription>
                  Auto-generated secure password
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}

      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mt-6">
        <h4 className="text-amber-800 font-medium">Account Access Information</h4>
        <p className="text-amber-700 text-sm mt-1">
          Creating a user account will allow this teacher to log into the ScholaRise ERP system. They will have access to:
        </p>
        <ul className="text-amber-700 text-sm mt-2 list-disc pl-5 space-y-1">
          <li>Their personal dashboard</li>
          <li>Class information for classes they teach</li>
          <li>Student information for their classes</li>
          <li>Attendance management</li>
          <li>Assignment tracking</li>
          <li>Grade management</li>
        </ul>
      </div>
    </div>
  );
} 