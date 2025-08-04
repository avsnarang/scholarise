"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Plus, 
  X, 
  GripVertical,
  Save,
  RotateCcw
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface SortStep {
  id: string;
  field: string;
  direction: "asc" | "desc";
  label: string;
}

export interface MultiStepSortProps {
  sortSteps: SortStep[];
  onSortStepsChange: (steps: SortStep[]) => void;
  availableFields: { value: string; label: string }[];
  onSave?: () => void;
  onReset?: () => void;
  className?: string;
}

export function MultiStepSort({
  sortSteps,
  onSortStepsChange,
  availableFields,
  onSave,
  onReset,
  className
}: MultiStepSortProps) {
  const [isOpen, setIsOpen] = useState(false);

  const addSortStep = (field: string, label: string) => {
    const newStep: SortStep = {
      id: crypto.randomUUID(),
      field,
      direction: "asc",
      label
    };
    onSortStepsChange([...sortSteps, newStep]);
  };

  const removeSortStep = (id: string) => {
    onSortStepsChange(sortSteps.filter(step => step.id !== id));
  };

  const updateSortDirection = (id: string, direction: "asc" | "desc") => {
    onSortStepsChange(
      sortSteps.map(step => 
        step.id === id ? { ...step, direction } : step
      )
    );
  };

  const moveSortStep = (fromIndex: number, toIndex: number) => {
    const newSteps = [...sortSteps];
    const [movedStep] = newSteps.splice(fromIndex, 1);
    if (movedStep) {
      newSteps.splice(toIndex, 0, movedStep);
      onSortStepsChange(newSteps);
    }
  };

  const getUsedFields = () => sortSteps.map(step => step.field);
  const getAvailableFields = () => 
    availableFields.filter(field => !getUsedFields().includes(field.value));

  const getSortIcon = () => {
    if (sortSteps.length === 0) return <ArrowUpDown className="h-4 w-4" />;
    return <ArrowUpDown className="h-4 w-4 text-primary" />;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={cn(
            "gap-2",
            sortSteps.length > 0 && "border-primary text-primary",
            className
          )}
        >
          {getSortIcon()}
          Sort
          {sortSteps.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 text-xs">
              {sortSteps.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 z-[60]" align="start">
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Sort</h4>
            <div className="flex items-center gap-2">
              {onReset && sortSteps.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onReset}
                  className="h-7 px-2 text-xs"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset
                </Button>
              )}
              {onSave && sortSteps.length > 0 && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={onSave}
                  className="h-7 px-2 text-xs"
                >
                  <Save className="h-3 w-3 mr-1" />
                  Save
                </Button>
              )}
            </div>
          </div>

          {/* Sort Steps */}
          {sortSteps.length > 0 && (
            <div className="space-y-2">
              {sortSteps.map((step, index) => (
                <div
                  key={step.id}
                  className="flex items-center gap-2 p-2 bg-muted/30 rounded-md group"
                >
                  {/* Drag Handle */}
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  
                  {/* Step Number */}
                  <div className="flex-shrink-0 w-5 h-5 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </div>
                  
                  {/* Field Name */}
                  <div className="flex-1 text-sm font-medium">
                    {step.label}
                  </div>
                  
                  {/* Direction Toggle */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 px-2">
                        {step.direction === "asc" ? (
                          <>
                            <ArrowUp className="h-3 w-3 mr-1" />
                            Asc
                          </>
                        ) : (
                          <>
                            <ArrowDown className="h-3 w-3 mr-1" />
                            Desc
                          </>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="z-[70]" align="end">
                      <DropdownMenuItem
                        onClick={() => updateSortDirection(step.id, "asc")}
                        className={cn(step.direction === "asc" && "bg-accent")}
                      >
                        <ArrowUp className="h-3 w-3 mr-2" />
                        Ascending
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => updateSortDirection(step.id, "desc")}
                        className={cn(step.direction === "desc" && "bg-accent")}
                      >
                        <ArrowDown className="h-3 w-3 mr-2" />
                        Descending
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  {/* Remove Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSortStep(step.id)}
                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add Sort Step */}
          {getAvailableFields().length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                  <Plus className="h-4 w-4" />
                  Add sort
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 z-[70]" align="start">
                {getAvailableFields().map((field) => (
                  <DropdownMenuItem
                    key={field.value}
                    onClick={() => addSortStep(field.value, field.label)}
                  >
                    {field.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Empty State */}
          {sortSteps.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              <ArrowUpDown className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No sorting applied</p>
              <p className="text-xs mt-1">Add a sort to organize your data</p>
            </div>
          )}

          {/* Info */}
          {sortSteps.length > 0 && (
            <div className="text-xs text-muted-foreground border-t pt-3 mt-4">
              <p>Items are sorted in the order above. Higher priority sorts are applied first.</p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}