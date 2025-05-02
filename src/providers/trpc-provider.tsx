"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { api, getClientConfig } from "@/utils/api";
import superjson from "superjson";

export function TRPCProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Add a retry configuration to make requests more resilient
        retry: 3,
        retryDelay: 1000,
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
      },
    },
  }));
  
  // Add data validation and error handling logging
  if (typeof window !== 'undefined') {
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      // Log to original console.error
      originalConsoleError(...args);
      
      // Check for array-related errors
      const errorString = args.join(' ');
      if (errorString.includes('is not an array') || errorString.includes('is not iterable')) {
        console.warn('Data type error detected! This might be because an API returned an object instead of an array.');
        // For debugging - add additional info here
        if (args[0] && typeof args[0] === 'object') {
          console.warn('Data structure received:', JSON.stringify(args[0], null, 2));
        }
      }
    };
  }
  
  const [trpcClient] = useState(() => api.createClient(getClientConfig()));

  return (
    <api.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </api.Provider>
  );
} 