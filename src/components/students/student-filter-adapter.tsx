"use client";

import * as React from "react";
import { useEffect, useState, useRef } from "react";
import { nanoid } from "nanoid";
import { 
  FilterType, 
  FilterOperator 
} from "@/components/ui/filters";
import type { Filter } from "@/components/ui/filters";
import Filters from "@/components/ui/filters";
import type { AdvancedFilters } from "@/components/students/student-advanced-filters";
import { Button } from "@/components/ui/button";
import { ListFilter, User, Calendar, School, Users, Mail, Phone } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { AnimateChangeInHeight } from "@/components/ui/filters";
import { cn } from "@/lib/utils";
import { 
  DueDate
} from "@/components/ui/filters";
import type { FilterOption } from "@/components/ui/filters";
import { api } from "@/utils/api";

// Define our own StudentFilterOption type that's compatible with our use case
interface StudentFilterOption {
  name: StudentFilterType | string;
  icon: React.ReactNode;
  label?: string;
}

// Custom filter types specific to students
export enum StudentFilterType {
  STATUS = "Status",
  CLASS = "Class",
  GENDER = "Gender",
  DATE_OF_BIRTH = "Date of Birth",
  JOIN_DATE = "Join Date",
  EMAIL = "Email",
  PHONE = "Phone",
  NAME = "Name",
}

// Student-specific filter options
const studentFilterViewOptions: StudentFilterOption[][] = [
  [
    {
      name: StudentFilterType.STATUS,
      icon: <Users className="size-3.5" />,
    },
    {
      name: StudentFilterType.CLASS,
      icon: <School className="size-3.5" />,
    },
    {
      name: StudentFilterType.GENDER,
      icon: <User className="size-3.5" />,
    },
    {
      name: StudentFilterType.NAME,
      icon: <User className="size-3.5" />,
    },
  ],
  [
    {
      name: StudentFilterType.DATE_OF_BIRTH,
      icon: <Calendar className="size-3.5" />,
    },
    {
      name: StudentFilterType.JOIN_DATE,
      icon: <Calendar className="size-3.5" />,
    },
    {
      name: StudentFilterType.EMAIL,
      icon: <Mail className="size-3.5" />,
    },
    {
      name: StudentFilterType.PHONE,
      icon: <Phone className="size-3.5" />,
    },
  ],
];

// Status options
const statusOptions: StudentFilterOption[] = [
  {
    name: "Active",
    icon: <Users className="size-3.5 text-green-500" />,
  },
  {
    name: "Inactive",
    icon: <Users className="size-3.5 text-gray-500" />,
  },
];

// Gender options
const genderOptions: StudentFilterOption[] = [
  {
    name: "Male",
    icon: <User className="size-3.5 text-blue-500" />,
  },
  {
    name: "Female",
    icon: <User className="size-3.5 text-pink-500" />,
  },
  {
    name: "Other",
    icon: <User className="size-3.5 text-purple-500" />,
  },
];

// Date options remain the same as before
const dateOptions: StudentFilterOption[] = Object.values(DueDate).map(
  (date) => ({
    name: date,
    icon: undefined,
  })
);

// Map student filter types to their options
const studentFilterToOptions: Record<string, StudentFilterOption[]> = {
  [StudentFilterType.STATUS]: statusOptions,
  [StudentFilterType.GENDER]: genderOptions,
  [StudentFilterType.DATE_OF_BIRTH]: dateOptions,
  [StudentFilterType.JOIN_DATE]: dateOptions,
  // For other fields, we'll need to fetch from API or use placeholders
  [StudentFilterType.CLASS]: [],
  [StudentFilterType.EMAIL]: [],
  [StudentFilterType.PHONE]: [],
  [StudentFilterType.NAME]: [],
};

