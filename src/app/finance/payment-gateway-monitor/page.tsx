"use client";

import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { DateRange } from 'react-day-picker';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { DateRangeSelector } from '@/components/ui/date-range-selector';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Download, 
  Calendar,
  CreditCard,
  Receipt,
  Users,
  Search,
  Filter,
  MoreVertical,
  Eye,
  ArrowUpDown,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Shield,
  Smartphone,
  RefreshCw,
  Activity,
  MonitorSpeaker,
  Globe,
  Link2,
  Loader2,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { api } from '@/utils/api';
import { useBranchContext } from '@/hooks/useBranchContext';
import { useAcademicSessionContext } from '@/hooks/useAcademicSessionContext';
import { formatIndianCurrency, cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import type { PaymentGateway, PaymentStatus } from '@/types/payment-gateway';

// Filter form schema
const filterSchema = z.object({
  status: z.string().optional(),
  gateway: z.string().optional(),
  studentSearch: z.string().optional(),
  dateRange: z.object({
    from: z.date().optional(),
    to: z.date().optional(),
  }).optional(),
});

type FilterFormData = z.infer<typeof filterSchema>;

// Payment status badge component
function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const getStatusConfig = (status: PaymentStatus) => {
    switch (status) {
      case 'SUCCESS':
        return { variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' };
      case 'PENDING':
        return { variant: 'secondary' as const, icon: Clock, color: 'text-yellow-600' };
      case 'INITIATED':
        return { variant: 'outline' as const, icon: Zap, color: 'text-blue-600' };
      case 'FAILED':
        return { variant: 'destructive' as const, icon: XCircle, color: 'text-red-600' };
      case 'CANCELLED':
        return { variant: 'outline' as const, icon: XCircle, color: 'text-gray-600' };
      case 'EXPIRED':
        return { variant: 'outline' as const, icon: Clock, color: 'text-orange-600' };
      case 'REFUNDED':
        return { variant: 'outline' as const, icon: RefreshCw, color: 'text-purple-600' };
      default:
        return { variant: 'outline' as const, icon: AlertCircle, color: 'text-gray-600' };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      <Icon size={12} className={config.color} />
      <span>{status}</span>
    </Badge>
  );
}

// Gateway badge component
function GatewayBadge({ gateway }: { gateway: PaymentGateway }) {
  const getGatewayConfig = (gateway: PaymentGateway) => {
    switch (gateway) {
      case 'RAZORPAY':
        return { color: 'bg-blue-100 text-blue-800', icon: CreditCard };
      case 'PAYTM':
        return { color: 'bg-purple-100 text-purple-800', icon: Smartphone };
      case 'STRIPE':
        return { color: 'bg-indigo-100 text-indigo-800', icon: Globe };
      // EASEBUZZ not available in current PaymentGateway enum
      default:
        return { color: 'bg-gray-100 text-gray-800', icon: CreditCard };
    }
  };

  const config = getGatewayConfig(gateway);
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn("flex items-center gap-1", config.color)}>
      <Icon size={12} />
      <span>{gateway}</span>
    </Badge>
  );
}

