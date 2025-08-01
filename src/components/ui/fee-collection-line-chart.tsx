"use client"

import { LineChart } from "@/components/LineChart"
import type { TooltipProps } from "@/components/LineChart"
import { cx, formatIndianCurrency } from "@/lib/utils"
import { api } from "@/utils/api"
import { useBranchContext } from "@/hooks/useBranchContext"
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext"
import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@tremor/react'
import { Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DateRangeSelector } from "@/components/ui/date-range-selector"
import type { DateRange } from "react-day-picker"

interface SummaryData {
  feeHead: string
  collection: number
  concession: number
  received: number
  due: number
}

const valueFormatter = (number: number) => {
  return formatIndianCurrency(number)
}

const getFeeHeadColors = (feeHeads: string[]): string[] => {
  const colors = ['green', 'amber', 'red', 'blue', 'violet', 'indigo', 'cyan', 'pink'];
  return feeHeads.map((_, index) => colors[index % colors.length]!);
}

const Tooltip = ({ payload, active, label }: TooltipProps) => {
  if (!active || !payload || payload.length === 0) return null

  // Detect dark mode at render time
  const isDarkMode = typeof window !== 'undefined' && document.documentElement.classList.contains('dark')
  const headerBg = isDarkMode ? '#7AAD8B' : '#00501B'

  const data = payload.filter(item => item.value > 0).map((item) => ({
    feeHead: item.dataKey as string,
    value: item.value,
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
          <span className="text-gray-50 dark:text-gray-50">Date</span>
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
              <span className="text-gray-700 dark:text-gray-300">
                {item.feeHead}
              </span>
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
  );
}

type TimePeriod = 'weekly' | 'monthly' | 'custom';

const TIME_PERIODS = {
  weekly: { days: 7, label: 'Weekly' },
  monthly: { days: 30, label: 'Monthly' },
  custom: { days: null, label: 'Custom' },
} as const;

export function FeeCollectionLineChart() {
  const { currentBranchId } = useBranchContext()
  const { currentSessionId } = useAcademicSessionContext()
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('monthly')
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>()
  const [showCustomDates, setShowCustomDates] = useState(false)

  // Calculate query parameters based on selected period
  const getQueryParams = () => {
    if (selectedPeriod === 'custom' && customDateRange?.from && customDateRange?.to) {
      const startDate = customDateRange.from
      const endDate = customDateRange.to
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return {
        days: diffDays,
        startDate,
        endDate,
      }
    } else if (selectedPeriod !== 'custom') {
      return {
        days: TIME_PERIODS[selectedPeriod].days,
      }
    }
    return {
      days: TIME_PERIODS.monthly.days, // fallback
    }
  }

  const queryParams = getQueryParams()

  // Fetch fee collection analytics data based on selected period
  const {
    data: analyticsData,
    isLoading,
    error
  } = api.finance.getFeeCollectionAnalytics.useQuery(
    {
      branchId: currentBranchId || '',
      sessionId: currentSessionId || '',
      ...queryParams,
    },
    {
      enabled: !!currentBranchId && !!currentSessionId,
    }
  )

  // Skeleton components
  const MetricSkeleton = () => (
    <div className="text-center">
      <div className="mb-1 flex items-center justify-center">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse"></div>
      </div>
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20 mx-auto animate-pulse"></div>
    </div>
  )

  const ChartSkeleton = () => (
    <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
  )

  const TableSkeleton = () => (
    <div className="space-y-3">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 animate-pulse"></div>
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse"></div>
      <div className="space-y-2 mt-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-600">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse"></div>
          </div>
        ))}
      </div>
    </div>
  )

  if (!currentBranchId || !currentSessionId) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-[#3a3a3a] dark:bg-[#252525]">
        <p className="text-center text-gray-500 dark:text-gray-400">
          Please select a branch and academic session to view fee collection data.
        </p>
      </div>
    )
  }

  const { chartData, summaryData, feeHeads, totalCollected, totalDue } = analyticsData || {}
  const colors = feeHeads ? getFeeHeadColors(feeHeads) : []

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-[#3a3a3a] dark:bg-[#252525]">
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
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">
              Fee Collection by Head
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {selectedPeriod === 'weekly' && 'Daily fee collection trends over the last 7 days'}
              {selectedPeriod === 'monthly' && 'Daily fee collection trends over the last 30 days'}  
              {selectedPeriod === 'custom' && customDateRange?.from && customDateRange?.to && 
                `Fee collection trends from ${customDateRange.from.toLocaleDateString()} to ${customDateRange.to.toLocaleDateString()}`}
              {selectedPeriod === 'custom' && (!customDateRange?.from || !customDateRange?.to) && 'Select custom date range below'}
            </p>
          </div>
          
          {/* Time Period Tabs */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1 relative">
            {isLoading && (
              <div className="absolute top-0 right-0 -mt-1 -mr-1">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              </div>
            )}
            {(Object.keys(TIME_PERIODS) as TimePeriod[]).map((period) => (
              <button
                key={period}
                onClick={() => {
                  setSelectedPeriod(period)
                  if (period === 'custom') {
                    setShowCustomDates(true)
                  } else {
                    setShowCustomDates(false)
                  }
                }}
                disabled={isLoading}
                className={cx(
                  "px-4 py-2 text-sm font-medium rounded-md transition-all",
                  selectedPeriod === period
                    ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300",
                  isLoading && "opacity-75 cursor-not-allowed"
                )}
              >
                {TIME_PERIODS[period].label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Custom Date Range Picker */}
        {selectedPeriod === 'custom' && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Date Range:</span>
              </div>
              <div className="flex-1 max-w-sm">
                <DateRangeSelector
                  value={customDateRange}
                  onChange={setCustomDateRange}
                  placeholder="Select date range"
                  disabled={isLoading}
                  className="text-sm"
                />
              </div>
              {customDateRange?.from && customDateRange?.to && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCustomDateRange(undefined)}
                  disabled={isLoading}
                  className="text-xs"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Summary stats */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        {isLoading || !analyticsData ? (
          <>
            <MetricSkeleton />
            <MetricSkeleton />
          </>
        ) : (
          <>
            <div className="text-center">
              <div className="mb-1 flex items-center justify-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Total Collected ({selectedPeriod === 'weekly' ? 'Week' : selectedPeriod === 'monthly' ? 'Month' : 'Period'})
                </span>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {valueFormatter(totalCollected || 0)}
              </p>
            </div>
            <div className="text-center">
              <div className="mb-1 flex items-center justify-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Total Due ({selectedPeriod === 'weekly' ? 'Week' : selectedPeriod === 'monthly' ? 'Month' : 'Period'})
                </span>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {valueFormatter(totalDue || 0)}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Chart */}
      <div className="mb-8">
        {isLoading || !analyticsData ? (
          <ChartSkeleton />
        ) : error ? (
          <div className="h-64 flex items-center justify-center text-red-500 border border-red-200 dark:border-red-800 rounded-lg">
            Error loading chart data: {error.message || 'Unknown error'}
          </div>
        ) : feeHeads && feeHeads.length > 0 ? (
          <LineChart
            className="h-64"
            data={chartData || []}
            index="date"
            categories={feeHeads}
            colors={colors}
            valueFormatter={valueFormatter}
            yAxisWidth={80}
            showLegend={false}
            customTooltip={Tooltip}
          />
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-lg">
            No fee heads configured for this branch and session.
          </div>
        )}
      </div>

      {/* Integrated Data Table */}
      <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
        {isLoading || !analyticsData ? (
          <TableSkeleton />
        ) : (
          <>
            <div className="sm:flex sm:items-center sm:justify-between sm:space-x-10 mb-6">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  Fee Head Summary
                </h4>
                <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-400">
                  Overview of collection, concession, and outstanding amounts by fee head.
                </p>
              </div>
            </div>
            
            <Table className="mt-4">
              <TableHead>
                <TableRow className="border-b border-gray-200 dark:border-gray-600">
                  <TableHeaderCell className="text-left text-gray-900 dark:text-white font-semibold py-3">
                    Fee Head
                  </TableHeaderCell>
                  <TableHeaderCell className="text-right text-gray-900 dark:text-white font-semibold py-3">
                    Collection
                  </TableHeaderCell>
                  <TableHeaderCell className="text-right text-gray-900 dark:text-white font-semibold py-3">
                    Concession
                  </TableHeaderCell>
                  <TableHeaderCell className="text-right text-gray-900 dark:text-white font-semibold py-3">
                    Received
                  </TableHeaderCell>
                  <TableHeaderCell className="text-right text-gray-900 dark:text-white font-semibold py-3">
                    Due
                  </TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {summaryData?.map((item, index) => (
                  <TableRow key={item.feeHead} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <TableCell className="font-medium text-gray-900 dark:text-white py-3">
                      {item.feeHead}
                    </TableCell>
                    <TableCell className="text-right text-gray-700 dark:text-gray-300 py-3 font-medium">
                      {valueFormatter(item.collection)}
                    </TableCell>
                    <TableCell className="text-right text-gray-700 dark:text-gray-300 py-3">
                      {valueFormatter(item.concession)}
                    </TableCell>
                    <TableCell className="text-right text-gray-700 dark:text-gray-300 py-3 font-medium">
                      {valueFormatter(item.received)}
                    </TableCell>
                    <TableCell className="text-right py-3">
                      <span className="font-semibold text-orange-600 dark:text-orange-400">
                        {valueFormatter(item.due)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {(!summaryData || summaryData.length === 0) && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No fee collection data available for the selected period.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
} 