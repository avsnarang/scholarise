"use client";

import * as React from "react";
import {
  Area,
  AreaChart as RechartsAreaChart,
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart as RechartsLineChart,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Label,
  LabelList
} from "recharts";
import { cn } from "@/lib/utils";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "./chart";

// Color palettes
const COLORS = {
  primary: "#00501B",
  secondary: "#A65A20",
  tertiary: "#0747A1",
  quaternary: "#7A1113",
  background: "rgba(255, 255, 255, 0.9)",
  border: "rgba(0, 0, 0, 0.1)",
  text: "#374151",
  muted: "#94a3b8"
};

// DonutChart Component
interface DonutChartProps {
  data: { name: string; value: number }[];
  colors?: string[];
  innerRadius?: number;
  outerRadius?: number;
  valueFormatter?: (value: number) => string;
  showAnimation?: boolean;
  showLegend?: boolean;
  className?: string;
  containerClassName?: string;
  title?: string;
  subtitle?: string;
}

export function DonutChart({
  data,
  colors = [COLORS.primary, COLORS.secondary, COLORS.tertiary, COLORS.quaternary],
  innerRadius = 60,
  outerRadius = 80,
  valueFormatter = (value: number) => `${value}`,
  showAnimation = true,
  showLegend = true,
  className,
  containerClassName,
  title,
  subtitle
}: DonutChartProps) {
  // Calculate total for center text
  const total = React.useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data]);
  
  // Create chart config for Shadcn chart container
  const chartConfig = React.useMemo(() => {
    return data.reduce((acc, item, index) => {
      acc[item.name] = {
        label: item.name,
        color: colors[index % colors.length] || COLORS.primary
      };
      return acc;
    }, {} as Record<string, { label: string; color: string }>);
  }, [data, colors]);

  return (
    <ChartContainer config={chartConfig} className={cn("h-80", containerClassName)}>
      {title && (
        <div className="mb-2 text-center">
          <h4 className="text-base font-medium">{title}</h4>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      )}
      <ResponsiveContainer width="100%" height={title ? "90%" : "100%"}>
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            fill={COLORS.primary}
            dataKey="value"
            nameKey="name"
            className={className}
            isAnimationActive={showAnimation}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length] || COLORS.primary} />
            ))}
          </Pie>
          
          {/* Add center text showing total */}
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-lg font-medium"
          >
            {valueFormatter(total)}
          </text>
          
          <ChartTooltip content={<ChartTooltipContent labelKey="name" />} />
          {showLegend && <ChartLegend content={<ChartLegendContent nameKey="name" />} />}
        </RechartsPieChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

// BarChart Component
interface BarChartProps {
  data: any[];
  xAxisKey?: string;
  yAxisKey?: string;
  color?: string;
  colors?: string[];
  showXAxis?: boolean;
  showYAxis?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  showLegend?: boolean;
  showAnimation?: boolean;
  valueFormatter?: (value: number) => string;
  className?: string;
  containerClassName?: string;
  title?: string;
  subtitle?: string;
}

