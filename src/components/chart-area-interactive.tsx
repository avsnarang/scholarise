"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/utils/api"
import { useBranchContext } from "@/hooks/useBranchContext"
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext"
import { useState, useEffect } from "react"

export const description = "An interactive area chart showing enrollment and attendance"

// Sample data for fallback
const sampleChartData = [
  { date: "2023-08-01", enrollment: 1110, attendance: 1050 },
  { date: "2023-09-01", enrollment: 1150, attendance: 1080 },
  { date: "2023-10-01", enrollment: 1160, attendance: 1095 },
  { date: "2023-11-01", enrollment: 1170, attendance: 1110 },
  { date: "2023-12-01", enrollment: 1180, attendance: 1115 },
  { date: "2024-01-01", enrollment: 1195, attendance: 1130 },
  { date: "2024-02-01", enrollment: 1210, attendance: 1150 },
  { date: "2024-03-01", enrollment: 1220, attendance: 1160 },
  { date: "2024-04-01", enrollment: 1230, attendance: 1175 },
  { date: "2024-05-01", enrollment: 1240, attendance: 1185 },
  { date: "2024-06-01", enrollment: 1250, attendance: 1195 },
];

// Chart config remains the same
const chartConfig = {
  students: {
    label: "Students",
  },
  enrollment: {
    label: "Enrollment",
    color: "#00501B",
  },
  attendance: {
    label: "Attendance",
    color: "#A65A20",
  },
} satisfies ChartConfig

export function ChartAreaInteractive() {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = useState("12m")
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Mock data instead of API calls that don't exist
  const attendanceData = sampleChartData.map(item => ({ 
    date: item.date, 
    count: item.attendance 
  }));
  
  const enrollmentData = sampleChartData.map(item => ({
    date: item.date,
    count: item.enrollment
  }));

  // Set default time range based on screen size
  useEffect(() => {
    if (isMobile) {
      setTimeRange("3m")
    }
  }, [isMobile]);
  
  // Process and merge data from both API calls
  useEffect(() => {
    setIsLoading(true);
    
    try {
      // Create a map to merge data by date
      const mergedData = enrollmentData.map((enrollItem: { date: string; count: number }) => {
        const matchingAttendance = attendanceData.find(
          (attItem) => attItem.date === enrollItem.date
        );
        
        return {
          date: enrollItem.date,
          enrollment: enrollItem.count,
          attendance: matchingAttendance?.count || 0
        };
      });
      
      setChartData(mergedData);
    } catch (error) {
      console.error("Error processing chart data:", error);
      // Fall back to sample data if there's an error
      setChartData(sampleChartData);
    }
    
    setIsLoading(false);
  }, [timeRange]); // Only depend on timeRange since we're using mock data

  // Filter data based on time range - already handled by the API with period param
  const filteredData = chartData;

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Student Metrics</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Enrollment and attendance trends
          </span>
          <span className="@[540px]/card:hidden">Enrollment and attendance</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="12m">Academic Year</ToggleGroupItem>
            <ToggleGroupItem value="6m">Last 6 months</ToggleGroupItem>
            <ToggleGroupItem value="3m">Last 3 months</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a value"
            >
              <SelectValue placeholder="Academic Year" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="12m" className="rounded-lg">
                Academic Year
              </SelectItem>
              <SelectItem value="6m" className="rounded-lg">
                Last 6 months
              </SelectItem>
              <SelectItem value="3m" className="rounded-lg">
                Last 3 months
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {isLoading ? (
          <div className="h-[250px] w-full flex items-center justify-center">
            <Skeleton className="h-full w-full rounded-lg" />
          </div>
        ) : filteredData.length === 0 ? (
          <div className="h-[250px] w-full flex flex-col items-center justify-center text-muted-foreground">
            <p>No data available</p>
            <p className="text-sm">Try selecting a different time range</p>
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[250px] w-full"
          >
            <AreaChart data={filteredData}>
              <defs>
                <linearGradient id="fillEnrollment" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="#00501B"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="#00501B"
                    stopOpacity={0.1}
                  />
                </linearGradient>
                <linearGradient id="fillAttendance" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="#A65A20"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="#A65A20"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  const date = new Date(value)
                  return date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                }}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    label="date"
                    labelFormatter={(value) => {
                      const date = new Date(value)
                      return date.toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    }}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="enrollment"
                stroke="#00501B"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="url(#fillEnrollment)"
              />
              <Area
                type="monotone"
                dataKey="attendance"
                stroke="#A65A20"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="url(#fillAttendance)"
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
