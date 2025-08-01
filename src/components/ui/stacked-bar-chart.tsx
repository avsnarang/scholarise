'use client';

import { BarChart, Card } from '@tremor/react';

function classNames(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

interface TabData {
  name: string;
  value: string;
  color: string;
}

type ChartDataPoint = Record<string, string | number>;

interface StackedBarChartProps {
  title?: string;
  description?: string;
  tabs: TabData[];
  data: ChartDataPoint[];
  categories: string[];
  colors: string[];
  valueFormatter?: (number: number) => string;
  indexKey?: string;
  className?: string;
}

const defaultValueFormatter = (number: number) => {
  const formatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
    notation: 'compact',
    compactDisplay: 'short',
  });
  return formatter.format(number);
};

export default function StackedBarChart({
  title = "Performance breakdown by categories",
  description = "Check performance across different categories over time",
  tabs,
  data,
  categories,
  colors,
  valueFormatter = defaultValueFormatter,
  indexKey = "date",
  className = "",
}: StackedBarChartProps) {
  return (
    <div className={className}>
      <Card className="border-gray-100 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">
          {title}
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          {description}
        </p>
        <ul
          role="list"
          className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-3"
        >
          {tabs.map((tab) => (
            <li
              key={tab.name}
              className="rounded-lg border border-gray-200 px-3 py-2 text-left bg-white hover:bg-gray-50 transition-colors duration-200"
            >
              <div className="flex items-center space-x-1.5">
                <span
                  className={classNames(tab.color, 'w-2.5 h-2.5 rounded-sm')}
                  aria-hidden={true}
                />
                <p className="text-sm font-medium text-gray-600">
                  {tab.name}
                </p>
              </div>
              <p className="mt-0.5 text-base font-bold text-gray-900">
                {tab.value}
              </p>
            </li>
          ))}
        </ul>
        <BarChart
          data={data}
          index={indexKey}
          categories={categories}
          colors={colors}
          showLegend={false}
          valueFormatter={valueFormatter}
          yAxisWidth={50}
          stack={true}
          className="mt-6 hidden h-56 sm:block"
        />
        <BarChart
          data={data}
          index={indexKey}
          categories={categories}
          colors={colors}
          showLegend={false}
          valueFormatter={valueFormatter}
          showYAxis={false}
          stack={true}
          className="mt-6 h-48 sm:hidden"
        />
      </Card>
    </div>
  );
} 