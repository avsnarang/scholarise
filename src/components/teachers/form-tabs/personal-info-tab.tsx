import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TeacherFormValues } from "../enhanced-teacher-form";

interface PersonalInfoTabProps {
  branches: any[];
}

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
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date of Birth</FormLabel>
              <FormControl>
                <Input 
                  type="date" 
                  {...field} 
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

        {/* Employee Code */}
        <FormField
          control={control}
          name="employeeCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Employee Code</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g., PS-23101" />
              </FormControl>
              <FormDescription>
                Unique identifier for this teacher
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Join Date */}
        <FormField
          control={control}
          name="joinDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Join Date</FormLabel>
              <FormControl>
                <Input 
                  type="date" 
                  {...field} 
                />
              </FormControl>
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
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {branches.map((branch: any) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                The branch this teacher is assigned to
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Phone */}
        <FormField
          control={control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Phone Number" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Alternate Phone */}
        <FormField
          control={control}
          name="alternatePhone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Alternate Phone</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Alternate Phone" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Personal Email */}
        <FormField
          control={control}
          name="personalEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Personal Email</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Personal Email" type="email" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <h3 className="text-xl font-medium text-[#00501B] mt-8">Emergency Contact</h3>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Emergency Contact Name */}
        <FormField
          control={control}
          name="emergencyContactName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Emergency Contact Name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Emergency Contact Name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Emergency Contact Phone */}
        <FormField
          control={control}
          name="emergencyContactPhone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Emergency Contact Phone</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Emergency Contact Phone" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Emergency Contact Relation */}
        <FormField
          control={control}
          name="emergencyContactRelation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Relationship</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g., Spouse, Parent" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <h3 className="text-xl font-medium text-[#00501B] mt-8">Address Information</h3>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Address */}
        <FormField
          control={control}
          name="address"
          render={({ field }) => (
            <FormItem className="col-span-full">
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Address" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* City */}
        <FormField
          control={control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel>City</FormLabel>
              <FormControl>
                <Input {...field} placeholder="City" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* State */}
        <FormField
          control={control}
          name="state"
          render={({ field }) => (
            <FormItem>
              <FormLabel>State</FormLabel>
              <FormControl>
                <Input {...field} placeholder="State" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Country */}
        <FormField
          control={control}
          name="country"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Country</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Country" defaultValue="India" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* PIN Code */}
        <FormField
          control={control}
          name="pincode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>PIN Code</FormLabel>
              <FormControl>
                <Input {...field} placeholder="PIN Code" />
              </FormControl>
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