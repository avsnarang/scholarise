"use client";

import React, { useState } from 'react';
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { FileText, BarChartBig, CalendarRange, Users, Download, Filter } from 'lucide-react';

// Placeholder report types
const reportTypes = [
  { id: 'collection_summary', name: 'Fee Collection Summary', icon: <BarChartBig/>, description: 'Overall fee collection statistics for a period.' },
  { id: 'outstanding_detail', name: 'Outstanding Fees Detail', icon: <FileText/>, description: 'Detailed list of students with pending fee payments.' },
  { id: 'daily_collection', name: 'Daily Collection Register', icon: <CalendarRange/>, description: 'Day-wise summary of fees collected.' },
  { id: 'class_wise_dues', name: 'Class-wise Dues Report', icon: <Users/>, description: 'Outstanding fees summarized by class.' },
  { id: 'fee_head_wise_collection', name: 'Fee Head-wise Collection', icon: <BarChartBig/>, description: 'Collection report categorized by individual fee heads.' },
  { id: 'transaction_log', name: 'Payment Transaction Log', icon: <FileText/>, description: 'Complete log of all payment transactions recorded.' },
];

export default function FinanceReportsPage() {
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  // Add more filters as needed: class, fee head, etc.

  const handleGenerateReport = () => {
    if (!selectedReport) {
      alert('Please select a report type.');
      return;
    }
    // TODO: Implement actual report generation logic and data fetching based on selectedReport and filters
    console.log('Generating report:', { selectedReport, dateFrom, dateTo });
    alert(`Generating ${selectedReport.name} from ${dateFrom || 'start'} to ${dateTo || 'today'} (mocked).`);
  };

  return (
    <PageWrapper title="Finance Reports" subtitle="Generate and view various financial reports for analysis and record-keeping.">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Report Selection Panel */} 
        <div className="md:col-span-1">
          <Card className="shadow-md border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-700 dark:text-white">Select Report</CardTitle>
              <CardDescription>Choose a report type from the list below.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {reportTypes.map(report => (
                <Button
                  key={report.id}
                  variant={selectedReport?.id === report.id ? "default" : "outline"}
                  className="w-full justify-start text-left h-auto py-3"
                  onClick={() => setSelectedReport(report)}
                >
                  <div className="flex items-center">
                    <span className="mr-3 text-[#00501B] dark:text-green-400">
                      {React.cloneElement(report.icon, {className: "h-5 w-5"})}
                    </span>
                    <div>
                        <span className="font-medium">{report.name}</span>
                        <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">{report.description}</p>
                    </div>
                  </div>
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Filters and Report Display Panel */} 
        <div className="md:col-span-2">
          <Card className="shadow-md border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 mb-6">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-700 dark:text-white flex items-center">
                <Filter className="h-5 w-5 mr-2 text-[#00501B] dark:text-green-400"/>
                Report Filters
              </CardTitle>
              <CardDescription>Apply filters before generating the report. Available filters may vary by report type.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="date-from" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date From</label>
                <Input id="date-from" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} disabled={!selectedReport} />
              </div>
              <div>
                <label htmlFor="date-to" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date To</label>
                <Input id="date-to" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} disabled={!selectedReport} />
              </div>
              {/* Add more dynamic filters here based on selectedReport.id if needed */}
            </CardContent>
            <CardContent>
                 <Button onClick={handleGenerateReport} disabled={!selectedReport} className="w-full sm:w-auto">
                    <Download className="h-4 w-4 mr-2" />
                    Generate & View Report
                 </Button>
            </CardContent>
          </Card>

          {selectedReport && (
            <Card className="shadow-md border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-700 dark:text-white">Report: {selectedReport.name}</CardTitle>
                <CardDescription>Showing data for the selected filters (Placeholder Content)</CardDescription>
              </CardHeader>
              <CardContent>
                {/* This area will display the actual report content or a link to download it */}
                <div className="min-h-[200px] flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md p-8">
                  <p className="text-gray-500 dark:text-gray-400 text-center">
                    Report content for "{selectedReport.name}" will appear here after generation.
                    <br/>
                    (For now, this is a placeholder. Actual report data would be fetched and displayed or offered for download.)
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          {!selectedReport && (
             <Card className="shadow-md border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <CardContent className="pt-6">
                    <p className="text-center text-gray-500 dark:text-gray-400">
                        Please select a report type from the left panel to apply filters and generate a report.
                    </p>
                </CardContent>
             </Card>
          )}
        </div>
      </div>
    </PageWrapper>
  );
} 