import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage
} from "@/components/ui/form";
import type { StudentFormValues } from "../enhanced-student-form";

// Education options
const educationOptions = [
  "Primary", "Secondary", "Higher Secondary", "Diploma", "Bachelor's",
  "Master's", "Doctorate", "Professional Degree", "Other"
];

export function ParentInfoTab() {
  const { control } = useFormContext<StudentFormValues>();

  return (
    <div className="space-y-6 p-6">
      <h3 className="text-xl font-medium text-[#00501B]">Parent's Information</h3>

      <div className="space-y-8">
        {/* Father's Information */}
        <div className="space-y-4">
          <h4 className="font-medium border-b pb-2">Father's Information</h4>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Father's Name */}
            <FormField
              control={control}
              name="fatherName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Father's Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Father's Name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Father's Date of Birth */}
            <FormField
              control={control}
              name="fatherDob"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Birth</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Father's Education */}
            <FormField
              control={control}
              name="fatherEducation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Education</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Education" list="education-list" />
                  </FormControl>
                  <datalist id="education-list">
                    {educationOptions.map(option => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Father's Occupation */}
            <FormField
              control={control}
              name="fatherOccupation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Occupation</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Occupation" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Father's Mobile */}
            <FormField
              control={control}
              name="fatherMobile"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mobile Number</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Mobile Number" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Father's Email */}
            <FormField
              control={control}
              name="fatherEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Email" type="email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Mother's Information */}
        <div className="space-y-4">
          <h4 className="font-medium border-b pb-2">Mother's Information</h4>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Mother's Name */}
            <FormField
              control={control}
              name="motherName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mother's Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Mother's Name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Mother's Date of Birth */}
            <FormField
              control={control}
              name="motherDob"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Birth</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Mother's Education */}
            <FormField
              control={control}
              name="motherEducation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Education</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Education" list="education-list" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Mother's Occupation */}
            <FormField
              control={control}
              name="motherOccupation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Occupation</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Occupation" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Mother's Mobile */}
            <FormField
              control={control}
              name="motherMobile"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mobile Number</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Mobile Number" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Mother's Email */}
            <FormField
              control={control}
              name="motherEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Email" type="email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Guardian's Information */}
        <div className="space-y-4">
          <h4 className="font-medium border-b pb-2">Guardian's Information (If different from parents)</h4>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Guardian's Name */}
            <FormField
              control={control}
              name="guardianName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Guardian's Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Guardian's Name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Guardian's Date of Birth */}
            <FormField
              control={control}
              name="guardianDob"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Birth</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Guardian's Education */}
            <FormField
              control={control}
              name="guardianEducation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Education</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Education" list="education-list" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Guardian's Occupation */}
            <FormField
              control={control}
              name="guardianOccupation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Occupation</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Occupation" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Guardian's Mobile */}
            <FormField
              control={control}
              name="guardianMobile"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mobile Number</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Mobile Number" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Guardian's Email */}
            <FormField
              control={control}
              name="guardianEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Email" type="email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Additional Parent Information */}
        <div className="space-y-4">
          <h4 className="font-medium border-b pb-2">Additional Information</h4>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Parent Anniversary */}
            <FormField
              control={control}
              name="parentAnniversary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parent Anniversary</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Monthly Income */}
            <FormField
              control={control}
              name="monthlyIncome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monthly Income</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Monthly Income" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Parent Username */}
            <FormField
              control={control}
              name="parentUsername"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parent Username</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Parent Username" readOnly />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Parent Password */}
            <FormField
              control={control}
              name="parentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parent Password</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Parent Password" type="password" readOnly />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
