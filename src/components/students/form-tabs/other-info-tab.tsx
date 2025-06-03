import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import type { StudentFormValues } from "../enhanced-student-form";

// Medium of instruction options
const mediumOptions = ["English", "Hindi", "Punjabi", "Urdu", "Other"];

// Indian states for school location
const indianStates = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal", "Delhi", "Jammu and Kashmir", "Ladakh", "Puducherry",
  "Chandigarh"
];

export function OtherInfoTab() {
  const { control } = useFormContext<StudentFormValues>();

  return (
    <div className="space-y-6 p-6">
      <h3 className="text-xl font-medium text-[#00501B]">Previous School Information</h3>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Name of Previous School */}
        <FormField
          control={control}
          name="previousSchool"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name of Previous School</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ""} placeholder="Name of Previous School" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Last Class Attended */}
        <FormField
          control={control}
          name="lastClassAttended"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Last Class Attended</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ""} placeholder="Last Class Attended" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Medium of Instruction */}
        <FormField
          control={control}
          name="mediumOfInstruction"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Medium of Instruction</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ""} placeholder="Medium of Instruction" list="medium-list" />
              </FormControl>
              <datalist id="medium-list">
                {mediumOptions.map(option => (
                  <option key={option} value={option} />
                ))}
              </datalist>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Recognised by State Board */}
        <FormField
          control={control}
          name="recognisedByStateBoard"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Recognised by State Board</FormLabel>
                <FormDescription>
                  Check if the previous school was recognised by a state board
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        {/* School City */}
        <FormField
          control={control}
          name="schoolCity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>School City</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ""} placeholder="School City" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* School State */}
        <FormField
          control={control}
          name="schoolState"
          render={({ field }) => (
            <FormItem>
              <FormLabel>School State</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ""} placeholder="School State" list="school-states-list" />
              </FormControl>
              <datalist id="school-states-list">
                {indianStates.map(state => (
                  <option key={state} value={state} />
                ))}
              </datalist>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Reason for Leaving */}
        <div className="md:col-span-2">
          <FormField
            control={control}
            name="reasonForLeaving"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reason for Leaving</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ""} placeholder="Reason for Leaving" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );
}
