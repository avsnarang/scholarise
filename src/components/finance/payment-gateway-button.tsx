"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { api } from '@/utils/api';
import { useBranchContext } from '@/hooks/useBranchContext';
import { useAcademicSessionContext } from '@/hooks/useAcademicSessionContext';
import { formatIndianCurrency } from '@/lib/utils';
import type { PaymentGatewayButtonProps } from '@/types/payment-gateway';
import { WhatsAppService } from '@/utils/whatsapp-service';

export function PaymentGatewayButton({
  studentId,
  selectedFees,
  feeTermId,
  feeTermName,
  totalAmount,
  onPaymentInitiated,
  onPaymentSuccess,
  onPaymentFailure,
  disabled = false,
  className = '',
}: PaymentGatewayButtonProps) {
  const { currentBranchId, currentBranch } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  // Student details
  const studentQuery = api.student.getById.useQuery(
    { id: studentId, branchId: currentBranchId || undefined },
    { enabled: !!studentId && !!currentBranchId }
  );

  // Gateway config check
  const gatewayConfigQuery = api.paymentGateway.getGatewayConfig.useQuery();
  const gatewayConfig = gatewayConfigQuery.data;

  // Generate payment link mutation
  const generatePaymentLinkMutation = api.paymentGateway.generatePaymentLink.useMutation({
    onSuccess: (data) => {
      // Send WhatsApp messages to parents
      handleWhatsAppSending(data);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate payment link",
        variant: "destructive",
      });
      setIsGeneratingLink(false);
    }
  });

  // Handle WhatsApp sending
  const handleWhatsAppSending = async (paymentLinkData: any) => {
    try {
      const whatsappData = {
        studentName: paymentLinkData.studentName,
        paymentUrl: paymentLinkData.paymentUrl,
        feeTermsCount: paymentLinkData.totalTerms,
        expiryHours: 24, // Default to 24 hours
        schoolName: currentBranch?.name || "The Scholars' Home"
      };

      const whatsappResult = await WhatsAppService.sendPaymentLinkToParents({
        fatherMobile: paymentLinkData.parentContacts.fatherMobile,
        motherMobile: paymentLinkData.parentContacts.motherMobile,
        fatherName: paymentLinkData.parentContacts.fatherName,
        motherName: paymentLinkData.parentContacts.motherName,
        paymentLinkData: whatsappData
      });

      // Open WhatsApp URLs
      if (whatsappResult.fatherUrl || whatsappResult.motherUrl) {
        WhatsAppService.openWhatsAppLinks({
          fatherUrl: whatsappResult.fatherUrl,
          motherUrl: whatsappResult.motherUrl
        });

        toast({
          title: "Payment Link Sent!",
          description: `${WhatsAppService.getWhatsAppDisplayText(whatsappResult.sentTo)} using approved school template`,
          variant: "default",
        });

        // Call the success callback
        if (onPaymentInitiated) {
          onPaymentInitiated(paymentLinkData.paymentLinkId);
        }
      } else {
        toast({
          title: "No Contact Numbers",
          description: "No valid parent contact numbers found for WhatsApp.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('WhatsApp sending error:', error);
      toast({
        title: "Error",
        description: "Failed to send WhatsApp message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleGeneratePaymentLink = async () => {
    if (!currentBranchId || !currentSessionId) {
      toast({
        title: "Error",
        description: "Branch or session information is missing.",
        variant: "destructive",
      });
      return;
    }

    if (!studentQuery.data?.parent?.fatherMobile && !studentQuery.data?.parent?.motherMobile) {
      toast({
        title: "No Contact Numbers",
        description: "No parent contact numbers found for WhatsApp messaging.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingLink(true);

    try {
      await generatePaymentLinkMutation.mutateAsync({
        studentId,
        branchId: currentBranchId,
        sessionId: currentSessionId,
        feeTermIds: [feeTermId], // For now, single fee term
        expiryHours: 24,
      });
    } catch (error) {
      // Error handling is done in the mutation onError callback
    }
  };

  // Check if any gateway is configured
  const isAnyGatewayConfigured = 
    gatewayConfig?.razorpay?.isConfigured || 
    gatewayConfig?.paytm?.isConfigured || 
    gatewayConfig?.stripe?.isConfigured || 
    false;

  if (!isAnyGatewayConfigured) {
    return (
      <Button disabled className={className}>
        <AlertCircle className="w-4 h-4 mr-2" />
        Payment Gateway Not Configured
      </Button>
    );
  }

  return (
    <Button 
      onClick={handleGeneratePaymentLink}
      disabled={disabled || selectedFees.length === 0 || isGeneratingLink}
      className={`bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white ${className}`}
    >
      {isGeneratingLink ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Sending WhatsApp...
        </>
      ) : (
        <>
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
          </svg>
          Send Payment Link - {formatIndianCurrency(totalAmount)}
        </>
      )}
    </Button>
  );
}