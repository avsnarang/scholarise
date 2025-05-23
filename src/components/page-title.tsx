import React from "react";

interface PageTitleProps {
  heading: string;
  text?: string;
  actions?: React.ReactNode;
}

export function PageTitle({ heading, text, actions }: PageTitleProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{heading}</h1>
        {text && <p className="text-sm text-muted-foreground mt-1">{text}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
} 