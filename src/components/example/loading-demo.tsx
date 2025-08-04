"use client";

import React from "react";
import { useGlobalLoading } from "@/providers/global-loading-provider";
import { useAsyncWithLoading } from "@/hooks/useLoadingState";
import { Button } from "@/components/ui/button";

/**
 * Example component demonstrating the global loading system
 * This component shows different ways to use the global loading overlay
 */
export function LoadingDemo() {
  const globalLoading = useGlobalLoading();
  const executeWithLoading = useAsyncWithLoading();

  const handleManualLoading = () => {
    globalLoading.show("Manual loading example...");
    
    setTimeout(() => {
      globalLoading.hide();
    }, 2000);
  };

  const handleAsyncOperation = async () => {
    await executeWithLoading(
      async () => {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        console.log("Async operation completed");
      },
      "Processing async operation..."
    );
  };

  const handleDataFetching = () => {
    globalLoading.show("Fetching user data...");
    
    // Simulate data fetching
    setTimeout(() => {
      globalLoading.show("Processing data...");
      
      setTimeout(() => {
        globalLoading.hide();
      }, 1000);
    }, 1500);
  };

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-semibold">Global Loading System Demo</h2>
      <p className="text-muted-foreground">
        Click the buttons below to test the global loading overlay with different messages.
      </p>
      
      <div className="space-y-2">
        <Button onClick={handleManualLoading} className="w-full">
          Test Manual Loading (2s)
        </Button>
        
        <Button onClick={handleAsyncOperation} variant="secondary" className="w-full">
          Test Async Operation (1.5s)
        </Button>
        
        <Button onClick={handleDataFetching} variant="outline" className="w-full">
          Test Data Fetching (2.5s)
        </Button>
      </div>
      
      <div className="mt-6 p-4 bg-muted rounded-lg">
        <h3 className="font-medium mb-2">Usage Examples:</h3>
        <div className="space-y-2 text-sm">
          <div>
            <code className="bg-background px-2 py-1 rounded">
              globalLoading.show("Custom message...")
            </code>
          </div>
          <div>
            <code className="bg-background px-2 py-1 rounded">
              globalLoading.hide()
            </code>
          </div>
          <div>
            <code className="bg-background px-2 py-1 rounded">
              useLoadingState(isLoading, "Message")
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}