import { useState } from "react";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { BranchSelect } from "@/components/common/branch-select";
import { type Control } from "react-hook-form";

interface BranchSelectFieldProps {
  control: Control<any>;
  name: string;
  label?: string;
  placeholder?: string;
  description?: string;
  disabled?: boolean;
  required?: boolean;
}

export function BranchSelectField({
  control,
  name,
  label = "Branch",
  placeholder = "Select branch",
  description,
  disabled = false,
  required = false,
}: BranchSelectFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </FormLabel>
          <FormControl>
            <BranchSelect
              value={field.value}
              onChange={field.onChange}
              placeholder={placeholder}
              disabled={disabled}
            />
          </FormControl>
          {description && (
            <p className="text-sm text-gray-500">{description}</p>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
