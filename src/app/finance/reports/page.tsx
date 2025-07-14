"use client";

import React, { useState, useMemo } from 'react';
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
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  FileText, 
  BarChart3, 
  CalendarRange, 
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
  Eye
} from 'lucide-react';
import VerticalBarChart from "@/components/ui/vertical-bar-chart";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { useToast } from "@/components/ui/use-toast";
import { formatIndianCurrency } from "@/lib/utils";

interface ReportFilters {
  startDate: string;
  endDate: string;
  classId?: string;
  feeTermId?: string;
  feeHeadId?: string;
  paymentMode?: string;
  status?: string;
}

interface ReportData {
  summary: {
    totalCollected: number;
    totalPending: number;
    totalOverdue: number;
    collectionRate: number;
    studentsCount: number;
  };
  collections: Array<{
    date: string;
    amount: number;
    count: number;
  }>;
  feeHeadWise: Array<{
    name: string;
    collected: number;
    pending: number;
    total: number;
  }>;
  classWise: Array<{
    className: string;
    collected: number;
    pending: number;
    studentsCount: number;
  }>;
  outstandingDetails: Array<{
    studentName: string;
    admissionNumber: string;
    className: string;
    totalDue: number;
    overdueDays: number;
    lastPaymentDate?: string;
  }>;
  transactions: Array<{
    id: string;
    date: string;
    studentName: string;
    feeHead: string;
    amount: number;
    paymentMode: string;
    receiptNumber: string;
  }>;
}

const reportTypes = [
  { 
    id: 'collection_summary', 
    name: 'Collection Summary', 
    icon: <BarChart3 className="h-4 w-4" />, 
    description: 'Overall collection statistics' 
  },
  { 
    id: 'outstanding_detail', 
    name: 'Outstanding Fees', 
    icon: <FileText className="h-4 w-4" />, 
    description: 'Students with pending payments' 
  },
  { 
    id: 'daily_collection', 
    name: 'Daily Collection', 
    icon: <CalendarRange className="h-4 w-4" />, 
    description: 'Day-wise collection register' 
  },
  { 
    id: 'class_wise_dues', 
    name: 'Class-wise Analysis', 
    icon: <Users className="h-4 w-4" />, 
    description: 'Analysis by class' 
  },
  { 
    id: 'fee_head_wise', 
    name: 'Fee Head Report', 
    icon: <BarChart3 className="h-4 w-4" />, 
    description: 'Breakdown by fee categories' 
  },
  { 
    id: 'transaction_log', 
    name: 'Transaction Log', 
    icon: <FileText className="h-4 w-4" />, 
    description: 'Payment transaction history' 
  },
];

