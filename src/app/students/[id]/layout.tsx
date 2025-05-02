"use client";

import { useEffect } from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  // We don't need another AppLayout wrapper here
  return children;
}
