"use client";

import { BarChart as TremorBarChart, Card, Title, Subtitle } from "@tremor/react";

interface BarChartProps {
  data: any[];
  xAxisKey?: string;
  yAxisKey?: string;
  color?: string;
  colors?: string[];
  showAnimation?: boolean;
  valueFormatter?: (value: number) => string;
  title?: string;
  subtitle?: string;
  className?: string;
}

export function BarChart({
  data,
  xAxisKey = "name",
  yAxisKey = "value",
  color,
  colors = ["#00501B"],
  showAnimation = true,
  valueFormatter = (value: number) => `${value}`,
  title,
  subtitle,
  className
}: BarChartProps) {
  // Prepare data for Tremor
  const categories = [yAxisKey]; 
  
  // Use either the color or first color from colors array
  const chartColors = color ? [color] : colors;
  
  return (
    <div className={className}>
      {title && <Title className="text-base font-medium">{title}</Title>}
      {subtitle && <Subtitle className="text-xs text-muted-foreground">{subtitle}</Subtitle>}
      <TremorBarChart
        data={data}
        index={xAxisKey}
        categories={categories}
        colors={chartColors}
        valueFormatter={valueFormatter}
        showAnimation={showAnimation}
        className="mt-4 h-72"
        yAxisWidth={48}
      />
    </div>
  );
} 