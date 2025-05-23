import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import type { EmployeeFormValues } from "@/server/api/employee-types";

export function ContactInfoTab() {
  const { control, watch, setValue } = useFormContext<EmployeeFormValues>();
  const [sameAsCurrent, setSameAsCurrent] = useState(false);
  
  // Function to copy current address to permanent address
  const handleSameAddressChange = (checked: boolean) => {
    setSameAsCurrent(checked);
    if (checked) {
      const currentAddress = watch("address");
      const currentCity = watch("city");
      const currentState = watch("state");
      const currentCountry = watch("country");
      const currentPincode = watch("pincode");
      
      setValue("permanentAddress", currentAddress);
      setValue("permanentCity", currentCity);
      setValue("permanentState", currentState);
      setValue("permanentCountry", currentCountry);
      setValue("permanentPincode", currentPincode);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <h3 className="text-xl font-medium text-[#00501B]">Current Address</h3>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Address */}
        <FormField
          control={control}
          name="address"
          render={({ field }) => (
            <FormItem className="col-span-full">
              <FormLabel>Current Address</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Current Address" />
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

      {/* Checkbox for same as current address */}
      <div className="flex items-center space-x-2 my-4">
        <Checkbox 
          id="same-address" 
          checked={sameAsCurrent}
          onCheckedChange={handleSameAddressChange}
        />
        <label
          htmlFor="same-address"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Permanent address same as current address
        </label>
      </div>

      <h3 className="text-xl font-medium text-[#00501B] mt-8">Permanent Address</h3>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Permanent Address */}
        <FormField
          control={control}
          name="permanentAddress"
          render={({ field }) => (
            <FormItem className="col-span-full">
              <FormLabel>Permanent Address</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Permanent Address" disabled={sameAsCurrent} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Permanent City */}
        <FormField
          control={control}
          name="permanentCity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>City</FormLabel>
              <FormControl>
                <Input {...field} placeholder="City" disabled={sameAsCurrent} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Permanent State */}
        <FormField
          control={control}
          name="permanentState"
          render={({ field }) => (
            <FormItem>
              <FormLabel>State</FormLabel>
              <FormControl>
                <Input {...field} placeholder="State" disabled={sameAsCurrent} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Permanent Country */}
        <FormField
          control={control}
          name="permanentCountry"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Country</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Country" defaultValue="India" disabled={sameAsCurrent} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Permanent PIN Code */}
        <FormField
          control={control}
          name="permanentPincode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>PIN Code</FormLabel>
              <FormControl>
                <Input {...field} placeholder="PIN Code" disabled={sameAsCurrent} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <h3 className="text-xl font-medium text-[#00501B] mt-8">Contact Details</h3>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
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
                <Input {...field} placeholder="Relationship" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
} 