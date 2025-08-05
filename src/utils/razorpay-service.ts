import crypto from 'crypto';

// Razorpay Configuration Interface
export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  env: 'production' | 'test';
}

// Razorpay Order Response Interface
export interface RazorpayOrderResponse {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt?: string;
  status: string;
  attempts: number;
  notes?: Record<string, any>;
  created_at: number;
}

// Razorpay Payment Response Interface  
export interface RazorpayPaymentResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

// Razorpay Webhook Event Interface
export interface RazorpayWebhookEvent {
  entity: string;
  account_id: string;
  event: string;
  contains: string[];
  payload: {
    payment?: {
      entity: {
        id: string;
        entity: string;
        amount: number;
        currency: string;
        status: string;
        order_id: string;
        invoice_id?: string;
        international: boolean;
        method: string;
        amount_refunded: number;
        refund_status?: string;
        captured: boolean;
        description?: string;
        card_id?: string;
        bank?: string;
        wallet?: string;
        vpa?: string;
        email: string;
        contact: string;
        notes?: Record<string, any>;
        fee: number;
        tax: number;
        error_code?: string;
        error_description?: string;
        error_source?: string;
        error_step?: string;
        error_reason?: string;
        acquirer_data?: {
          bank_transaction_id?: string;
        };
        created_at: number;
      };
    };
    order?: {
      entity: {
        id: string;
        entity: string;
        amount: number;
        amount_paid: number;
        amount_due: number;
        currency: string;
        receipt?: string;
        status: string;
        attempts: number;
        notes?: Record<string, any>;
        created_at: number;
      };
    };
  };
  created_at: number;
}

class RazorpayService {
  private config: RazorpayConfig;
  private baseUrl: string;

  constructor() {
    this.config = {
      keyId: process.env.RAZORPAY_KEY_ID || '',
      keySecret: process.env.RAZORPAY_KEY_SECRET || '',
      webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
      env: (process.env.RAZORPAY_ENV as 'production' | 'test') || 'test',
    };

    // Razorpay uses the same API endpoint for both test and production
    // The key ID determines which environment is used
    this.baseUrl = 'https://api.razorpay.com/v1';

    if (!this.isConfigured()) {
      console.warn('Razorpay configuration is incomplete. Please set RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, and RAZORPAY_WEBHOOK_SECRET environment variables.');
    }
  }

  /**
   * Check if Razorpay is properly configured
   */
  isConfigured(): boolean {
    return !!(this.config.keyId && this.config.keySecret && this.config.webhookSecret);
  }

  /**
   * Generate a unique receipt ID for Razorpay orders
   */
  generateReceiptId(prefix: string = 'SCHOLAR'): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Create a Razorpay order
   * According to Razorpay docs, creating an order is the recommended approach for secure payments
   */
  async createOrder(params: {
    amount: number; // Amount in rupees (will be converted to paise)
    currency?: string;
    receipt: string;
    notes?: Record<string, any>;
    partialPayment?: boolean;
  }): Promise<RazorpayOrderResponse> {
    if (!this.isConfigured()) {
      throw new Error('Razorpay service is not configured. Please set RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, and RAZORPAY_WEBHOOK_SECRET environment variables.');
    }

    try {
      const orderData = {
        amount: Math.round(params.amount * 100), // Convert to paise
        currency: params.currency || 'INR',
        receipt: params.receipt,
        notes: params.notes || {},
        partial_payment: params.partialPayment || false,
      };

      const response = await fetch(`${this.baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${this.config.keyId}:${this.config.keySecret}`).toString('base64')}`,
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Razorpay API error: ${error.error?.description || response.statusText}`);
      }

      const order = await response.json();
      return order;
    } catch (error) {
      console.error('Error creating Razorpay order:', error);
      throw error;
    }
  }

  /**
   * Verify payment signature to ensure payment authenticity
   * This is crucial for security as mentioned in Razorpay docs
   */
  verifyPaymentSignature(params: {
    orderId: string;
    paymentId: string;
    signature: string;
  }): boolean {
    try {
      const text = `${params.orderId}|${params.paymentId}`;
      const expectedSignature = crypto
        .createHmac('sha256', this.config.keySecret)
        .update(text)
        .digest('hex');

      return expectedSignature === params.signature;
    } catch (error) {
      console.error('Error verifying payment signature:', error);
      return false;
    }
  }

  /**
   * Verify webhook signature for secure webhook handling
   * Essential for preventing webhook tampering
   */
  verifyWebhookSignature(body: string, signature: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.config.webhookSecret)
        .update(body)
        .digest('hex');

      return expectedSignature === signature;
    } catch (error) {
      console.error('Error verifying webhook signature:', error);
      return false;
    }
  }

  /**
   * Fetch payment details from Razorpay
   */
  async fetchPayment(paymentId: string): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error('Razorpay service is not configured.');
    }

    try {
      const response = await fetch(`${this.baseUrl}/payments/${paymentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.config.keyId}:${this.config.keySecret}`).toString('base64')}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Razorpay API error: ${error.error?.description || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching payment details:', error);
      throw error;
    }
  }

  /**
   * Fetch order details from Razorpay
   */
  async fetchOrder(orderId: string): Promise<RazorpayOrderResponse> {
    if (!this.isConfigured()) {
      throw new Error('Razorpay service is not configured.');
    }

    try {
      const response = await fetch(`${this.baseUrl}/orders/${orderId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.config.keyId}:${this.config.keySecret}`).toString('base64')}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Razorpay API error: ${error.error?.description || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching order details:', error);
      throw error;
    }
  }

  /**
   * Capture a payment (for manual capture mode)
   */
  async capturePayment(paymentId: string, amount: number, currency: string = 'INR'): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error('Razorpay service is not configured.');
    }

    try {
      const response = await fetch(`${this.baseUrl}/payments/${paymentId}/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${this.config.keyId}:${this.config.keySecret}`).toString('base64')}`,
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // Convert to paise
          currency,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Razorpay API error: ${error.error?.description || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error capturing payment:', error);
      throw error;
    }
  }

  /**
   * Initiate a refund
   */
  async refundPayment(paymentId: string, amount?: number, notes?: Record<string, any>): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error('Razorpay service is not configured.');
    }

    try {
      const refundData: any = {};
      if (amount !== undefined) {
        refundData.amount = Math.round(amount * 100); // Convert to paise
      }
      if (notes) {
        refundData.notes = notes;
      }

      const response = await fetch(`${this.baseUrl}/payments/${paymentId}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${this.config.keyId}:${this.config.keySecret}`).toString('base64')}`,
        },
        body: JSON.stringify(refundData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Razorpay API error: ${error.error?.description || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error refunding payment:', error);
      throw error;
    }
  }

  /**
   * Get configuration (without sensitive data)
   */
  getConfig(): Omit<RazorpayConfig, 'keySecret' | 'webhookSecret'> {
    return {
      keyId: this.config.keyId,
      env: this.config.env,
    };
  }
}

// Export singleton instance
export const razorpayService = new RazorpayService();

// Export class for testing
export { RazorpayService };
export default razorpayService;