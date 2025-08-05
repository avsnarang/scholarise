"use client";

import React from "react";
import { subDays, startOfWeek, endOfWeek } from "date-fns";
import { CalendarIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface QuickDateSelectorProps {
  onChange: (date: Date) => void;
  canSelectPreviousDates?: boolean;
}

export default function QuickDateSelector({ onChange, canSelectPreviousDates = true }: QuickDateSelectorProps) {
  const today = new Date();
  const yesterday = subDays(today, 1);
  const weekStart = startOfWeek(today);
  const weekEnd = endOfWeek(today);
  
  const handleDateClick = (date: Date) => {
    if (typeof onChange === 'function') {
      onChange(date);
    }
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <CalendarIcon className="mr-2 h-4 w-4" />
          Quick Select
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleDateClick(today)}>
          Today
        </DropdownMenuItem>
        {canSelectPreviousDates && (
          <>
            <DropdownMenuItem onClick={() => handleDateClick(yesterday)}>
              Yesterday
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDateClick(weekStart)}>
              Start of Week
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDateClick(weekEnd)}>
              End of Week
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}