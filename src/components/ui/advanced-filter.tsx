"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { ListFilter, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { nanoid } from "nanoid";
import Filters from "@/components/ui/filters";
import type { Filter as UIFilter } from "@/components/ui/filters";
import { FilterOperator as UIFilterOperator } from "@/components/ui/filters";

// Generic filter types
export interface FilterOption {
  name: string;
  icon: React.ReactNode;
  value?: string; // Optional custom value, defaults to name
}

export interface FilterCategory {
  name: string;
  icon: React.ReactNode;
  options: FilterOption[];
}

export interface AdvancedFilterProps {
  categories: FilterCategory[][];
  filters: UIFilter[];
  onFiltersChange: (filters: UIFilter[]) => void;
  placeholder?: string;
  className?: string;
}

export function AdvancedFilter({
  categories,
  filters,
  onFiltersChange,
  placeholder = "Search filters...",
  className
}: AdvancedFilterProps) {
  const [open, setOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [commandInput, setCommandInput] = useState("");
  const commandInputRef = useRef<HTMLInputElement>(null);

  const getFilterOptions = (categoryName: string): FilterOption[] => {
    for (const group of categories) {
      const category = group.find(cat => cat.name === categoryName);
      if (category) {
        return category.options;
      }
    }
    return [];
  };

  const handleFilterSelect = (categoryName: string, optionName: string) => {
    const newFilter: UIFilter = {
      id: nanoid(),
      type: categoryName as any,
      operator: UIFilterOperator.IS,
      value: [optionName],
    };

    onFiltersChange([...filters, newFilter]);
    
    setTimeout(() => {
      setSelectedCategory(null);
      setCommandInput("");
    }, 100);
    setOpen(false);
  };

  const clearAllFilters = () => {
    onFiltersChange([]);
  };

  return (
    <div className={cn("flex gap-2 flex-wrap", className)}>
      <Filters 
        filters={filters} 
        setFilters={(value) => {
          if (typeof value === 'function') {
            const updater = value as (prev: UIFilter[]) => UIFilter[];
            onFiltersChange(updater(filters));
          } else {
            onFiltersChange(value);
          }
        }} 
      />
      
      {filters.filter((filter) => filter.value?.length > 0).length > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="transition group h-6 text-xs items-center rounded-sm hover:bg-destructive hover:text-destructive-foreground"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            clearAllFilters();
          }}
          title="Clear all filters"
        >
          <X className="size-3 mr-1" />
          Clear
        </Button>
      )}
      
      <Popover
        open={open}
        onOpenChange={(open) => {
          setOpen(open);
          if (!open) {
            setTimeout(() => {
              setSelectedCategory(null);
              setCommandInput("");
            }, 200);
          }
        }}
        modal={false}
      >
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            role="combobox"
            aria-expanded={open}
            size="sm"
            className={cn(
              "transition group h-6 text-xs rounded-sm flex gap-1.5 items-center hover:bg-accent hover:text-accent-foreground",
              filters.length > 0 && "w-6"
            )}
            onClick={() => setOpen(!open)}
            title="Filter items"
          >
            <ListFilter className="size-3 shrink-0 transition-all text-muted-foreground group-hover:text-primary" />
            {!filters.length && "Filter"}
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-[250px] p-0 z-[9999] bg-white border border-border shadow-lg" sideOffset={4}>
          <Command shouldFilter={false} className="bg-white [&_[cmdk-item]]:cursor-pointer [&_[cmdk-item]]:select-none [&_[cmdk-item]]:pointer-events-auto">
            <CommandInput
              placeholder={selectedCategory ? `Search ${selectedCategory.toLowerCase()}...` : placeholder}
              className="h-9"
              value={commandInput}
              onValueChange={setCommandInput}
              ref={commandInputRef}
            />
            
            <CommandList className="max-h-[300px] overflow-y-auto relative z-10 bg-white">
              <CommandEmpty className="text-gray-500 py-4 text-center">No results found.</CommandEmpty>
              
              {selectedCategory ? (
                <CommandGroup>
                  {getFilterOptions(selectedCategory)
                    .filter(option => 
                      option.name.toLowerCase().includes(commandInput.toLowerCase())
                    )
                    .map((option) => (
                    <CommandItem
                      className="group flex gap-2 items-center cursor-pointer hover:bg-blue-50 hover:text-blue-700 data-[selected=true]:bg-blue-100 data-[selected=true]:text-blue-800 transition-colors"
                      key={option.name}
                      value={option.name}
                      onSelect={() => handleFilterSelect(selectedCategory, option.name)}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleFilterSelect(selectedCategory, option.name);
                      }}
                    >
                      <div className="flex items-center gap-2 w-full">
                        {option.icon}
                        <span className="text-black group-hover:text-blue-700">
                          {option.name}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                  
                  <CommandSeparator />
                  
                  <CommandItem
                    className="group flex gap-2 items-center cursor-pointer hover:bg-gray-50 hover:text-gray-700 data-[selected=true]:bg-gray-100 data-[selected=true]:text-gray-800 transition-colors"
                    onSelect={() => {
                      setSelectedCategory(null);
                      setCommandInput("");
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setSelectedCategory(null);
                      setCommandInput("");
                    }}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <ChevronDown className="size-3.5 rotate-90" />
                      <span className="text-black group-hover:text-gray-800">
                        Back to categories
                      </span>
                    </div>
                  </CommandItem>
                </CommandGroup>
              ) : (
                categories.map((group, index) => (
                  <React.Fragment key={index}>
                    <CommandGroup>
                      {group
                        .filter(category => 
                          category.name.toLowerCase().includes(commandInput.toLowerCase())
                        )
                        .map((category) => (
                        <CommandItem
                          className="group flex gap-2 items-center cursor-pointer hover:bg-green-50 hover:text-green-700 data-[selected=true]:bg-green-100 data-[selected=true]:text-green-800 transition-colors"
                          key={category.name}
                          value={category.name}
                          onSelect={() => {
                            setSelectedCategory(category.name);
                            setCommandInput("");
                            setTimeout(() => {
                              commandInputRef.current?.focus();
                            }, 100);
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setSelectedCategory(category.name);
                            setCommandInput("");
                            setTimeout(() => {
                              commandInputRef.current?.focus();
                            }, 100);
                          }}
                        >
                          <div className="flex items-center gap-2 w-full">
                            {category.icon}
                            <span className="text-black group-hover:text-green-700">
                              {category.name}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    {index < categories.length - 1 && (
                      <CommandSeparator />
                    )}
                  </React.Fragment>
                ))
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Hook for converting between advanced filters and UI filters
export interface AdvancedFilterCondition {
  id: string;
  field: string;
  operator: string;
  value: string | boolean | null;
}

export interface AdvancedFilters {
  conditions: AdvancedFilterCondition[];
  logicOperator: "and" | "or";
}

export interface FilterMapping {
  [categoryName: string]: {
    field: string;
    valueMapper?: (displayValue: string, options: any[]) => string;
    displayMapper?: (fieldValue: string, options: any[]) => string;
  };
}

export function useAdvancedFilterAdapter(
  advancedFilters: AdvancedFilters,
  onAdvancedFiltersChange: (filters: AdvancedFilters) => void,
  filterMapping: FilterMapping,
  dataOptions: { [categoryName: string]: any[] } = {}
) {
  const [uiFilters, setUiFilters] = useState<UIFilter[]>([]);
  const isUpdatingFromAdvanced = React.useRef(false);

  // Convert advanced filters to UI filters
  React.useEffect(() => {
    if (isUpdatingFromAdvanced.current) return;

    const newFilters: UIFilter[] = [];
    
    advancedFilters.conditions.forEach(condition => {
      // Find the category that matches this field
      const categoryName = Object.keys(filterMapping).find(
        cat => filterMapping[cat]?.field === condition.field
      );
      
      if (categoryName) {
        const mapping = filterMapping[categoryName];
        if (!mapping) return;
        
        const displayValue = mapping.displayMapper 
          ? mapping.displayMapper(condition.value as string, dataOptions[categoryName] || [])
          : condition.value as string;
          
        if (displayValue) {
          newFilters.push({
            id: condition.id,
            type: categoryName as any,
            operator: UIFilterOperator.IS,
            value: [displayValue]
          });
        }
      }
    });
    
    // Only update if the filters have actually changed
    if (JSON.stringify(newFilters) !== JSON.stringify(uiFilters)) {
      setUiFilters(newFilters);
    }
  }, [advancedFilters.conditions]);

  // Convert UI filters back to advanced filters
  const handleUiFilterChange = React.useCallback((newFilters: UIFilter[]) => {
    isUpdatingFromAdvanced.current = true;
    
    const conditions: AdvancedFilterCondition[] = newFilters.map(filter => {
      const categoryName = filter.type as string;
      const mapping = filterMapping[categoryName];
      
      if (!mapping) {
        return {
          id: filter.id,
          field: categoryName,
          operator: "equals",
          value: filter.value[0] ?? ""
        };
      }
      
      const displayValue = filter.value[0] ?? "";
      const fieldValue = mapping.valueMapper 
        ? mapping.valueMapper(displayValue, dataOptions[categoryName] || [])
        : displayValue;
      
      return {
        id: filter.id,
        field: mapping.field,
        operator: "equals",
        value: fieldValue
      };
    });
    
    onAdvancedFiltersChange({
      conditions,
      logicOperator: "and"
    });
    
    // Reset the flag after a brief delay
    setTimeout(() => {
      isUpdatingFromAdvanced.current = false;
    }, 50);
  }, [filterMapping, dataOptions, onAdvancedFiltersChange]);

  return {
    uiFilters,
    setUiFilters: handleUiFilterChange
  };
} 