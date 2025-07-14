"use client"

import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'

export interface TooltipProps {
  active?: boolean
  payload?: any[]
  label?: string | number
  [key: string]: any
}

interface LineChartProps {
  data: any[]
  index: string
  categories: string[]
  colors: string[]
  valueFormatter?: (value: number) => string
  yAxisWidth?: number
  showLegend?: boolean
  customTooltip?: any
  className?: string
}

const colorMap: Record<string, { light: string; dark: string }> = {
  blue: { light: "#3b82f6", dark: "#60a5fa" },
  cyan: { light: "#06b6d4", dark: "#22d3ee" },
  violet: { light: "#8b5cf6", dark: "#a78bfa" },
  emerald: { light: "#10b981", dark: "#34d399" },
  amber: { light: "#A65A20", dark: "#C27C54" },
  red: { light: "#ef4444", dark: "#f87171" },
  green: { light: "#00501B", dark: "#7AAD8B" },
  pgreen: { light: "#ef4444", dark: "#7AAD8B" },
  purple: { light: "#a855f7", dark: "#c084fc" },
  pink: { light: "#ec4899", dark: "#f472b6" },
  yellow: { light: "#eab308", dark: "#facc15" },
  gray: { light: "#6b7280", dark: "#9ca3af" },
};

export function LineChart({
  data,
  index,
  categories,
  colors,
  valueFormatter = (value) => value.toString(),
  yAxisWidth = 48,
  showLegend = true,
  customTooltip,
  className,
}: LineChartProps) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check if dark mode is enabled
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };

    checkDarkMode();

    // Listen for changes to dark mode
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  // Get actual color for each category based on current theme
  const getColor = (colorKey: string) => {
    const colorConfig = colorMap[colorKey] ?? { light: "#6b7280", dark: "#9ca3af" };
    return isDarkMode ? colorConfig.dark : colorConfig.light;
  };

  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
          <XAxis 
            dataKey={index} 
            className="text-gray-600 dark:text-gray-300"
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            width={yAxisWidth}
            className="text-gray-600 dark:text-gray-300"
            tick={{ fontSize: 12 }}
            tickFormatter={valueFormatter}
          />
          {customTooltip ? (
            <Tooltip 
              content={customTooltip}
              wrapperStyle={{ 
                backgroundColor: 'transparent',
                border: 'none',
                boxShadow: 'none',
                outline: 'none'
              }}
              cursor={false}
            />
          ) : (
            <Tooltip 
              formatter={valueFormatter}
              labelStyle={{ color: 'var(--foreground)' }}
              contentStyle={{ 
                backgroundColor: 'var(--background)', 
                border: '1px solid var(--border)',
                borderRadius: '6px'
              }}
            />
          )}
          {categories.map((category, index) => {
            const colorKey = colors[index] || 'gray';
            const strokeColor = getColor(colorKey);
            
            return (
              <Line
                key={category}
                type="monotone"
                dataKey={category}
                stroke={strokeColor}
                strokeWidth={3}
                dot={{ fill: strokeColor, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: strokeColor, strokeWidth: 2, fill: strokeColor }}
                connectNulls={false}
              />
            )
          })}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  )
} 