export default function FinanceReportsPage() {
  const [selectedReport, setSelectedReport] = useState('collection_summary');
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] ?? '',
    endDate: new Date().toISOString().split('T')[0] ?? '',
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  const { toast } = useToast();

  // API calls
  const reportDataQuery = api.finance.getFinancialSummary.useQuery(
    {
      branchId: currentBranchId!,
      sessionId: currentSessionId!,
      startDate: new Date(filters.startDate),
      endDate: new Date(filters.endDate),
    },
    { 
      enabled: !!currentBranchId && !!currentSessionId,
      refetchOnWindowFocus: false,
    }
  );

  const classesQuery = api.finance.getClasses.useQuery(
    { branchId: currentBranchId!, sessionId: currentSessionId! },
    { enabled: !!currentBranchId && !!currentSessionId }
  );

  const feeTermsQuery = api.finance.getFeeTerms.useQuery(
    { branchId: currentBranchId!, sessionId: currentSessionId! },
    { enabled: !!currentBranchId && !!currentSessionId }
  );

  const feeHeadsQuery = api.finance.getFeeHeads.useQuery(
    { branchId: currentBranchId! },
    { enabled: !!currentBranchId }
  );

  const updateFilter = (key: keyof ReportFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value || undefined }));
  };

  const handleGenerateReport = () => {
    setIsGenerating(true);
    reportDataQuery.refetch().finally(() => {
      setIsGenerating(false);
      toast({
        title: "Report Generated",
        description: `${reportTypes.find(r => r.id === selectedReport)?.name} has been updated.`,
      });
    });
  };

  const handleExportReport = () => {
    if (!reportDataQuery.data) {
      toast({
        title: "No Data",
        description: "Please generate a report first.",
        variant: "destructive",
      });
      return;
    }

    let csvContent = '';
    const reportData = reportDataQuery.data as unknown as ReportData;

    switch (selectedReport) {
      case 'outstanding_detail':
        csvContent = [
          'Student Name,Admission Number,Class,Total Due,Overdue Days,Last Payment Date',
          ...reportData.outstandingDetails.map(item => 
            `"${item.studentName}","${item.admissionNumber}","${item.className}",${item.totalDue},${item.overdueDays},"${item.lastPaymentDate || 'N/A'}"`
          )
        ].join('\n');
        break;
      case 'transaction_log':
        csvContent = [
          'Date,Student Name,Fee Head,Amount,Payment Mode,Receipt Number',
          ...reportData.transactions.map(item => 
            `"${item.date}","${item.studentName}","${item.feeHead}",${item.amount},"${item.paymentMode}","${item.receiptNumber}"`
          )
        ].join('\n');
        break;
      default:
        csvContent = `Report: ${reportTypes.find(r => r.id === selectedReport)?.name}\nGenerated: ${new Date().toLocaleString()}\n\nTotal Collected: ₹${reportData.summary.totalCollected.toLocaleString()}\nTotal Pending: ₹${reportData.summary.totalPending.toLocaleString()}\nCollection Rate: ${reportData.summary.collectionRate.toFixed(1)}%`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${selectedReport}_${filters.startDate}_to_${filters.endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Report Exported",
      description: "Report downloaded as CSV file.",
    });
  };

  const handlePrintReport = () => {
    window.print();
    toast({
      title: "Print Initiated",
      description: "Report sent to printer.",
    });
  };

  const reportData = reportDataQuery.data as ReportData | undefined;

  const chartData = useMemo(() => {
    if (!reportData) return [];
    
    switch (selectedReport) {
      case 'daily_collection':
        return reportData.collections?.map(item => ({
          name: new Date(item.date).toLocaleDateString(),
          value: item.amount,
        })) || [];
      case 'fee_head_wise':
        return reportData.feeHeadWise?.map(item => ({
          name: item.name,
          value: item.collected,
        })) || [];
      case 'class_wise_dues':
        return reportData.classWise?.map(item => ({
          name: item.className,
          value: item.collected,
        })) || [];
      default:
        return [];
    }
  }, [reportData, selectedReport]);

  if (!currentBranchId || !currentSessionId) {
    return (
      <PageWrapper title="Finance Reports" subtitle="Generate financial reports and analytics">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please select a branch and academic session to access finance reports.
          </AlertDescription>
        </Alert>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Finance Reports" subtitle="Generate financial reports and analytics">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Report Selection & Filters */}
        <div className="lg:col-span-1 space-y-4">
          {/* Report Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Report Type</CardTitle>
              <CardDescription>Select the report to generate</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {reportTypes.map((report) => (
                <div
                  key={report.id}
                  className={`p-3 rounded-lg cursor-pointer border transition-colors ${
                    selectedReport === report.id
                      ? 'bg-muted border-border'
                      : 'hover:bg-muted/50 border-border'
                  }`}
                  onClick={() => setSelectedReport(report.id)}
                >
                  <div className="flex items-start gap-2">
                    {report.icon}
                    <div>
                      <p className="font-medium text-sm">{report.name}</p>
                      <p className="text-xs text-muted-foreground">{report.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Date Range */}
              <div className="space-y-2">
                <Label>Date Range</Label>
                <div className="grid grid-cols-1 gap-2">
                  <Input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => updateFilter('startDate', e.target.value)}
                  />
                  <Input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => updateFilter('endDate', e.target.value)}
                  />
                </div>
              </div>

              {/* Class Filter */}
              <div className="space-y-2">
                <Label>Class</Label>
                <Select value={filters.classId || 'all'} onValueChange={(value) => updateFilter('classId', value === 'all' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {classesQuery.data?.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Fee Term Filter */}
              <div className="space-y-2">
                <Label>Fee Term</Label>
                <Select value={filters.feeTermId || 'all'} onValueChange={(value) => updateFilter('feeTermId', value === 'all' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Terms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Terms</SelectItem>
                    {feeTermsQuery.data?.map((term) => (
                      <SelectItem key={term.id} value={term.id}>{term.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Mode Filter */}
              <div className="space-y-2">
                <Label>Payment Mode</Label>
                <Select value={filters.paymentMode || 'all'} onValueChange={(value) => updateFilter('paymentMode', value === 'all' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Modes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Modes</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                    <SelectItem value="Bank_Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                    <SelectItem value="Online">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Action Buttons */}
              <div className="space-y-2">
                <Button 
                  onClick={handleGenerateReport} 
                  className="w-full"
                  disabled={isGenerating || reportDataQuery.isLoading}
                >
                  {isGenerating || reportDataQuery.isLoading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4 mr-2" />
                  )}
                  Generate Report
                </Button>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={handleExportReport} disabled={!reportData}>
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                  <Button variant="outline" onClick={handlePrintReport} disabled={!reportData}>
                    <Printer className="h-4 w-4 mr-1" />
                    Print
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Report Content */}
        <div className="lg:col-span-3 space-y-6">
          {reportData && reportData.summary && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Collected</p>
                        <p className="text-2xl font-semibold">{formatIndianCurrency(reportData.summary.totalCollected || 0)}</p>
                      </div>
                      <DollarSign className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Pending</p>
                        <p className="text-2xl font-semibold">{formatIndianCurrency(reportData.summary.totalPending || 0)}</p>
                      </div>
                      <Clock className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Collection Rate</p>
                        <p className="text-2xl font-semibold">{(reportData.summary.collectionRate || 0).toFixed(1)}%</p>
                      </div>
                      <div className="flex items-center">
                        {(reportData.summary.collectionRate || 0) >= 80 ? (
                          <TrendingUp className="h-8 w-8 text-muted-foreground" />
                        ) : (
                          <TrendingDown className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Students</p>
                        <p className="text-2xl font-semibold">{reportData.summary.studentsCount || 0}</p>
                      </div>
                      <Users className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Chart Visualization */}
              {chartData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {selectedReport === 'daily_collection' && 'Daily Collection Trend'}
                      {selectedReport === 'fee_head_wise' && 'Fee Head-wise Collection'}
                      {selectedReport === 'class_wise_dues' && 'Class-wise Collection'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <VerticalBarChart
                        data={chartData}
                        title=""
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Detailed Tables */}
              <Tabs defaultValue="summary" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="summary">Summary</TabsTrigger>
                  {selectedReport === 'outstanding_detail' && <TabsTrigger value="outstanding">Outstanding Details</TabsTrigger>}
                  {selectedReport === 'transaction_log' && <TabsTrigger value="transactions">Transactions</TabsTrigger>}
                  {selectedReport === 'class_wise_dues' && <TabsTrigger value="classes">Class Analysis</TabsTrigger>}
                  {selectedReport === 'fee_head_wise' && <TabsTrigger value="feeheads">Fee Heads</TabsTrigger>}
                </TabsList>

                <TabsContent value="summary">
                  <Card>
                    <CardHeader>
                      <CardTitle>Report Summary</CardTitle>
                      <CardDescription>
                        Key metrics for {reportTypes.find(r => r.id === selectedReport)?.name}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Collection Rate:</span>
                            <Badge variant={(reportData.summary.collectionRate || 0) >= 80 ? "default" : "secondary"}>
                              {(reportData.summary.collectionRate || 0).toFixed(1)}%
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Students:</span>
                            <span className="font-medium">{reportData.summary.studentsCount || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Report Period:</span>
                            <span className="font-medium">{filters.startDate} to {filters.endDate}</span>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Amount Collected:</span>
                            <span className="font-medium">{formatIndianCurrency(reportData.summary.totalCollected || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Amount Pending:</span>
                            <span className="font-medium">{formatIndianCurrency(reportData.summary.totalPending || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Amount:</span>
                            <span className="font-medium">{formatIndianCurrency((reportData.summary.totalCollected || 0) + (reportData.summary.totalPending || 0))}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {selectedReport === 'outstanding_detail' && reportData.outstandingDetails && (
                  <TabsContent value="outstanding">
                    <Card>
                      <CardHeader>
                        <CardTitle>Outstanding Fee Details</CardTitle>
                        <CardDescription>{reportData.outstandingDetails.length} students with pending payments</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Student Name</TableHead>
                                <TableHead>Admission No.</TableHead>
                                <TableHead>Class</TableHead>
                                <TableHead className="text-right">Total Due</TableHead>
                                <TableHead className="text-right">Overdue Days</TableHead>
                                <TableHead>Last Payment</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {reportData.outstandingDetails.map((item, index) => (
                                <TableRow key={index}>
                                  <TableCell className="font-medium">{item.studentName}</TableCell>
                                  <TableCell>{item.admissionNumber}</TableCell>
                                  <TableCell>{item.className}</TableCell>
                                  <TableCell className="text-right">{formatIndianCurrency(item.totalDue)}</TableCell>
                                  <TableCell className="text-right">{item.overdueDays}</TableCell>
                                  <TableCell>{item.lastPaymentDate || 'N/A'}</TableCell>
                                  <TableCell>
                                    <Badge variant={item.overdueDays > 30 ? "destructive" : "secondary"}>
                                      {item.overdueDays > 30 ? 'Critical' : 'Pending'}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}

                {selectedReport === 'transaction_log' && reportData.transactions && (
                  <TabsContent value="transactions">
                    <Card>
                      <CardHeader>
                        <CardTitle>Transaction History</CardTitle>
                        <CardDescription>{reportData.transactions.length} transactions in selected period</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Student</TableHead>
                                <TableHead>Fee Head</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead>Payment Mode</TableHead>
                                <TableHead>Receipt No.</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {reportData.transactions.map((item, index) => (
                                <TableRow key={index}>
                                  <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                                  <TableCell className="font-medium">{item.studentName}</TableCell>
                                  <TableCell>{item.feeHead}</TableCell>
                                  <TableCell className="text-right">{formatIndianCurrency(item.amount)}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline">{item.paymentMode}</Badge>
                                  </TableCell>
                                  <TableCell>{item.receiptNumber}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}

                {selectedReport === 'class_wise_dues' && reportData.classWise && (
                  <TabsContent value="classes">
                    <Card>
                      <CardHeader>
                        <CardTitle>Class-wise Analysis</CardTitle>
                        <CardDescription>Collection performance by class</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Class</TableHead>
                                <TableHead className="text-right">Collected</TableHead>
                                <TableHead className="text-right">Pending</TableHead>
                                <TableHead className="text-right">Collection Rate</TableHead>
                                <TableHead className="text-right">Students</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {reportData.classWise.map((item, index) => (
                                <TableRow key={index}>
                                  <TableCell className="font-medium">{item.className}</TableCell>
                                  <TableCell className="text-right">{formatIndianCurrency(item.collected)}</TableCell>
                                  <TableCell className="text-right">{formatIndianCurrency(item.pending)}</TableCell>
                                  <TableCell className="text-right">
                                    <Badge variant={((item.collected / (item.collected + item.pending)) * 100) >= 80 ? "default" : "secondary"}>
                                      {((item.collected / (item.collected + item.pending)) * 100).toFixed(1)}%
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">{item.studentsCount}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}

                {selectedReport === 'fee_head_wise' && reportData.feeHeadWise && (
                  <TabsContent value="feeheads">
                    <Card>
                      <CardHeader>
                        <CardTitle>Fee Head-wise Collection</CardTitle>
                        <CardDescription>Collection breakdown by fee categories</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Fee Head</TableHead>
                                <TableHead className="text-right">Collected</TableHead>
                                <TableHead className="text-right">Pending</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead className="text-right">Collection Rate</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {reportData.feeHeadWise.map((item, index) => (
                                <TableRow key={index}>
                                  <TableCell className="font-medium">{item.name}</TableCell>
                                  <TableCell className="text-right">{formatIndianCurrency(item.collected)}</TableCell>
                                  <TableCell className="text-right">{formatIndianCurrency(item.pending)}</TableCell>
                                  <TableCell className="text-right">{formatIndianCurrency(item.total)}</TableCell>
                                  <TableCell className="text-right">
                                    <Badge variant={((item.collected / item.total) * 100) >= 80 ? "default" : "secondary"}>
                                      {((item.collected / item.total) * 100).toFixed(1)}%
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}
              </Tabs>
            </>
          )}

          {/* Loading State */}
          {(reportDataQuery.isLoading || isGenerating) && (
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center justify-center space-x-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Generating report...</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* No Data State */}
          {!reportDataQuery.isLoading && !isGenerating && !reportData && (
            <Card>
              <CardContent className="p-8">
                <div className="text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Report Generated</h3>
                  <p className="text-muted-foreground mb-4">
                    Click "Generate Report" to create your financial report.
                  </p>
                  <Button onClick={handleGenerateReport}>
                    <Eye className="h-4 w-4 mr-2" />
                    Generate Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </PageWrapper>
  );
} 