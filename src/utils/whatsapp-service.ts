import { api } from '@/utils/api';

interface WhatsAppMessageData {
  phoneNumber: string;
  message: string;
  branchId: string;
}

interface PaymentLinkWhatsAppData {
  studentName: string;
  paymentUrl: string;
  feeTermsCount: number;
  expiryHours: number;
  schoolName: string;
}

export class WhatsAppService {
  
  /**
   * Format phone number for WhatsApp
   * Removes spaces, hyphens, and adds country code if needed
   */
  static formatPhoneNumber(phone: string): string {
    if (!phone) return '';
    
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Add country code if not present
    if (cleaned.length === 10) {
      cleaned = '91' + cleaned; // Add India country code
    }
    
    return cleaned;
  }

  /**
   * Add appropriate title to parent name if not already present
   */
  static addTitleToName(name: string, gender: 'father' | 'mother'): string {
    if (!name || name.trim() === '') {
      return gender === 'father' ? 'Mr. Father' : 'Mrs. Mother';
    }

    const trimmedName = name.trim();
    
    // Common titles to check for
    const titles = [
      'Mr.', 'Mrs.', 'Ms.', 'Miss', 'Dr.', 'Prof.', 'Professor', 
      'Sir', 'Madam', 'Shri', 'Smt.', 'Kumari', 'Captain', 'Major', 
      'Colonel', 'General', 'Admiral', 'Wing Commander', 'Squadron Leader'
    ];
    
    // Check if name already has a title
    const hasTitle = titles.some(title => 
      trimmedName.toLowerCase().startsWith(title.toLowerCase())
    );
    
    if (hasTitle) {
      return trimmedName;
    }
    
    // Add appropriate title based on gender
    if (gender === 'father') {
      return `Mr. ${trimmedName}`;
    } else {
      // For mothers, default to Mrs. but could be Ms. - using Mrs. as it's more common for parents
      return `Mrs. ${trimmedName}`;
    }
  }

  /**
   * Generate WhatsApp payment link message using approved template with numbered variables
   */
  static generatePaymentLinkMessage(parentName: string, paymentUrl: string): string {
    // Using approved WhatsApp template with numbered variables {{1}} and {{2}}
    const message = `Dear {{1}},

As you asked, here is the payment link to complete your ward's fee payment:

🔗 {{2}}
(Please open in your browser if the link doesn't click directly.)

Kindly select the Fee Term for which you'd like to make the payment. Once completed, you will receive a confirmation on your registered contact details.

If you face any issues or have already made the payment, feel free to get in touch with the Accounts Office.

📞 Accounts Helpdesk: +91 86279 00056
📧 accounts@tsh.edu.in
🌐 www.tsh.edu.in

Warm regards,
Accounts Department`;

    // Replace numbered variables with actual values
    return message
      .replace('{{1}}', parentName)
      .replace('{{2}}', paymentUrl);
  }

  /**
   * Generate WhatsApp Web URL for sending message
   */
  static generateWhatsAppURL(phoneNumber: string, message: string): string {
    const formattedPhone = this.formatPhoneNumber(phoneNumber);
    const encodedMessage = encodeURIComponent(message);
    
    return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
  }

  /**
   * Send payment link to multiple WhatsApp numbers
   */
  static async sendPaymentLinkToParents(params: {
    fatherMobile?: string;
    motherMobile?: string;
    fatherName?: string;
    motherName?: string;
    paymentLinkData: PaymentLinkWhatsAppData;
  }): Promise<{
    fatherUrl?: string;
    motherUrl?: string;
    sentTo: string[];
  }> {
    const { fatherMobile, motherMobile, fatherName, motherName, paymentLinkData } = params;
    const results: { fatherUrl?: string; motherUrl?: string; sentTo: string[] } = { sentTo: [] };

    // Send to father if mobile number exists
    if (fatherMobile) {
      const formattedFatherPhone = this.formatPhoneNumber(fatherMobile);
      if (formattedFatherPhone) {
        // Add title to father's name and generate message using {{1}} and {{2}} variables
        const fatherNameWithTitle = this.addTitleToName(fatherName || 'Father', 'father');
        const fatherMessage = this.generatePaymentLinkMessage(
          fatherNameWithTitle,
          paymentLinkData.paymentUrl
        );
        results.fatherUrl = this.generateWhatsAppURL(formattedFatherPhone, fatherMessage);
        results.sentTo.push(`Father (${fatherMobile})`);
      }
    }

    // Send to mother if mobile number exists
    if (motherMobile) {
      const formattedMotherPhone = this.formatPhoneNumber(motherMobile);
      if (formattedMotherPhone) {
        // Add title to mother's name and generate message using {{1}} and {{2}} variables
        const motherNameWithTitle = this.addTitleToName(motherName || 'Mother', 'mother');
        const motherMessage = this.generatePaymentLinkMessage(
          motherNameWithTitle,
          paymentLinkData.paymentUrl
        );
        results.motherUrl = this.generateWhatsAppURL(formattedMotherPhone, motherMessage);
        results.sentTo.push(`Mother (${motherMobile})`);
      }
    }

    return results;
  }

  /**
   * Open WhatsApp URLs in new tabs
   */
  static openWhatsAppLinks(urls: { fatherUrl?: string; motherUrl?: string }) {
    const { fatherUrl, motherUrl } = urls;
    
    if (fatherUrl) {
      window.open(fatherUrl, '_blank');
    }
    
    // Delay opening second link to avoid popup blocking
    if (motherUrl) {
      setTimeout(() => {
        window.open(motherUrl, '_blank');
      }, 1000);
    }
  }

  /**
   * Check if WhatsApp is available on the device
   */
  static isWhatsAppAvailable(): boolean {
    // Check if it's a mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // WhatsApp Web works on all devices, WhatsApp app on mobile
    return true;
  }

  /**
   * Get user-friendly display text for WhatsApp sending
   */
  static getWhatsAppDisplayText(sentTo: string[]): string {
    if (sentTo.length === 0) {
      return 'No valid mobile numbers found';
    }
    
    if (sentTo.length === 1) {
      return `Payment link sent to ${sentTo[0]}`;
    }
    
    return `Payment link sent to ${sentTo.join(' and ')}`;
  }
}

export default WhatsAppService;