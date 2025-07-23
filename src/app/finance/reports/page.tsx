"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MultiSelect } from "@/components/ui/multi-select";
import { 
  FileText, 
  BarChart3, 
  Users, 
  Download, 
  Filter, 
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  Printer,
  RefreshCw,
  Eye,
  EyeOff,
  Search
} from 'lucide-react';
import { LineChart } from "@/components/LineChart";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { DateRangeSelector } from "@/components/ui/date-range-selector";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { useToast } from "@/components/ui/use-toast";
import { formatIndianCurrency } from "@/lib/utils";
import type { TooltipProps } from "@/components/LineChart"
import type { DateRange } from "react-day-picker"

// Shared value formatter using Indian currency format
const valueFormatter = (number: number) => {
  return formatIndianCurrency(number)
}

// Shared color scheme matching fee-collection-line-chart
const getFeeHeadColors = (items: string[]): string[] => {
  const colors = ['green', 'amber', 'red', 'blue', 'violet', 'indigo', 'cyan', 'pink'];
  return items.map((_, index) => colors[index % colors.length]!);
}

// Theme-aware color mapping for legends (matching Tremor's color values)
const getActualColors = (items: string[], isDark: boolean = false): string[] => {
  const lightColors: Record<string, string> = {
    green: '#10b981',   // emerald-500
    amber: '#f59e0b',   // amber-500
    red: '#ef4444',     // red-500
    blue: '#3b82f6',    // blue-500
    violet: '#8b5cf6',  // violet-500
    indigo: '#6366f1',  // indigo-500
    cyan: '#06b6d4',    // cyan-500
    pink: '#ec4899'     // pink-500
  };
  
  const darkColors: Record<string, string> = {
    green: '#34d399',   // emerald-400
    amber: '#fbbf24',   // amber-400
    red: '#f87171',     // red-400
    blue: '#60a5fa',    // blue-400
    violet: '#a78bfa',  // violet-400
    indigo: '#818cf8',  // indigo-400
    cyan: '#22d3ee',    // cyan-400
    pink: '#f472b6'     // pink-400
  };
  
  const colorMap = isDark ? darkColors : lightColors;
  const colorNames = ['green', 'amber', 'red', 'blue', 'violet', 'indigo', 'cyan', 'pink'];
  return items.map((_, index) => colorMap[colorNames[index % colorNames.length]!]!);
}

// Interactive Legend Component
interface InteractiveLegendProps {
  items: string[];
  colors: string[];
  visibleItems: Record<string, boolean>;
  onToggle: (item: string) => void;
  className?: string;
}

