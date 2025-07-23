"use client"

import * as React from "react"
import { Clock } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface TimePickerProps {
  value?: string // HH:MM format
  onChange: (time: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  format24?: boolean // Default to 24-hour format
}

export function TimePicker({
  value,
  onChange,
  placeholder = "Select time",
  disabled = false,
  className,
  format24 = false,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [hours, setHours] = React.useState<string>("")
  const [minutes, setMinutes] = React.useState<string>("")
  const [period, setPeriod] = React.useState<string>("AM")

  // Parse value when it changes
  React.useEffect(() => {
    if (value) {
      const [h, m] = value.split(":")
      if (format24) {
        setHours(h || "00")
        setMinutes(m || "00")
      } else {
        const hour24 = parseInt(h || "0")
        const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
        setHours(hour12.toString().padStart(2, "0"))
        setMinutes(m || "00")
        setPeriod(hour24 >= 12 ? "PM" : "AM")
      }
    }
  }, [value, format24])

  // Generate hours array
  const generateHours = () => {
    if (format24) {
      return Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"))
    } else {
      return Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, "0"))
    }
  }

  // Generate minutes array (every 1 minute)
  const generateMinutes = () => {
    return Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"))
  }

  // Format time for display
  const formatTime = (time?: string): string => {
    if (!time) return ""
    
    if (format24) {
      return time
    } else {
      const [h, m] = time.split(":")
      const hour24 = parseInt(h || "0")
      const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
      const periodDisplay = hour24 >= 12 ? "PM" : "AM"
      return `${hour12.toString().padStart(2, "0")}:${m} ${periodDisplay}`
    }
  }

  // Handle time change
  const handleTimeChange = () => {
    if (hours && minutes) {
      let finalTime: string
      
      if (format24) {
        finalTime = `${hours}:${minutes}`
      } else {
        let hour24 = parseInt(hours)
        if (period === "PM" && hour24 !== 12) {
          hour24 += 12
        } else if (period === "AM" && hour24 === 12) {
          hour24 = 0
        }
        finalTime = `${hour24.toString().padStart(2, "0")}:${minutes}`
      }
      
      onChange(finalTime)
      setOpen(false)
    }
  }

  // Prevent form submission when clicking the button
  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setOpen(!open)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="w-full">
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal cursor-pointer",
              !value && "text-muted-foreground",
              className
            )}
            disabled={disabled}
            onClick={handleButtonClick}
          >
            <Clock className="mr-2 h-4 w-4" />
            {value ? formatTime(value) : placeholder}
          </Button>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-6 z-50" align="start">
        <div className="space-y-6">
          <div className="text-sm font-medium text-center">Select Time</div>
          <div className="flex items-center gap-4">
            {/* Hours */}
            <div className="flex flex-col items-center gap-2">
              <label className="text-xs font-medium text-muted-foreground">
                {format24 ? "Hour" : "Hour"}
              </label>
              <Select value={hours} onValueChange={setHours}>
                <SelectTrigger className="w-20 cursor-pointer">
                  <SelectValue placeholder="00" />
                </SelectTrigger>
                <SelectContent className="z-50 max-h-48">
                  {generateHours().map((hour) => (
                    <SelectItem 
                      key={hour} 
                      value={hour}
                      className="cursor-pointer hover:bg-muted"
                    >
                      {hour}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="text-lg font-bold mt-6">:</div>

            {/* Minutes */}
            <div className="flex flex-col items-center gap-2">
              <label className="text-xs font-medium text-muted-foreground">Min</label>
              <Select value={minutes} onValueChange={setMinutes}>
                <SelectTrigger className="w-20 cursor-pointer">
                  <SelectValue placeholder="00" />
                </SelectTrigger>
                <SelectContent className="z-50 max-h-48">
                  {generateMinutes().map((minute) => (
                    <SelectItem 
                      key={minute} 
                      value={minute}
                      className="cursor-pointer hover:bg-muted"
                    >
                      {minute}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* AM/PM for 12-hour format */}
            {!format24 && (
              <>
                <div className="w-3" />
                <div className="flex flex-col items-center gap-2">
                  <label className="text-xs font-medium text-muted-foreground">Period</label>
                  <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger className="w-20 cursor-pointer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-50">
                      <SelectItem value="AM" className="cursor-pointer hover:bg-muted">AM</SelectItem>
                      <SelectItem value="PM" className="cursor-pointer hover:bg-muted">PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 cursor-pointer"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="flex-1 cursor-pointer"
              onClick={handleTimeChange}
              disabled={!hours || !minutes}
            >
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
} 