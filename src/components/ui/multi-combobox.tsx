"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"

interface MultiComboboxProps {
  options: { value: string; label: string }[]
  selected: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  emptyMessage?: string
  className?: string
  searchPlaceholder?: string
}

export function MultiCombobox({
  options,
  selected,
  onChange,
  placeholder = "Select options",
  className,
  searchPlaceholder = "Search...",
}: MultiComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")
  
  // Filter options based on search value
  const filteredOptions = React.useMemo(() => {
    if (!searchValue) return options
    
    return options.filter(option => 
      option.label.toLowerCase().includes(searchValue.toLowerCase())
    )
  }, [options, searchValue])
  
  // No sorting, keep original order
  const sortedOptions = filteredOptions
  
  // Handle selection
  const handleSelect = (value: string) => {
    const newSelected = selected.includes(value)
      ? selected.filter(item => item !== value)
      : [...selected, value]
    onChange(newSelected)
    // Don't close the popover, let the user continue selecting
  }
  
  // Remove a selected item
  const handleRemove = React.useCallback((value: string, e?: React.MouseEvent) => {
    // Stop propagation if event is provided
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Only proceed if value exists in selected array
    if (selected.includes(value)) {
      const newSelected = selected.filter(item => item !== value);
      onChange(newSelected);
    }
  }, [selected, onChange]);
  
  // Clear search when closing
  React.useEffect(() => {
    if (!open) {
      setSearchValue("")
    }
  }, [open])
  
  // Get display text for the button
  const displayText = selected.length > 0 
    ? `${selected.length} selected` 
    : placeholder
  
  return (
    <div className="relative w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between text-muted-foreground h-10",
              className
            )}
            onClick={() => setOpen(!open)}
          >
            {displayText}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[var(--radix-popover-trigger-width)] p-0" 
          align="start"
          side="bottom"
          sideOffset={5}
          avoidCollisions={true}
        >
          <Command shouldFilter={false}>
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <Input
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-9 w-full border-0 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <CommandList>
              <CommandGroup className="max-h-[300px] overflow-auto">
                {sortedOptions.map((option) => {
                  const isSelected = selected.includes(option.value)
                  return (
                    <div
                      key={option.value}
                      className={cn(
                        "flex cursor-pointer items-center py-2 px-2 m-1 rounded-sm",
                        isSelected ? "bg-accent" : "hover:bg-accent/50",
                      )}
                      onClick={() => handleSelect(option.value)}
                    >
                      <div
                        className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "opacity-50"
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <span className="flex-1">
                        {option.label}
                      </span>
                    </div>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {/* Display selected items */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selected.map((value) => {
            const option = options.find(o => o.value === value)
            return (
              <Badge 
                key={value} 
                variant="secondary"
                className="px-2 py-1 text-sm flex items-center gap-1"
              >
                {option?.label || value}
                <button
                  type="button"
                  onClick={(e) => handleRemove(value, e)}
                  className="inline-flex h-3 w-3 items-center justify-center rounded-full focus:outline-none"
                  aria-label={`Remove ${option?.label || value}`}
                >
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-destructive" 
                  />
                </button>
              </Badge>
            )
          })}
        </div>
      )}
    </div>
  )
} 