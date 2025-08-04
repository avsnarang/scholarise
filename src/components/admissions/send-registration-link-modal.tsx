"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/utils/api";
import { Send, Loader2, MessageSquare } from "lucide-react";

// Form validation schema
const sendLinkSchema = z.object({
  parentName: z.string().min(1, "Parent name is required").max(100, "Name is too long"),
  phoneNumber: z.string()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number is too long")
    .regex(/^[+]?[\d\s\-()]+$/, "Invalid phone number format")
});

type SendLinkFormData = z.infer<typeof sendLinkSchema>;

interface SendRegistrationLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  registrationUrl: string;
  branchName: string;
  sessionName: string;
  branchId: string;
  sessionId: string;
}

export function SendRegistrationLinkModal({ 
  isOpen, 
  onClose, 
  registrationUrl, 
  branchName, 
  sessionName,
  branchId,
  sessionId 
}: SendRegistrationLinkModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Get templates to find the request_registration_link template
  const { data: templates } = api.communication.getTemplates.useQuery({
    isActive: true
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm<SendLinkFormData>({
    resolver: zodResolver(sendLinkSchema)
  });

  // Get phone number value for formatting display
  const phoneValue = watch("phoneNumber");

  // Format phone number for display (add +91 if needed)
  const formatPhoneDisplay = (phone: string): string => {
    if (!phone) return "";
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 10 && !phone.startsWith("+")) {
      return `+91 ${cleaned}`;
    }
    return phone;
  };

  const createShortUrl = api.shortUrl.createShortUrl.useMutation();
  const sendRegistrationLink = api.communication.sendMessage.useMutation({
    onSuccess: (result) => {
      toast({
        title: "Registration Link Sent! 📱",
        description: `WhatsApp message sent successfully to ${formatPhoneDisplay(phoneValue)}`,
        variant: "default",
      });
      setIsLoading(false);
      reset();
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Failed to Send Message ❌",
        description: error.message || "Please try again or contact support",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  });

  const onSubmit = async (data: SendLinkFormData) => {
    try {
      setIsLoading(true);

      // Create a persistent short URL via the API
      const shortUrlResult = await createShortUrl.mutateAsync({
        originalUrl: registrationUrl,
      });

      const shortUrl = shortUrlResult.shortUrl;
      
      // Format phone number for API
      let formattedPhone = data.phoneNumber.replace(/\D/g, "");
      if (formattedPhone.length === 10) {
        formattedPhone = `91${formattedPhone}`;
      }

      // Prepare recipient data
      const recipients = [{
        id: `registration-${Date.now()}`,
        name: data.parentName,
        phone: formattedPhone,
        type: "parent",
        additional: {
          contactPersonName: data.parentName,
          registrationUrl: shortUrl,
          branchName,
          sessionName
        }
      }];

      // Find the request_registration_link template
      const registrationTemplate = templates?.find(
        template => template.metaTemplateName === 'request_registration_link' && template.metaTemplateStatus === 'APPROVED'
      );

      if (!registrationTemplate) {
        const availableTemplates = templates?.map(t => ({
          name: t.name,
          metaTemplateName: t.metaTemplateName,
          status: t.metaTemplateStatus
        })) || [];
        
        throw new Error(
          `Registration link template not found. Please ensure the 'request_registration_link' template is synced and approved.\n\n` +
          `Available templates: ${JSON.stringify(availableTemplates, null, 2)}`
        );
      }

      // Get the template variables (should be something like ['variable_1', 'variable_2'])
      const templateVariables = registrationTemplate.templateVariables || [];
      console.log('🔍 Template variables:', templateVariables);

      // Build template parameters using the actual variable names
      const templateParameters: Record<string, string> = {};
      
      // Map the values to the correct parameter names
      const [key1, key2] = templateVariables;
      if (key1 && key2) {
        templateParameters[key1] = data.parentName;
        templateParameters[key2] = shortUrl;
      } else {
        // Fallback to numbered parameters if template variables are not properly set
        templateParameters["1"] = data.parentName;
        templateParameters["2"] = shortUrl;
      }

      console.log('🔍 Sending template parameters:', templateParameters);

      // Send using the request_registration_link template
      await sendRegistrationLink.mutateAsync({
        title: `Registration Link for ${data.parentName}`,
        templateId: registrationTemplate.id,
        recipientType: "INDIVIDUAL_STUDENTS", // Using this as closest match
        recipients,
        templateParameters,
        branchId,
        dryRun: false
      });

    } catch (error) {
      console.error("Error sending registration link:", error);
      
      let errorMessage = "Failed to send registration link. Please try again.";
      
      if (error instanceof Error) {
        if (error.message.includes("Template parameter validation failed")) {
          errorMessage = `Template configuration issue: ${error.message}\n\nPlease check the Communication → Templates section or contact support.`;
        } else if (error.message.includes("template not found")) {
          errorMessage = error.message;
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Error ❌",
        description: errorMessage,
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-600" />
            Send Registration Link
          </DialogTitle>
          <DialogDescription>
            Send the registration link for <strong>{branchName}</strong> ({sessionName}) via WhatsApp
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="parentName">Parent Name *</Label>
            <Input
              id="parentName"
              placeholder="Enter parent's full name"
              {...register("parentName")}
              className={errors.parentName ? "border-red-500" : ""}
            />
            {errors.parentName && (
              <p className="text-sm text-red-600">{errors.parentName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number *</Label>
            <Input
              id="phoneNumber"
              placeholder="Enter WhatsApp number (e.g., +91 9876543210)"
              {...register("phoneNumber")}
              className={errors.phoneNumber ? "border-red-500" : ""}
            />
            {errors.phoneNumber && (
              <p className="text-sm text-red-600">{errors.phoneNumber.message}</p>
            )}
            {phoneValue && !errors.phoneNumber && (
              <p className="text-sm text-green-600">
                Will send to: {formatPhoneDisplay(phoneValue)}
              </p>
            )}
          </div>

          {/* Preview of the message */}
          <div className="bg-gray-50 p-3 rounded-lg border">
            <h4 className="text-sm font-medium mb-2">Message Preview:</h4>
            <div className="text-sm text-gray-700 whitespace-pre-line">
              {`Dear ${watch("parentName") || "[Parent Name]"},

Here you go — as requested, please find the link to the Registration Form for admission at The Scholars' Home:

🔗 [Registration Link]
(If the link doesn't open, please copy and paste it into your browser.)

Once you submit the form, our Admissions Team will get in touch with you shortly.

If you need any help during the process, feel free to reach out.

📞 Admissions Helpdesk: +91-8628800056
📧 admissions@tsh.edu.in
🌐 www.tsh.edu.in

Warm regards`}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send via WhatsApp
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}