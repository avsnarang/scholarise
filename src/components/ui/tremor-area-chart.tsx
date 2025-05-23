"use client";

import { AreaChart as TremorAreaChart, Card, Title, Subtitle } from "@tremor/react";

interface AreaChartProps {
  data: any[];
  index: string;
  categories: string[];
  colors?: string[];
  valueFormatter?: (value: number) => string;
  showAnimation?: boolean;
  title?: string;
  subtitle?: string;
  className?: string;
}

export function AreaChart({
  data,
  index,
  categories,
  colors = ["#00501B", "#A65A20"],
  valueFormatter = (value: number) => `${value}`,
  showAnimation = true,
  title,
  subtitle,
  className
}: AreaChartProps) {
  return (
    <div className={className}>
      {title && <Title className="text-base font-medium">{title}</Title>}
      {subtitle && <Subtitle className="text-xs text-muted-foreground">{subtitle}</Subtitle>}
      <TremorAreaChart
        data={data}
        index={index}
        categories={categories}
        colors={colors}
        valueFormatter={valueFormatter}
        showAnimation={showAnimation}
        className="mt-4 h-72"
        yAxisWidth={48}
        autoMinValue
        connectNulls
        curveType="monotone"
      />
    </div>
  );
} 