import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TeacherFormValues } from "../enhanced-teacher-form";

// Years for graduation
const graduationYears = Array.from({ length: 70 }, (_, i) => (new Date().getFullYear() - i).toString());

export function QualificationsTab() {
  const { control } = useFormContext<TeacherFormValues>();

  return (
    <div className="space-y-6 p-6">
      <h3 className="text-xl font-medium text-[#00501B]">Educational Qualifications</h3>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Highest Qualification Achieved */}
        <FormField
          control={control}
          name="qualification"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Highest Qualification Achieved</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select qualification" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="High School">High School</SelectItem>
                  <SelectItem value="Bachelors">Bachelor's Degree</SelectItem>
                  <SelectItem value="Masters">Master's Degree</SelectItem>
                  <SelectItem value="PhD">PhD</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Professional Qualifications */}
        <FormField
          control={control}
          name="professionalQualifications"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Professional Qualifications</FormLabel>
              <FormControl>
                <Input {...field} placeholder="B.Ed, M.Ed, D.El.Ed, etc." />
              </FormControl>
              <FormDescription>Teaching certifications like B.Ed, M.Ed, etc.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Special Certifications */}
        <FormField
          control={control}
          name="specialCertifications"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Special Certifications</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Montessori, Cambridge, etc." />
              </FormControl>
              <FormDescription>Montessori Training, Cambridge Certifications, etc.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Year of Completion */}
        <FormField
          control={control}
          name="yearOfCompletion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Year of Completion</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {graduationYears.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Institution/University Name */}
        <FormField
          control={control}
          name="institution"
          render={({ field }) => (
            <FormItem>
              <FormLabel>University/Institution Name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Institution Name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Specialization */}
        <FormField
          control={control}
          name="specialization"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Specialization</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g., Mathematics, Science" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Previous Experience */}
        <FormField
          control={control}
          name="experience"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Total Teaching Experience (Years)</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Years of Experience" type="number" min="0" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Bio Section */}
        <FormField
          control={control}
          name="bio"
          render={({ field }) => (
            <FormItem className="col-span-full">
              <FormLabel>Professional Bio</FormLabel>
              <FormControl>
                <Textarea 
                  {...field} 
                  placeholder="Brief professional bio" 
                  className="min-h-[120px]"
                />
              </FormControl>
              <FormDescription>A brief professional description about yourself</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* File Upload section for certificates */}
      <div className="mt-6">
        <h4 className="text-md font-medium mb-2">Upload Certificates</h4>
        <p className="text-sm text-muted-foreground mb-4">
          Upload copies of your educational certificates and degrees
        </p>
        <div className="border border-dashed border-gray-300 rounded-md p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Drag and drop your files here, or click to select files
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            (PDF, JPG, or PNG files, max 5MB each)
          </p>
          {/* File upload component will be implemented separately */}
          <button
            type="button"
            className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Select Files
          </button>
        </div>
      </div>
    </div>
  );
} 