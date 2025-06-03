"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ArrowLeft, Save } from "lucide-react";

// Sample data
const sampleStudents = [
  { id: 's1', name: 'Aarav Sharma', admissionNo: 'SCH001', class: '10 A' },
  { id: 's2', name: 'Priya Singh', admissionNo: 'SCH002', class: '12 B' },
  { id: 's3', name: 'Rohan Mehta', admissionNo: 'SCH003', class: '9 C' },
];

const sampleFeeTerms = [
  { id: 'ft1', name: 'Term 1 (2024-2025)' },
  { id: 'ft2', name: 'Annual Charges (2024-2025)' },
];

export default function CreateFeeCollectionPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    studentId: '',
    feeTermId: '',
    amount: '',
    paymentMode: 'Cash',
    transactionReference: '',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.studentId || !formData.feeTermId || !formData.amount) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('Creating fee collection:', formData);
      
      // Redirect back to fee collection list
      router.push('/finance/fee-collection');
    } catch (error) {
      console.error('Error creating fee collection:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/finance/fee-collection');
  };

  return (
    <PageWrapper 
      title="Record Fee Payment" 
      subtitle="Record a new fee payment for a student"
    >
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={handleCancel}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Fee Collection
        </Button>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-700 dark:text-white">
            Fee Payment Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="student">Student</Label>
                <Select 
                  value={formData.studentId} 
                  onValueChange={(value) => handleInputChange('studentId', value)}
                >
                  <SelectTrigger id="student">
                    <SelectValue placeholder="Select Student" />
                  </SelectTrigger>
                  <SelectContent>
                    {sampleStudents.map(student => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.name} ({student.admissionNo}) - {student.class}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="feeTerm">Fee Term</Label>
                <Select 
                  value={formData.feeTermId} 
                  onValueChange={(value) => handleInputChange('feeTermId', value)}
                >
                  <SelectTrigger id="feeTerm">
                    <SelectValue placeholder="Select Fee Term" />
                  </SelectTrigger>
                  <SelectContent>
                    {sampleFeeTerms.map(term => (
                      <SelectItem key={term.id} value={term.id}>
                        {term.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="amount">Amount (₹)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <Label htmlFor="paymentMode">Payment Mode</Label>
                <Select 
                  value={formData.paymentMode} 
                  onValueChange={(value) => handleInputChange('paymentMode', value)}
                >
                  <SelectTrigger id="paymentMode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                    <SelectItem value="Online">Online Transfer</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                    <SelectItem value="DD">Demand Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="paymentDate">Payment Date</Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={formData.paymentDate}
                  onChange={(e) => handleInputChange('paymentDate', e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="transactionReference">Transaction Reference</Label>
                <Input
                  id="transactionReference"
                  placeholder="Cheque No., Transaction ID, etc."
                  value={formData.transactionReference}
                  onChange={(e) => handleInputChange('transactionReference', e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes about this payment"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-4 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !formData.studentId || !formData.feeTermId || !formData.amount}
                className="bg-[#00501B] hover:bg-[#00501B]/90 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Recording Payment...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Record Payment
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </PageWrapper>
  );
} 