const InteractiveLegend = ({ items, colors, visibleItems, onToggle, className = "" }: InteractiveLegendProps) => (
  <div className={`flex flex-wrap gap-3 justify-center p-3 bg-gray-50 dark:bg-gray-800 rounded-md border ${className}`}>
    {items.map((item: string, index: number) => {
      const isVisible = visibleItems[item];
      return (
        <button
          key={item}
          onClick={() => onToggle(item)}
          className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700 ${
            isVisible 
              ? 'bg-white dark:bg-gray-700 shadow-sm border border-gray-200 dark:border-gray-600' 
              : 'bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700'
          }`}
          title={`Click to ${isVisible ? 'hide' : 'show'} ${item}`}
        >
          <div 
            className={`w-3 h-3 rounded-full flex-shrink-0 border-2 ${
              isVisible ? 'border-white dark:border-gray-700' : 'border-gray-400 dark:border-gray-500'
            }`}
            style={{ 
              backgroundColor: isVisible ? colors[index] : 'transparent',
              borderColor: isVisible ? colors[index] : undefined
            }}
          />
          <span className={`text-sm font-medium ${
            isVisible ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'
          }`}>
            {item}
          </span>
          {isVisible ? (
            <Eye className="w-3 h-3 text-green-500" />
          ) : (
            <EyeOff className="w-3 h-3 text-gray-400" />
          )}
        </button>
      );
    })}
  </div>
);

// Custom Tooltip component matching fee-collection-line-chart design
const CustomTooltip = ({ payload, active, label, title }: TooltipProps & { title?: string }) => {
  if (!active || !payload || payload.length === 0) return null

  // Detect dark mode at render time
  const isDarkMode = typeof window !== 'undefined' && document.documentElement.classList.contains('dark')
  const headerBg = isDarkMode ? '#7AAD8B' : '#00501B'

  const data = payload.filter(item => item.value > 0).map((item) => ({
    name: item.dataKey as string,
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
          <span className="text-gray-50 dark:text-gray-50">{title || 'Date'}</span>
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
                {item.name}
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

// Skeleton components matching fee-collection-line-chart

const MetricSkeleton = () => (
  <div className="text-center">
    <div className="mb-1 flex items-center justify-center">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse"></div>
    </div>
    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20 mx-auto animate-pulse"></div>
  </div>
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

// Fee Defaulters Report Component
function FeeDefaultersReport() {
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  const { toast } = useToast();

  // Detect dark mode for theme-aware colors
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  useEffect(() => {
    const checkTheme = () => {
      const isDark = typeof window !== 'undefined' && document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
    };
    
    checkTheme();
    
    // Watch for theme changes
    const observer = new MutationObserver(checkTheme);
    if (typeof window !== 'undefined') {
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class']
      });
    }
    
    return () => observer.disconnect();
  }, []);

  // Filter states
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>([]);
  const [selectedFeeTermIds, setSelectedFeeTermIds] = useState<string[]>([]);
  const [selectedFeeHeadIds, setSelectedFeeHeadIds] = useState<string[]>([]);
  const [includePartiallyPaid, setIncludePartiallyPaid] = useState(true);
  const [minimumDueAmount, setMinimumDueAmount] = useState<number | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [days, setDays] = useState<number>(30)

  // Fetch dropdown data
  const classesQuery = api.class.getAll.useQuery(
    {
      branchId: currentBranchId!,
      sessionId: currentSessionId!,
      includeSections: true,
  },
  { 
      enabled: !!currentBranchId && !!currentSessionId,
    }
  );

  const feeTermsQuery = api.finance.getFeeTerms.useQuery(
    {
      branchId: currentBranchId ?? undefined,
      sessionId: currentSessionId ?? undefined,
  },
  { 
      enabled: !!currentBranchId && !!currentSessionId,
    }
  );

  const feeHeadsQuery = api.finance.getFeeHeads.useQuery(
    {
      branchId: currentBranchId ?? undefined,
      sessionId: currentSessionId ?? undefined,
    },
    {
      enabled: !!currentBranchId && !!currentSessionId,
    }
  );

  // Fetch report data
  const reportQuery = api.finance.getFeeDefaultersReport.useQuery(
    {
      branchId: currentBranchId!,
      sessionId: currentSessionId!,
      classIds: selectedClassIds.length > 0 ? selectedClassIds : undefined,
      sectionIds: selectedSectionIds.length > 0 ? selectedSectionIds : undefined,
      feeTermIds: selectedFeeTermIds.length > 0 ? selectedFeeTermIds : undefined,
      feeHeadIds: selectedFeeHeadIds.length > 0 ? selectedFeeHeadIds : undefined,
      includePartiallyPaid,
      minimumDueAmount,
    },
    { 
      enabled: !!currentBranchId && !!currentSessionId,
    }
  );

  // Prepare dropdown options
  const classOptions = useMemo(() => {
    if (!classesQuery.data) return [];
    return classesQuery.data.map(cls => ({
      value: cls.id,
      label: cls.name,
    }));
  }, [classesQuery.data]);

  const sectionOptions = useMemo(() => {
    if (!classesQuery.data) return [];
    const allSections = classesQuery.data.flatMap(cls => 
      cls.sections?.map(section => ({
        value: section.id,
        label: `${cls.name} - ${section.name}`,
        classId: cls.id,
      })) || []
    );
    
    // Filter sections based on selected classes
    if (selectedClassIds.length > 0) {
      return allSections.filter(section => selectedClassIds.includes(section.classId));
    }
    
    return allSections;
  }, [classesQuery.data, selectedClassIds]);

  const feeTermOptions = useMemo(() => {
    if (!feeTermsQuery.data) return [];
    return feeTermsQuery.data.map(term => ({
      value: term.id,
      label: term.name,
    }));
  }, [feeTermsQuery.data]);

  const feeHeadOptions = useMemo(() => {
    if (!feeHeadsQuery.data) return [];
    return feeHeadsQuery.data.map(head => ({
      value: head.id,
      label: head.name,
    }));
  }, [feeHeadsQuery.data]);

  // Filter table data based on search while preserving backend class order
  const filteredTableData = useMemo(() => {
    const data = reportQuery.data?.tableData || [];
    
    // Apply search filter if search query exists
    if (!searchQuery) {
      return data; // Return original data (already sorted by backend)
    }
    
    // Create a map to preserve original order
    const originalOrderMap = new Map(data.map((student, index) => [student.studentId, index]));
    
    // Filter the data
    const filtered = data.filter(student => 
      student.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.className.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.sectionName.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    // Sort filtered results to maintain original backend order (class by displayOrder, grade, name)
    return filtered.sort((a, b) => {
      const aIndex = originalOrderMap.get(a.studentId) ?? 0;
      const bIndex = originalOrderMap.get(b.studentId) ?? 0;
      return aIndex - bIndex;
    });
  }, [reportQuery.data?.tableData, searchQuery]);

  if (!currentBranchId || !currentSessionId) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-[#3a3a3a] dark:bg-[#252525]">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please select a branch and academic session to view reports.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { chartData, tableData, summary, feeHeads } = reportQuery.data || {};
  
  // Chart colors similar to fee-collection-line-chart
  const colors = feeHeads ? getFeeHeadColors(feeHeads) : [];
  const actualColorsDefaulters = feeHeads ? getActualColors(feeHeads, isDarkMode) : [];

  // Interactive legend state for Fee Defaulters - simple approach
  const [hiddenItemsDefaulters, setHiddenItemsDefaulters] = useState<Set<string>>(new Set());

  const handleLegendToggleDefaulters = (item: string) => {
    setHiddenItemsDefaulters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(item)) {
        newSet.delete(item);
      } else {
        newSet.add(item);
      }
      return newSet;
    });
  };

  // Filter chart categories and colors based on visibility
  const visibleCategoriesDefaulters = (feeHeads || []).filter((feeHead: string) => !hiddenItemsDefaulters.has(feeHead));
  // Get colors for visible categories only, maintaining the original mapping
  const visibleChartColorsDefaulters = (feeHeads || [])
    .filter((feeHead: string) => !hiddenItemsDefaulters.has(feeHead))
    .map((feeHead: string) => {
      const originalIndex = (feeHeads || []).indexOf(feeHead);
      return colors[originalIndex]!;
    });

      return (
      <div className="space-y-6">
        {/* Filters Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Report Filters
              </CardTitle>
          <CardDescription>
            Select criteria to filter the fee defaulters report
          </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Class Selection */}
              <div className="space-y-2">
              <Label>Classes</Label>
              <MultiSelect
                options={classOptions}
                selected={selectedClassIds}
                onValueChange={(values) => {
                  setSelectedClassIds(values);
                  // Clear section selection when classes change
                  setSelectedSectionIds([]);
                }}
                placeholder="Select classes"
                className="w-full"
                  />
            </div>

            {/* Section Selection */}
            <div className="space-y-2">
              <Label>Sections</Label>
              <MultiSelect
                options={sectionOptions}
                selected={selectedSectionIds}
                onValueChange={setSelectedSectionIds}
                placeholder="Select sections"
                className="w-full"
                disabled={sectionOptions.length === 0}
                  />
              </div>

            {/* Fee Terms Selection */}
              <div className="space-y-2">
              <Label>Fee Terms/Cycles</Label>
              <MultiSelect
                options={feeTermOptions}
                selected={selectedFeeTermIds}
                onValueChange={setSelectedFeeTermIds}
                placeholder="Select fee terms"
                className="w-full"
              />
              </div>

            {/* Fee Heads Selection */}
              <div className="space-y-2">
              <Label>Fee Heads</Label>
              <MultiSelect
                options={feeHeadOptions}
                selected={selectedFeeHeadIds}
                onValueChange={setSelectedFeeHeadIds}
                placeholder="Select fee heads"
                className="w-full"
              />
              </div>

            {/* Minimum Due Amount */}
              <div className="space-y-2">
              <Label>Minimum Due Amount</Label>
              <Input
                type="number"
                placeholder="Enter minimum amount"
                value={minimumDueAmount || ''}
                onChange={(e) => setMinimumDueAmount(e.target.value ? Number(e.target.value) : undefined)}
                min="0"
                step="0.01"
              />
              </div>

            {/* Include Partially Paid */}
              <div className="space-y-2">
              <Label>Options</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includePartiallyPaid"
                  checked={includePartiallyPaid}
                  onCheckedChange={(checked) => setIncludePartiallyPaid(checked as boolean)}
                />
                <Label htmlFor="includePartiallyPaid" className="text-sm">
                  Include partially paid students
                </Label>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
                <Button 
              onClick={() => {
                setSelectedClassIds([]);
                setSelectedSectionIds([]);
                setSelectedFeeTermIds([]);
                setSelectedFeeHeadIds([]);
                setMinimumDueAmount(undefined);
                setIncludePartiallyPaid(true);
                setSearchQuery('');
              }}
              variant="outline"
              size="sm"
            >
              Clear Filters
            </Button>
            <Button
              onClick={() => reportQuery.refetch()}
              variant="outline"
              size="sm"
              disabled={reportQuery.isLoading}
            >
              {reportQuery.isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
                  </Button>
              </div>
            </CardContent>
          </Card>

              {/* Summary Cards */}
       {reportQuery.isLoading ? (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
           {Array.from({ length: 5 }).map((_, i) => (
             <Card key={i}>
               <CardContent className="p-6">
                 <div className="flex items-center justify-between">
                   <div className="space-y-2">
                     <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                     <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                   </div>
                   <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                 </div>
               </CardContent>
             </Card>
           ))}
         </div>
       ) : summary && (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card>
            <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                  <p className="text-sm font-medium text-muted-foreground">Students with Dues</p>
                  <p className="text-2xl font-bold">{summary.totalStudents}</p>
                      </div>
                <Users className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
            <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Due Amount</p>
                  <p className="text-2xl font-bold text-red-600">{valueFormatter(summary.totalDueAmount)}</p>
                      </div>
                <TrendingDown className="h-8 w-8 text-red-500" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
            <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                  <p className="text-sm font-medium text-muted-foreground">To Be Collected</p>
                  <p className="text-2xl font-bold text-blue-600">{valueFormatter(summary.totalToBeCollected)}</p>
                      </div>
                <DollarSign className="h-8 w-8 text-blue-500" />
                      </div>
            </CardContent>
          </Card>

                     <Card>
             <CardContent className="p-6">
               <div className="flex items-center justify-between">
                 <div>
                   <p className="text-sm font-medium text-muted-foreground">Concession Applied</p>
                   <p className="text-2xl font-bold text-green-600">{valueFormatter(summary.totalConcessionApplied)}</p>
                 </div>
                 <TrendingUp className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
             <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                   <p className="text-sm font-medium text-muted-foreground">Collected Till Date</p>
                   <p className="text-2xl font-bold text-green-600">{valueFormatter((summary as any).totalCollectedTillDate || 0)}</p>
                      </div>
                 <CheckCircle className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>
       )}

      {/* Chart Section */}
                <Card>
                  <CardHeader>
          <CardTitle>Fee Due Trends by Due Date</CardTitle>
          <CardDescription>
            Outstanding amounts grouped by fee head and due date
          </CardDescription>
                  </CardHeader>
                  <CardContent>
          {reportQuery.isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>Loading chart data...</span>
            </div>
          ) : chartData && chartData.length > 0 && feeHeads && feeHeads.length > 0 ? (
            <div className="space-y-4">
              <LineChart
                className="h-64"
                data={chartData}
                index="date"
                categories={visibleCategoriesDefaulters}
                colors={visibleChartColorsDefaulters}
                valueFormatter={valueFormatter}
                yAxisWidth={80}
                showLegend={false}
                customTooltip={CustomTooltip}
              />
                             {/* Interactive Legend */}
               {feeHeads && feeHeads.length > 0 && (
                 <InteractiveLegend
                   items={feeHeads}
                   colors={actualColorsDefaulters}
                   visibleItems={Object.fromEntries(feeHeads.map((item: string) => [item, !hiddenItemsDefaulters.has(item)]))}
                   onToggle={handleLegendToggleDefaulters}
                   className="mt-2"
                 />
               )}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No due amounts found for the selected criteria</p>
                    </div>
            </div>
          )}
                  </CardContent>
                </Card>

      {/* Data Table Section */}
                  <Card>
                    <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Student-wise Fee Defaulters</CardTitle>
                      <CardDescription>
                Detailed breakdown of outstanding fees by student
                      </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
                    </CardHeader>
                    <CardContent>
          {reportQuery.isLoading ? (
            <div className="h-32 flex items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>Loading table data...</span>
            </div>
          ) : filteredTableData && filteredTableData.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Details</TableHead>
                    <TableHead>Class/Section</TableHead>
                    <TableHead className="text-right">To Be Collected</TableHead>
                    <TableHead className="text-right">Concession Applied</TableHead>
                    <TableHead className="text-right">Due Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTableData.map((student) => (
                    <TableRow key={student.studentId}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{student.studentName}</div>
                          <div className="text-sm text-muted-foreground">
                            Adm. No: {student.admissionNumber}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {student.className} - {student.sectionName}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {valueFormatter(student.totalToBeCollected)}
                      </TableCell>
                      <TableCell className="text-right">
                        {valueFormatter(student.totalConcessionAmount)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {valueFormatter(student.totalDueAmount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          student.totalDueAmount === 0 ? "default" :
                          student.totalPaidAmount > 0 ? "secondary" : "destructive"
                        }>
                          {student.totalDueAmount === 0 ? "Paid" :
                           student.totalPaidAmount > 0 ? "Partial" : "Pending"}
                            </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
                          </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No students found with outstanding dues</p>
                          </div>
                          </div>
          )}
        </CardContent>
      </Card>
                        </div>
  );
}

// Collection Summary Report Component
function CollectionSummaryReport() {
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  const { toast } = useToast();

  // Detect dark mode for theme-aware colors
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  useEffect(() => {
    const checkTheme = () => {
      const isDark = typeof window !== 'undefined' && document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
    };
    
    checkTheme();
    
    // Watch for theme changes
    const observer = new MutationObserver(checkTheme);
    if (typeof window !== 'undefined') {
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class']
      });
    }
    
    return () => observer.disconnect();
  }, []);

  // Filter states
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [selectedFeeTermIds, setSelectedFeeTermIds] = useState<string[]>([]);
  const [selectedFeeHeadIds, setSelectedFeeHeadIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>(new Date(new Date().getFullYear(), 3, 1).toISOString().split('T')[0]!); // April 1st
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]!);

  // Fetch dropdown data
  const classesQuery = api.class.getAll.useQuery(
    {
      branchId: currentBranchId!,
      sessionId: currentSessionId!,
      includeSections: true,
    },
    {
      enabled: !!currentBranchId && !!currentSessionId,
    }
  );

  const feeTermsQuery = api.finance.getFeeTerms.useQuery(
    {
      branchId: currentBranchId ?? undefined,
      sessionId: currentSessionId ?? undefined,
    },
    {
      enabled: !!currentBranchId && !!currentSessionId,
    }
  );

  const feeHeadsQuery = api.finance.getFeeHeads.useQuery(
    {
      branchId: currentBranchId ?? undefined,
      sessionId: currentSessionId ?? undefined,
    },
    {
      enabled: !!currentBranchId && !!currentSessionId,
    }
  );

  // Fetch real report data
  const reportQuery = api.finance.getCollectionSummaryReport.useQuery(
    {
      branchId: currentBranchId!,
      sessionId: currentSessionId!,
      startDate,
      endDate,
      classIds: selectedClassIds.length > 0 ? selectedClassIds : undefined,
      feeTermIds: selectedFeeTermIds.length > 0 ? selectedFeeTermIds : undefined,
      feeHeadIds: selectedFeeHeadIds.length > 0 ? selectedFeeHeadIds : undefined,
    },
    {
      enabled: !!currentBranchId && !!currentSessionId,
    }
  );

  const reportData = reportQuery.data || {
    summary: {
      totalCollections: 0,
      totalAmount: 0,
      uniqueStudents: 0,
      dateRange: { startDate: new Date(startDate), endDate: new Date(endDate) }
    },
    chartData: [],
    feeHeadSummary: []
  };

  const valueFormatter = (value: number) => formatIndianCurrency(value);

  const chartData = reportData.chartData.map(item => ({
    ...item,
    amount: item.amount,
  }));

  // Get fee heads for chart legend and colors
  const feeHeads = (reportData as any)?.feeHeads || [];
  const chartCategories = feeHeads.length > 0 ? feeHeads : ["amount"];
  const chartColors = feeHeads.length > 0 ? getFeeHeadColors(feeHeads) : ["green"];
  const actualColors = feeHeads.length > 0 ? getActualColors(feeHeads, isDarkMode) : [isDarkMode ? "#34d399" : "#10b981"];

  // Simple legend state without infinite loops
  const [hiddenItems, setHiddenItems] = useState<Set<string>>(new Set());

  const handleLegendToggle = (item: string) => {
    setHiddenItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(item)) {
        newSet.delete(item);
      } else {
        newSet.add(item);
      }
      return newSet;
    });
  };

  // Filter visible categories based on hidden items
  const visibleCategories = chartCategories.filter((category: string) => !hiddenItems.has(category));
  // Get colors for visible categories only, maintaining the original mapping
  const visibleChartColors = chartCategories
    .filter((category: string) => !hiddenItems.has(category))
    .map((category: string) => {
      const originalIndex = chartCategories.indexOf(category);
      return chartColors[originalIndex]!;
    });

  // Prepare data for multi-select
  const classOptions = classesQuery.data?.map(cls => ({
    label: cls.name,
    value: cls.id,
  })) ?? [];

  const feeTermOptions = feeTermsQuery.data?.map(term => ({
    label: term.name,
    value: term.id,
  })) ?? [];

  const feeHeadOptions = feeHeadsQuery.data?.map(head => ({
    label: head.name,
    value: head.id,
  })) ?? [];

  return (
    <div className="space-y-6">
      <style dangerouslySetInnerHTML={{
        __html: `
          .recharts-tooltip-wrapper [style*="background-color: rgb(0, 80, 27)"] {
            background-color: #00501B !important;
          }
          .dark .recharts-tooltip-wrapper [style*="background-color: rgb(122, 173, 139)"] {
            background-color: #7AAD8B !important;
          }
        `
      }} />

      {/* Filters Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Collection Filters
          </CardTitle>
          <CardDescription>
            Filter collections by date range, classes, fee terms, and fee heads
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Date Range</Label>
              <DateRangeSelector
                value={{ 
                  from: new Date(startDate), 
                  to: new Date(endDate) 
                }}
                                 onChange={(range: DateRange | undefined) => {
                   if (range?.from) setStartDate(range.from.toISOString().split('T')[0]!);
                   if (range?.to) setEndDate(range.to.toISOString().split('T')[0]!);
                 }}
                placeholder="Select date range"
                disabled={reportQuery.isLoading}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Classes</Label>
                             <MultiSelect
                 options={classOptions}
                 selected={selectedClassIds}
                 onValueChange={setSelectedClassIds}
                 placeholder="Select classes..."
                 disabled={classesQuery.isLoading}
               />
            </div>
            <div>
              <Label>Fee Terms</Label>
                             <MultiSelect
                 options={feeTermOptions}
                 selected={selectedFeeTermIds}
                 onValueChange={setSelectedFeeTermIds}
                 placeholder="Select fee terms..."
                 disabled={feeTermsQuery.isLoading}
               />
             </div>
             <div>
               <Label>Fee Heads</Label>
               <MultiSelect
                 options={feeHeadOptions}
                 selected={selectedFeeHeadIds}
                 onValueChange={setSelectedFeeHeadIds}
                 placeholder="Select fee heads..."
                 disabled={feeHeadsQuery.isLoading}
               />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Collections</p>
                <p className="text-2xl font-bold text-green-600">{reportData.summary.totalCollections}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold text-blue-600">{valueFormatter(reportData.summary.totalAmount)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Unique Students</p>
                <p className="text-2xl font-bold text-purple-600">{reportData.summary.uniqueStudents}</p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg per Collection</p>
                <p className="text-2xl font-bold text-orange-600">
                  {valueFormatter(Math.round(reportData.summary.totalAmount / reportData.summary.totalCollections))}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart Section */}
                    <Card>
                      <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Daily Collection Trend
          </CardTitle>
          <CardDescription>Collection amounts over time in the selected period</CardDescription>
                      </CardHeader>
                      <CardContent>
             {reportQuery.isLoading || !reportQuery.data ? (
               <div className="h-64 flex items-center justify-center">
                 <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                 <span>Loading chart data...</span>
               </div>
             ) : chartData && chartData.length > 0 ? (
               <div className="space-y-4">
                 <LineChart
                   className="h-64"
                   data={chartData}
                   index="formattedDate"
                   categories={visibleCategories}
                   colors={visibleChartColors}
                   valueFormatter={valueFormatter}
                   yAxisWidth={80}
                   showLegend={false}
                   customTooltip={(props: TooltipProps) => <CustomTooltip {...props} title="Collection Date" />}
                 />
                 {/* Interactive Legend */}
                 {feeHeads.length > 0 && (
                   <InteractiveLegend
                     items={chartCategories}
                     colors={actualColors}
                     visibleItems={Object.fromEntries(chartCategories.map((item: string) => [item, !hiddenItems.has(item)]))}
                     onToggle={handleLegendToggle}
                     className="mt-2"
                   />
                 )}
               </div>
             ) : (
               <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-lg">
                 No data available for the selected criteria.
               </div>
             )}
        </CardContent>
      </Card>

      {/* Fee Head Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>Fee Head Summary</CardTitle>
          <CardDescription>Collection breakdown by fee heads</CardDescription>
        </CardHeader>
        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                <TableHead>Fee Head</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead className="text-right">Collections</TableHead>
                <TableHead className="text-right">Avg per Collection</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
              {reportData.feeHeadSummary.map((item, index) => (
                                <TableRow key={index}>
                  <TableCell className="font-medium">{item.feeHeadName}</TableCell>
                  <TableCell className="text-right font-mono">{valueFormatter(item.totalAmount)}</TableCell>
                  <TableCell className="text-right">{item.collectionCount}</TableCell>
                  <TableCell className="text-right font-mono">
                    {valueFormatter(Math.round(item.totalAmount / item.collectionCount))}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// Daily Collection Report Component
function DailyCollectionReport() {
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  const { toast } = useToast();

  // Detect dark mode for theme-aware colors
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  useEffect(() => {
    const checkTheme = () => {
      const isDark = typeof window !== 'undefined' && document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
    };
    
    checkTheme();
    
    // Watch for theme changes
    const observer = new MutationObserver(checkTheme);
    if (typeof window !== 'undefined') {
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class']
      });
    }
    
    return () => observer.disconnect();
  }, []);

  // Filter states
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]!);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [selectedFeeHeadIds, setSelectedFeeHeadIds] = useState<string[]>([]);

  // Fetch dropdown data
  const classesQuery = api.class.getAll.useQuery(
    {
      branchId: currentBranchId!,
      sessionId: currentSessionId!,
      includeSections: true,
    },
    {
      enabled: !!currentBranchId && !!currentSessionId,
    }
  );

  const feeHeadsQuery = api.finance.getFeeHeads.useQuery(
    {
      branchId: currentBranchId ?? undefined,
      sessionId: currentSessionId ?? undefined,
    },
    {
      enabled: !!currentBranchId && !!currentSessionId,
    }
  );

  // Fetch real report data
  const reportQuery = api.finance.getDailyCollectionReport.useQuery(
    {
      branchId: currentBranchId!,
      sessionId: currentSessionId!,
      selectedDate,
      classIds: selectedClassIds.length > 0 ? selectedClassIds : undefined,
      feeHeadIds: selectedFeeHeadIds.length > 0 ? selectedFeeHeadIds : undefined,
    },
    {
      enabled: !!currentBranchId && !!currentSessionId,
    }
  );

  const reportData = reportQuery.data || {
    summary: {
      totalCollections: 0,
      totalAmount: 0,
      uniqueStudents: 0,
      selectedDate: new Date(selectedDate),
      peakHour: '0',
    },
    chartData: Array.from({ length: 24 }, (_, hour) => ({
      hour: hour.toString().padStart(2, '0') + ':00',
      amount: 0,
    })),
    collectorSummary: [],
    collections: []
  };

  const valueFormatter = (value: number) => formatIndianCurrency(value);

  // Get fee heads for chart legend and colors
  const feeHeads = (reportData as any)?.feeHeads || [];
  const chartCategories = feeHeads.length > 0 ? feeHeads : ["amount"];
  const chartColors = feeHeads.length > 0 ? getFeeHeadColors(feeHeads) : ["green"];
  const actualColors = feeHeads.length > 0 ? getActualColors(feeHeads, isDarkMode) : [isDarkMode ? "#34d399" : "#10b981"];

  // Interactive legend state for Daily Collection - simple approach
  const [hiddenItemsDaily, setHiddenItemsDaily] = useState<Set<string>>(new Set());

  const handleLegendToggleDaily = (item: string) => {
    setHiddenItemsDaily(prev => {
      const newSet = new Set(prev);
      if (newSet.has(item)) {
        newSet.delete(item);
      } else {
        newSet.add(item);
      }
      return newSet;
    });
  };

  // Filter chart categories and colors based on visibility
  const visibleCategoriesDaily = chartCategories.filter((category: string) => !hiddenItemsDaily.has(category));
  // Get colors for visible categories only, maintaining the original mapping
  const visibleChartColorsDaily = chartCategories
    .filter((category: string) => !hiddenItemsDaily.has(category))
    .map((category: string) => {
      const originalIndex = chartCategories.indexOf(category);
      return chartColors[originalIndex]!;
    });

  // Prepare data for multi-select
  const classOptions = classesQuery.data?.map(cls => ({
    label: cls.name,
    value: cls.id,
  })) ?? [];

  const feeHeadOptions = feeHeadsQuery.data?.map(head => ({
    label: head.name,
    value: head.id,
  })) ?? [];

  return (
    <div className="space-y-6">
      <style dangerouslySetInnerHTML={{
        __html: `
          .recharts-tooltip-wrapper [style*="background-color: rgb(0, 80, 27)"] {
            background-color: #00501B !important;
          }
          .dark .recharts-tooltip-wrapper [style*="background-color: rgb(122, 173, 139)"] {
            background-color: #7AAD8B !important;
          }
        `
      }} />

      {/* Filters Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Daily Report Filters
          </CardTitle>
          <CardDescription>
            View collections for a specific date with optional class and fee head filters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Select Date</Label>
              <DatePicker
                value={new Date(selectedDate)}
                onChange={(date) => setSelectedDate(date.toISOString().split('T')[0]!)}
                placeholder="Select date"
                disabled={reportQuery.isLoading}
              />
            </div>
            <div>
              <Label>Classes</Label>
                             <MultiSelect
                 options={classOptions}
                 selected={selectedClassIds}
                 onValueChange={setSelectedClassIds}
                 placeholder="All classes..."
                 disabled={classesQuery.isLoading}
               />
             </div>
             <div>
               <Label>Fee Heads</Label>
               <MultiSelect
                 options={feeHeadOptions}
                 selected={selectedFeeHeadIds}
                 onValueChange={setSelectedFeeHeadIds}
                 placeholder="All fee heads..."
                 disabled={feeHeadsQuery.isLoading}
               />
            </div>
                        </div>
                      </CardContent>
                    </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Collections</p>
                <p className="text-2xl font-bold text-green-600">{reportData.summary.totalCollections}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold text-blue-600">{valueFormatter(reportData.summary.totalAmount)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Unique Students</p>
                <p className="text-2xl font-bold text-purple-600">{reportData.summary.uniqueStudents}</p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Peak Hour</p>
                <p className="text-2xl font-bold text-orange-600">{reportData.summary.peakHour}:00</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Selected Date</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {new Date(selectedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                </p>
              </div>
              <FileText className="h-8 w-8 text-indigo-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hourly Chart */}
                    <Card>
                      <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Hourly Collection Pattern
          </CardTitle>
          <CardDescription>Collection amounts by hour for {new Date(selectedDate).toLocaleDateString('en-IN')}</CardDescription>
                      </CardHeader>
                      <CardContent>
          {reportQuery.isLoading || !reportData ? (
            <div className="h-64 flex items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>Loading chart data...</span>
            </div>
          ) : reportData.chartData && reportData.chartData.length > 0 ? (
            <div className="space-y-4">
              <LineChart
                className="h-64"
                data={reportData.chartData}
                index="hour"
                categories={visibleCategoriesDaily}
                colors={visibleChartColorsDaily}
                valueFormatter={valueFormatter}
                yAxisWidth={80}
                showLegend={false}
                customTooltip={(props: TooltipProps) => <CustomTooltip {...props} title="Hour" />}
              />
              {/* Interactive Legend */}
              {feeHeads.length > 0 && (
                <InteractiveLegend
                  items={chartCategories}
                  colors={actualColors}
                  visibleItems={Object.fromEntries(chartCategories.map((item: string) => [item, !hiddenItemsDaily.has(item)]))}
                  onToggle={handleLegendToggleDaily}
                  className="mt-2"
                />
              )}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-lg">
              No hourly collection data available for the selected date.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Collector Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Collection Staff Summary</CardTitle>
          <CardDescription>Performance by collection staff</CardDescription>
        </CardHeader>
        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                <TableHead>Staff Name</TableHead>
                <TableHead className="text-right">Collections</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead className="text-right">Avg per Collection</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                             {reportData.collectorSummary.length > 0 ? reportData.collectorSummary.map((item: any, index: number) => (
                 <TableRow key={index}>
                   <TableCell className="font-medium">{item.collectorName}</TableCell>
                   <TableCell className="text-right">{item.collectionCount}</TableCell>
                   <TableCell className="text-right font-mono">{valueFormatter(item.totalAmount)}</TableCell>
                   <TableCell className="text-right font-mono">
                     {valueFormatter(Math.round(item.totalAmount / item.collectionCount))}
                   </TableCell>
                 </TableRow>
               )) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No collection data available for this date
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Collections List */}
                    <Card>
                      <CardHeader>
          <CardTitle>Daily Collections</CardTitle>
          <CardDescription>All collections for the selected date</CardDescription>
                      </CardHeader>
                      <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                <TableHead>Receipt No.</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Student</TableHead>
                                <TableHead>Class</TableHead>
                <TableHead>Collector</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
              {reportData.collections.slice(0, 10).map((collection) => (
                <TableRow key={collection.id}>
                  <TableCell className="font-mono">{collection.receiptNumber}</TableCell>
                  <TableCell>
                    {collection.collectionTime.toLocaleTimeString('en-IN', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{collection.studentName}</div>
                      <div className="text-sm text-muted-foreground">{collection.admissionNumber}</div>
                    </div>
                  </TableCell>
                  <TableCell>{collection.className} - {collection.sectionName}</TableCell>
                  <TableCell>{collection.collectorName}</TableCell>
                  <TableCell className="text-right font-mono">{valueFormatter(collection.totalAmount)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// Class-wise Analysis Report Component
function ClasswiseAnalysisReport() {
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  const { toast } = useToast();

  // Detect dark mode for theme-aware colors
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  useEffect(() => {
    const checkTheme = () => {
      const isDark = typeof window !== 'undefined' && document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
    };
    
    checkTheme();
    
    // Watch for theme changes
    const observer = new MutationObserver(checkTheme);
    if (typeof window !== 'undefined') {
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class']
      });
    }
    
    return () => observer.disconnect();
  }, []);

  // Filter states
  const [selectedFeeTermIds, setSelectedFeeTermIds] = useState<string[]>([]);
  const [selectedFeeHeadIds, setSelectedFeeHeadIds] = useState<string[]>([]);
  const [includeOutstanding, setIncludeOutstanding] = useState(true);

  // Fetch dropdown data
  const feeTermsQuery = api.finance.getFeeTerms.useQuery(
    {
      branchId: currentBranchId ?? undefined,
      sessionId: currentSessionId ?? undefined,
    },
    {
      enabled: !!currentBranchId && !!currentSessionId,
    }
  );

  const feeHeadsQuery = api.finance.getFeeHeads.useQuery(
    {
      branchId: currentBranchId ?? undefined,
      sessionId: currentSessionId ?? undefined,
    },
    {
      enabled: !!currentBranchId && !!currentSessionId,
    }
  );

  // Fetch real report data
  const reportQuery = api.finance.getClasswiseAnalysisReport.useQuery(
    {
      branchId: currentBranchId!,
      sessionId: currentSessionId!,
      feeTermIds: selectedFeeTermIds.length > 0 ? selectedFeeTermIds : undefined,
      feeHeadIds: selectedFeeHeadIds.length > 0 ? selectedFeeHeadIds : undefined,
      includeOutstanding,
    },
    {
      enabled: !!currentBranchId && !!currentSessionId,
    }
  );

  const reportData = reportQuery.data || {
    summary: {
      totalClasses: 0,
      totalStudents: 0,
      totalCollected: 0,
      totalExpected: 0,
      totalOutstanding: 0,
      averageCollectionPercentage: 0,
    },
    classAnalysis: []
  };

  const valueFormatter = (value: number) => formatIndianCurrency(value);

  // Prepare chart data with 3 lines
  const chartData = reportData.classAnalysis.map(ca => ({
    className: ca.className,
    collected: ca.totalCollected,
    expected: ca.totalExpected,
    concession: (ca as any).totalConcession || 0,
    outstanding: ca.totalOutstanding,
    percentage: ca.collectionPercentage,
  }));

  // Chart categories and colors for 3 lines
  const chartCategories = ["collected", "expected", "concession"];
  const chartColors = ["green", "blue", "orange"];
  const actualColors = isDarkMode 
    ? ["#34d399", "#60a5fa", "#fbbf24"] // Dark mode: emerald-400, blue-400, amber-400
    : ["#10b981", "#3b82f6", "#f59e0b"]; // Light mode: emerald-500, blue-500, amber-500

  // Interactive legend state for Class-wise Analysis - simple approach
  const [hiddenItemsClass, setHiddenItemsClass] = useState<Set<string>>(new Set());

  const handleLegendToggleClass = (item: string) => {
    setHiddenItemsClass(prev => {
      const newSet = new Set(prev);
      if (newSet.has(item)) {
        newSet.delete(item);
      } else {
        newSet.add(item);
      }
      return newSet;
    });
  };

  // Filter chart categories and colors based on visibility
  const visibleCategoriesClass = chartCategories.filter((category: string) => !hiddenItemsClass.has(category));
  // Get colors for visible categories only, maintaining the original mapping
  const visibleChartColorsClass = chartCategories
    .filter((category: string) => !hiddenItemsClass.has(category))
    .map((category: string) => {
      const originalIndex = chartCategories.indexOf(category);
      return chartColors[originalIndex]!;
    });

  // Prepare data for multi-select
  const feeTermOptions = feeTermsQuery.data?.map(term => ({
    label: term.name,
    value: term.id,
  })) ?? [];

  const feeHeadOptions = feeHeadsQuery.data?.map(head => ({
    label: head.name,
    value: head.id,
  })) ?? [];

  return (
    <div className="space-y-6">
      <style dangerouslySetInnerHTML={{
        __html: `
          .recharts-tooltip-wrapper [style*="background-color: rgb(0, 80, 27)"] {
            background-color: #00501B !important;
          }
          .dark .recharts-tooltip-wrapper [style*="background-color: rgb(122, 173, 139)"] {
            background-color: #7AAD8B !important;
          }
        `
      }} />

      {/* Filters Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Analysis Filters
          </CardTitle>
          <CardDescription>
            Analyze class-wise performance with optional fee term and fee head filters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Fee Terms</Label>
                             <MultiSelect
                 options={feeTermOptions}
                 selected={selectedFeeTermIds}
                 onValueChange={setSelectedFeeTermIds}
                 placeholder="All fee terms..."
                 disabled={feeTermsQuery.isLoading}
               />
             </div>
             <div>
               <Label>Fee Heads</Label>
               <MultiSelect
                 options={feeHeadOptions}
                 selected={selectedFeeHeadIds}
                 onValueChange={setSelectedFeeHeadIds}
                 placeholder="All fee heads..."
                 disabled={feeHeadsQuery.isLoading}
               />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="include-outstanding"
              checked={includeOutstanding}
              onCheckedChange={(checked) => setIncludeOutstanding(checked === true)}
            />
            <Label htmlFor="include-outstanding">Include outstanding amount calculations</Label>
                        </div>
                      </CardContent>
                    </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Classes</p>
                <p className="text-2xl font-bold text-blue-600">{reportData.summary.totalClasses}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                <p className="text-2xl font-bold text-purple-600">{reportData.summary.totalStudents}</p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Collected</p>
                <p className="text-2xl font-bold text-green-600">{valueFormatter(reportData.summary.totalCollected)}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Expected</p>
                <p className="text-2xl font-bold text-blue-600">{valueFormatter(reportData.summary.totalExpected)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Outstanding</p>
                <p className="text-2xl font-bold text-red-600">{valueFormatter(reportData.summary.totalOutstanding)}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Collection %</p>
                <p className="text-2xl font-bold text-orange-600">{reportData.summary.averageCollectionPercentage.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Class Comparison Chart */}
                    <Card>
                      <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Class-wise Collection vs Expected
          </CardTitle>
          <CardDescription>Comparison of collected vs expected amounts by class</CardDescription>
                      </CardHeader>
                      <CardContent>
             {reportQuery.isLoading || !reportData ? (
               <div className="h-64 flex items-center justify-center">
                 <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                 <span>Loading chart data...</span>
               </div>
             ) : chartData && chartData.length > 0 ? (
               <div className="space-y-4">
                 <LineChart
                   className="h-64"
                   data={chartData}
                   index="className"
                   categories={visibleCategoriesClass}
                   colors={visibleChartColorsClass}
                   valueFormatter={valueFormatter}
                   yAxisWidth={80}
                   showLegend={false}
                   customTooltip={(props: TooltipProps) => <CustomTooltip {...props} title="Class" />}
                 />
                 {/* Interactive Legend with custom labels */}
                 <InteractiveLegend
                   items={chartCategories.map(category => 
                     category === "collected" ? "Collected" : 
                     category === "expected" ? "Expected" : 
                     "Concession Applied"
                   )}
                   colors={actualColors}
                   visibleItems={Object.fromEntries(
                     chartCategories.map((category, index) => [
                       category === "collected" ? "Collected" : 
                       category === "expected" ? "Expected" : 
                       "Concession Applied",
                       !hiddenItemsClass.has(category)
                     ])
                   )}
                   onToggle={(displayName: string) => {
                     const actualKey = displayName === "Collected" ? "collected" :
                                     displayName === "Expected" ? "expected" : "concession";
                     handleLegendToggleClass(actualKey);
                   }}
                   className="mt-2"
                 />
               </div>
             ) : (
               <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-lg">
                 No class-wise data available for the selected criteria.
               </div>
             )}
        </CardContent>
      </Card>

      {/* Class Analysis Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Class Analysis</CardTitle>
          <CardDescription>Performance metrics for each class</CardDescription>
        </CardHeader>
        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead className="text-right">Students</TableHead>
                <TableHead className="text-right">Collected</TableHead>
                <TableHead className="text-right">Expected</TableHead>
                <TableHead className="text-right">Concession Applied</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead className="text-right">Collection %</TableHead>
                <TableHead className="text-right">Avg per Student</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
              {reportData.classAnalysis.map((item) => (
                <TableRow key={item.classId}>
                  <TableCell className="font-medium">{item.className}</TableCell>
                  <TableCell className="text-right">{item.totalStudents}</TableCell>
                  <TableCell className="text-right font-mono">{valueFormatter(item.totalCollected)}</TableCell>
                  <TableCell className="text-right font-mono">{valueFormatter(item.totalExpected)}</TableCell>
                  <TableCell className="text-right font-mono text-orange-600">{valueFormatter((item as any).totalConcession || 0)}</TableCell>
                  <TableCell className="text-right font-mono text-red-600">{valueFormatter(item.totalOutstanding)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={item.collectionPercentage >= 80 ? "default" : item.collectionPercentage >= 60 ? "secondary" : "destructive"}>
                      {item.collectionPercentage.toFixed(1)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">{valueFormatter(Math.round(item.averagePerStudent))}</TableCell>
                </TableRow>
              ))}
                            </TableBody>
                          </Table>
                      </CardContent>
                    </Card>
                </div>
  );
}

// Placeholder component for other reports (now removed)
function OtherReports({ reportType }: { reportType: string }) {
  return (
    <div className="text-center py-12">
      <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-lg font-semibold mb-2">{reportType}</h3>
      <p className="text-muted-foreground">
        This report will be available soon. Please check back later.
      </p>
                </div>
  );
}

// Concession Report Component
function ConcessionReport() {
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();

  // Filter states
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [selectedConcessionTypeIds, setSelectedConcessionTypeIds] = useState<string[]>([]);
     const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>(new Date(new Date().getFullYear(), 3, 1).toISOString().split('T')[0]!); // April 1st
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]!);

  // Fetch dropdown data
  const classesQuery = api.class.getAll.useQuery(
    {
      branchId: currentBranchId!,
      sessionId: currentSessionId!,
      includeSections: true,
    },
    {
      enabled: !!currentBranchId && !!currentSessionId,
    }
  );

  // Fetch report data
  const reportQuery = api.finance.getConcessionReport.useQuery(
    {
      branchId: currentBranchId!,
      sessionId: currentSessionId!,
      startDate,
      endDate,
      classIds: selectedClassIds.length > 0 ? selectedClassIds : undefined,
      concessionTypeIds: selectedConcessionTypeIds.length > 0 ? selectedConcessionTypeIds : undefined,
             status: selectedStatus && selectedStatus !== 'ALL' ? (selectedStatus as 'PENDING' | 'APPROVED' | 'REJECTED') : undefined,
    },
    { 
      enabled: !!currentBranchId && !!currentSessionId,
    }
  );

  // Prepare dropdown options
  const classOptions = useMemo(() => {
    if (!classesQuery.data) return [];
    return classesQuery.data.map(cls => ({
      value: cls.id,
      label: cls.name,
    }));
  }, [classesQuery.data]);

  const concessionTypeOptions = useMemo(() => {
    if (!reportQuery.data?.concessionTypes) return [];
    return reportQuery.data.concessionTypes.map(type => ({
      value: type.id,
      label: type.name,
    }));
  }, [reportQuery.data?.concessionTypes]);

  if (!currentBranchId || !currentSessionId) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-[#3a3a3a] dark:bg-[#252525]">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please select a branch and academic session to view concession reports.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { chartData, tableData, summary } = reportQuery.data || {};

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Concession Filters
          </CardTitle>
          <CardDescription>
            Filter concessions by date range, classes, concession types, and status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Date Range</Label>
              <DateRangeSelector
                value={{ 
                  from: new Date(startDate), 
                  to: new Date(endDate) 
                }}
                onChange={(range: DateRange | undefined) => {
                  if (range?.from) setStartDate(range.from.toISOString().split('T')[0]!);
                  if (range?.to) setEndDate(range.to.toISOString().split('T')[0]!);
                }}
                placeholder="Select date range"
                disabled={reportQuery.isLoading}
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</Label>
                             <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                 <SelectTrigger>
                   <SelectValue placeholder="All status" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="ALL">All Status</SelectItem>
                   <SelectItem value="PENDING">Pending</SelectItem>
                   <SelectItem value="APPROVED">Approved</SelectItem>
                   <SelectItem value="REJECTED">Rejected</SelectItem>
                 </SelectContent>
               </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Classes</Label>
              <MultiSelect
                options={classOptions}
                selected={selectedClassIds}
                onValueChange={setSelectedClassIds}
                placeholder="All classes..."
                disabled={classesQuery.isLoading}
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Concession Types</Label>
              <MultiSelect
                options={concessionTypeOptions}
                selected={selectedConcessionTypeIds}
                onValueChange={setSelectedConcessionTypeIds}
                placeholder="All concession types..."
                disabled={reportQuery.isLoading}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Concessions</p>
                <div className="text-2xl font-bold">
                  {reportQuery.isLoading ? <MetricSkeleton /> : (summary?.totalConcessions || 0)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <div className="text-2xl font-bold">
                  {reportQuery.isLoading ? <MetricSkeleton /> : valueFormatter(summary?.totalAmount || 0)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <div className="text-2xl font-bold">
                  {reportQuery.isLoading ? <MetricSkeleton /> : (summary?.statusSummary?.pending || 0)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <div className="text-2xl font-bold">
                  {reportQuery.isLoading ? <MetricSkeleton /> : (summary?.statusSummary?.approved || 0)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Concession Trends
          </CardTitle>
          <CardDescription>Daily concession amounts over time</CardDescription>
        </CardHeader>
        <CardContent>
          {reportQuery.isLoading || !reportQuery.data ? (
            <div className="h-64 flex items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>Loading chart data...</span>
            </div>
          ) : chartData && chartData.length > 0 ? (
            <LineChart
              className="h-64"
              data={chartData}
              index="formattedDate"
              categories={["amount"]}
              colors={["amber"]}
              valueFormatter={valueFormatter}
              yAxisWidth={80}
              showLegend={false}
              customTooltip={(props: TooltipProps) => <CustomTooltip {...props} title="Date" />}
            />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-lg">
              No concession data available for the selected criteria.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Concession Details
          </CardTitle>
          <CardDescription>Complete list of student concessions</CardDescription>
        </CardHeader>
        <CardContent>
          {reportQuery.isLoading || !reportQuery.data ? (
            <TableSkeleton />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Roll No.</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Concession Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Applied Date</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData && tableData.length > 0 ? tableData.map((row: any) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.studentName}</TableCell>
                    <TableCell>{row.rollNumber}</TableCell>
                    <TableCell>{row.className} - {row.sectionName}</TableCell>
                    <TableCell>{row.concessionType}</TableCell>
                    <TableCell className="font-mono">{valueFormatter(row.concessionAmount)}</TableCell>
                    <TableCell>
                      <Badge variant={
                        row.status === 'APPROVED' ? 'default' : 
                        row.status === 'PENDING' ? 'secondary' : 
                        'destructive'
                      }>
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(row.appliedDate).toLocaleDateString('en-IN')}</TableCell>
                    <TableCell className="max-w-xs truncate">{row.reason || 'N/A'}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No concession records found for the selected criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function FinanceReportsPage() {
  const [activeTab, setActiveTab] = useState('fee-defaulters');

  // Detect dark mode for theme-aware colors
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  useEffect(() => {
    const checkTheme = () => {
      const isDark = typeof window !== 'undefined' && document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
    };
    
    checkTheme();
    
    // Watch for theme changes
    const observer = new MutationObserver(checkTheme);
    if (typeof window !== 'undefined') {
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class']
      });
    }
    
    return () => observer.disconnect();
  }, []);

  const reportTabs = [
    { 
      id: 'fee-defaulters', 
      name: 'Fee Defaulters', 
      icon: <AlertTriangle className="h-4 w-4" />, 
      description: 'Students with outstanding fees' 
    },
    { 
      id: 'collection-summary', 
      name: 'Collection Summary', 
      icon: <BarChart3 className="h-4 w-4" />, 
      description: 'Overall collection statistics' 
    },
    { 
      id: 'daily-collection', 
      name: 'Daily Collection', 
      icon: <FileText className="h-4 w-4" />, 
      description: 'Day-wise collection register' 
    },
    { 
      id: 'class-wise', 
      name: 'Class-wise Analysis', 
      icon: <Users className="h-4 w-4" />, 
      description: 'Analysis by class and section' 
    },
    { 
      id: 'concession', 
      name: 'Concession Report', 
      icon: <DollarSign className="h-4 w-4" />, 
      description: 'Student concession tracking and analysis' 
    },
  ];

  return (
    <PageWrapper title="Finance Reports" subtitle="Generate comprehensive financial reports and analytics">
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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 mb-6">
          {reportTabs.map((tab) => (
            <TabsTrigger 
              key={tab.id} 
              value={tab.id}
              className="flex items-center gap-2 text-sm"
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.name}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="fee-defaulters">
          <FeeDefaultersReport />
        </TabsContent>

        <TabsContent value="collection-summary">
          <CollectionSummaryReport />
        </TabsContent>

        <TabsContent value="daily-collection">
          <DailyCollectionReport />
        </TabsContent>

        <TabsContent value="class-wise">
          <ClasswiseAnalysisReport />
        </TabsContent>

        <TabsContent value="concession">
          <ConcessionReport />
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
} 