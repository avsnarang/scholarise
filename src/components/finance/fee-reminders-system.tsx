"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Bell, 
  Send, 
  Calendar, 
  MessageSquare, 
  Mail, 
  Phone, 
  Settings, 
  Clock, 
  User, 
  AlertTriangle,
  CheckCircle,
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  RefreshCw,
  Download,
  Filter,
  Search
} from 'lucide-react';
import { generateFeeReminders } from "@/lib/fee-calculations";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  section?: {
    class?: {
      name: string;
    };
  };
  parent?: {
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
  };
}

interface FeeReminder {
  id: string;
  studentId: string;
  student: Student;
  feeHeadId: string;
  feeHeadName: string;
  amount: number;
  dueDate: Date;
  overdueBy: number;
  reminderType: 'gentle' | 'urgent' | 'final';
  status: 'pending' | 'sent' | 'acknowledged' | 'failed';
  scheduledDate: Date;
  sentDate?: Date;
  template: string;
  channel: 'email' | 'sms' | 'app' | 'all';
  isAutomated: boolean;
  attempts: number;
  nextRetry?: Date;
}

interface ReminderTemplate {
  id: string;
  name: string;
  type: 'gentle' | 'urgent' | 'final';
  subject: string;
  content: string;
  channel: 'email' | 'sms' | 'app';
  isActive: boolean;
  variables: string[];
}

interface ReminderRule {
  id: string;
  name: string;
  triggerDays: number; // Days after due date
  reminderType: 'gentle' | 'urgent' | 'final';
  isActive: boolean;
  channels: ('email' | 'sms' | 'app')[];
  repeatAfterDays?: number;
  maxAttempts: number;
  conditions: {
    minAmount?: number;
    maxAmount?: number;
    classIds?: string[];
    feeHeadIds?: string[];
  };
}

interface FeeRemindersSystemProps {
  students: Student[];
  onSendReminder: (reminderId: string) => Promise<void>;
  onBulkSendReminders: (reminderIds: string[]) => Promise<void>;
  onCreateReminderRule: (rule: Omit<ReminderRule, 'id'>) => Promise<void>;
  onUpdateTemplate: (template: ReminderTemplate) => Promise<void>;
  onGenerateReminders?: () => Promise<FeeReminder[]>;
}

