"use client";

import * as React from "react"
import * as RechartsPrimitive from "recharts"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: "", dark: ".dark" } as const

export type ChartConfig = Record<string, {
    label?: string;
    color?: string;
    theme?: {
      light: string;
      dark: string;
    };
    icon?: React.ComponentType<{ className?: string }>;
  }>;

type ChartContextProps = {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }

  return context
}

interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  config?: ChartConfig;
  children: React.ReactNode;
}

export function ChartContainer({
  config,
  children,
  className,
  ...props
}: ChartContainerProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Create CSS variables from the config - moved before conditional return
  const style = React.useMemo(() => {
    if (!config) return {};

    return Object.entries(config).reduce<React.CSSProperties>(
      (acc, [key, value]) => {
        if (value.color) {
          (acc as Record<string, string>)[`--color-${key}`] = value.color;
        }
        return acc;
      },
      {}
    );
  }, [config]);

  if (!mounted) {
    return (
      <div
        className={cn("flex items-center justify-center", className)}
        {...props}
      >
        <div className="h-full w-full animate-pulse rounded-md bg-muted/50" />
      </div>
    );
  }

  return (
    <ChartContext.Provider value={{ config: config || {} }}>
      <div
        className={cn("w-full overflow-hidden", className)}
        style={style}
        {...props}
      >
        {children}
      </div>
    </ChartContext.Provider>
  )
}

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(
    ([, config]) => config.theme || config.color
  )

  if (!colorConfig.length) {
    return null
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color =
      itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ||
      itemConfig.color
    return color ? `  --color-${key}: ${color};` : null
  })
  .join("\n")}
}
`
          )
          .join("\n"),
      }}
    />
  )
}

interface ChartTooltipProps {
  content: React.ReactNode;
  cursor?: boolean;
}

export function ChartTooltip({ content, cursor = false }: ChartTooltipProps) {
  return (
    <Tooltip content={content} cursor={cursor} />
  );
}

function Tooltip({
  content,
  cursor,
}: {
  content: React.ReactNode;
  cursor?: boolean;
}) {
  return (
    <React.Fragment>
      {cursor && <ChartCursor />}
      {content}
    </React.Fragment>
  );
}

function ChartCursor() {
  return null; // Placeholder for cursor component
}

interface ChartTooltipContentProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  labelKey?: string;
  nameKey?: string;
  hideLabel?: boolean;
  hideIndicator?: boolean;
  indicator?: "dot" | "line" | "dashed";
  labelClassName?: string;
  contentClassName?: string;
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  labelKey,
  nameKey,
  hideLabel = false,
  hideIndicator = false,
  indicator = "dot",
  labelClassName,
  contentClassName,
}: ChartTooltipContentProps) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-lg border bg-background p-2 shadow-md">
      {!hideLabel && (
        <div className={cn("mb-1 text-xs text-muted-foreground", labelClassName)}>
          {label || payload[0]?.payload?.[labelKey || "label"] || ""}
        </div>
      )}
      <div className={cn("space-y-1.5", contentClassName)}>
        {payload.map((entry, index) => {
          const color = entry.color || `var(--color-${entry.dataKey})`;
          const name = entry.name || 
            (nameKey && entry.payload?.[nameKey]) || 
            entry.dataKey;
          
          return (
            <div key={`item-${index}`} className="flex items-center gap-2">
              {!hideIndicator && (
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
              )}
              <span className="text-xs font-medium">{name}</span>
              <span className="ml-auto text-xs font-medium">
                {entry.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ChartLegendProps {
  content: React.ReactNode;
}

export function ChartLegend({ content }: ChartLegendProps) {
  return content;
}

interface ChartLegendContentProps {
  payload?: any[];
  nameKey?: string;
}

export function ChartLegendContent({
  payload,
  nameKey,
}: ChartLegendContentProps) {
  if (!payload?.length) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 pt-4">
      {payload.map((entry, index) => {
        const color = entry.color || `var(--color-${entry.dataKey})`;
        const name = entry.value || 
          (nameKey && entry.payload?.[nameKey]) || 
          entry.dataKey;
        
        return (
          <div key={`item-${index}`} className="flex items-center gap-1.5">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs font-medium">{name}</span>
          </div>
        );
      })}
    </div>
  );
}

// Helper to extract item config from a payload.
function getPayloadConfigFromPayload(
  config: ChartConfig,
  payload: unknown,
  key: string
) {
  if (typeof payload !== "object" || payload === null) {
    return undefined
  }

  const payloadPayload =
    "payload" in payload &&
    typeof payload.payload === "object" &&
    payload.payload !== null
      ? payload.payload
      : undefined

  let configLabelKey: string = key

  if (
    key in payload &&
    typeof payload[key as keyof typeof payload] === "string"
  ) {
    configLabelKey = payload[key as keyof typeof payload] as string
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof payloadPayload[key as keyof typeof payloadPayload] === "string"
  ) {
    configLabelKey = payloadPayload[
      key as keyof typeof payloadPayload
    ] as string
  }

  return configLabelKey in config
    ? config[configLabelKey]
    : config[key]
}