export default function PaymentGatewayMonitorPage() {
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  const { toast } = useToast();

  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showRequestDetails, setShowRequestDetails] = useState(false);
  const [showTransactionDetails, setShowTransactionDetails] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'requests' | 'transactions' | 'webhooks'>('requests');

  // Filter form
  const form = useForm<FilterFormData>({
    resolver: zodResolver(filterSchema),
    defaultValues: {
      status: 'all',
      gateway: 'all',
      studentSearch: '',
      dateRange: undefined,
    },
  });

  const watchedValues = form.watch();

  // Query for payment gateway data
  const {
    data: paymentData,
    isLoading,
    refetch,
    error
  } = api.paymentGateway.getPaymentGatewayRequests.useQuery(
    {
      branchId: currentBranchId || '',
      sessionId: currentSessionId || '',
      status: watchedValues.status && watchedValues.status !== 'all' ? watchedValues.status as any : undefined,
      gateway: watchedValues.gateway && watchedValues.gateway !== 'all' ? watchedValues.gateway as any : undefined,
      startDate: watchedValues.dateRange?.from,
      endDate: watchedValues.dateRange?.to,
      limit: 100,
    },
    {
      enabled: !!(currentBranchId && currentSessionId),
      refetchInterval: 30000, // Refresh every 30 seconds
    }
  );

  // Filter students by search term
  const filteredRequests = useMemo(() => {
    if (!paymentData?.paymentRequests) return [];
    
    const searchTerm = watchedValues.studentSearch?.toLowerCase() || '';
    if (!searchTerm) return paymentData.paymentRequests;

    return paymentData.paymentRequests.filter(request => 
      request.studentName.toLowerCase().includes(searchTerm) ||
      request.studentAdmissionNumber.toLowerCase().includes(searchTerm) ||
      request.buyerName.toLowerCase().includes(searchTerm)
    );
  }, [paymentData?.paymentRequests, watchedValues.studentSearch]);

  const filteredTransactions = useMemo(() => {
    if (!paymentData?.transactions) return [];
    
    const searchTerm = watchedValues.studentSearch?.toLowerCase() || '';
    if (!searchTerm) return paymentData.transactions;

    return paymentData.transactions.filter(transaction => 
      transaction.studentName.toLowerCase().includes(searchTerm) ||
      transaction.studentAdmissionNumber.toLowerCase().includes(searchTerm)
    );
  }, [paymentData?.transactions, watchedValues.studentSearch]);

  // Export functionality
  const handleExport = (type: 'requests' | 'transactions' | 'webhooks') => {
    let data: any[] = [];
    let filename = '';

    switch (type) {
      case 'requests':
        data = filteredRequests.map(req => ({
          'Request ID': req.id,
          'Gateway': req.gateway,
          'Status': req.status,
          'Amount': formatIndianCurrency(req.amount),
          'Student': req.studentName,
          'Admission No': req.studentAdmissionNumber,
          'Fee Term': req.feeTermName,
          'Purpose': req.purpose,
          'Buyer Name': req.buyerName,
          'Buyer Phone': req.buyerPhone,
          'Created': new Date(req.createdAt).toLocaleString(),
          'Expires': req.expiresAt ? new Date(req.expiresAt).toLocaleString() : 'No Expiry',
        }));
        filename = 'payment-requests.csv';
        break;
      case 'transactions':
        data = filteredTransactions.map(txn => ({
          'Transaction ID': txn.gatewayTransactionId,
          'Gateway': txn.gateway,
          'Status': txn.status,
          'Amount': formatIndianCurrency(txn.amount),
          'Student': txn.studentName,
          'Admission No': txn.studentAdmissionNumber,
          'Fee Term': txn.feeTermName,
          'Order ID': txn.gatewayOrderId,
          'Payment ID': txn.gatewayPaymentId,
          'Failure Reason': txn.failureReason || '',
          'Created': new Date(txn.createdAt).toLocaleString(),
          'Paid At': txn.paidAt ? new Date(txn.paidAt).toLocaleString() : '',
        }));
        filename = 'payment-transactions.csv';
        break;
      case 'webhooks':
        data = paymentData?.webhookLogs?.map(log => ({
          'Log ID': log.id,
          'Gateway': log.gateway,
          'Event': log.event,
          'Transaction ID': log.transactionId || '',
          'Request ID': log.requestId || '',
          'Processed': log.processed ? 'Yes' : 'No',
          'Error': log.processingError || '',
          'Created': new Date(log.createdAt).toLocaleString(),
        })) || [];
        filename = 'webhook-logs.csv';
        break;
    }

    if (data.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no records to export.",
        variant: "destructive",
      });
      return;
    }

    // Convert to CSV and download
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export successful",
      description: `${data.length} records exported to ${filename}`,
    });
  };

  if (!currentBranchId || !currentSessionId) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Branch and Session Required</h3>
            <p className="text-gray-600">Please select a branch and academic session to continue.</p>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Payment Gateway Monitor
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Monitor and track all payment gateway requests, transactions, and webhook logs
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {paymentData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{paymentData.paymentRequests.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Transactions</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{paymentData.transactions.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {paymentData.transactions.length > 0 
                    ? Math.round((paymentData.transactions.filter(t => t.status === 'SUCCESS').length / paymentData.transactions.length) * 100)
                    : 0}%
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Webhook Logs (24h)</CardTitle>
                <MonitorSpeaker className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{paymentData.webhookLogs.length}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="All statuses" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">All Statuses</SelectItem>
                          <SelectItem value="PENDING">Pending</SelectItem>
                          <SelectItem value="INITIATED">Initiated</SelectItem>
                          <SelectItem value="SUCCESS">Success</SelectItem>
                          <SelectItem value="FAILED">Failed</SelectItem>
                          <SelectItem value="CANCELLED">Cancelled</SelectItem>
                          <SelectItem value="EXPIRED">Expired</SelectItem>
                          <SelectItem value="REFUNDED">Refunded</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gateway"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gateway</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="All gateways" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">All Gateways</SelectItem>
                          <SelectItem value="RAZORPAY">Razorpay</SelectItem>
                          <SelectItem value="PAYTM">Paytm</SelectItem>
                          <SelectItem value="STRIPE">Stripe</SelectItem>

                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="studentSearch"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Search Student</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Name, admission no..."
                            className="pl-9"
                            {...field}
                          />
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dateRange"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date Range</FormLabel>
                      <FormControl>
                        <DateRangeSelector
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select date range"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('requests')}
              className={cn(
                "py-2 px-1 border-b-2 font-medium text-sm",
                activeTab === 'requests'
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              Payment Requests ({paymentData?.paymentRequests.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={cn(
                "py-2 px-1 border-b-2 font-medium text-sm",
                activeTab === 'transactions'
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              Transactions ({paymentData?.transactions.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('webhooks')}
              className={cn(
                "py-2 px-1 border-b-2 font-medium text-sm",
                activeTab === 'webhooks'
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              Webhook Logs ({paymentData?.webhookLogs.length || 0})
            </button>
          </nav>
        </div>

        {/* Content based on active tab */}
        {isLoading ? (
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Data</h3>
                <p className="text-gray-600 mb-4">{error.message}</p>
                <Button onClick={() => refetch()}>Try Again</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Payment Requests Tab */}
            {activeTab === 'requests' && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Payment Requests</CardTitle>
                    <CardDescription>
                      All payment requests created through the payment gateway
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => handleExport('requests')}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                </CardHeader>
                <CardContent>
                  {filteredRequests.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No payment requests found</h3>
                      <p className="text-gray-600">No payment requests match your current filters.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Request Info</TableHead>
                            <TableHead>Student</TableHead>
                            <TableHead>Gateway</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead>Expires</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredRequests.map((request) => (
                            <TableRow key={request.id}>
                              <TableCell>
                                <div className="space-y-1">
                                  <div className="font-medium">{request.purpose}</div>
                                  <div className="text-sm text-gray-500">{request.feeTermName}</div>
                                  {request.gatewayRequestId && (
                                    <div className="text-xs font-mono text-gray-400">
                                      ID: {request.gatewayRequestId.slice(0, 16)}...
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <div className="font-medium">{request.studentName}</div>
                                  <div className="text-sm text-gray-500">{request.studentAdmissionNumber}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <GatewayBadge gateway={request.gateway} />
                              </TableCell>
                              <TableCell className="font-medium">
                                {formatIndianCurrency(request.amount)}
                              </TableCell>
                              <TableCell>
                                <PaymentStatusBadge status={request.status} />
                              </TableCell>
                              <TableCell className="text-sm text-gray-500">
                                {new Date(request.createdAt).toLocaleDateString()}
                                <br />
                                {new Date(request.createdAt).toLocaleTimeString()}
                              </TableCell>
                              <TableCell className="text-sm text-gray-500">
                                {request.expiresAt ? (
                                  <>
                                    {new Date(request.expiresAt).toLocaleDateString()}
                                    <br />
                                    {new Date(request.expiresAt).toLocaleTimeString()}
                                  </>
                                ) : (
                                  'No expiry'
                                )}
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedRequest(request);
                                        setShowRequestDetails(true);
                                      }}
                                    >
                                      <Eye className="mr-2 h-4 w-4" />
                                      View Details
                                    </DropdownMenuItem>
                                    {request.paymentUrl && (
                                      <DropdownMenuItem
                                        onClick={() => window.open(request.paymentUrl, '_blank')}
                                      >
                                        <Link2 className="mr-2 h-4 w-4" />
                                        Open Payment Link
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Transactions Tab */}
            {activeTab === 'transactions' && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Gateway Transactions</CardTitle>
                    <CardDescription>
                      All payment gateway transactions and their current status
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => handleExport('transactions')}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                </CardHeader>
                <CardContent>
                  {filteredTransactions.length === 0 ? (
                    <div className="text-center py-8">
                      <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No transactions found</h3>
                      <p className="text-gray-600">No transactions match your current filters.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Transaction ID</TableHead>
                            <TableHead>Student</TableHead>
                            <TableHead>Gateway</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead>Paid At</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredTransactions.map((transaction) => (
                            <TableRow key={transaction.id}>
                              <TableCell>
                                <div className="space-y-1">
                                  <div className="font-mono text-sm">
                                    {transaction.gatewayTransactionId}
                                  </div>
                                  {transaction.gatewayOrderId && (
                                    <div className="text-xs text-gray-500">
                                      Order: {transaction.gatewayOrderId.slice(0, 16)}...
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <div className="font-medium">{transaction.studentName}</div>
                                  <div className="text-sm text-gray-500">{transaction.studentAdmissionNumber}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <GatewayBadge gateway={transaction.gateway} />
                              </TableCell>
                              <TableCell className="font-medium">
                                {formatIndianCurrency(transaction.amount)}
                              </TableCell>
                              <TableCell>
                                <PaymentStatusBadge status={transaction.status} />
                                {transaction.failureReason && (
                                  <div className="text-xs text-red-600 mt-1">
                                    {transaction.failureReason}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-gray-500">
                                {new Date(transaction.createdAt).toLocaleDateString()}
                                <br />
                                {new Date(transaction.createdAt).toLocaleTimeString()}
                              </TableCell>
                              <TableCell className="text-sm text-gray-500">
                                {transaction.paidAt ? (
                                  <>
                                    {new Date(transaction.paidAt).toLocaleDateString()}
                                    <br />
                                    {new Date(transaction.paidAt).toLocaleTimeString()}
                                  </>
                                ) : (
                                  '-'
                                )}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedTransaction(transaction);
                                    setShowTransactionDetails(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Webhook Logs Tab */}
            {activeTab === 'webhooks' && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Webhook Logs (Last 24 Hours)</CardTitle>
                    <CardDescription>
                      Recent webhook events received from payment gateways
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => handleExport('webhooks')}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                </CardHeader>
                <CardContent>
                  {!paymentData?.webhookLogs || paymentData.webhookLogs.length === 0 ? (
                    <div className="text-center py-8">
                      <MonitorSpeaker className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No webhook logs found</h3>
                      <p className="text-gray-600">No webhook events have been received in the last 24 hours.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Event</TableHead>
                            <TableHead>Gateway</TableHead>
                            <TableHead>Transaction ID</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Received At</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paymentData.webhookLogs.map((log) => (
                            <TableRow key={log.id}>
                              <TableCell>
                                <div className="font-medium">{log.event}</div>
                                {log.requestId && (
                                  <div className="text-xs text-gray-500">
                                    Request: {log.requestId.slice(0, 12)}...
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <GatewayBadge gateway={log.gateway} />
                              </TableCell>
                              <TableCell>
                                <div className="font-mono text-sm">
                                  {log.transactionId || 'N/A'}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={log.processed ? "default" : "destructive"}>
                                  {log.processed ? 'Processed' : 'Failed'}
                                </Badge>
                                {log.processingError && (
                                  <div className="text-xs text-red-600 mt-1">
                                    {log.processingError}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-gray-500">
                                {new Date(log.createdAt).toLocaleDateString()}
                                <br />
                                {new Date(log.createdAt).toLocaleTimeString()}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    // Show webhook payload in a dialog
                                    console.log('Webhook payload:', log.payload);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Request Details Dialog */}
        <Dialog open={showRequestDetails} onOpenChange={setShowRequestDetails}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Payment Request Details</DialogTitle>
              <DialogDescription>
                Detailed information about the payment request
              </DialogDescription>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Status</Label>
                    <div className="mt-1">
                      <PaymentStatusBadge status={selectedRequest.status} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Gateway</Label>
                    <div className="mt-1">
                      <GatewayBadge gateway={selectedRequest.gateway} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Amount</Label>
                    <div className="mt-1 font-semibold text-lg">
                      {formatIndianCurrency(selectedRequest.amount)}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Currency</Label>
                    <div className="mt-1">{selectedRequest.currency}</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Student Information</Label>
                    <div className="mt-1 space-y-1">
                      <div className="font-medium">{selectedRequest.studentName}</div>
                      <div className="text-sm text-gray-600">
                        Admission No: {selectedRequest.studentAdmissionNumber}
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-500">Buyer Information</Label>
                    <div className="mt-1 space-y-1">
                      <div className="font-medium">{selectedRequest.buyerName}</div>
                      <div className="text-sm text-gray-600">{selectedRequest.buyerPhone}</div>
                      {selectedRequest.buyerEmail && (
                        <div className="text-sm text-gray-600">{selectedRequest.buyerEmail}</div>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-500">Purpose</Label>
                    <div className="mt-1">{selectedRequest.purpose}</div>
                  </div>

                  {selectedRequest.description && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Description</Label>
                      <div className="mt-1">{selectedRequest.description}</div>
                    </div>
                  )}

                  <div>
                    <Label className="text-sm font-medium text-gray-500">Fee Breakdown</Label>
                    <div className="mt-1">
                      {selectedRequest.fees?.map((fee: any, index: number) => (
                        <div key={index} className="flex justify-between py-2 border-b">
                          <span>{fee.feeHeadName}</span>
                          <span className="font-medium">{formatIndianCurrency(fee.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Created At</Label>
                      <div className="mt-1">
                        {new Date(selectedRequest.createdAt).toLocaleString()}
                      </div>
                    </div>
                    {selectedRequest.expiresAt && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Expires At</Label>
                        <div className="mt-1">
                          {new Date(selectedRequest.expiresAt).toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedRequest.paymentUrl && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Payment URL</Label>
                      <div className="mt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(selectedRequest.paymentUrl, '_blank')}
                          className="flex items-center gap-2"
                        >
                          <Link2 className="h-4 w-4" />
                          Open Payment Link
                        </Button>
                      </div>
                    </div>
                  )}

                  {selectedRequest.latestTransaction && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Latest Transaction</Label>
                      <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-sm">
                            {selectedRequest.latestTransaction.gatewayTransactionId}
                          </span>
                          <PaymentStatusBadge status={selectedRequest.latestTransaction.status} />
                        </div>
                        {selectedRequest.latestTransaction.failureReason && (
                          <div className="text-sm text-red-600 mt-2">
                            Failure Reason: {selectedRequest.latestTransaction.failureReason}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Transaction Details Dialog */}
        <Dialog open={showTransactionDetails} onOpenChange={setShowTransactionDetails}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Transaction Details</DialogTitle>
              <DialogDescription>
                Detailed information about the payment transaction
              </DialogDescription>
            </DialogHeader>
            {selectedTransaction && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Status</Label>
                    <div className="mt-1">
                      <PaymentStatusBadge status={selectedTransaction.status} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Gateway</Label>
                    <div className="mt-1">
                      <GatewayBadge gateway={selectedTransaction.gateway} />
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-500">Transaction ID</Label>
                  <div className="mt-1 font-mono text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded">
                    {selectedTransaction.gatewayTransactionId}
                  </div>
                </div>

                {selectedTransaction.gatewayOrderId && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Gateway Order ID</Label>
                    <div className="mt-1 font-mono text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded">
                      {selectedTransaction.gatewayOrderId}
                    </div>
                  </div>
                )}

                {selectedTransaction.gatewayPaymentId && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Gateway Payment ID</Label>
                    <div className="mt-1 font-mono text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded">
                      {selectedTransaction.gatewayPaymentId}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Amount</Label>
                    <div className="mt-1 font-semibold text-lg">
                      {formatIndianCurrency(selectedTransaction.amount)}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Currency</Label>
                    <div className="mt-1">{selectedTransaction.currency}</div>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-500">Student</Label>
                  <div className="mt-1">
                    <div className="font-medium">{selectedTransaction.studentName}</div>
                    <div className="text-sm text-gray-600">
                      Admission No: {selectedTransaction.studentAdmissionNumber}
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-500">Fee Term</Label>
                  <div className="mt-1">{selectedTransaction.feeTermName}</div>
                </div>

                {selectedTransaction.failureReason && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Failure Reason</Label>
                    <div className="mt-1 text-red-600">{selectedTransaction.failureReason}</div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Created At</Label>
                    <div className="mt-1">
                      {new Date(selectedTransaction.createdAt).toLocaleString()}
                    </div>
                  </div>
                  {selectedTransaction.paidAt && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Paid At</Label>
                      <div className="mt-1">
                        {new Date(selectedTransaction.paidAt).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>

                {selectedTransaction.expiresAt && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Expires At</Label>
                    <div className="mt-1">
                      {new Date(selectedTransaction.expiresAt).toLocaleString()}
                    </div>
                  </div>
                )}

                {selectedTransaction.gatewayResponse && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Gateway Response</Label>
                    <div className="mt-1">
                      <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-x-auto">
                        {JSON.stringify(selectedTransaction.gatewayResponse, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {selectedTransaction.webhookData && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Webhook Data</Label>
                    <div className="mt-1">
                      <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-x-auto">
                        {JSON.stringify(selectedTransaction.webhookData, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PageWrapper>
  );
}