"use client";

import React from "react";
import { useTheme } from "next-themes";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sun, Moon, Monitor, ChevronDown } from "lucide-react";

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  const themes = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ] as const;

  const defaultTheme = { value: "system", label: "System", icon: Monitor };
  
  // Ensure we always have a valid theme
  const currentTheme = themes.find(t => t.value === theme) ?? defaultTheme;
  const IconComponent = currentTheme.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-8 w-full items-center gap-2 rounded-lg bg-muted/30 hover:bg-muted/50 px-3 py-1 transition-colors">
        <IconComponent className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="text-xs font-medium truncate">{currentTheme.label}</span>
        </div>
        <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[180px]" align="start">
        {themes.map((themeOption) => {
          const Icon = themeOption.icon;
          return (
            <DropdownMenuItem
              key={themeOption.value}
              onClick={() => setTheme(themeOption.value)}
              className="flex items-center gap-2 cursor-pointer hover:cursor-pointer"
            >
              <Icon className="h-3 w-3" />
              <span className="text-xs">{themeOption.label}</span>
              {theme === themeOption.value && (
                <div className="ml-auto">
                  <div className="h-2 w-2 rounded-full bg-primary"></div>
                </div>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 