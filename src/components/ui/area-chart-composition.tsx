'use client';

import {
  BarChart,
  Card,
  List,
  ListItem,
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  TabPanels,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@tremor/react';
import React from 'react';

function classNames(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

interface ChartDataPoint {
  date: string;
  [key: string]: string | number;
}

interface SummaryItem {
  name: string;
  value: string;
  invested: string;
  cashflow: string;
  gain: string;
  realized: string;
  dividends: string;
  bgColor: string;
  changeType: 'positive' | 'negative';
}

interface AreaChartCompositionProps {
  title: string;
  totalValue: string;
  changeAmount: string;
  changePercentage: string;
  changeType: 'positive' | 'negative';
  timeframe: string;
  data: ChartDataPoint[];
  categories: string[];
  colors: string[];
  summary: SummaryItem[];
  valueFormatter?: (number: number) => string;
  className?: string;
}

const defaultValueFormatter = (number: number) =>
  `$${Intl.NumberFormat('us').format(number).toString()}`;

// Custom Tooltip Component
const CustomTooltip = ({ 
  active, 
  payload, 
  label, 
  valueFormatter 
}: {
  active?: boolean;
  payload?: any[];
  label?: string | number;
  valueFormatter: (value: number) => string;
}) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white dark:bg-[#252525] rounded-lg border border-gray-200 dark:border-gray-600 shadow-lg p-4 min-w-[200px]">
        <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">{String(label)}</p>
        <div className="space-y-2">
          {payload
            .filter(entry => entry.value != null && entry.value !== 0)
            .map((entry, index) => {
              // Get the color based on the entry's color or use a fallback
              const getColorStyle = () => {
                if (entry.color) {
                  return { backgroundColor: entry.color };
                }
                // Fallback color mapping
                const colorMap: Record<string, string> = {
                  'emerald': '#10b981',
                  'blue': '#3b82f6',
                  'amber': '#f59e0b',
                  'red': '#ef4444',
                  'violet': '#8b5cf6',
                  'indigo': '#6366f1',
                };
                const colorName = entry.dataKey?.toLowerCase().includes('tuition') ? 'emerald' :
                                  entry.dataKey?.toLowerCase().includes('library') ? 'blue' :
                                  entry.dataKey?.toLowerCase().includes('laboratory') ? 'amber' :
                                  entry.dataKey?.toLowerCase().includes('sports') ? 'red' :
                                  entry.dataKey?.toLowerCase().includes('transport') ? 'violet' :
                                  entry.dataKey?.toLowerCase().includes('exam') ? 'indigo' : 'gray';
                return { backgroundColor: colorMap[colorName] || '#6b7280' };
              };

              return (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={getColorStyle()}
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{entry.dataKey}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {valueFormatter(entry.value)}
                  </span>
                </div>
              );
            })}
        </div>
      </div>
    );
  }
  return null;
};

