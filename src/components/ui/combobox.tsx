"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "./input"

interface ComboboxProps {
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  emptyMessage?: string
  className?: string
  triggerClassName?: string
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  emptyMessage = "No results found.",
  className,
  triggerClassName,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [activeIndex, setActiveIndex] = React.useState<number>(-1)
  
  // Refs for DOM elements
  const inputRef = React.useRef<HTMLInputElement>(null)
  const optionsRef = React.useRef<HTMLDivElement>(null)
  const optionRefs = React.useRef<(HTMLDivElement | null)[]>([])
  
  // Handle button click to open/close dropdown
  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setOpen(!open)
  }
  
  // Get selected option for display
  const selectedOption = React.useMemo(() => 
    options.find(option => option.value === value),
    [options, value]
  )
  
  // Sort and filter options
  const sortedAndFilteredOptions = React.useMemo(() => {
    // First sort alphabetically by label
    const sortedOptions = [...options].sort((a, b) => 
      a.label.localeCompare(b.label)
    )
    
    // Then filter based on search term
    if (!searchTerm) return sortedOptions
    
    return sortedOptions.filter(option => 
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [options, searchTerm])
  
  // Handle option selection
  const handleSelect = (optionValue: string) => {
    onChange(optionValue === value ? "" : optionValue)
    setSearchTerm("")
    setOpen(false)
    setActiveIndex(-1)
  }
  
  // Reset active index when search term changes or dropdown opens/closes
  React.useEffect(() => {
    setActiveIndex(-1)
  }, [searchTerm, open])
  
  // Focus input when dropdown opens
  React.useEffect(() => {
    if (open) {
      // Allow some time for the PopoverContent to be mounted
      setTimeout(() => {
        inputRef.current?.focus()
      }, 10)
    }
  }, [open])
  
  // Update option refs when options change
  React.useEffect(() => {
    optionRefs.current = optionRefs.current.slice(0, sortedAndFilteredOptions.length)
  }, [sortedAndFilteredOptions])
  
  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Don't handle if closed
    if (!open) return
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (sortedAndFilteredOptions.length > 0) {
          setActiveIndex(prev => 
            prev < sortedAndFilteredOptions.length - 1 ? prev + 1 : 0
          )
        }
        break
        
      case 'ArrowUp':
        e.preventDefault()
        if (sortedAndFilteredOptions.length > 0) {
          setActiveIndex(prev => 
            prev > 0 ? prev - 1 : sortedAndFilteredOptions.length - 1
          )
        }
        break
        
      case 'Enter':
        e.preventDefault()
        if (activeIndex >= 0 && activeIndex < sortedAndFilteredOptions.length) {
          const selectedOption = sortedAndFilteredOptions[activeIndex]
          if (selectedOption) {
            handleSelect(selectedOption.value)
          }
        }
        break
        
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        break
        
      case 'Tab':
        // Allow normal tab behavior, but close dropdown
        setOpen(false)
        break
        
      default:
        break
    }
  }
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="w-full">
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-controls="combobox-options"
            aria-haspopup="listbox"
            className={cn("w-full justify-between", triggerClassName)}
            onClick={handleButtonClick}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Space" || e.key === " ") {
                e.preventDefault()
                setOpen(true)
              }
            }}
          >
            {selectedOption ? selectedOption.label : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </div>
      </PopoverTrigger>
      <PopoverContent 
        className={cn("p-0", className)} 
        align="start"
        side="bottom"
        sideOffset={5}
        alignOffset={0}
        avoidCollisions={true}
        style={{ width: 'var(--radix-popover-trigger-width)', maxHeight: '300px' }}
        onKeyDown={handleKeyDown}
        onMouseLeave={() => setActiveIndex(-1)}
      >
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            ref={inputRef}
            placeholder={`Search ${placeholder.toLowerCase()}...`}
            className="flex h-9 w-full border-0 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-autocomplete="list"
            aria-controls="combobox-options"
          />
        </div>
        <div 
          ref={optionsRef}
          className="max-h-[300px] overflow-y-auto"
          id="combobox-options"
          role="listbox"
          aria-label={`${placeholder} options`}
        >
          {sortedAndFilteredOptions.length === 0 ? (
            <div className="py-6 text-center text-sm">
              {emptyMessage}
            </div>
          ) : (
            <div className="max-h-[300px] overflow-y-auto">
              {sortedAndFilteredOptions.map((option, index) => (
                <div
                  ref={(el) => {
                    optionRefs.current[index] = el;
                    return undefined;
                  }}
                  key={option.value}
                  className={cn(
                    "flex cursor-pointer items-center justify-between px-3 py-2 text-sm outline-none",
                    activeIndex === index && "bg-slate-100 text-[#00501B]",
                    value === option.value && "font-medium",
                    "hover:bg-slate-100 hover:text-[#00501B]"
                  )}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSelect(option.value);
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                  role="option"
                  aria-selected={value === option.value}
                  tabIndex={-1}
                  id={`option-${option.value}`}
                >
                  {option.label}
                  {value === option.value && (
                    <Check className="h-4 w-4 text-[#00501B]" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
