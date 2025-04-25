"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className="h-9 w-9 border-gray-200 dark:border-[#5c5c8a] dark:bg-[#2d2d4d] dark:hover:bg-[#38385e] dark:text-[#e6e6f5]"
        >
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-[#A65A20]" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 dark:text-[#b0a8e2]" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="dark:bg-[#2d2d4d] dark:border-[#5c5c8a]">
        <DropdownMenuItem 
          onClick={() => setTheme("light")}
          className="dark:hover:bg-[#38385e] dark:focus:bg-[#38385e] dark:text-[#e6e6f5]"
        >
          <Sun className="mr-2 h-4 w-4 text-[#A65A20]" />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("dark")}
          className="dark:hover:bg-[#38385e] dark:focus:bg-[#38385e] dark:text-[#e6e6f5]"
        >
          <Moon className="mr-2 h-4 w-4 dark:text-[#b0a8e2]" />
          <span>Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("system")}
          className="dark:hover:bg-[#38385e] dark:focus:bg-[#38385e] dark:text-[#e6e6f5]"
        >
          <span className="mr-2 h-4 w-4 flex items-center justify-center">💻</span>
          <span>System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 