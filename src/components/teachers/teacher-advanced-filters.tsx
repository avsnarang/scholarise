import { useState, useEffect } from "react";
import { Filter, Plus, Trash, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { api } from "@/utils/api";
import { cn } from "@/lib/utils";

// Define the filter condition type
export type FilterOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "is_empty"
  | "is_not_empty"
  | "greater_than"
  | "less_than"
  | "greater_than_or_equal"
  | "less_than_or_equal";

export type FilterFieldType =
  | "text"
  | "number"
  | "date"
  | "boolean"
  | "select"
  | "relation";

export interface FilterField {
  id: string;
  name: string;
  type: FilterFieldType;
  options?: { id: string; name: string }[];
}

export interface FilterCondition {
  id: string;
  field: string;
  operator: FilterOperator;
  value: string | boolean | number | null;
}

export interface AdvancedFilters {
  conditions: FilterCondition[];
  logicOperator: "and" | "or";
}

interface TeacherAdvancedFiltersProps {
  filters: AdvancedFilters;
  onFilterChange: (filters: AdvancedFilters) => void;
}

// Define available fields for filtering
const FILTER_FIELDS: FilterField[] = [
  { id: "firstName", name: "First Name", type: "text" },
  { id: "lastName", name: "Last Name", type: "text" },
  { id: "qualification", name: "Qualification", type: "text" },
  { id: "specialization", name: "Specialization", type: "text" },
  { id: "joinDate", name: "Join Date", type: "date" },
  { id: "isActive", name: "Status", type: "boolean" },
];

// Define operators available for each field type
const OPERATORS_BY_TYPE: Record<FilterFieldType, { id: FilterOperator; name: string }[]> = {
  text: [
    { id: "equals", name: "Equals" },
    { id: "not_equals", name: "Does not equal" },
    { id: "contains", name: "Contains" },
    { id: "not_contains", name: "Does not contain" },
    { id: "starts_with", name: "Starts with" },
    { id: "ends_with", name: "Ends with" },
    { id: "is_empty", name: "Is empty" },
    { id: "is_not_empty", name: "Is not empty" },
  ],
  number: [
    { id: "equals", name: "Equals" },
    { id: "not_equals", name: "Does not equal" },
    { id: "greater_than", name: "Greater than" },
    { id: "less_than", name: "Less than" },
    { id: "greater_than_or_equal", name: "Greater than or equal to" },
    { id: "less_than_or_equal", name: "Less than or equal to" },
    { id: "is_empty", name: "Is empty" },
    { id: "is_not_empty", name: "Is not empty" },
  ],
  date: [
    { id: "equals", name: "Equals" },
    { id: "not_equals", name: "Does not equal" },
    { id: "greater_than", name: "After" },
    { id: "less_than", name: "Before" },
    { id: "is_empty", name: "Is empty" },
    { id: "is_not_empty", name: "Is not empty" },
  ],
  boolean: [
    { id: "equals", name: "Equals" },
    { id: "not_equals", name: "Does not equal" },
  ],
  select: [
    { id: "equals", name: "Equals" },
    { id: "not_equals", name: "Does not equal" },
    { id: "is_empty", name: "Is empty" },
    { id: "is_not_empty", name: "Is not empty" },
  ],
  relation: [
    { id: "equals", name: "Equals" },
    { id: "not_equals", name: "Does not equal" },
    { id: "is_empty", name: "Is empty" },
    { id: "is_not_empty", name: "Is not empty" },
  ],
};

// Helper function to generate a unique ID
const generateId = () => Math.random().toString(36).substring(2, 9);

export function TeacherAdvancedFilters({ filters, onFilterChange }: TeacherAdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<AdvancedFilters>(filters);

  // Update local filters when parent filters change
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Get the field object by ID
  const getFieldById = (id: string) => {
    return FILTER_FIELDS.find((field) => field.id === id) || FILTER_FIELDS[0];
  };

  // Add a new filter condition
  const addCondition = () => {
    const defaultField = FILTER_FIELDS[0];
    if (!defaultField) return; // Guard clause if FILTER_FIELDS is empty
    
    const newCondition: FilterCondition = {
      id: generateId(),
      field: defaultField.id,
      operator: "equals",
      value: "",
    };

    setLocalFilters((prev) => ({
      ...prev,
      conditions: [...prev.conditions, newCondition],
    }));
  };

  // Remove a filter condition
  const removeCondition = (id: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      conditions: prev.conditions.filter((condition) => condition.id !== id),
    }));
  };

  // Update a filter condition
  const updateCondition = (id: string, updates: Partial<FilterCondition>) => {
    setLocalFilters((prev) => ({
      ...prev,
      conditions: prev.conditions.map((condition) =>
        condition.id === id ? { ...condition, ...updates } : condition
      ),
    }));
  };

  // Toggle the logic operator (AND/OR)
  const toggleLogicOperator = () => {
    setLocalFilters((prev) => ({
      ...prev,
      logicOperator: prev.logicOperator === "and" ? "or" : "and",
    }));
  };

  // Apply filters
  const applyFilters = () => {
    onFilterChange(localFilters);
    setIsOpen(false);
  };

  // Reset filters to default (only active teachers)
  const resetFilters = () => {
    const defaultFilters: AdvancedFilters = {
      conditions: [
        {
          id: "default-active-filter",
          field: "isActive",
          operator: "equals",
          value: true,
        }
      ],
      logicOperator: "and",
    };
    setLocalFilters(defaultFilters);
    onFilterChange(defaultFilters);
  };

  // Get operators for a field
  const getOperatorsForField = (fieldId: string) => {
    const field = getFieldById(fieldId);
    return OPERATORS_BY_TYPE[field?.type || "text"];
  };

  // Check if a value input should be shown for the operator
  const shouldShowValueInput = (operator: FilterOperator) => {
    return !["is_empty", "is_not_empty"].includes(operator);
  };

  // Render the value input based on field type
  const renderValueInput = (condition: FilterCondition) => {
    const field = getFieldById(condition.field);
    if (!field) return null;

    if (!shouldShowValueInput(condition.operator)) {
      return null;
    }

    switch (field.type) {
      case "boolean":
        return (
          <Select
            value={condition.value?.toString() || "true"}
            onValueChange={(value) => updateCondition(condition.id, { value: value === "true" })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Active</SelectItem>
              <SelectItem value="false">Inactive</SelectItem>
            </SelectContent>
          </Select>
        );

      case "select":
        return (
          <Select
            value={condition.value?.toString() || ""}
            onValueChange={(value) => updateCondition(condition.id, { value })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select value" />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "date":
        return (
          <Input
            type="date"
            value={condition.value?.toString() || ""}
            onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
            className="w-full"
          />
        );

      case "number":
        return (
          <Input
            type="number"
            value={condition.value?.toString() || ""}
            onChange={(e) => updateCondition(condition.id, { value: parseFloat(e.target.value) })}
            className="w-full"
          />
        );

      default:
        return (
          <Input
            type="text"
            value={condition.value?.toString() || ""}
            onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
            className="w-full"
            placeholder="Enter value"
          />
        );
    }
  };

  // Get a summary of the filters for display
  const getFilterSummary = () => {
    if (localFilters.conditions.length === 0) {
      return "No filters";
    }

    return `${localFilters.conditions.length} filter${localFilters.conditions.length > 1 ? "s" : ""}`;
  };

  // Get count of active filters (excluding the default isActive filter)
  const getActiveFilterCount = () => {
    return localFilters.conditions.filter(c => {
      // Skip the default active filter
      if (c.id === "default-active-filter" &&
          c.field === "isActive" &&
          c.operator === "equals" &&
          c.value === true) {
        return false;
      }
      return true;
    }).length;
  };

  return (
    <div>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant={getActiveFilterCount() > 0 ? "default" : "outline"}
            className={`h-10 px-3 flex items-center gap-2 ${getActiveFilterCount() > 0 ? 'bg-[#00501B] text-white border-[#00501B]' : 'border-gray-300 hover:border-[#00501B] hover:text-[#00501B]'} transition-all duration-200`}
            onClick={() => setIsOpen(true)}
          >
            <Filter className="h-4 w-4" />
            <span className="font-medium">Filter</span>
            {getActiveFilterCount() > 0 && (
              <span className="ml-1.5 bg-white text-[#00501B] rounded-full h-5 min-w-[20px] inline-flex items-center justify-center text-xs font-bold px-1.5">
                {getActiveFilterCount()}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto border-l border-gray-200">
          <SheetHeader>
            <SheetTitle className="text-xl font-bold text-gray-900">Filter Teachers</SheetTitle>
            <SheetDescription className="text-gray-600">
              Add conditions to filter the teacher list
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Logic operator selector (AND/OR) */}
            {localFilters.conditions.length > 1 && (
              <div className="flex items-center justify-center space-x-2 bg-gray-50/80 p-3 rounded-lg">
                <div className="text-sm text-gray-500 mr-2">Match:</div>
                <Button
                  variant={localFilters.logicOperator === "and" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLocalFilters((prev) => ({ ...prev, logicOperator: "and" }))}
                  className={`w-16 ${localFilters.logicOperator === "and" ? "bg-[#00501B] hover:bg-[#00501B]/90 text-white" : "border-gray-200 hover:border-[#00501B]/30 hover:text-[#00501B]"}`}
                >
                  ALL
                </Button>
                <Button
                  variant={localFilters.logicOperator === "or" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLocalFilters((prev) => ({ ...prev, logicOperator: "or" }))}
                  className={`w-16 ${localFilters.logicOperator === "or" ? "bg-[#00501B] hover:bg-[#00501B]/90 text-white" : "border-gray-200 hover:border-[#00501B]/30 hover:text-[#00501B]"}`}
                >
                  ANY
                </Button>
              </div>
            )}

            {/* Filter conditions */}
            <div className="space-y-4">
              {localFilters.conditions.map((condition) => {
                const field = getFieldById(condition.field);
                const operators = getOperatorsForField(condition.field);

                return (
                  <div key={condition.id} className="flex flex-col space-y-2 rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-[#00501B]">Filter Condition</Label>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-full text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                        onClick={() => removeCondition(condition.id)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {/* Field selector */}
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500">Field</Label>
                        <Select
                          value={condition.field}
                          onValueChange={(value) => {
                            const newField = getFieldById(value);
                            if (!newField) return;
                            
                            const newOperators = OPERATORS_BY_TYPE[newField.type] || [];
                            const newOperator = newOperators[0]?.id || "equals";
                            
                            updateCondition(condition.id, {
                              field: value,
                              operator: newOperator,
                              value: newField.type === "boolean" ? true : "",
                            });
                          }}
                        >
                          <SelectTrigger className="border-gray-200 bg-white/90 focus:ring-[#00501B]/20 focus:border-[#00501B]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FILTER_FIELDS.map((field) => (
                              <SelectItem key={field.id} value={field.id}>
                                {field.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Operator selector */}
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500">Operator</Label>
                        <Select
                          value={condition.operator}
                          onValueChange={(value) => updateCondition(condition.id, {
                            operator: value as FilterOperator
                          })}
                        >
                          <SelectTrigger className="border-gray-200 bg-white/90 focus:ring-[#00501B]/20 focus:border-[#00501B]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {operators.map((op) => (
                              <SelectItem key={op.id} value={op.id}>
                                {op.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Value input */}
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500">Value</Label>
                        <div className="w-full">
                          {renderValueInput(condition)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Add condition button */}
              <Button
                variant="outline"
                className="w-full border-dashed border-gray-300 bg-gray-50/50 hover:border-[#00501B]/30 hover:bg-gray-50 hover:text-[#00501B] transition-all duration-200"
                onClick={addCondition}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add filter condition
              </Button>
            </div>

            {/* Action buttons */}
            <div className="flex justify-between border-t border-gray-200 pt-6 mt-6">
              <Button
                variant="outline"
                onClick={resetFilters}
                className="flex items-center gap-1 border-gray-200 hover:border-red-300 hover:text-red-600 transition-colors"
              >
                <X className="h-4 w-4" />
                Reset
              </Button>
              <Button
                onClick={applyFilters}
                className="bg-[#00501B] hover:bg-[#00501B]/90 text-white transition-colors"
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Filter count is now shown in the button */}
    </div>
  );
}
