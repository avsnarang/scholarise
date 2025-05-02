"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from "next-themes";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [mounted, setMounted] = React.useState(false);

  // Prevent hydration mismatch by only rendering after first mount
  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
      {...props}
      // Force light theme during SSR to match HTML attribute
      forcedTheme={mounted ? undefined : "light"}
    >
      {children}
    </NextThemesProvider>
  );
}
