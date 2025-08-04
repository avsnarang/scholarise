"use client";

import React from "react";
import { useGlobalLoading } from "@/providers/global-loading-provider";
import { useTheme } from "next-themes";

export function GlobalLoadingOverlay() {
  const { isLoading, message } = useGlobalLoading();
  const { theme } = useTheme();

  if (!isLoading) return null;

      return (
      <div className="fixed inset-0 z-[999999] flex items-center justify-center backdrop-blur-xs">
        {/* Translucent background overlay with reduced opacity to show blurred content */}
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{
            backgroundColor:
              theme === "dark"
                ? "rgba(0, 80, 27, 0.15)" // Reduced opacity to show content below
                : "rgba(0, 80, 27, 0.05)", // Very light overlay for light mode
          }}
        />

        {/* Loading content with enhanced backdrop */}
        <div className="relative z-999999 flex flex-col items-center gap-4 rounded-2xl px-8 py-10 backdrop-blur-md bg-white/10 dark:bg-black/20 border border-white/20 dark:border-white/10 shadow-2xl">
          {/* Enhanced loading circle with glow effect */}
          <div className="relative">
            {/* Glow effect behind the spinner */}
            <div
              className="absolute inset-0 rounded-full blur-lg opacity-30"
              style={{
                backgroundColor: theme === "dark" ? "#7AAD8B" : "#00501B",
              }}
            />
            
            {/* Outer spinning ring */}
            <div
              className="relative h-16 w-16 animate-spin rounded-full border-4 border-transparent"
              style={{
                borderTopColor: theme === "dark" ? "#7AAD8B" : "#00501B", // Primary color
                borderRightColor: theme === "dark" ? "#7AAD8B" : "#00501B",
                filter: "drop-shadow(0 0 8px rgba(0, 80, 27, 0.3))",
              }}
            />

            {/* Inner static circle with enhanced visibility */}
            <div
              className="absolute inset-3 rounded-full opacity-30"
              style={{
                backgroundColor: theme === "dark" ? "#7AAD8B" : "#00501B",
              }}
            />
          </div>

          {/* Loading message with enhanced visibility */}
          <div className="text-center">
            <h3
              className="mb-1 text-lg font-semibold drop-shadow-lg"
              style={{
                color: theme === "dark" ? "#e2e8f0" : "#1f2937",
                textShadow: theme === "dark" 
                  ? "0 2px 4px rgba(0, 0, 0, 0.8)" 
                  : "0 2px 4px rgba(255, 255, 255, 0.8)",
              }}
            >
              {message}
            </h3>
            <p
              className="text-sm opacity-80 drop-shadow-md"
              style={{
                color: theme === "dark" ? "#a0aec0" : "#6b7280",
                textShadow: theme === "dark" 
                  ? "0 1px 2px rgba(0, 0, 0, 0.6)" 
                  : "0 1px 2px rgba(255, 255, 255, 0.6)",
              }}
            >
              Please wait...
            </p>
          </div>
        </div>
      </div>
  );
}