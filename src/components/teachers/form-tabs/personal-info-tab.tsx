import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { DatePicker } from "@/components/ui/date-picker";
import { Combobox } from "@/components/ui/combobox";
import type { TeacherFormValues } from "../enhanced-teacher-form";

interface PersonalInfoTabProps {
  branches: any[];
}

// Define blood group options
const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

// Define marital status options
const maritalStatusOptions = ["Single", "Married", "Divorced", "Widowed", "Separated"];

export function PersonalInfoTab({ branches }: PersonalInfoTabProps) {
  const { control, watch } = useFormContext<TeacherFormValues>();
  const gender = watch("gender");

  return (
    <div className="space-y-6 p-6">
      <h3 className="text-xl font-medium text-[#00501B]">Personal Information</h3>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* First Name */}
        <FormField
          control={control}
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center">
                First Name <span className="text-red-500 ml-1">*</span>
              </FormLabel>
              <FormControl>
                <Input {...field} placeholder="First Name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Middle Name */}
        <FormField
          control={control}
          name="middleName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Middle Name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Middle Name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Last Name */}
        <FormField
          control={control}
          name="lastName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center">
                Last Name <span className="text-red-500 ml-1">*</span>
              </FormLabel>
              <FormControl>
                <Input {...field} placeholder="Last Name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Date of Birth */}
        <FormField
          control={control}
          name="dateOfBirth"
          render={({ field: { value, onChange, ...rest } }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date of Birth</FormLabel>
              <FormControl>
                <DatePicker
                  value={value ? new Date(value) : undefined}
                  onChange={(date) => {
                    const dateStr = date.toISOString().split('T')[0];
                    onChange(dateStr);
                  }}
                  placeholder="Select date of birth"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Gender */}
        <FormField
          control={control}
          name="gender"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Gender</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                >
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="Male" id="male" />
                    <FormLabel htmlFor="male" className="font-normal">
                      Male
                    </FormLabel>
                  </div>
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="Female" id="female" />
                    <FormLabel htmlFor="female" className="font-normal">
                      Female
                    </FormLabel>
                  </div>
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="Other" id="other" />
                    <FormLabel htmlFor="other" className="font-normal">
                      Other
                    </FormLabel>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Blood Group */}
        <FormField
          control={control}
          name="bloodGroup"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Blood Group</FormLabel>
              <FormControl>
                <Combobox
                  options={bloodGroups.map(group => ({ value: group, label: group }))}
                  value={field.value || ""}
                  onChange={field.onChange}
                  placeholder="Select blood group"
                  emptyMessage="No blood groups found."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Marital Status */}
        <FormField
          control={control}
          name="maritalStatus"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Marital Status</FormLabel>
              <FormControl>
                <Combobox
                  options={maritalStatusOptions.map(status => ({ value: status, label: status }))}
                  value={field.value || ""}
                  onChange={field.onChange}
                  placeholder="Select marital status"
                  emptyMessage="No status options found."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Nationality */}
        <FormField
          control={control}
          name="nationality"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nationality</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Nationality" defaultValue="Indian" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Religion */}
        <FormField
          control={control}
          name="religion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Religion</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Religion" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* PAN Card Number */}
        <FormField
          control={control}
          name="panNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>PAN Card Number</FormLabel>
              <FormControl>
                <Input {...field} placeholder="PAN Card Number" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Aadhaar Number */}
        <FormField
          control={control}
          name="aadharNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Aadhaar Number</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Aadhaar Number" />
              </FormControl>
              <FormDescription>Optional, but useful for verification</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Branch */}
        <FormField
          control={control}
          name="branchId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center">
                Branch <span className="text-red-500 ml-1">*</span>
              </FormLabel>
              <FormControl>
                <Combobox
                  options={branches.map(branch => ({ value: branch.id, label: branch.name }))}
                  value={field.value || ""}
                  onChange={field.onChange}
                  placeholder="Select branch"
                  emptyMessage="No branches found."
                />
              </FormControl>
              <FormDescription>
                The branch this teacher is assigned to
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="pt-4">
        <FormField
          control={control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Active Status</FormLabel>
                <FormDescription>
                  Set whether this teacher is active in the system
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
      </div>
    </div>
  );
} 