"use client"

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'

export interface TooltipProps {
  active?: boolean
  payload?: any[]
  label?: string | number
  [key: string]: any
}

interface DonutChartProps {
  data: Array<{ name: string; value: number }>
  colors?: string[]
  valueFormatter?: (value: number) => string
  innerRadius?: number
  outerRadius?: number
  showLegend?: boolean
  showLabel?: boolean
  customTooltip?: any
  className?: string
  centerContent?: React.ReactNode
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

const defaultColors = ['green', 'amber', 'red', 'blue', 'violet', 'indigo', 'cyan', 'pink']

const DefaultTooltip = ({ active, payload, valueFormatter = (value: number) => value.toLocaleString() }: TooltipProps & { valueFormatter?: (value: number) => string }) => {
  if (!active || !payload || payload.length === 0) return null

  // Detect dark mode at render time
  const isDarkMode = typeof window !== 'undefined' && document.documentElement.classList.contains('dark')
  const headerBg = isDarkMode ? '#7AAD8B' : '#00501B'

  const item = payload[0]
  if (!item) return null

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
            {item.name}
          </span>
        </p>
      </div>
      <div className="mt-1 w-60 space-y-1 rounded-md border border-gray-500/10 bg-white px-4 py-2 text-sm shadow-md dark:border-gray-400/20 dark:bg-gray-900">
        <div className="flex items-center space-x-2.5">
          <div className="flex w-full justify-between">
            <div className="flex items-center space-x-2">
              <div 
                className="h-3 w-3 rounded-full" 
                style={{ backgroundColor: item.color }}
              />
              <span className="text-gray-700 dark:text-gray-300">
                {item.name}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="font-medium text-gray-900 dark:text-gray-50">
                {valueFormatter(item.value)}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Percentage
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-50">
              {item.percent}%
            </span>
          </div>
        </div>
      </div>
    </>
  )
}

export function DonutChart({
  data,
  colors = defaultColors,
  valueFormatter = (value: number) => value.toLocaleString(),
  innerRadius = 60,
  outerRadius = 90,
  showLegend = true,
  showLabel = false,
  customTooltip,
  className,
  centerContent,
}: DonutChartProps) {
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

  // Get actual color for each segment based on current theme
  const getColor = (colorKey: string) => {
    const colorConfig = colorMap[colorKey] ?? { light: "#6b7280", dark: "#9ca3af" }
    return isDarkMode ? colorConfig.dark : colorConfig.light
  }

  // Calculate total for center content
  const total = data.reduce((sum, item) => sum + item.value, 0)

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
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            dataKey="value"
            nameKey="name"
            label={showLabel}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={getColor(colors[index % colors.length] || 'gray')} 
              />
            ))}
          </Pie>
          {customTooltip ? (
            <Tooltip 
              content={customTooltip}
              wrapperStyle={{ 
                backgroundColor: 'transparent',
                border: 'none',
                boxShadow: 'none',
                outline: 'none'
              }}
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
            />
          )}
          {showLegend && (
            <Legend 
              verticalAlign="bottom" 
              height={36}
              wrapperStyle={{
                fontSize: '14px',
                color: isDarkMode ? '#e5e7eb' : '#374151'
              }}
            />
          )}
          
          {/* Center content - default shows total */}
          {!centerContent && (
            <text
              x="50%"
              y="50%"
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-lg font-semibold fill-gray-900 dark:fill-gray-100"
            >
              {valueFormatter(total)}
            </text>
          )}
        </PieChart>
      </ResponsiveContainer>
      
      {/* Custom center content positioned absolutely */}
      {centerContent && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {centerContent}
        </div>
      )}
    </div>
  )
} 