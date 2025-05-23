import { useEffect } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage
} from "@/components/ui/form";
import type { StudentFormValues } from "../enhanced-student-form";
import { MultiSelect } from "@/components/ui/multi-select";
import { Combobox } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";

// Blood group options
const bloodGroups = [
  "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"
];

// Subject options (example)
const subjectOptions = [
  { label: "Mathematics", value: "mathematics" },
  { label: "Science", value: "science" },
  { label: "English", value: "english" },
  { label: "Hindi", value: "hindi" },
  { label: "Social Studies", value: "social_studies" },
  { label: "Computer Science", value: "computer_science" },
  { label: "Physical Education", value: "physical_education" },
  { label: "Art", value: "art" },
  { label: "Music", value: "music" },
];

interface StudentInfoTabProps {
  branch: any;
  classes: any[];
  generateSchoolEmail: (admissionNumber: string, branchId: string) => string;
}

export function StudentInfoTab({ branch, classes, generateSchoolEmail }: StudentInfoTabProps) {
  const { control, watch, setValue } = useFormContext<StudentFormValues>();

  const admissionNumber = watch("admissionNumber");
  const gender = watch("gender");

  // Update school email when admission number changes
  useEffect(() => {
    if (branch?.id && admissionNumber) {
      const email = generateSchoolEmail(admissionNumber, branch.id);
      setValue("schoolEmail", email);
      setValue("username", email);
    }
  }, [admissionNumber, branch?.id, generateSchoolEmail, setValue]);

  // Function to check if student age is appropriate for class
  const validateAgeForClass = (dateOfBirth: string, classId: string) => {
    if (!dateOfBirth || !classId) return true;

    const selectedClass = classes.find(c => c.id === classId);
    if (!selectedClass) return true;

    const dob = new Date(dateOfBirth);
    const today = new Date();
    const referenceDate = new Date(today.getFullYear(), 3, 1); // April 1st of current year

    let age = referenceDate.getFullYear() - dob.getFullYear();

    // Adjust age if birthday hasn't occurred yet this year
    if (
      referenceDate.getMonth() < dob.getMonth() ||
      (referenceDate.getMonth() === dob.getMonth() && referenceDate.getDate() < dob.getDate())
    ) {
      age--;
    }

    // Example age validation logic (adjust based on your requirements)
    const className = selectedClass.name.toLowerCase();
    if (className.includes("1st") && age < 6) return false;
    if (className.includes("2nd") && age < 7) return false;
    // Add more class-specific age validations as needed

    return true;
  };

  return (
    <div className="space-y-6 p-6">
      <h3 className="text-xl font-medium text-[#00501B]">Student Information</h3>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Admission Number */}
        <FormField
          control={control}
          name="admissionNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center">
                Admission Number <span className="text-red-500 ml-1">*</span>
              </FormLabel>
              <FormControl>
                <Input {...field} placeholder="Admission Number" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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

        {/* Class */}
        <FormField
          control={control}
          name="classId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center">
                Enrollment Class <span className="text-red-500 ml-1">*</span>
              </FormLabel>
              <FormControl>
                <Combobox
                  options={classes.map((cls) => ({
                    value: cls.id,
                    label: `${cls.name} - ${cls.section}`
                  }))}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Select Class"
                  emptyMessage="No classes found."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Date of Birth */}
        <FormField
          control={control}
          name="dateOfBirth"
          render={({ field: { value, onChange } }) => (
            <FormItem>
              <FormLabel className="flex items-center">
                Date of Birth <span className="text-red-500 ml-1">*</span>
              </FormLabel>
              <FormControl>
                <DatePicker
                  value={value ? new Date(value) : undefined}
                  onChange={(date) => {
                    const dateStr = date.toISOString().split('T')[0];
                    onChange(dateStr);
                    // Validate age for selected class
                    const classId = watch("classId");
                    if (classId && dateStr && !validateAgeForClass(dateStr, classId)) {
                      // Show warning or set error
                    }
                  }}
                  placeholder="Select date of birth"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Date of Admission */}
        <FormField
          control={control}
          name="dateOfAdmission"
          render={({ field: { value, onChange } }) => (
            <FormItem>
              <FormLabel className="flex items-center">
                Date of Admission <span className="text-red-500 ml-1">*</span>
              </FormLabel>
              <FormControl>
                <DatePicker
                  value={value ? new Date(value) : undefined}
                  onChange={(date) => {
                    const dateStr = date.toISOString().split('T')[0];
                    onChange(dateStr);
                    
                    // Also update the joining date if it's not set or is before admission date
                    const joiningDateStr = watch("dateOfJoining");
                    if (!joiningDateStr || joiningDateStr === "" || new Date(joiningDateStr) < date) {
                      setValue("dateOfJoining", dateStr!);
                    }
                  }}
                  placeholder="Select date of admission"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Date of Joining */}
        <FormField
          control={control}
          name="dateOfJoining"
          render={({ field: { value, onChange } }) => (
            <FormItem>
              <FormLabel className="flex items-center">
                Date of Joining <span className="text-red-500 ml-1">*</span>
              </FormLabel>
              <FormControl>
                <DatePicker
                  value={value ? new Date(value) : undefined}
                  onChange={(date) => {
                    const dateStr = date.toISOString().split('T')[0];
                    onChange(dateStr);
                  }}
                  placeholder="Select date of joining"
                />
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
                  options={bloodGroups.map((group) => ({
                    value: group,
                    label: group
                  }))}
                  value={field.value || ""}
                  onChange={field.onChange}
                  placeholder="Select Blood Group"
                  emptyMessage="No blood groups found."
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
            <FormItem>
              <FormLabel className="flex items-center">
                Gender <span className="text-red-500 ml-1">*</span>
              </FormLabel>
              <FormControl>
                <Combobox
                  options={[
                    { value: "Male", label: "Male" },
                    { value: "Female", label: "Female" },
                    { value: "Other", label: "Other (Specify)" }
                  ]}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Select Gender"
                  emptyMessage="No options found."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Other Gender (conditional) */}
        {gender === "Other" && (
          <FormField
            control={control}
            name="otherGender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Specify Gender</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Specify Gender" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* School Email */}
        <FormField
          control={control}
          name="schoolEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>School Email</FormLabel>
              <FormControl>
                <Input {...field} placeholder="School Email" readOnly />
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

        {/* Phone Number */}
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

        {/* Caste */}
        <FormField
          control={control}
          name="caste"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Caste</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Caste" />
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

        {/* Nationality */}
        <FormField
          control={control}
          name="nationality"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nationality</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Nationality" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Aadhar Number */}
        <FormField
          control={control}
          name="aadharNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Aadhar Number</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Aadhar Number" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* UDISE ID */}
        <FormField
          control={control}
          name="udiseId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>UDISE ID</FormLabel>
              <FormControl>
                <Input {...field} placeholder="UDISE ID" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* CBSE-10 Roll Number */}
        <FormField
          control={control}
          name="cbse10RollNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CBSE-10 Roll Number</FormLabel>
              <FormControl>
                <Input {...field} placeholder="CBSE-10 Roll Number" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* CBSE-12 Roll Number */}
        <FormField
          control={control}
          name="cbse12RollNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CBSE-12 Roll Number</FormLabel>
              <FormControl>
                <Input {...field} placeholder="CBSE-12 Roll Number" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Username */}
        <FormField
          control={control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Username" readOnly />
              </FormControl>
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
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Password" type="password" readOnly />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Subjects (Multi-select) */}
      <div className="mt-6">
        <FormField
          control={control}
          name="subjects"
          render={() => (
            <FormItem>
              <FormLabel>Subjects</FormLabel>
              <FormControl>
                <Controller
                  name="subjects"
                  control={control}
                  render={({ field }) => (
                    <MultiSelect
                      options={subjectOptions}
                      selected={field.value || []}
                      onValueChange={field.onChange}
                      placeholder="Select subjects"
                    />
                  )}
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
