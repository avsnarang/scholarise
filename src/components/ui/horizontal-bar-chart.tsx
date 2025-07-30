"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'

export interface TooltipProps {
  active?: boolean
  payload?: any[]
  label?: string | number
  [key: string]: any
}

interface HorizontalBarChartProps {
  data: any[]
  index: string
  categories: string[]
  colors: string[]
  valueFormatter?: (value: number) => string
  xAxisWidth?: number
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
  purple: { light: "#a855f7", dark: "#c084fc" },
  pink: { light: "#ec4899", dark: "#f472b6" },
  yellow: { light: "#eab308", dark: "#facc15" },
  gray: { light: "#6b7280", dark: "#9ca3af" },
  indigo: { light: "#6366f1", dark: "#818cf8" },
}

const DefaultTooltip = ({ payload, active, label, valueFormatter = (value: number) => value.toLocaleString() }: TooltipProps & { valueFormatter?: (value: number) => string }) => {
  if (!active || !payload || payload.length === 0) return null

  // Detect dark mode at render time
  const isDarkMode = typeof window !== 'undefined' && document.documentElement.classList.contains('dark')
  const headerBg = isDarkMode ? '#7AAD8B' : '#00501B'

  const data = payload.filter(item => item.value > 0).map((item) => ({
    category: item.dataKey as string,
    value: item.value,
    color: item.color,
  }))

  const total = payload.reduce((sum, item) => sum + (item.value || 0), 0)

  return (
    <>
      <div 
        className="custom-tooltip-header w-60 rounded-md border border-gray-500/10 px-4 py-1.5 text-sm shadow-md dark:border-gray-400/20"
        style={{ 
          backgroundColor: headerBg,
          background: headerBg
        }}
      >
        <p className="flex items-center justify-between">
          <span className="text-gray-50 dark:text-gray-50">Category</span>
          <span className="font-medium text-gray-50 dark:text-gray-50">
            {label}
          </span>
        </p>
      </div>
      <div className="mt-1 w-60 space-y-1 rounded-md border border-gray-500/10 bg-white px-4 py-2 text-sm shadow-md dark:border-gray-400/20 dark:bg-gray-900">
        <div className="mb-2 flex items-center justify-between border-b border-gray-200 pb-2 dark:border-gray-600">
          <span className="font-medium text-gray-700 dark:text-gray-300">
            Total
          </span>
          <span className="font-semibold text-gray-900 dark:text-gray-50">
            {valueFormatter(total)}
          </span>
        </div>
        {data.map((item, index) => (
          <div key={index} className="flex items-center space-x-2.5">
            <div className="flex w-full justify-between">
              <div className="flex items-center space-x-2">
                <div 
                  className="h-2 w-2 rounded-full" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-gray-700 dark:text-gray-300">
                  {item.category}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="font-medium text-gray-900 dark:text-gray-50">
                  {valueFormatter(item.value)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

export function HorizontalBarChart({
  data,
  index,
  categories,
  colors,
  valueFormatter = (value: number) => value.toLocaleString(),
  xAxisWidth = 80,
  showLegend = true,
  customTooltip,
  className,
}: HorizontalBarChartProps) {
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    // Check if dark mode is enabled
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'))
    }

    checkDarkMode()

    // Listen for changes to dark mode
    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })

    return () => observer.disconnect()
  }, [])

  // Get actual color for each category based on current theme
  const getColor = (colorKey: string) => {
    const colorConfig = colorMap[colorKey] ?? { light: "#6b7280", dark: "#9ca3af" }
    return isDarkMode ? colorConfig.dark : colorConfig.light
  }

  return (
    <div className={cn("w-full", className)}>
      <style dangerouslySetInnerHTML={{
        __html: `
          /* Override dashboard global styles for our custom tooltip */
          .recharts-tooltip-wrapper [style*="background-color: rgb(0, 80, 27)"] {
            background-color: #00501B !important;
          }
          .dark .recharts-tooltip-wrapper [style*="background-color: rgb(122, 173, 139)"] {
            background-color: #7AAD8B !important;
          }
          /* More specific override */
          .recharts-tooltip-wrapper div[style*="background"] {
            background-color: var(--tooltip-bg) !important;
          }
          :root {
            --tooltip-bg: #00501B;
          }
          .dark {
            --tooltip-bg: #7AAD8B;
          }
          /* Specific class override */
          .custom-tooltip-header {
            background-color: var(--tooltip-bg) !important;
            background: var(--tooltip-bg) !important;
          }
        `
      }} />
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={data} 
          layout="horizontal"
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
          <XAxis 
            type="number"
            className="text-gray-600 dark:text-gray-300"
            tick={{ fontSize: 12 }}
            tickFormatter={valueFormatter}
          />
          <YAxis 
            type="category"
            dataKey={index} 
            width={xAxisWidth}
            className="text-gray-600 dark:text-gray-300"
            tick={{ fontSize: 12 }}
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
              content={<DefaultTooltip valueFormatter={valueFormatter} />}
              wrapperStyle={{ 
                backgroundColor: 'transparent',
                border: 'none',
                boxShadow: 'none',
                outline: 'none'
              }}
              cursor={false}
            />
          )}
          {categories.map((category, index) => {
            const colorKey = colors[index] || 'gray'
            const fillColor = getColor(colorKey)
            
            return (
              <Bar
                key={category}
                dataKey={category}
                fill={fillColor}
                radius={[0, 4, 4, 0]}
              />
            )
          })}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
} 