import React from "react";
import { cn } from "@/lib/utils";

export interface ProgressCircleProps {
  value: number;
  size?: "small" | "medium" | "large";
  color?: string;
  showAnimation?: boolean;
  className?: string;
}

export function ProgressCircle({
  value,
  size = "medium",
  color = "#000",
  showAnimation = false,
  className,
}: ProgressCircleProps) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  
  const sizes = {
    small: 80,
    medium: 120,
    large: 160,
  };
  
  const svgSize = sizes[size];
  const strokeWidth = size === "small" ? 4 : 6;
  
  return (
    <div className={cn("relative inline-flex", className)}>
      <svg
        width={svgSize}
        height={svgSize}
        viewBox="0 0 100 100"
        className={cn(
          "transform -rotate-90",
          showAnimation && "transition-all duration-1000 ease-in-out"
        )}
      >
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-100"
        />
        
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={showAnimation ? circumference : offset}
          strokeLinecap="round"
          className={showAnimation ? "transition-all duration-1000 ease-in-out" : ""}
          style={showAnimation ? { strokeDashoffset: offset } : {}}
        />
      </svg>
    </div>
  );
} 