export default function AreaChartComposition({
  title,
  totalValue,
  changeAmount,
  changePercentage,
  changeType,
  timeframe,
  data,
  categories,
  colors,
  summary,
  valueFormatter = defaultValueFormatter,
  className = "",
}: AreaChartCompositionProps) {


  return (
        <div className={`bg-white dark:bg-[#252525] rounded-xl border border-gray-200 dark:border-[#3a3a3a] shadow-sm ${className}`}>


      {/* Header Section */}
      <div className="p-6 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              {title}
            </h3>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {totalValue}
            </p>
            <p className="text-sm font-medium">
              <span className={classNames(
                changeType === 'positive'
                  ? 'text-emerald-600 dark:text-[#7AAD8B]'
                  : 'text-red-600 dark:text-red-400'
              )}>
                {changeAmount} ({changePercentage})
              </span>{' '}
              <span className="font-normal text-gray-500 dark:text-gray-400">
                {timeframe}
              </span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500 dark:text-gray-400">Last 30 days</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Fee collection trends</p>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="p-6 w-full">
        {/* Custom Legend */}
        <div className="flex flex-wrap items-center justify-center gap-6 mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
          {categories.map((category, index) => {
            const getColorHex = (colorName: string) => {
              const colorMap: Record<string, string> = {
                'emerald': '#10b981',
                'blue': '#3b82f6', 
                'amber': '#f59e0b',
                'red': '#ef4444',
                'violet': '#8b5cf6',
                'indigo': '#6366f1',
              };
              return colorMap[colorName] || '#6b7280';
            };
            
            return (
              <div key={category} className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getColorHex(colors[index] || 'gray') }}
                />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{category}</span>
              </div>
            );
          })}
        </div>

        {/* Chart with Tabs */}
        <div className="w-full">
          <TabGroup>
            <TabList className="mt-8">
              <Tab className="font-medium">All Fee Heads</Tab>
              <Tab className="font-medium">Primary Fees</Tab>
              <Tab className="font-medium">Secondary Fees</Tab>
            </TabList>
            <TabPanels>
              {/* All Fee Heads */}
              <TabPanel>
                <BarChart
                  data={data}
                  index="date"
                  categories={categories}
                  colors={colors}
                  valueFormatter={valueFormatter}
                  stack={true}
                  showLegend={false}
                  showYAxis={false}
                  startEndOnly={true}
                  className="mt-8 h-64"
                />
                <List className="mt-4">
                  {categories.map((category, index) => (
                    <ListItem key={category}>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`h-0.5 w-3 bg-${colors[index]}-500`}
                          aria-hidden={true}
                        />
                        <span>{category}</span>
                      </div>
                      <span className="font-medium text-tremor-content-strong dark:text-dark-tremor-content-strong">
                        {valueFormatter(data.reduce((sum, day) => sum + (Number(day[category]) || 0), 0))}
                      </span>
                    </ListItem>
                  ))}
                </List>
              </TabPanel>

              {/* Primary Fees */}
              <TabPanel>
                                 <BarChart
                   data={data}
                   index="date"
                   categories={['Tuition Fee', 'Library Fee', 'Laboratory Fee']}
                   colors={['emerald', 'blue', 'amber']}
                   valueFormatter={valueFormatter}
                   stack={true}
                   showLegend={false}
                   showYAxis={false}
                   startEndOnly={true}
                   className="mt-8 h-64"
                 />
                <List className="mt-4">
                  {['Tuition Fee', 'Library Fee', 'Laboratory Fee'].map((category, index) => (
                    <ListItem key={category}>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`h-0.5 w-3 bg-${['emerald', 'blue', 'amber'][index]}-500`}
                          aria-hidden={true}
                        />
                        <span>{category}</span>
                      </div>
                                             <span className="font-medium text-tremor-content-strong dark:text-dark-tremor-content-strong">
                         {valueFormatter(data.reduce((sum, day) => sum + (Number(day[category]) || 0), 0))}
                       </span>
                     </ListItem>
                   ))}
                 </List>
               </TabPanel>

               {/* Secondary Fees */}
              <TabPanel>
                                 <BarChart
                   data={data}
                   index="date"
                   categories={['Sports Fee', 'Transport Fee', 'Exam Fee']}
                   colors={['red', 'violet', 'indigo']}
                   valueFormatter={valueFormatter}
                   stack={true}
                   showLegend={false}
                   showYAxis={false}
                   startEndOnly={true}
                   className="mt-8 h-64"
                 />
                <List className="mt-4">
                  {['Sports Fee', 'Transport Fee', 'Exam Fee'].map((category, index) => (
                    <ListItem key={category}>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`h-0.5 w-3 bg-${['red', 'violet', 'indigo'][index]}-500`}
                          aria-hidden={true}
                        />
                        <span>{category}</span>
                      </div>
                                             <span className="font-medium text-tremor-content-strong dark:text-dark-tremor-content-strong">
                         {valueFormatter(data.reduce((sum, day) => sum + (Number(day[category]) || 0), 0))}
                       </span>
                     </ListItem>
                   ))}
                 </List>
               </TabPanel>
             </TabPanels>
           </TabGroup>
        </div>
      </div>

      {/* Summary Table */}
      <div className="border-t border-gray-100 dark:border-gray-700">
        <div className="p-6">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Fee Head Summary</h4>
          <Table>
            <TableHead>
              <TableRow className="border-b border-gray-200 dark:border-gray-600">
                <TableHeaderCell className="text-left text-gray-900 dark:text-white font-semibold py-3">
                  Fee Head
                </TableHeaderCell>
                <TableHeaderCell className="text-right text-gray-900 dark:text-white font-semibold py-3">
                  Total Due
                </TableHeaderCell>
                <TableHeaderCell className="text-right text-gray-900 dark:text-white font-semibold py-3">
                  Concession
                </TableHeaderCell>
                <TableHeaderCell className="text-right text-gray-900 dark:text-white font-semibold py-3">
                  Received
                </TableHeaderCell>
                <TableHeaderCell className="text-right text-gray-900 dark:text-white font-semibold py-3">
                  Remaining
                </TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {summary.map((item) => (
                <TableRow key={item.name} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <TableCell className="font-medium text-gray-900 dark:text-white py-3">
                    <div className="flex space-x-3 items-center">
                      <span
                        className={classNames(item.bgColor, 'w-3 h-3 shrink-0 rounded-full')}
                        aria-hidden={true}
                      />
                      <span>{item.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-gray-700 dark:text-gray-300 py-3 font-medium">{item.invested}</TableCell>
                  <TableCell className="text-right text-gray-700 dark:text-gray-300 py-3">{item.cashflow}</TableCell>
                  <TableCell className="text-right text-gray-700 dark:text-gray-300 py-3 font-medium">{item.gain}</TableCell>
                  <TableCell className="text-right py-3">
                    <span
                      className={classNames(
                        item.changeType === 'positive'
                          ? 'text-emerald-600 dark:text-[#7AAD8B]'
                          : 'text-red-600 dark:text-red-400',
                        'font-semibold'
                      )}
                    >
                      {item.realized}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
} 