import { useState, useEffect } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { api } from "@/utils/api";

interface Branch {
  id: string;
  name: string;
  code: string;
}

interface BranchSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function BranchSelect({
  value,
  onChange,
  placeholder = "Select branch",
  disabled = false,
  className,
}: BranchSelectProps) {
  const [open, setOpen] = useState(false);

  // Get branches ordered by the custom order field with better error handling
  const {
    data: branches,
    isLoading,
    error,
    refetch
  } = api.branch.getAll.useQuery(undefined, {
    retry: 3,
    retryDelay: 1000
  });

  // Find the selected branch name
  const selectedBranch = branches?.find((branch: Branch) => branch.id === value);

  // Update the value if the selected branch is no longer available
  useEffect(() => {
    if (branches?.length && value && !selectedBranch) {
      console.log('Selected branch not found, resetting to empty');
      onChange("");
    }
  }, [branches, value, selectedBranch, onChange]);

  // For debugging
  useEffect(() => {
    console.log('BranchSelect value:', value);
    console.log('Selected branch:', selectedBranch);
  }, [value, selectedBranch]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between",
            error ? "border-red-300 bg-red-50 text-red-900" : "",
            className
          )}
          disabled={disabled || isLoading}
          onClick={() => {
            if (error) {
              // If there was an error, try to refetch when the user clicks
              void refetch();
            }
          }}
        >
          {error ? (
            <span className="flex items-center text-red-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              Error loading branches
            </span>
          ) : (
            selectedBranch ? selectedBranch.name : placeholder
          )}
          {isLoading ? (
            <svg className="ml-2 h-4 w-4 animate-spin text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0 bg-white border border-gray-200 shadow-lg">
        <Command className="bg-white">
          <CommandInput placeholder="Search branch..." className="text-gray-900" />
          <CommandEmpty className="text-gray-900">
            {error ? "Error loading branches" : "No branch found."}
          </CommandEmpty>
          {isLoading && (
            <div className="flex items-center justify-center py-6">
              <svg className="h-6 w-6 animate-spin text-[#00501B]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          )}
          {error && (
            <div className="p-4 text-center">
              <p className="text-sm text-red-600 mb-2">Failed to load branches</p>
              <Button
                size="sm"
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50"
                onClick={() => void refetch()}
              >
                Retry
              </Button>
            </div>
          )}
          {!isLoading && !error && (
            <CommandGroup className="max-h-[300px] overflow-y-auto">
              {branches?.map((branch: Branch) => (
                <CommandItem
                  key={branch.id}
                  value={branch.id}
                  className="text-gray-900 hover:bg-gray-100 hover:text-[#00501B] cursor-pointer clickable"
                  onSelect={(currentValue) => {
                    console.log('Branch selected:', branch.id, branch.name, 'Current value:', value);

                    // Force trigger onChange even if the value is the same
                    // This ensures the branch context is updated
                    onChange(branch.id);

                    // Close the popover
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === branch.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {branch.name}
                  <span className="ml-auto text-xs text-gray-500">
                    {branch.code}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
