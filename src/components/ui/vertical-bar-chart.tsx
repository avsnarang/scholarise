'use client';

import { useState } from 'react';
import CountUp from 'react-countup';

interface DataPoint {
  name: string;
  value: number;
}

interface VerticalBarChartProps {
  data: DataPoint[];
  title?: string;
  metricLabel?: string;
  valueFormatter?: (number: number) => string;
  className?: string;
}

import { formatIndianNumber } from '@/lib/utils';

const defaultValueFormatter = (number: number) =>
  formatIndianNumber(number);

export default function VerticalBarChart({
  data,
  title = "Locations",
  metricLabel = "Visitors",
  valueFormatter = defaultValueFormatter,
  className = "",
}: VerticalBarChartProps) {
  const initialSum = data.reduce(
    (sum, dataPoint) => sum + (dataPoint.value || 0),
    0,
  );

  const [selectedItem, setSelectedItem] = useState<string | undefined>(undefined);
  const maxValue = Math.max(...data.map(item => item.value));

  const handleBarClick = (item: DataPoint) => {
    setSelectedItem(selectedItem === item.name ? undefined : item.name);
  };

  const filteredData = selectedItem 
    ? data.filter(item => item.name === selectedItem)
    : data;

  const displaySum = selectedItem 
    ? data.find(item => item.name === selectedItem)?.value || 0
    : initialSum;

  return (
    <div className={`bg-white dark:bg-[#252525] rounded-xl border border-gray-200 dark:border-[#3a3a3a] p-6 ${className}`}>
      {/* Header with total count */}
      <div className="mb-6">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{metricLabel}</p>
        <p className="text-3xl font-bold text-gray-900 dark:text-white">
          <CountUp end={displaySum} duration={0.6} formattingFn={valueFormatter} />
        </p>
      </div>

      {/* Chart Title */}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>

      {/* Bar Chart */}
      <div className="space-y-3">
        {filteredData.map((item, index) => {
          const percentage = (item.value / maxValue) * 100;
          const isSelected = selectedItem === item.name;
          
          return (
            <div 
              key={item.name}
              className="cursor-pointer group"
              onClick={() => handleBarClick(item)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm font-medium transition-colors ${
                  isSelected ? 'text-[#00501b] dark:text-[#7AAD8B]' : 'text-gray-700 dark:text-gray-300 group-hover:text-[#00501b] dark:group-hover:text-[#7AAD8B]'
                }`}>
                  {item.name}
                </span>
                <span className={`text-sm font-semibold transition-colors ${
                  isSelected ? 'text-[#00501b] dark:text-[#7AAD8B]' : 'text-gray-900 dark:text-white group-hover:text-[#00501b] dark:group-hover:text-[#7AAD8B]'
                }`}>
                  {valueFormatter(item.value)}
                </span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-[#1a1a1a] rounded-full h-2 group-hover:bg-gray-200 dark:group-hover:bg-[#2a2a2a] transition-colors">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ease-out ${
                    isSelected 
                      ? 'bg-[#00501b] dark:bg-[#7AAD8B]' 
                      : 'bg-[#00501b] dark:bg-[#7AAD8B] bg-opacity-50 dark:bg-opacity-70 group-hover:bg-opacity-70 dark:group-hover:bg-opacity-90'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Clear selection button */}
      {selectedItem && (
        <button
          onClick={() => setSelectedItem(undefined)}
          className="mt-4 text-xs text-[#00501b] dark:text-[#7AAD8B] hover:text-[#00501b]/80 dark:hover:text-[#7AAD8B]/80 font-medium transition-colors"
        >
          Show all locations
        </button>
      )}
    </div>
  );
} 