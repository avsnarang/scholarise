"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ThemeOption {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const themeOptions: ThemeOption[] = [
  {
    value: "light",
    label: "Light",
    icon: Sun,
    description: "Light mode"
  },
  {
    value: "dark", 
    label: "Dark",
    icon: Moon,
    description: "Dark mode"
  },
  {
    value: "system",
    label: "System",
    icon: Monitor,
    description: "Follow system preference"
  }
];

export function MinimalThemeToggle() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // Only run on client side after mount to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Find current theme, default to system
  // Use system as fallback during SSR to prevent hydration mismatch
  const currentTheme = themeOptions.find(option => option.value === theme) || themeOptions[2];
  const CurrentIcon = mounted ? (currentTheme?.icon || Monitor) : Monitor; // Default to Monitor during SSR
  
  const handleThemeSelect = (themeValue: string) => {
    setTheme(themeValue);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex h-9 items-center rounded-lg py-2 text-sm transition-all",
            "bg-transparent hover:bg-gray-50/50",
            "dark:hover:bg-[#303030]/50",
            "focus:outline-none",
            // Responsive layout
            "w-9 justify-center px-2", // Mobile: icon-only, centered
            "md:w-auto md:justify-start md:gap-2 md:px-3" // Desktop: full width with text
          )}
        >
          <CurrentIcon className="h-4 w-4 text-gray-500 dark:text-[#808080] flex-shrink-0" />
          <span className="hidden md:inline text-gray-500 dark:text-[#808080] truncate">
            {mounted ? (currentTheme?.label || "System") : "System"}
          </span>
        </button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-[200px] p-0 border-0 shadow-sm bg-white dark:bg-[#303030]"
        align="end"
        alignOffset={0}
        sideOffset={4}
      >
        <div className="py-1">
          <div className="px-3 py-2 text-xs font-medium text-gray-400 dark:text-[#606060]">
            Theme Preference
          </div>
          {themeOptions.map((option) => {
            const isSelected = mounted && option.value === theme;
            const IconComponent = option.icon;
            
            return (
              <button
                key={option.value}
                onClick={() => handleThemeSelect(option.value)}
                className={cn(
                  "flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors",
                  "hover:bg-gray-50 dark:hover:bg-[#404040]",
                  isSelected && "bg-gray-50 dark:bg-[#404040]"
                )}
              >
                <div className="flex items-center gap-3">
                  <IconComponent className={cn(
                    "h-4 w-4 flex-shrink-0",
                    option.value === "light" && "text-orange-500 dark:text-orange-400",
                    option.value === "dark" && "text-blue-500 dark:text-blue-400", 
                    option.value === "system" && "text-gray-500 dark:text-[#808080]"
                  )} />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-gray-900 dark:text-[#e6e6e6]">
                      {option.label}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-[#808080]">
                      {option.description}
                    </span>
                  </div>
                </div>
                {isSelected && (
                  <Check className="h-4 w-4 text-gray-900 dark:text-[#e6e6e6] flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}