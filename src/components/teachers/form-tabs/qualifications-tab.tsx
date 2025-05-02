import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MultiSelect } from "@/components/ui/multi-select";
import type { TeacherFormValues } from "../enhanced-teacher-form";

// Predefined options for certifications
const certificationOptions = [
  { label: "B.Ed", value: "b_ed" },
  { label: "M.Ed", value: "m_ed" },
  { label: "Ph.D in Education", value: "phd_edu" },
  { label: "CTET", value: "ctet" },
  { label: "UPTET", value: "uptet" },
  { label: "PSTET", value: "pstet" },
  { label: "Microsoft Certified Educator", value: "ms_educator" },
  { label: "Google Certified Educator", value: "google_educator" },
  { label: "Apple Teacher", value: "apple_teacher" },
  { label: "Cambridge Teaching Knowledge Test", value: "cambridge_tkt" },
];

// Subject options
const subjectOptions = [
  { label: "Mathematics", value: "mathematics" },
  { label: "Science", value: "science" },
  { label: "Physics", value: "physics" },
  { label: "Chemistry", value: "chemistry" },
  { label: "Biology", value: "biology" },
  { label: "English", value: "english" },
  { label: "Hindi", value: "hindi" },
  { label: "Social Studies", value: "social_studies" },
  { label: "History", value: "history" },
  { label: "Geography", value: "geography" },
  { label: "Computer Science", value: "computer_science" },
  { label: "Physical Education", value: "physical_education" },
  { label: "Art", value: "art" },
  { label: "Music", value: "music" },
  { label: "Environmental Science", value: "environmental_science" },
  { label: "Economics", value: "economics" },
  { label: "Business Studies", value: "business_studies" },
  { label: "Accountancy", value: "accountancy" },
  { label: "Psychology", value: "psychology" },
  { label: "Political Science", value: "political_science" },
];

export function QualificationsTab() {
  const { control } = useFormContext<TeacherFormValues>();

  return (
    <div className="space-y-6 p-6">
      <h3 className="text-xl font-medium text-[#00501B]">Professional Qualifications</h3>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Qualification */}
        <FormField
          control={control}
          name="qualification"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Highest Qualification</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g., M.Sc., B.Ed." />
              </FormControl>
              <FormDescription>
                Highest educational qualification
              </FormDescription>
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
                <Input {...field} placeholder="e.g., Mathematics" />
              </FormControl>
              <FormDescription>
                Subject specialization or expertise
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Experience */}
        <FormField
          control={control}
          name="experience"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Teaching Experience (years)</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g., 5" type="number" min="0" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Certifications */}
        <FormField
          control={control}
          name="certifications"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Certifications</FormLabel>
              <FormControl>
                <MultiSelect
                  options={certificationOptions}
                  selected={field.value || []}
                  onChange={field.onChange}
                  placeholder="Select certifications"
                />
              </FormControl>
              <FormDescription>
                Teaching certifications and credentials
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Subjects */}
        <FormField
          control={control}
          name="subjects"
          render={({ field }) => (
            <FormItem className="col-span-full">
              <FormLabel>Teaching Subjects</FormLabel>
              <FormControl>
                <MultiSelect
                  options={subjectOptions}
                  selected={field.value || []}
                  onChange={field.onChange}
                  placeholder="Select subjects"
                />
              </FormControl>
              <FormDescription>
                Subjects this teacher can teach
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Bio */}
        <FormField
          control={control}
          name="bio"
          render={({ field }) => (
            <FormItem className="col-span-full">
              <FormLabel>Professional Biography</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Brief professional biography or introduction"
                  className="min-h-[150px] resize-y"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
} 