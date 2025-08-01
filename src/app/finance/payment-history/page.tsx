"use client";

import React, { useState, useMemo } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, type DataTableFilter } from '@/components/ui/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import { 
  Download, 
  Calendar,
  CreditCard,
  Receipt,
  Users,
  DollarSign,
  ExternalLink,
  ArrowUpDown
} from 'lucide-react';
import { api } from '@/utils/api';
import { useBranchContext } from '@/hooks/useBranchContext';
import { useAcademicSessionContext } from '@/hooks/useAcademicSessionContext';
import { formatIndianCurrency } from '@/lib/utils';
import { PaymentStatusBadge } from '@/components/finance/payment-status-indicator';
import type { PaymentHistoryItem, PaymentGateway } from '@/types/payment-gateway';

export default function PaymentHistoryPage() {
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();

  // Get payment history
  const { data: paymentHistory, isLoading, error: historyError } = api.paymentGateway.getPaymentHistory.useQuery(
    {
      branchId: currentBranchId!,
      sessionId: currentSessionId!,
      // No limit specified = get ALL records
    },
    {
      enabled: !!currentBranchId && !!currentSessionId,
    }
  );

  // Get payment statistics
  const { data: statistics, error: statsError } = api.paymentGateway.getPaymentStatistics.useQuery(
    {
      branchId: currentBranchId!,
      sessionId: currentSessionId!,
    },
    {
      enabled: !!currentBranchId && !!currentSessionId,
    }
  );

  // Prepare data for the table
  const tableData = useMemo(() => {
    return paymentHistory?.items || [];
  }, [paymentHistory]);



  // Define table columns
  const columns = useMemo<ColumnDef<PaymentHistoryItem>[]>(() => [
    {
      accessorKey: "paymentDate",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 p-0 font-medium"
        >
          Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.paymentDate.toLocaleDateString()}
        </div>
      ),
    },
    {
      accessorKey: "studentName",
      header: "Student",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.studentName}</div>
          <div className="text-sm text-gray-500">{row.original.studentAdmissionNumber}</div>
        </div>
      ),
    },
    {
      accessorKey: "className",
      header: "Class",
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.className && row.original.sectionName && (
            <span>{row.original.className} - {row.original.sectionName}</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "feeTermName",
      header: "Fee Term",
      cell: ({ row }) => (
        <div className="text-sm">{row.original.feeTermName}</div>
      ),
    },
    {
      accessorKey: "amount",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 p-0 font-medium justify-end"
        >
          Amount
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-right font-medium">
          {formatIndianCurrency(row.original.amount)}
        </div>
      ),
    },
    {
      accessorKey: "paymentMode",
      header: "Payment Mode",
      cell: ({ row }) => (
        <Badge variant="outline" className="text-xs">
          {row.original.paymentMode}
        </Badge>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <PaymentStatusBadge 
          status={row.original.status as any} 
          gateway={row.original.gateway} 
        />
      ),
    },
    {
      accessorKey: "receiptNumber",
      header: "Receipt/Transaction",
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.receiptNumber && (
            <div className="flex items-center gap-1">
              <Receipt className="h-3 w-3" />
              {row.original.receiptNumber}
            </div>
          )}
          {row.original.transactionId && (
            <div className="flex items-center gap-1 text-blue-600">
              <ExternalLink className="h-3 w-3" />
              <span className="truncate max-w-[100px]" title={row.original.transactionId}>
                {row.original.transactionId}
              </span>
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <Badge 
          variant={row.original.type === 'gateway' ? 'default' : 'secondary'}
          className="text-xs"
        >
          {row.original.type === 'gateway' ? 'Gateway' : 'Manual'}
        </Badge>
      ),
    },
  ], []);

  // Define filters for the DataTable
  const filters: DataTableFilter[] = [
    {
      key: 'gateway',
      label: 'Gateway',
      type: 'select',
      placeholder: 'All Gateways',
      options: [
        { label: 'Easebuzz', value: 'EASEBUZZ', icon: '💳' },
        { label: 'Razorpay', value: 'RAZORPAY', icon: '💳' },
        { label: 'Paytm', value: 'PAYTM', icon: '💳' },
        { label: 'Stripe', value: 'STRIPE', icon: '💳' },
      ],
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      placeholder: 'All Statuses',
      options: [
        { label: 'Success', value: 'SUCCESS', icon: '✅' },
        { label: 'Pending', value: 'PENDING', icon: '⏳' },
        { label: 'Failed', value: 'FAILED', icon: '❌' },
        { label: 'Completed', value: 'COMPLETED', icon: '✅' },
        { label: 'Cancelled', value: 'CANCELLED', icon: '🚫' },
      ],
    },
    {
      key: 'paymentMode',
      label: 'Payment Mode',
      type: 'select',
      placeholder: 'All Modes',
      options: [
        { label: 'Cash', value: 'Cash', icon: '💵' },
        { label: 'Card', value: 'Card', icon: '💳' },
        { label: 'Online', value: 'Online', icon: '🌐' },
        { label: 'Bank Transfer', value: 'Bank_Transfer', icon: '🏦' },
        { label: 'UPI', value: 'UPI', icon: '📱' },
        { label: 'Cheque', value: 'Cheque', icon: '📄' },
      ],
    },
    {
      key: 'type',
      label: 'Type',
      type: 'select',
      placeholder: 'All Types',
      options: [
        { label: 'Manual', value: 'manual', icon: '✍️' },
        { label: 'Gateway', value: 'gateway', icon: '🌐' },
      ],
    },
  ];

  // Export functionality
  const handleExport = () => {
    if (!tableData.length) return;

    const csvContent = [
      // Header
      [
        'Date',
        'Student Name',
        'Admission No',
        'Class',
        'Fee Term',
        'Amount',
        'Payment Mode',
        'Status',
        'Receipt/Transaction ID',
        'Type',
        'Gateway'
      ].join(','),
      // Data rows
      ...tableData.map(payment => [
        payment.paymentDate.toLocaleDateString(),
        `"${payment.studentName}"`,
        payment.studentAdmissionNumber,
        `"${payment.className || ''} - ${payment.sectionName || ''}"`,
        `"${payment.feeTermName}"`,
        payment.amount,
        payment.paymentMode,
        payment.status,
        payment.receiptNumber || payment.transactionId || '',
        payment.type,
        payment.gateway || 'Manual'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `payment_history_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!currentBranchId || !currentSessionId) {
    return (
      <PageWrapper title="Payment History" subtitle="View all payment transactions">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <Calendar className="h-8 w-8 text-yellow-500 mx-auto mb-4" />
            <p className="text-yellow-600">Please select a branch and academic session</p>
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (isLoading) {
    return (
      <PageWrapper title="Payment History" subtitle="Comprehensive view of all payment transactions">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      </PageWrapper>
    );
  }

  if (historyError || statsError) {
    return (
      <PageWrapper title="Payment History" subtitle="Comprehensive view of all payment transactions">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="text-red-600 mb-4">
              <p className="font-medium">Error loading payment data</p>
              <p className="text-sm">{historyError?.message || statsError?.message}</p>
            </div>
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
            >
              Retry
            </Button>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Payment History" subtitle="Comprehensive view of all payment transactions">
      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatIndianCurrency(statistics.totalAmount)}</div>
              <p className="text-xs text-muted-foreground">
                All payments combined
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalTransactions.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {typeof statistics.manualTransactions === 'number' ? statistics.manualTransactions : 0} manual + {typeof statistics.gatewayTransactions === 'number' ? statistics.gatewayTransactions : 0} gateway
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Manual Payments</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatIndianCurrency(statistics.manualAmount)}</div>
              <p className="text-xs text-muted-foreground">
                {typeof statistics.manualTransactions === 'number' ? statistics.manualTransactions : 0} transactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gateway Payments</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatIndianCurrency(statistics.gatewayAmount)}</div>
              <p className="text-xs text-muted-foreground">
                {typeof statistics.gatewayTransactions === 'number' ? statistics.gatewayTransactions : 0} transactions
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payment History Table with Advanced Features */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Payment Transactions</CardTitle>
            <CardDescription>
              {isLoading ? 'Loading payments...' : 
               tableData.length > 0 ? `Showing ${tableData.length} payments` : 
               'No payments found for the selected branch and session'}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={!tableData.length}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={tableData}
            searchKey="studentName"
            searchPlaceholder="Search by student name, admission number..."
            filters={filters}
            pageSize={100}
          />
        </CardContent>
      </Card>
    </PageWrapper>
  );
} 