export function BarChart({
  data,
  xAxisKey = "name",
  yAxisKey = "value",
  color = COLORS.primary,
  colors,
  showXAxis = true,
  showYAxis = true,
  showGrid = true,
  showTooltip = true,
  showLegend = false,
  showAnimation = true,
  valueFormatter = (value: number) => `${value}`,
  className,
  containerClassName,
  title,
  subtitle
}: BarChartProps) {
  // If we have multiple data keys (not just xAxisKey and yAxisKey), set up for multiple bars
  const dataKeys = React.useMemo(() => {
    if (!data.length) return [yAxisKey];
    
    // Get all keys except the xAxis key
    const firstItem = data[0];
    return Object.keys(firstItem).filter(
      key => key !== xAxisKey && typeof firstItem[key] === "number"
    );
  }, [data, xAxisKey, yAxisKey]);

  // Create chart config for Shadcn chart container
  const chartConfig = React.useMemo(() => {
    const config: Record<string, { label: string; color: string }> = {};
    
    dataKeys.forEach((key, index) => {
      config[key] = {
        label: key,
        color: (colors ? colors[index % colors.length] : color) || COLORS.primary
      };
    });
    
    return config;
  }, [dataKeys, color, colors]);

  return (
    <ChartContainer config={chartConfig} className={cn("h-80", containerClassName)}>
      {title && (
        <div className="mb-2">
          <h4 className="text-base font-medium">{title}</h4>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      )}
      <ResponsiveContainer width="100%" height={title ? "90%" : "100%"}>
        <RechartsBarChart data={data} className={className}>
          {showGrid && <CartesianGrid vertical={false} strokeDasharray="3 3" />}
          {showXAxis && (
            <XAxis
              dataKey={xAxisKey}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickMargin={10}
            />
          )}
          {showYAxis && (
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={valueFormatter}
            />
          )}
          {showTooltip && (
            <ChartTooltip 
              cursor={true}
              content={<ChartTooltipContent />} 
            />
          )}
          {showLegend && <ChartLegend content={<ChartLegendContent />} />}
          
          {dataKeys.length > 1 ? (
            // Multiple bars
            dataKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={colors ? colors[index % colors.length] : color}
                radius={[4, 4, 0, 0]}
                isAnimationActive={showAnimation}
              >
                <LabelList 
                  dataKey={key} 
                  position="top" 
                  formatter={valueFormatter}
                  style={{ fontSize: 10, fill: '#6b7280' }}
                />
              </Bar>
            ))
          ) : (
            // Single bar
            <Bar
              dataKey={yAxisKey}
              fill={color}
              radius={[4, 4, 0, 0]}
              isAnimationActive={showAnimation}
            >
              <LabelList 
                dataKey={yAxisKey} 
                position="top" 
                formatter={valueFormatter}
                style={{ fontSize: 10, fill: '#6b7280' }}
              />
            </Bar>
          )}
        </RechartsBarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

// AreaChart Component
interface AreaChartProps {
  data: any[];
  index: string;
  categories: string[];
  colors?: string[];
  showXAxis?: boolean;
  showYAxis?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  showLegend?: boolean;
  showAnimation?: boolean;
  valueFormatter?: (value: number) => string;
  className?: string;
  containerClassName?: string;
  title?: string;
  subtitle?: string;
}

export function AreaChart({
  data,
  index,
  categories,
  colors = [COLORS.primary, COLORS.secondary],
  showXAxis = true,
  showYAxis = true,
  showGrid = true,
  showTooltip = true,
  showLegend = true,
  showAnimation = true,
  valueFormatter = (value: number) => `${value}`,
  className,
  containerClassName,
  title,
  subtitle
}: AreaChartProps) {
  // Create chart config for Shadcn chart container
  const chartConfig = React.useMemo(() => {
    return categories.reduce((acc, category, i) => {
      acc[category] = {
        label: category,
        color: colors[i % colors.length] || COLORS.primary
      };
      return acc;
    }, {} as Record<string, { label: string; color: string }>);
  }, [categories, colors]);

  return (
    <ChartContainer config={chartConfig} className={cn("h-80", containerClassName)}>
      {title && (
        <div className="mb-2">
          <h4 className="text-base font-medium">{title}</h4>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      )}
      <ResponsiveContainer width="100%" height={title ? "90%" : "100%"}>
        <RechartsAreaChart data={data} className={className}>
          {showGrid && <CartesianGrid vertical={false} strokeDasharray="3 3" />}
          {showXAxis && (
            <XAxis
              dataKey={index}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickMargin={10}
            />
          )}
          {showYAxis && (
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={valueFormatter}
            />
          )}
          {showTooltip && (
            <ChartTooltip 
              cursor={true}
              content={<ChartTooltipContent />} 
            />
          )}
          {showLegend && <ChartLegend content={<ChartLegendContent />} />}
          
          {/* Define gradients for each area */}
          <defs>
            {categories.map((key, index) => (
              <linearGradient key={`gradient-${key}`} id={`color-${key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors[index % colors.length] || COLORS.primary} stopOpacity={0.3} />
                <stop offset="95%" stopColor={colors[index % colors.length] || COLORS.primary} stopOpacity={0.05} />
              </linearGradient>
            ))}
          </defs>
          
          {categories.map((key, index) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stroke={colors[index % colors.length] || COLORS.primary}
              fill={`url(#color-${key})`}
              strokeWidth={2}
              isAnimationActive={showAnimation}
              activeDot={{ r: 6, strokeWidth: 1, stroke: "#fff" }}
            />
          ))}
        </RechartsAreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
} 