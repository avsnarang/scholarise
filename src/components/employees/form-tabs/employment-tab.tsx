import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { EmployeeFormValues } from "@/server/api/employee-types";
import { api } from "@/utils/api";
import { DatePicker } from "@/components/ui/date-picker";
import { Combobox } from "@/components/ui/combobox";

// Employment type options
const employeeTypes = ["Full-Time", "Part-Time", "Contractual", "Visiting Faculty"];

// Asset return status options
const assetReturnStatusOptions = [
  "Not Applicable",
  "Issued",
  "Partially Returned",
  "Fully Returned",
];

export function EmploymentTab() {
  const { control } = useFormContext<EmployeeFormValues>();
  
  // Fetch departments and designations from the database
  const { data: departmentData } = api.department.getAll.useQuery();
  const { data: designationData } = api.designation.getAll.useQuery();
  
  // Fetch teachers and employees to use as reporting managers
  const { data: teachersData } = api.teacher.getAll.useQuery({
    limit: 100,
    isActive: true,
  });
  const { data: employeesData } = api.employee.getAll.useQuery({
    limit: 100,
    isActive: true,
  });
  
  // Extract departments and designations from the response
  const departments = departmentData?.items || [];
  const designations = designationData?.items || [];
  
  // Prepare list of potential reporting managers (teachers + employees)
  const potentialManagers = [
    ...(teachersData?.items || []).map(teacher => ({
      id: teacher.id,
      name: `${teacher.firstName} ${teacher.lastName}${teacher.employeeCode ? ` (${teacher.employeeCode})` : ''}`,
      type: 'Teacher'
    })),
    ...(employeesData?.items || []).map(employee => ({
      id: employee.id,
      name: `${employee.firstName} ${employee.lastName}`,
      type: 'Employee'
    }))
  ].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6 p-6">
      <h3 className="text-xl font-medium text-[#00501B] dark:text-[#7AAD8B]">
        Employment Details
      </h3>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Employee Code */}
        <FormField
          control={control}
          name="employeeCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Employee Code</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g., EMP-2023-001" />
              </FormControl>
              <FormDescription>
                Unique identifier for this employee
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Date of Joining */}
        <FormField
          control={control}
          name="joinDate"
          render={({ field: { value, onChange, ...rest } }) => (
            <FormItem>
              <FormLabel>Date of Joining</FormLabel>
              <FormControl>
                <DatePicker
                  value={value ? new Date(value) : undefined}
                  onChange={(date) => {
                    const dateStr = date?.toISOString().split("T")[0];
                    onChange(dateStr);
                  }}
                  placeholder="Select date of joining"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Designation */}
        <FormField
          control={control}
          name="designation"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center">
                Designation <span className="ml-1 text-red-500">*</span>
              </FormLabel>
              <FormControl>
                {designations.length > 0 ? (
                  <Combobox
                    options={designations.map((designation) => ({
                      value: designation.title,
                      label: designation.title,
                    }))}
                    value={field.value || ""}
                    onChange={field.onChange}
                    placeholder="Select designation"
                    emptyMessage="No designations found."
                  />
                ) : (
                  <Combobox
                    options={[
                      { value: "Manager", label: "Manager" },
                      { value: "Supervisor", label: "Supervisor" },
                      { value: "Administrator", label: "Administrator" },
                      { value: "Support Staff", label: "Support Staff" },
                    ]}
                    value={field.value || ""}
                    onChange={field.onChange}
                    placeholder="Select designation"
                    emptyMessage="No designations found."
                  />
                )}
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Department */}
        <FormField
          control={control}
          name="department"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Department</FormLabel>
              <FormControl>
                {departments.length > 0 ? (
                  <Combobox
                    options={departments.map((department) => ({
                      value: department.name,
                      label: department.name,
                    }))}
                    value={field.value || ""}
                    onChange={field.onChange}
                    placeholder="Select department"
                    emptyMessage="No departments found."
                  />
                ) : (
                  <Combobox
                    options={[
                      { value: "Academic", label: "Academic" },
                      { value: "Non-Academic", label: "Non-Academic" },
                      { value: "Admin", label: "Admin" },
                      { value: "Support", label: "Support" },
                    ]}
                    value={field.value || ""}
                    onChange={field.onChange}
                    placeholder="Select department"
                    emptyMessage="No departments found."
                  />
                )}
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Reporting Manager */}
        <FormField
          control={control}
          name="reportingManager"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reporting Manager</FormLabel>
              <FormControl>
                {potentialManagers.length > 0 ? (
                  <Combobox
                    options={potentialManagers.map((manager) => ({
                      value: manager.name,
                      label: manager.name,
                    }))}
                    value={field.value || ""}
                    onChange={field.onChange}
                    placeholder="Select reporting manager"
                    emptyMessage="No managers found."
                  />
                ) : (
                  <Input {...field} placeholder="Department Head/Principal" />
                )}
              </FormControl>
              <FormDescription>
                Person to whom this employee reports
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Employee Type */}
        <FormField
          control={control}
          name="employeeType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Employee Type</FormLabel>
              <FormControl>
                <Combobox
                  options={employeeTypes.map((type) => ({
                    value: type,
                    label: type,
                  }))}
                  value={field.value || ""}
                  onChange={field.onChange}
                  placeholder="Select employee type"
                  emptyMessage="No employee types found."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Previous Experience */}
        <FormField
          control={control}
          name="previousExperience"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Previous Experience (Years)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Total years of experience"
                  type="number"
                  min="0"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Previous Employer */}
        <FormField
          control={control}
          name="previousEmployer"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Previous Employer</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Name of previous organization" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Confirmation Date */}
        <FormField
          control={control}
          name="confirmationDate"
          render={({ field: { value, onChange, ...rest } }) => (
            <FormItem>
              <FormLabel>Confirmation Date</FormLabel>
              <FormControl>
                <DatePicker
                  value={value ? new Date(value) : undefined}
                  onChange={(date) => {
                    const dateStr = date?.toISOString().split("T")[0];
                    onChange(dateStr);
                  }}
                  placeholder="Select confirmation date"
                />
              </FormControl>
              <FormDescription>
                Post-probation confirmation date
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Salary & Banking Details */}
      <h3 className="mt-8 text-xl font-medium text-[#00501B] dark:text-[#909090]">
        Salary & Banking Details
      </h3>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <FormField
          control={control}
          name="salaryStructure"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Salary Structure</FormLabel>
              <FormControl>
                <Input {...field} placeholder="CTC, Basic, Allowances" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="pfNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>PF Number</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Provident Fund Number" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="esiNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ESI Number</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Employee State Insurance Number"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="uanNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>UAN</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Universal Account Number" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="bankName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bank Name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Name of the bank" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="accountNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account Number</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Bank account number" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="ifscCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>IFSC Code</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Bank IFSC code" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* IT & Asset Allocation */}
      <h3 className="mt-8 text-xl font-medium text-[#00501B] dark:text-[#909090]">
        IT & Asset Allocation
      </h3>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <FormField
          control={control}
          name="officialEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Official Email ID</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="email"
                  placeholder="Official email address"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="deviceIssued"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Device/System Issued</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Device details and serial numbers"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="accessCardId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Access Card/ID</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Access card or ID number" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="softwareLicenses"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Software Licenses</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Software licenses assigned" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="assetReturnStatus"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Return of Assets Status</FormLabel>
              <FormControl>
                <Combobox
                  options={assetReturnStatusOptions.map((status) => ({
                    value: status,
                    label: status,
                  }))}
                  value={field.value || ""}
                  onChange={field.onChange}
                  placeholder="Select status"
                  emptyMessage="No status options found."
                />
              </FormControl>
              <FormDescription>Status of assets at exit</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
} 