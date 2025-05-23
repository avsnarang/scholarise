import React from "react";
import {
  Area,
  AreaChart as RechartsAreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";
import { cn } from "@/lib/utils";

interface AreaChartProps {
  data: any[];
  index: string;
  categories: string[];
  colors?: string[];
  valueFormatter?: (value: number) => string;
  showAnimation?: boolean;
  className?: string;
}

export function AreaChart({
  data,
  index,
  categories,
  colors = ["#2563eb", "#f59e0b"],
  valueFormatter = (value: number) => value.toString(),
  showAnimation = false,
  className,
}: AreaChartProps) {
  return (
    <div className={cn("w-full h-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsAreaChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis 
            dataKey={index} 
            tick={{ fontSize: 12 }} 
            tickLine={false} 
            axisLine={{ stroke: "#f0f0f0" }}
          />
          <YAxis 
            tick={{ fontSize: 12 }} 
            tickLine={false} 
            axisLine={false}
            tickFormatter={valueFormatter}
          />
          <Tooltip 
            formatter={(value: number) => [valueFormatter(value), ""]}
            labelFormatter={(label) => `${label}`}
            contentStyle={{ 
              borderRadius: "6px", 
              border: "1px solid #e5e7eb",
              boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)" 
            }}
          />
          {categories.map((category, index) => (
            <Area
              key={category}
              type="monotone"
              dataKey={category}
              stroke={colors[index % colors.length]}
              fill={colors[index % colors.length]}
              fillOpacity={0.15}
              strokeWidth={2}
              isAnimationActive={showAnimation}
              activeDot={{ r: 6, strokeWidth: 1, stroke: "#fff" }}
            />
          ))}
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
} 