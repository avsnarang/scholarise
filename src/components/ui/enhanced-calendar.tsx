"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface EnhancedCalendarProps {
  value?: Date
  onChange?: (date: Date) => void
  disabled?: boolean
  className?: string
}

export function EnhancedCalendar({
  value,
  onChange,
  disabled,
  className,
}: EnhancedCalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(() => {
    return value ? new Date(value.getFullYear(), value.getMonth(), 1) : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  })

  // Get days in month
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  // Get day of week for first day of month (0 = Sunday, 1 = Monday, etc.)
  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay()
  }

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const daysInMonth = getDaysInMonth(year, month)
  const firstDayOfMonth = getFirstDayOfMonth(year, month)

  // Generate days for the current month
  const days = []
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null)
  }
  // Add days of the month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i)
  }

  // Month names
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  // Day names
  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

  // Generate years for dropdown (from 1940 to current year + 5)
  const currentYear = new Date().getFullYear()
  const startYear = 1940
  const endYear = currentYear + 5
  const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i)

  // Handle month and year selection
  const handleMonthChange = (newMonth: string) => {
    const monthIndex = monthNames.findIndex(m => m === newMonth)
    if (monthIndex !== -1) {
      setCurrentMonth(new Date(year, monthIndex, 1))
    }
  }

  const handleYearChange = (newYear: string) => {
    setCurrentMonth(new Date(parseInt(newYear), month, 1))
  }

  // Handle date selection
  const handleDateClick = (day: number) => {
    if (disabled) return
    
    // Create the date at noon to avoid timezone issues
    const selectedDate = new Date(year, month, day, 12, 0, 0)
    onChange?.(selectedDate)
  }

  // Check if a date is selected
  const isSelected = (day: number) => {
    if (!value) return false
    return (
      value.getDate() === day &&
      value.getMonth() === month &&
      value.getFullYear() === year
    )
  }

  // Check if a date is today
  const isToday = (day: number) => {
    const today = new Date()
    return (
      today.getDate() === day &&
      today.getMonth() === month &&
      today.getFullYear() === year
    )
  }

  return (
    <div className={cn("p-4", className)}>
      {/* Calendar header with dropdowns */}
      <div className="flex justify-between items-center mb-4 px-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100"
          onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}
          disabled={disabled}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-2">
          <Select
            value={monthNames[month]}
            onValueChange={handleMonthChange}
            disabled={disabled}
          >
            <SelectTrigger className="h-8 w-fit min-w-[120px] text-sm">
              <SelectValue>{monthNames[month]}</SelectValue>
            </SelectTrigger>
            <SelectContent className="z-[9999]">
              {monthNames.map((monthName) => (
                <SelectItem key={monthName} value={monthName}>
                  {monthName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={year.toString()}
            onValueChange={handleYearChange}
            disabled={disabled}
          >
            <SelectTrigger className="h-8 w-fit min-w-[80px] text-sm">
              <SelectValue>{year}</SelectValue>
            </SelectTrigger>
            <SelectContent className="z-[9999]">
              {years.map((yearNum) => (
                <SelectItem key={yearNum} value={yearNum.toString()}>
                  {yearNum}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100"
          onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
          disabled={disabled}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-x-1 gap-y-1 w-full">
        {/* Day headers */}
        {dayNames.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-gray-500 h-10 flex items-center justify-center"
          >
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {days.map((day, index) => (
          <div key={index} className="p-0 text-center">
            {day ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  "h-10 w-full p-0 font-normal text-sm",
                  isSelected(day) && "bg-[#00501B] text-white hover:bg-[#00501B] hover:text-white",
                  isToday(day) && !isSelected(day) && "bg-gray-100 text-gray-900",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
                onClick={() => handleDateClick(day)}
                disabled={disabled}
              >
                {day}
              </Button>
            ) : (
              <div className="h-10 w-full"></div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
