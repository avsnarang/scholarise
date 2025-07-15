"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import {
  CheckIcon,
  XCircle,
  ChevronDown,
  XIcon,
  WandSparkles,
  Search,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

/**
 * Variants for the multi-select component to handle different styles.
 * Uses class-variance-authority (cva) to define different styles based on "variant" prop.
 */
const multiSelectVariants = cva(
  "m-1 transition ease-in-out delay-150 hover:-translate-y-1 hover:scale-110 duration-300",
  {
    variants: {
      variant: {
        default:
          "border-foreground/10 text-foreground bg-card hover:bg-card/80 dark:bg-card/80 dark:border-foreground/20",
        secondary:
          "border-foreground/10 bg-secondary text-secondary-foreground hover:bg-secondary/80 dark:bg-secondary/80 dark:border-foreground/20",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80 dark:bg-destructive/80",
        inverted: "inverted",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

/**
 * Props for MultiSelect component
 */
interface MultiSelectProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof multiSelectVariants> {
  /**
   * An array of option objects to be displayed in the multi-select component.
   * Each option object has a label, value, and an optional icon.
   */
  options: {
    /** The text to display for the option. */
    label: string;
    /** The unique value associated with the option. */
    value: string;
    /** Optional icon component to display alongside the option. */
    icon?: React.ComponentType<{ className?: string }>;
  }[];

  /**
   * Callback function triggered when the selected values change.
   * Receives an array of the new selected values.
   */
  onValueChange: (value: string[]) => void;

  /** The default selected values when the component mounts. */
  defaultValue?: string[];
  
  /** 
   * The currently selected values (controlled component).
   * This will override defaultValue if both are provided.
   */
  selected?: string[];

  /**
   * Placeholder text to be displayed when no values are selected.
   * Optional, defaults to "Select options".
   */
  placeholder?: string;

  /**
   * Animation duration in seconds for the visual effects (e.g., bouncing badges).
   * Optional, defaults to 0 (no animation).
   */
  animation?: number;

  /**
   * Maximum number of items to display. Extra selected items will be summarized.
   * Optional, defaults to 3.
   */
  maxCount?: number;

  /**
   * The modality of the popover. When set to true, interaction with outside elements
   * will be disabled and only popover content will be visible to screen readers.
   * Optional, defaults to false.
   */
  modalPopover?: boolean;

  /**
   * If true, renders the multi-select component as a child of another component.
   * Optional, defaults to false.
   */
  asChild?: boolean;

  /**
   * Additional class names to apply custom styles to the multi-select component.
   * Optional, can be used to add custom styles.
   */
  className?: string;
}

export const MultiSelect = React.forwardRef<
  HTMLButtonElement,
  MultiSelectProps
>(
  (
    {
      options,
      onValueChange,
      variant,
      defaultValue = [],
      selected,
      placeholder = "Select options",
      animation = 0,
      maxCount = 3,
      modalPopover = false,
      asChild = false,
      className,
      ...props
    },
    ref
  ) => {
    const [selectedValues, setSelectedValues] =
      React.useState<string[]>(selected || defaultValue || []);
    const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
    const [isAnimating, setIsAnimating] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");
    const [lastClickedIndex, setLastClickedIndex] = React.useState<number | null>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);
    
    // Update selectedValues when selected prop changes
    React.useEffect(() => {
      if (selected !== undefined) {
        setSelectedValues(selected);
      }
    }, [selected]);

    // Handle scroll events to prevent interference with parent containers
    React.useEffect(() => {
      const handleWheel = (e: WheelEvent) => {
        e.stopPropagation();
      };

      const scrollContainer = scrollContainerRef.current;
      if (scrollContainer && isPopoverOpen) {
        scrollContainer.addEventListener('wheel', handleWheel, { passive: false });
        return () => scrollContainer.removeEventListener('wheel', handleWheel);
      }
    }, [isPopoverOpen]);

    // Handle input key events for better keyboard navigation
    const handleInputKeyDown = (
      event: React.KeyboardEvent<HTMLInputElement>
    ) => {
      // Handle backspace to remove last item
      if (event.key === "Backspace" && !event.currentTarget.value && selectedValues.length > 0) {
        const newSelectedValues = [...selectedValues];
        newSelectedValues.pop();
        setSelectedValues(newSelectedValues);
        onValueChange(newSelectedValues);
      }

      // Close dropdown on Escape
      if (event.key === "Escape") {
        setIsPopoverOpen(false);
      }
    };

    // Handle search input change
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
      // Reset last clicked index when search changes
      setLastClickedIndex(null);
    };

    // Toggle selection of an option
    const toggleOption = (option: string) => {
      const newSelectedValues = selectedValues.includes(option)
        ? selectedValues.filter((value) => value !== option)
        : [...selectedValues, option];
      setSelectedValues(newSelectedValues);
      onValueChange(newSelectedValues);
    };

    // Select range of options
    const selectRange = (startIndex: number, endIndex: number, shouldSelect: boolean) => {
      const start = Math.min(startIndex, endIndex);
      const end = Math.max(startIndex, endIndex);
      const currentOptions = searchQuery ? filteredOptions : options;
      const rangeValues = currentOptions.slice(start, end + 1).map(option => option.value);
      
      let newSelectedValues = [...selectedValues];
      
      if (shouldSelect) {
        // Add all range values that aren't already selected
        rangeValues.forEach(value => {
          if (!newSelectedValues.includes(value)) {
            newSelectedValues.push(value);
          }
        });
      } else {
        // Remove all range values
        newSelectedValues = newSelectedValues.filter(value => !rangeValues.includes(value));
      }
      
      setSelectedValues(newSelectedValues);
      onValueChange(newSelectedValues);
    };

    // Toggle selection directly through DOM
    const handleDirectClick = (e: React.MouseEvent, optionValue: string, optionIndex: number) => {
      e.preventDefault();
      e.stopPropagation();
      
      const currentOptions = searchQuery ? filteredOptions : options;
      
      // Handle shift+click for range selection
      if (e.shiftKey && lastClickedIndex !== null) {
        // Determine if we should select or deselect based on the target item's current state
        const targetSelected = selectedValues.includes(optionValue);
        const shouldSelect = !targetSelected;
        
        selectRange(lastClickedIndex, optionIndex, shouldSelect);
      } else {
        // Normal click - toggle single option
        toggleOption(optionValue);
        setLastClickedIndex(optionIndex);
      }
    };

    // Clear all selected values
    const handleClear = (e?: React.MouseEvent) => {
      if (e) {
        e.stopPropagation();
      }
      setSelectedValues([]);
      onValueChange([]);
      inputRef.current?.focus();
    };

    // Toggle popover open/close
    const handleTogglePopover = () => {
      setIsPopoverOpen((prev) => !prev);
      // Focus the search input when opening
      if (!isPopoverOpen) {
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      }
    };

    // Remove extra selected options
    const clearExtraOptions = (e: React.MouseEvent) => {
      e.stopPropagation();
      const newSelectedValues = selectedValues.slice(0, maxCount);
      setSelectedValues(newSelectedValues);
      onValueChange(newSelectedValues);
    };

    // Toggle select all options
    const toggleAll = () => {
      if (selectedValues.length === options.length) {
        handleClear();
      } else {
        const allValues = options.map((option) => option.value);
        setSelectedValues(allValues);
        onValueChange(allValues);
      }
    };

    // Filter options based on search query
    const filteredOptions = React.useMemo(() => {
      if (!searchQuery) return options;
      return options.filter((option) =>
        option.label.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }, [options, searchQuery]);

    // Add custom scrollbar styles
    React.useEffect(() => {
      const style = document.createElement('style');
      style.textContent = `
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgb(209 213 219) transparent;
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgb(209 213 219);
          border-radius: 3px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgb(156 163 175);
        }
        
        .dark .custom-scrollbar {
          scrollbar-color: rgb(107 114 128) transparent;
        }
        
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgb(107 114 128);
        }
        
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgb(75 85 99);
        }
      `;
      document.head.appendChild(style);
      
      return () => {
        document.head.removeChild(style);
      };
    }, []);

    return (
        <Popover
          open={isPopoverOpen}
          onOpenChange={(open) => {
            setIsPopoverOpen(open);
            if (open) {
              // Reset search when opening
              setSearchQuery("");
              // Reset last clicked index when opening
              setLastClickedIndex(null);
              // Focus the search input
              setTimeout(() => {
                inputRef.current?.focus();
              }, 100);
            } else {
              // Reset last clicked index when closing
              setLastClickedIndex(null);
            }
          }}
          modal={modalPopover}
        >
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            {...props}
            type="button"
            onClick={handleTogglePopover}
            className={cn(
              "flex w-full p-1 rounded-md border min-h-10 h-auto items-center justify-between bg-inherit hover:bg-inherit [&_svg]:pointer-events-auto",
              className
            )}
          >
            {selectedValues.length > 0 ? (
              <div className="flex justify-between items-center w-full">
                <div className="flex flex-wrap items-center">
                  {selectedValues.slice(0, maxCount).map((value) => {
                    const option = options.find((o) => o.value === value);
                    const IconComponent = option?.icon;
                    return (
                      <Badge
                        key={value}
                        className={cn(
                          isAnimating ? "animate-bounce" : "",
                          multiSelectVariants({ variant })
                        )}
                        style={{ animationDuration: `${animation}s` }}
                      >
                        {IconComponent && (
                          <IconComponent className="h-4 w-4 mr-2" />
                        )}
                        {option?.label}
                        <XCircle
                          className="ml-2 h-4 w-4 cursor-pointer"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleOption(value);
                          }}
                        />
                      </Badge>
                    );
                  })}
                  {selectedValues.length > maxCount && (
                    <Badge
                      className={cn(
                        "bg-transparent text-foreground border-foreground/1 hover:bg-transparent",
                        isAnimating ? "animate-bounce" : "",
                        multiSelectVariants({ variant })
                      )}
                      style={{ animationDuration: `${animation}s` }}
                    >
                      {`+ ${selectedValues.length - maxCount} more`}
                      <XCircle
                        className="ml-2 h-4 w-4 cursor-pointer"
                        onClick={(event) => {
                          event.stopPropagation();
                          clearExtraOptions(event);
                        }}
                      />
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <XIcon
                    className="h-4 mx-2 cursor-pointer text-muted-foreground"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleClear(event);
                    }}
                  />
                  <Separator
                    orientation="vertical"
                    className="flex min-h-6 h-full"
                  />
                  <ChevronDown className="h-4 mx-2 cursor-pointer text-muted-foreground" />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full mx-auto">
                <span className="text-sm text-muted-foreground mx-3">
                  {placeholder}
                </span>
                <ChevronDown className="h-4 cursor-pointer text-muted-foreground mx-2" />
              </div>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 z-[9999] pointer-events-auto"
          align="start"
          onEscapeKeyDown={() => setIsPopoverOpen(false)}
          style={{ 
            pointerEvents: 'auto'
          }}
        >
          <div className="w-full bg-white dark:bg-[#404040] rounded-md border border-gray-200 dark:border-[#606060] shadow-lg">
            <div className="flex items-center border-b border-gray-200 dark:border-[#606060] px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input 
                ref={inputRef}
                className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground dark:text-white"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleInputKeyDown}
              />
            </div>
            <div className="p-1">
              {filteredOptions.length === 0 && (
                <div className="py-6 text-center text-sm text-muted-foreground">No results found.</div>
              )}
              <div className="p-1">
                <div
                  className="flex items-center px-2 py-1.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-[#505050] rounded-sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleAll();
                  }}
                >
                  <div
                    className={cn(
                      "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                      selectedValues.length === options.length
                        ? "bg-primary text-primary-foreground"
                        : "opacity-50 [&_svg]:invisible"
                    )}
                  >
                    <CheckIcon className="h-4 w-4" />
                  </div>
                  <span className="text-sm">(Select All)</span>
                </div>
                <div 
                  ref={scrollContainerRef}
                  className="max-h-[200px] overflow-y-auto overscroll-contain custom-scrollbar"
                  onWheel={(e) => {
                    e.stopPropagation();
                  }}
                >
                  {filteredOptions.map((option, index) => {
                    const isSelected = selectedValues.includes(option.value);
                    const isLastClicked = lastClickedIndex === index;
                    return (
                      <div 
                        key={option.value}
                        className={cn(
                          "flex items-center px-2 py-1.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-[#505050] rounded-sm text-sm select-none",
                          isLastClicked && "ring-1 ring-primary ring-inset"
                        )}
                        onClick={(e) => handleDirectClick(e, option.value, index)}
                        title={`${option.label}${isLastClicked ? ' (Last clicked - Shift+Click to select range)' : ''}`}
                      >
                        <div
                          className={cn(
                            "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "opacity-50 [&_svg]:invisible"
                          )}
                        >
                          <CheckIcon className="h-4 w-4" />
                        </div>
                        {option.icon && (
                          <option.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                        )}
                        <span>{option.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="-mx-1 h-px bg-border" />
              <div className="overflow-hidden p-1">
                <div className="px-2 py-1 text-xs text-muted-foreground text-center">
                  Hold Shift + Click to select range
                </div>
                <div className="flex items-center justify-between">
                  {selectedValues.length > 0 && (
                    <>
                      <div
                        className="flex-1 justify-center cursor-pointer text-center py-1.5 hover:bg-gray-100 dark:hover:bg-[#505050] rounded-sm text-sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation(); 
                          handleClear();
                        }}
                      >
                        Clear
                      </div>
                      <div className="h-full w-px bg-border" />
                    </>
                  )}
                  <div
                    className="flex-1 justify-center cursor-pointer text-center py-1.5 hover:bg-gray-100 dark:hover:bg-[#505050] rounded-sm text-sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsPopoverOpen(false);
                    }}
                  >
                    Close
                  </div>
                </div>
              </div>
            </div>
          </div>
        </PopoverContent>
        {animation > 0 && selectedValues.length > 0 && (
          <WandSparkles
            className={cn(
              "cursor-pointer my-2 text-foreground bg-background w-3 h-3",
              isAnimating ? "" : "text-muted-foreground"
            )}
            onClick={() => setIsAnimating(!isAnimating)}
          />
        )}
      </Popover>
    );
  }
);

MultiSelect.displayName = "MultiSelect";