export function FeeRemindersSystem({
  students,
  onSendReminder,
  onBulkSendReminders,
  onCreateReminderRule,
  onUpdateTemplate,
  onGenerateReminders,
}: FeeRemindersSystemProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [reminders, setReminders] = useState<FeeReminder[]>([]);
  const [templates, setTemplates] = useState<ReminderTemplate[]>([]);
  const [rules, setRules] = useState<ReminderRule[]>([]);
  const [selectedReminders, setSelectedReminders] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Default templates
  const defaultTemplates: ReminderTemplate[] = [
    {
      id: 'gentle-email',
      name: 'Gentle Reminder - Email',
      type: 'gentle',
      subject: 'Fee Payment Reminder - {{studentName}}',
      content: `Dear {{parentName}},

This is a gentle reminder that the fee payment for {{studentName}} ({{admissionNumber}}) is due.

Fee Details:
- Fee Head: {{feeHeadName}}
- Amount: ₹{{amount}}
- Due Date: {{dueDate}}

Please arrange for the payment at your earliest convenience.

Thank you for your cooperation.

Best regards,
Finance Department`,
      channel: 'email',
      isActive: true,
      variables: ['studentName', 'parentName', 'admissionNumber', 'feeHeadName', 'amount', 'dueDate']
    },
    {
      id: 'urgent-email',
      name: 'Urgent Reminder - Email',
      type: 'urgent',
      subject: 'URGENT: Fee Payment Overdue - {{studentName}}',
      content: `Dear {{parentName}},

This is an urgent reminder that the fee payment for {{studentName}} ({{admissionNumber}}) is now {{overdueBy}} days overdue.

Fee Details:
- Fee Head: {{feeHeadName}}
- Amount: ₹{{amount}}
- Due Date: {{dueDate}}
- Overdue By: {{overdueBy}} days

Please contact the finance office immediately to arrange payment and avoid any late fees.

Contact: finance@school.edu | +91-XXXXXXXXXX

Best regards,
Finance Department`,
      channel: 'email',
      isActive: true,
      variables: ['studentName', 'parentName', 'admissionNumber', 'feeHeadName', 'amount', 'dueDate', 'overdueBy']
    },
    {
      id: 'final-email',
      name: 'Final Notice - Email',
      type: 'final',
      subject: 'FINAL NOTICE: Fee Payment Required - {{studentName}}',
      content: `Dear {{parentName}},

This is a FINAL NOTICE regarding the overdue fee payment for {{studentName}} ({{admissionNumber}}).

Fee Details:
- Fee Head: {{feeHeadName}}
- Amount: ₹{{amount}}
- Due Date: {{dueDate}}
- Overdue By: {{overdueBy}} days

Immediate action is required. Please contact the finance office within 3 days to avoid further action.

Contact: finance@school.edu | +91-XXXXXXXXXX

Best regards,
Finance Department`,
      channel: 'email',
      isActive: true,
      variables: ['studentName', 'parentName', 'admissionNumber', 'feeHeadName', 'amount', 'dueDate', 'overdueBy']
    }
  ];

  // Initialize templates
  useEffect(() => {
    setTemplates(defaultTemplates);
  }, []);

  // Generate mock reminders (in a real app, this would come from API)
  const generateMockReminders = () => {
    const mockReminders: FeeReminder[] = students.slice(0, 10).map((student, index) => ({
      id: `reminder-${index}`,
      studentId: student.id,
      student,
      feeHeadId: `fee-${index % 3}`,
      feeHeadName: ['Tuition Fee', 'Library Fee', 'Transport Fee'][index % 3] ?? '',
      amount: [5000, 500, 1500][index % 3] ?? 0,
      dueDate: new Date(Date.now() - (index + 1) * 7 * 24 * 60 * 60 * 1000),
      overdueBy: (index + 1) * 7,
      reminderType: index < 3 ? 'gentle' : index < 6 ? 'urgent' : 'final',
      status: ['pending', 'sent', 'acknowledged'][index % 3] as any,
      scheduledDate: new Date(Date.now() + index * 24 * 60 * 60 * 1000),
      template: `${index < 3 ? 'gentle' : index < 6 ? 'urgent' : 'final'}-email`,
      channel: 'email',
      isAutomated: index % 2 === 0,
      attempts: index % 3,
      sentDate: index % 3 !== 0 ? new Date(Date.now() - index * 24 * 60 * 60 * 1000) : undefined,
    }));
    return mockReminders;
  };

  useEffect(() => {
    setReminders(generateMockReminders());
  }, [students]);

  const filteredReminders = reminders.filter(reminder => {
    if (searchQuery && !reminder.student.firstName.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !reminder.student.lastName.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !reminder.student.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (statusFilter !== 'all' && reminder.status !== statusFilter) {
      return false;
    }
    if (typeFilter !== 'all' && reminder.reminderType !== typeFilter) {
      return false;
    }
    return true;
  });

  const handleSelectReminder = (reminderId: string) => {
    const newSelected = new Set(selectedReminders);
    if (newSelected.has(reminderId)) {
      newSelected.delete(reminderId);
    } else {
      newSelected.add(reminderId);
    }
    setSelectedReminders(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedReminders.size === filteredReminders.length) {
      setSelectedReminders(new Set());
    } else {
      setSelectedReminders(new Set(filteredReminders.map(r => r.id)));
    }
  };

  const handleSendSelected = async () => {
    if (selectedReminders.size === 0) return;
    
    setIsSending(true);
    try {
      await onBulkSendReminders(Array.from(selectedReminders));
      
      // Update reminder status
      setReminders(prev => prev.map(reminder => 
        selectedReminders.has(reminder.id) 
          ? { ...reminder, status: 'sent' as const, sentDate: new Date() }
          : reminder
      ));
      
      setSelectedReminders(new Set());
    } catch (error) {
      console.error('Failed to send reminders:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleGenerateReminders = async () => {
    setIsGenerating(true);
    try {
      if (onGenerateReminders) {
        const newReminders = await onGenerateReminders();
        setReminders(prev => [...prev, ...newReminders]);
      }
    } catch (error) {
      console.error('Failed to generate reminders:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const getStatusBadge = (status: FeeReminder['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pending</Badge>;
      case 'sent':
        return <Badge variant="outline" className="text-blue-600 border-blue-600">Sent</Badge>;
      case 'acknowledged':
        return <Badge variant="default" className="bg-green-100 text-green-800">Acknowledged</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: FeeReminder['reminderType']) => {
    switch (type) {
      case 'gentle':
        return <Badge variant="outline" className="text-green-600 border-green-600">Gentle</Badge>;
      case 'urgent':
        return <Badge variant="outline" className="text-orange-600 border-orange-600">Urgent</Badge>;
      case 'final':
        return <Badge variant="destructive">Final Notice</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const reminderStats = {
    total: reminders.length,
    pending: reminders.filter(r => r.status === 'pending').length,
    sent: reminders.filter(r => r.status === 'sent').length,
    acknowledged: reminders.filter(r => r.status === 'acknowledged').length,
    failed: reminders.filter(r => r.status === 'failed').length,
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Reminders</p>
                <p className="text-2xl font-bold">{reminderStats.total}</p>
              </div>
              <Bell className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{reminderStats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Sent</p>
                <p className="text-2xl font-bold text-blue-600">{reminderStats.sent}</p>
              </div>
              <Send className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Acknowledged</p>
                <p className="text-2xl font-bold text-green-600">{reminderStats.acknowledged}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold text-red-600">{reminderStats.failed}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="reminders">Reminders</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
                <CardDescription>Manage fee reminders efficiently</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={handleGenerateReminders}
                  disabled={isGenerating}
                  className="w-full"
                >
                  {isGenerating ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Generate New Reminders
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={handleSendSelected}
                  disabled={selectedReminders.size === 0 || isSending}
                  className="w-full"
                >
                  {isSending ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Send Selected ({selectedReminders.size})
                </Button>
                
                <Button variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </Button>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Latest reminder activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reminders.slice(0, 5).map((reminder, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <div>
                          <p className="text-sm font-medium">
                            {reminder.student.firstName} {reminder.student.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {reminder.feeHeadName} - ₹{reminder.amount.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(reminder.status)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reminders" className="space-y-6">
          {/* Filters and Search */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex flex-1 gap-4">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search students..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="acknowledged">Acknowledged</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="gentle">Gentle</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="final">Final</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={handleSelectAll}
                    variant="outline"
                    size="sm"
                  >
                    {selectedReminders.size === filteredReminders.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  
                  <Button 
                    onClick={handleSendSelected}
                    disabled={selectedReminders.size === 0 || isSending}
                    size="sm"
                  >
                    {isSending ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Send Selected
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reminders Table */}
          <Card>
            <CardHeader>
              <CardTitle>Fee Reminders</CardTitle>
              <CardDescription>
                Manage and send fee payment reminders to parents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox 
                          checked={selectedReminders.size === filteredReminders.length && filteredReminders.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Fee Details</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Overdue</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReminders.map((reminder) => (
                      <TableRow key={reminder.id}>
                        <TableCell>
                          <Checkbox 
                            checked={selectedReminders.has(reminder.id)}
                            onCheckedChange={() => handleSelectReminder(reminder.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {reminder.student.firstName} {reminder.student.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {reminder.student.admissionNumber}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{reminder.feeHeadName}</p>
                            <p className="text-sm text-muted-foreground">
                              ₹{reminder.amount.toLocaleString()}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {reminder.dueDate.toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-red-600 border-red-600">
                            {reminder.overdueBy} days
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {getTypeBadge(reminder.reminderType)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(reminder.status)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {reminder.channel === 'email' && <Mail className="h-3 w-3 mr-1" />}
                            {reminder.channel === 'sms' && <Phone className="h-3 w-3 mr-1" />}
                            {reminder.channel === 'app' && <Bell className="h-3 w-3 mr-1" />}
                            {reminder.channel}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => onSendReminder(reminder.id)}
                              disabled={reminder.status === 'sent'}
                            >
                              <Send className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {filteredReminders.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No reminders found matching your criteria</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        {getTypeBadge(template.type)}
                        <Badge variant="outline">
                          {template.channel === 'email' && <Mail className="h-3 w-3 mr-1" />}
                          {template.channel === 'sms' && <Phone className="h-3 w-3 mr-1" />}
                          {template.channel === 'app' && <Bell className="h-3 w-3 mr-1" />}
                          {template.channel}
                        </Badge>
                      </CardDescription>
                    </div>
                    <Switch checked={template.isActive} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">Subject</Label>
                      <p className="text-sm text-muted-foreground">{template.subject}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Content Preview</Label>
                      <div className="text-sm text-muted-foreground bg-muted p-3 rounded max-h-32 overflow-y-auto">
                        {template.content.substring(0, 200)}...
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm">
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm">
                        Preview
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="automation" className="space-y-6">
          <Alert>
            <Settings className="h-4 w-4" />
            <AlertDescription>
              Configure automatic reminder rules to streamline your fee collection process.
            </AlertDescription>
          </Alert>
          
          <Card>
            <CardHeader>
              <CardTitle>Automation Rules</CardTitle>
              <CardDescription>
                Set up rules to automatically send reminders based on due dates and conditions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium">Gentle Reminder</h4>
                      <p className="text-sm text-muted-foreground">Send 3 days after due date</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Trigger:</span> +3 days
                    </div>
                    <div>
                      <span className="font-medium">Channel:</span> Email
                    </div>
                    <div>
                      <span className="font-medium">Max Attempts:</span> 2
                    </div>
                    <div>
                      <span className="font-medium">Repeat:</span> 7 days
                    </div>
                  </div>
                </div>
                
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium">Urgent Reminder</h4>
                      <p className="text-sm text-muted-foreground">Send 10 days after due date</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Trigger:</span> +10 days
                    </div>
                    <div>
                      <span className="font-medium">Channel:</span> Email + SMS
                    </div>
                    <div>
                      <span className="font-medium">Max Attempts:</span> 3
                    </div>
                    <div>
                      <span className="font-medium">Repeat:</span> 5 days
                    </div>
                  </div>
                </div>
                
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium">Final Notice</h4>
                      <p className="text-sm text-muted-foreground">Send 21 days after due date</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Trigger:</span> +21 days
                    </div>
                    <div>
                      <span className="font-medium">Channel:</span> All channels
                    </div>
                    <div>
                      <span className="font-medium">Max Attempts:</span> 1
                    </div>
                    <div>
                      <span className="font-medium">Repeat:</span> None
                    </div>
                  </div>
                </div>
                
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Rule
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 