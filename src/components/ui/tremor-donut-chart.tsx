"use client";

import { Card, DonutChart as TremorDonutChart, Title, Legend } from "@tremor/react";

interface ChartData {
  name: string;
  value: number;
}

interface DonutChartProps {
  data: ChartData[];
  colors?: string[];
  valueFormatter?: (value: number) => string;
  showAnimation?: boolean;
  className?: string;
  title?: string;
  showLegend?: boolean;
}

export function DonutChart({
  data,
  colors = ["#00501B", "#A65A20", "#0747A1", "#7A1113"],
  valueFormatter = (value: number) => `${value}`,
  showAnimation = true,
  className,
  title,
  showLegend = true
}: DonutChartProps) {
  return (
    <div className={className}>
      {title && <Title className="text-center mb-4">{title}</Title>}
      <TremorDonutChart
        data={data}
        category="value"
        index="name"
        colors={colors}
        valueFormatter={valueFormatter}
        showAnimation={showAnimation}
        className="mt-6"
      />
      {showLegend && (
        <Legend
          categories={data.map(item => item.name)}
          colors={colors}
          className="mt-4 justify-center"
        />
      )}
    </div>
  );
} 