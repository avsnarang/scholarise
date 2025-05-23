import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { EmployeeFormValues } from "@/server/api/employee-types";
import { DatePicker } from "@/components/ui/date-picker";
import { Combobox } from "@/components/ui/combobox";
import { MultiSelect } from "@/components/ui/multi-select";

// Blood group options
const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

// Marital status options
const maritalStatusOptions = ["Single", "Married", "Divorced", "Widowed", "Separated"];

interface PersonalInfoTabProps {
  branches: { id: string; name: string }[];
}

export function PersonalInfoTab({ branches }: PersonalInfoTabProps) {
  const { control, watch } = useFormContext<EmployeeFormValues>();
  const gender = watch("gender");

  return (
    <div className="space-y-6 p-6">
      <h3 className="text-xl font-medium text-[#00501B]">
        Personal Information
      </h3>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* First Name */}
        <FormField
          control={control}
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center">
                First Name <span className="ml-1 text-red-500">*</span>
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
                Last Name <span className="ml-1 text-red-500">*</span>
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
                  value={field.value}
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
              <Select onValueChange={field.onChange} value={field.value || ""}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select marital status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {maritalStatusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                <Input
                  {...field}
                  placeholder="Nationality"
                />
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

        {/* Branches - Multi-select */}
        <FormField
          control={control}
          name="branchAccess"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center">
                Branches <span className="ml-1 text-red-500">*</span>
              </FormLabel>
              <FormControl>
                <MultiSelect
                  options={branches.map(branch => ({ value: branch.id, label: branch.name }))}
                  selected={field.value || []}
                  onValueChange={field.onChange}
                  placeholder="Select branches"
                />
              </FormControl>
              <FormDescription>
                Select all branches this employee can access. The first branch selected is the primary branch.
              </FormDescription>
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
              <FormDescription>
                Optional, but useful for verification
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="pt-4">
          <FormField
            control={control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Active Status</FormLabel>
                  <FormDescription>
                    Set whether this employee is active in the system
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
    </div>
  );
} 