// Map our new filter system to the existing student filters
export const useStudentFilterAdapter = (
  filters: AdvancedFilters,
  onFilterChange: (filters: AdvancedFilters) => void
) => {
  const [uiFilters, setUiFilters] = useState<Filter[]>([]);
  // Change to use sections API since students belong to sections
  const { data: sectionsData } = api.section.getAll.useQuery({
    includeClass: true,
    isActive: true,
  });

  // Update section options when data is available
  useEffect(() => {
    if (sectionsData?.length) {
      studentFilterToOptions[StudentFilterType.CLASS] = sectionsData.map(section => ({
        name: `${section.class.name} - ${section.name}`,
        icon: <School className="size-3.5" />,
        label: section.id // Use section ID since students belong to sections
      }));
    }
  }, [sectionsData]);

  // When advanced filters change, update the UI filters
  useEffect(() => {
    const newFilters: Filter[] = [];
    
    // Convert existing active/inactive filter to Status filter
    const activeFilter = filters.conditions.find(condition => condition.field === "isActive");
    if (activeFilter) {
      newFilters.push({
        id: activeFilter.id,
        type: StudentFilterType.STATUS as any,
        operator: activeFilter.value === true ? FilterOperator.IS : FilterOperator.IS_NOT,
        value: [activeFilter.value === true ? "Active" : "Inactive"]
      });
    }
    
    // Convert other filters
    filters.conditions.forEach(condition => {
      if (condition.field === "isActive") return; // Already handled above
      
      // Change from classId to sectionId since students belong to sections
      if (condition.field === "sectionId" || condition.field === "classId") {
        const sectionInfo = sectionsData?.find(s => s.id === condition.value);
        newFilters.push({
          id: condition.id,
          type: StudentFilterType.CLASS as any,
          operator: condition.operator === "equals" ? FilterOperator.IS : FilterOperator.IS_NOT,
          value: [sectionInfo ? `${sectionInfo.class.name} - ${sectionInfo.name}` : condition.value as string]
        });
      }
      
      if (condition.field === "gender") {
        newFilters.push({
          id: condition.id,
          type: StudentFilterType.GENDER as any,
          operator: condition.operator === "equals" ? FilterOperator.IS : FilterOperator.IS_NOT,
          value: [condition.value as string]
        });
      }
      
      if (condition.field === "dateOfBirth") {
        newFilters.push({
          id: condition.id,
          type: StudentFilterType.DATE_OF_BIRTH as any,
          operator: condition.operator === "greater_than" ? FilterOperator.AFTER : FilterOperator.BEFORE,
          value: [condition.value as string]
        });
      }

      if (condition.field === "joinDate") {
        newFilters.push({
          id: condition.id,
          type: StudentFilterType.JOIN_DATE as any,
          operator: condition.operator === "greater_than" ? FilterOperator.AFTER : FilterOperator.BEFORE,
          value: [condition.value as string]
        });
      }

      if (condition.field === "email") {
        newFilters.push({
          id: condition.id,
          type: StudentFilterType.EMAIL as any,
          operator: condition.operator === "contains" ? FilterOperator.INCLUDE : FilterOperator.DO_NOT_INCLUDE,
          value: [condition.value as string]
        });
      }

      if (condition.field === "phone") {
        newFilters.push({
          id: condition.id,
          type: StudentFilterType.PHONE as any,
          operator: condition.operator === "contains" ? FilterOperator.INCLUDE : FilterOperator.DO_NOT_INCLUDE,
          value: [condition.value as string]
        });
      }

      if (condition.field === "firstName" || condition.field === "lastName") {
        newFilters.push({
          id: condition.id,
          type: StudentFilterType.NAME as any,
          operator: condition.operator === "contains" ? FilterOperator.INCLUDE : FilterOperator.DO_NOT_INCLUDE,
          value: [condition.value as string]
        });
      }
    });
    
    setUiFilters(newFilters);
  }, [filters, sectionsData]);

  // When UI filters change, convert them back to advanced filters
  const handleUiFilterChange = (newFilters: Filter[]) => {
    const conditions = newFilters.map(filter => {
      let field: string;
      let operator: string;
      let value: string | boolean | number;
      
      // Status filter (active/inactive)
      if ((filter.type as any) === StudentFilterType.STATUS) {
        field = "isActive";
        operator = "equals";
        value = filter.value[0] === "Active";
      }
      // Section filter (changed from class filter)
      else if ((filter.type as any) === StudentFilterType.CLASS) {
        field = "sectionId"; // Use sectionId since students belong to sections
        operator = filter.operator === FilterOperator.IS ? "equals" : "not_equals";
        // Find section ID from label or name
        const sectionOption = studentFilterToOptions[StudentFilterType.CLASS]?.find(
          s => s.name === filter.value[0]
        );
        value = sectionOption?.label ?? filter.value[0] ?? "";
      }
      // Gender filter
      else if ((filter.type as any) === StudentFilterType.GENDER) {
        field = "gender";
        operator = filter.operator === FilterOperator.IS ? "equals" : "not_equals";
        value = filter.value[0] ?? "";
      }
      // Date of Birth filter
      else if ((filter.type as any) === StudentFilterType.DATE_OF_BIRTH) {
        field = "dateOfBirth";
        operator = filter.operator === FilterOperator.AFTER ? "greater_than" : "less_than";
        value = filter.value[0] ?? "";
      }
      // Join Date filter
      else if ((filter.type as any) === StudentFilterType.JOIN_DATE) {
        field = "joinDate";
        operator = filter.operator === FilterOperator.AFTER ? "greater_than" : "less_than";
        value = filter.value[0] ?? "";
      }
      // Email filter
      else if ((filter.type as any) === StudentFilterType.EMAIL) {
        field = "email";
        operator = filter.operator === FilterOperator.INCLUDE ? "contains" : "not_contains";
        value = filter.value[0] ?? "";
      }
      // Phone filter
      else if ((filter.type as any) === StudentFilterType.PHONE) {
        field = "phone";
        operator = filter.operator === FilterOperator.INCLUDE ? "contains" : "not_contains";
        value = filter.value[0] ?? "";
      }
      // Name filter - default to firstName
      else if ((filter.type as any) === StudentFilterType.NAME) {
        field = "firstName";
        operator = filter.operator === FilterOperator.INCLUDE ? "contains" : "not_contains";
        value = filter.value[0] ?? "";
      }
      else {
        // Default fallback
        field = "firstName";
        operator = "contains";
        value = filter.value[0] ?? "";
      }
      
      return {
        id: filter.id,
        field,
        operator,
        value
      };
    });
    
    // If no active filter is present, add the default one
    if (!conditions.some(c => c.field === "isActive")) {
      conditions.push({
        id: "default-active-filter",
        field: "isActive",
        operator: "equals",
        value: true
      });
    }
    
    onFilterChange({
      conditions: conditions as any,
      logicOperator: "and"
    });
  };
  
  return {
    uiFilters,
    setUiFilters: handleUiFilterChange
  };
};

