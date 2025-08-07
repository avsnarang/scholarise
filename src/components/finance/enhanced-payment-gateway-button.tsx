"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/use-toast';
import { 
  ChevronDown,
  Loader2,
  Users,
  User,
  UserCheck
} from 'lucide-react';
import { api } from '@/utils/api';
import { useBranchContext } from '@/hooks/useBranchContext';
import { useAcademicSessionContext } from '@/hooks/useAcademicSessionContext';

interface EnhancedPaymentGatewayButtonProps {
  studentId: string;
  selectedFees: Array<{
    feeHeadId: string;
    feeHeadName: string;
    amount: number;
  }>;
  feeTermId: string;
  feeTermName: string;
  totalAmount: number;
  onPaymentInitiated?: (paymentRequestId: string) => void;
  disabled?: boolean;
  className?: string;
}

type RecipientOption = 'both' | 'father' | 'mother';

interface RecipientChoice {
  value: RecipientOption;
  label: string;
  icon: React.ReactNode;
  description: string;
}

export function EnhancedPaymentGatewayButton({
  studentId,
  selectedFees,
  feeTermId,
  feeTermName,
  totalAmount,
  onPaymentInitiated,
  disabled = false,
  className = '',
}: EnhancedPaymentGatewayButtonProps) {
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<RecipientOption>('both');

  // Student details query (with section and class data for template variables)
  const studentQuery = api.student.getById.useQuery(
    { id: studentId, branchId: currentBranchId || undefined },
    { enabled: !!studentId && !!currentBranchId }
  );

  // Gateway config check
  const gatewayConfigQuery = api.paymentGateway.getGatewayConfig.useQuery();
  const gatewayConfig = gatewayConfigQuery.data;

  // Find the manual_fee_payment_link template
  const templatesQuery = api.communication.getTemplates.useQuery({}, { enabled: !!currentBranchId });
  const paymentLinkTemplate = templatesQuery.data?.find(
    template => template.metaTemplateName === 'manual_fee_payment_link' && template.metaTemplateStatus === 'APPROVED'
  );

  // Communication API for sending template messages
  const sendTemplateMutation = api.communication.sendMessage.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Payment Link Sent!",
        description: `Payment link sent successfully via WhatsApp.`,
      });
    },
    onError: (error) => {
      console.error('WhatsApp template sending error:', error);
      toast({
        title: "Failed to Send",
        description: "Could not send WhatsApp messages. Payment link is still valid.",
        variant: "destructive",
      });
    }
  });

  // Generate payment link mutation
  const generatePaymentLinkMutation = api.paymentGateway.generatePaymentLink.useMutation({
    onSuccess: (data) => {
      // Send WhatsApp messages to selected recipients
      handleWhatsAppSending(data);
      onPaymentInitiated?.(data.paymentLinkId);
    },
    onError: (error) => {
      toast({
        title: "Payment Link Generation Failed",
        description: error.message || "Failed to generate payment link",
        variant: "destructive",
      });
      setIsGeneratingLink(false);
    },
  });

  // Handle automatic WhatsApp template message sending
  const handleWhatsAppSending = async (paymentLinkData: any) => {
    try {
      if (!paymentLinkTemplate) {
        console.error('Manual fee payment link template not found or not approved');
        toast({
          title: "Template Not Available",
          description: "Manual fee payment link template is not configured. Please contact administrator.",
          variant: "destructive",
        });
        setIsGeneratingLink(false);
        return;
      }

      // Prepare recipients based on selection
      const recipients: Array<{
        id: string;
        name: string;
        phone: string;
        type: string;
        additional?: any;
      }> = [];

      const parentContacts = paymentLinkData.parentContacts;
      
      // Prepare student name first
      const studentName = paymentLinkData.studentName || `${studentQuery.data?.firstName} ${studentQuery.data?.lastName}` || 'Student';

      // Add recipients based on selection
      if ((selectedRecipient === 'both' || selectedRecipient === 'father') && parentContacts.fatherMobile) {
        const fatherName = parentContacts.fatherName || 'Father';
        const fatherNameWithTitle = fatherName.toLowerCase().includes('mr.') ? fatherName : `Mr. ${fatherName}`;
        
        recipients.push({
          id: `father_${studentId}`,
          name: fatherNameWithTitle,
          phone: parentContacts.fatherMobile,
          type: 'FATHER',
          additional: { 
            relationship: 'father',
            studentId,
            studentName: studentName
          }
        });
      }

      if ((selectedRecipient === 'both' || selectedRecipient === 'mother') && parentContacts.motherMobile) {
        const motherName = parentContacts.motherName || 'Mother';
        const motherNameWithTitle = motherName.toLowerCase().includes('mrs.') ? motherName : `Mrs. ${motherName}`;
        
        recipients.push({
          id: `mother_${studentId}`,
          name: motherNameWithTitle,
          phone: parentContacts.motherMobile,
          type: 'MOTHER',
          additional: { 
            relationship: 'mother',
            studentId,
            studentName: studentName
          }
        });
      }

      if (recipients.length === 0) {
        toast({
          title: "No Contact Numbers",
          description: `No ${selectedRecipient === 'father' ? "father's" : selectedRecipient === 'mother' ? "mother's" : "parent"} contact number found.`,
          variant: "destructive",
        });
        setIsGeneratingLink(false);
        return;
      }

      console.log('Sending payment link to:', recipients.length, 'recipients based on selection:', selectedRecipient, 'Recipients:', recipients.map(r => r.name));

      // Prepare template variables to match manual_fee_payment_link format
      const paymentUrl = paymentLinkData.paymentUrl || '';
      const className = studentQuery.data?.section?.class?.name || 'Class';
      const sectionName = studentQuery.data?.section?.name || 'Section';

      // Send individual messages to each recipient with their specific name
      const successfulSends: string[] = [];
      const failedSends: string[] = [];

      for (const recipient of recipients) {
        try {
          await sendTemplateMutation.mutateAsync({
            title: `Payment Link - ${studentName}`,
            recipientType: 'INDIVIDUAL_STUDENTS',
            recipients: [recipient], // Send to one recipient at a time
            templateId: paymentLinkTemplate.id,
            templateParameters: {
              // The manual_fee_payment_link template uses 5 variables:
              variable_1: recipient.name,       // Actual parent name (Mr. John Doe, Mrs. Jane Smith)
              variable_2: studentName,          // Student Name
              variable_3: className,            // Class Name
              variable_4: sectionName,          // Section Name
              variable_5: paymentUrl            // Payment Link
            },
            templateDataMappings: {
              variable_1: {
                dataField: "recipient_name",
                fallbackValue: recipient.name
              },
              variable_2: {
                dataField: "student_name", 
                fallbackValue: studentName
              },
              variable_3: {
                dataField: "class_name", 
                fallbackValue: className
              },
              variable_4: {
                dataField: "section_name", 
                fallbackValue: sectionName
              },
              variable_5: {
                dataField: "payment_url", 
                fallbackValue: paymentUrl
              }
            },
            branchId: currentBranchId!
          });
          successfulSends.push(recipient.name);
        } catch (err) {
          console.error(`Failed to send WhatsApp message to ${recipient.name}:`, err);
          failedSends.push(recipient.name);
        }
      }

      // Show appropriate success/error messages
      if (successfulSends.length > 0) {
        const successText = successfulSends.length === 1 
          ? successfulSends[0] 
          : successfulSends.join(' and ');
        
        toast({
          title: "Payment Link Sent!",
          description: `Payment link sent to ${successText} via WhatsApp for ${studentName}.`,
        });
      }

      if (failedSends.length > 0) {
        const failText = failedSends.length === 1 
          ? failedSends[0] 
          : failedSends.join(' and ');
        
        toast({
          title: "Partial Send Failure",
          description: `Failed to send payment link to ${failText}. Please check contact details.`,
          variant: "destructive",
        });
      }

      // If all messages failed, throw error to trigger outer catch block
      if (successfulSends.length === 0) {
        throw new Error(`Failed to send payment link to all recipients: ${failedSends.join(', ')}`);
      }

    } catch (error) {
      console.error('WhatsApp template sending error:', error);
      toast({
        title: "WhatsApp Send Failed",
        description: "Could not send WhatsApp messages. Payment link is still valid.",
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

    const parent = studentQuery.data?.parent;
    if (!parent?.fatherMobile && !parent?.motherMobile) {
      toast({
        title: "No Contact Numbers",
        description: "No parent contact numbers found for WhatsApp messaging.",
        variant: "destructive",
      });
      return;
    }

    // Validate recipient selection
    if (selectedRecipient === 'father' && !parent.fatherMobile) {
      toast({
        title: "Father's Number Missing",
        description: "Father's mobile number is not available. Please select a different option.",
        variant: "destructive",
      });
      return;
    }

    if (selectedRecipient === 'mother' && !parent.motherMobile) {
      toast({
        title: "Mother's Number Missing", 
        description: "Mother's mobile number is not available. Please select a different option.",
        variant: "destructive",
      });
      return;
    }

    if (!paymentLinkTemplate) {
      toast({
        title: "Template Not Available",
        description: "Manual fee payment link template is not configured or approved. Please contact administrator.",
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
        <Loader2 className="w-4 h-4 mr-2" />
        Payment Gateway Not Configured
      </Button>
    );
  }

  // Get available recipient options based on student's parent data
  const parent = studentQuery.data?.parent;
  const recipientOptions: RecipientChoice[] = [];

  if (parent?.fatherMobile && parent?.motherMobile) {
    recipientOptions.push({
      value: 'both',
      label: 'Both Parents',
      icon: <Users className="w-4 h-4" />,
      description: 'Send to both father and mother'
    });
  }

  if (parent?.fatherMobile) {
    recipientOptions.push({
      value: 'father',
      label: 'Father Only',
      icon: <User className="w-4 h-4" />,
      description: parent.fatherName || 'Father'
    });
  }

  if (parent?.motherMobile) {
    recipientOptions.push({
      value: 'mother',
      label: 'Mother Only', 
      icon: <UserCheck className="w-4 h-4" />,
      description: parent.motherName || 'Mother'
    });
  }

  const currentSelection = recipientOptions.find(opt => opt.value === selectedRecipient) || recipientOptions[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          size="sm"
          disabled={disabled || isGeneratingLink || recipientOptions.length === 0}
          className={`bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white ${className}`}
        >
          {isGeneratingLink ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
              </svg>
              {currentSelection?.label}
              <ChevronDown className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {recipientOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => {
              setSelectedRecipient(option.value);
              // Automatically trigger payment link generation when selection changes
              setTimeout(() => handleGeneratePaymentLink(), 100);
            }}
            className={selectedRecipient === option.value ? "bg-green-50 dark:bg-green-950" : ""}
          >
            <div className="flex items-center gap-2 w-full">
              {option.icon}
              <div className="flex-1">
                <div className="font-medium text-sm">{option.label}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{option.description}</div>
              </div>
              {selectedRecipient === option.value && <UserCheck className="w-4 h-4 text-green-600" />}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}