interface StudentFilterProps {
  filters: AdvancedFilters;
  onFilterChange: (filters: AdvancedFilters) => void;
}

export function StudentFilter({ filters, onFilterChange }: StudentFilterProps) {
  const { uiFilters, setUiFilters } = useStudentFilterAdapter(filters, onFilterChange);
  
  const [open, setOpen] = useState(false);
  const [selectedView, setSelectedView] = useState<StudentFilterType | null>(null);
  const [commandInput, setCommandInput] = useState("");
  const commandInputRef = useRef<HTMLInputElement>(null);
  
  return (
    <div className="flex gap-2 flex-wrap">
      <Filters filters={uiFilters} setFilters={(value) => {
        if (typeof value === 'function') {
          // Handle functional update
          const updater = value as (prev: Filter[]) => Filter[];
          setUiFilters(updater(uiFilters));
        } else {
          // Handle direct value update
          setUiFilters(value);
        }
      }} />
      {uiFilters.filter((filter) => filter.value?.length > 0).length > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="transition group h-6 text-xs items-center rounded-sm"
          onClick={() => {
            // Reset to default (only active students)
            setUiFilters([{
              id: "default-active-filter",
              type: StudentFilterType.STATUS as any,
              operator: FilterOperator.IS,
              value: ["Active"]
            }]);
          }}
        >
          Clear
        </Button>
      )}
      <Popover
        open={open}
        onOpenChange={(open) => {
          setOpen(open);
          if (!open) {
            setTimeout(() => {
              setSelectedView(null);
              setCommandInput("");
            }, 200);
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            role="combobox"
            aria-expanded={open}
            size="sm"
            className={cn(
              "transition group h-6 text-xs rounded-sm flex gap-1.5 items-center",
              uiFilters.length > 0 && "w-6"
            )}
          >
            <ListFilter className="size-3 shrink-0 transition-all text-muted-foreground group-hover:text-primary" />
            {!uiFilters.length && "Filter"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <AnimateChangeInHeight>
            <Command>
              <CommandInput
                placeholder={selectedView ? selectedView : "Filter..."}
                className="h-9"
                value={commandInput}
                onInputCapture={(e) => {
                  setCommandInput(e.currentTarget.value);
                }}
                ref={commandInputRef}
              />
              <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                {selectedView ? (
                  <CommandGroup>
                    {studentFilterToOptions[selectedView]?.map(
                      (filter: StudentFilterOption) => (
                        <CommandItem
                          className="group text-muted-foreground flex gap-2 items-center"
                          key={filter.name}
                          value={filter.name}
                          onSelect={(currentValue) => {
                            setUiFilters([
                              ...uiFilters,
                              {
                                id: nanoid(),
                                type: selectedView as any,
                                operator:
                                  (selectedView === StudentFilterType.DATE_OF_BIRTH || 
                                   selectedView === StudentFilterType.JOIN_DATE) &&
                                  currentValue !== DueDate.IN_THE_PAST
                                    ? FilterOperator.BEFORE
                                    : FilterOperator.IS,
                                value: [currentValue],
                              },
                            ]);
                            setTimeout(() => {
                              setSelectedView(null);
                              setCommandInput("");
                            }, 200);
                            setOpen(false);
                          }}
                        >
                          {filter.icon}
                          <span className="text-accent-foreground">
                            {filter.name}
                          </span>
                          {filter.label && (
                            <span className="text-muted-foreground text-xs ml-auto">
                              {filter.label}
                            </span>
                          )}
                        </CommandItem>
                      )
                    )}
                  </CommandGroup>
                ) : (
                  studentFilterViewOptions.map(
                    (group: StudentFilterOption[], index: number) => (
                      <React.Fragment key={index}>
                        <CommandGroup>
                          {group.map((filter: StudentFilterOption) => (
                            <CommandItem
                              className="group text-muted-foreground flex gap-2 items-center"
                              key={filter.name}
                              value={filter.name}
                              onSelect={(currentValue) => {
                                setSelectedView(currentValue as StudentFilterType);
                                setCommandInput("");
                                commandInputRef.current?.focus();
                              }}
                            >
                              {filter.icon}
                              <span className="text-accent-foreground">
                                {filter.name}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        {index < studentFilterViewOptions.length - 1 && (
                          <CommandSeparator />
                        )}
                      </React.Fragment>
                    )
                  )
                )}
              </CommandList>
            </Command>
          </AnimateChangeInHeight>
        </PopoverContent>
      </Popover>
    </div>
  );
} 