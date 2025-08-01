import crypto from 'crypto';

// Easebuzz Configuration
export interface EasebuzzConfig {
  merchantKey: string;
  merchantSalt: string;
  env: 'production' | 'sandbox';
  baseUrl: string;
}

export interface PaymentRequest {
  txnid: string;
  amount: string;
  firstname: string;
  email: string;
  phone: string;
  productinfo: string;
  surl: string; // success URL
  furl: string; // failure URL
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
}

export interface PaymentResponse {
  key: string;
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  udf1: string;
  udf2: string;
  udf3: string;
  udf4: string;
  udf5: string;
  mihpayid: string;
  status: string;
  resphash: string;
  msg: string;
  bank_ref_num: string;
  bankcode: string;
  error: string;
  error_Message: string;
  name_on_card: string;
  cardnum: string;
  issuing_bank: string;
  card_type: string;
  phone: string;
  unmappedstatus: string;
  hash: string;
  field1: string;
  field2: string;
  field3: string;
  field4: string;
  field5: string;
  field6: string;
  field7: string;
  field8: string;
  field9: string;
  PG_TYPE: string;
  addedon: string;
  payment_source: string;
  upi_va: string;
  mode: string;
  submerchantid: string;
}

export interface PaymentLinkRequest {
  key: string;
  amount: string;
  txnid: string;
  productinfo: string;
  firstname: string;
  email: string;
  phone: string;
  surl: string;
  furl: string;
  hash: string;
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
  expiry_date?: string; // Format: DD-MM-YYYY HH:MM:SS
  send_email?: 'true' | 'false';
  send_sms?: 'true' | 'false';
}

export interface PaymentLinkResponse {
  status: 0 | 1;
  data: string; // Payment URL
  msg: string;
}

export interface TransactionDetailsRequest {
  key: string;
  txnid: string;
  amount: string;
  email: string;
  hash: string;
}

export interface TransactionDetailsResponse {
  status: 0 | 1;
  msg: string;
  transaction_details: {
    txnid: string;
    mihpayid: string;
    amount: string;
    status: string;
    mode: string;
    bank_ref_num: string;
    bankcode: string;
    error: string;
    error_Message: string;
    addedon: string;
    payment_source: string;
    upi_va: string;
    easepayid: string;
    unmappedstatus: string;
    name_on_card: string;
    cardnum: string;
    issuing_bank: string;
    card_type: string;
    field1: string;
    field2: string;
    field3: string;
    field4: string;
    field5: string;
    field6: string;
    field7: string;
    field8: string;
    field9: string;
    PG_TYPE: string;
    submerchantid: string;
  };
}

class EasebuzzService {
  private config: EasebuzzConfig;

  constructor() {
    // Initialize config from environment variables
    this.config = {
      merchantKey: process.env.EASEBUZZ_MERCHANT_KEY || '',
      merchantSalt: process.env.EASEBUZZ_MERCHANT_SALT || '',
      env: (process.env.EASEBUZZ_ENV as 'production' | 'sandbox') || 'sandbox',
      baseUrl: process.env.EASEBUZZ_ENV === 'production' 
        ? 'https://pay.easebuzz.in/payment/initiateLink'
        : 'https://testpay.easebuzz.in/payment/initiateLink'
    };

    if (!this.config.merchantKey || !this.config.merchantSalt) {
      console.warn('Easebuzz configuration is incomplete. Please set EASEBUZZ_MERCHANT_KEY and EASEBUZZ_MERCHANT_SALT environment variables.');
    }
  }

  /**
   * Generate hash for payment request
   */
  generatePaymentHash(params: PaymentRequest): string {
    const { merchantSalt } = this.config;
    const hashString = `${this.config.merchantKey}|${params.txnid}|${params.amount}|${params.productinfo}|${params.firstname}|${params.email}|${params.udf1 || ''}|${params.udf2 || ''}|${params.udf3 || ''}|${params.udf4 || ''}|${params.udf5 || ''}||||||${merchantSalt}`;
    
    return crypto.createHash('sha512').update(hashString).digest('hex');
  }

  /**
   * Generate hash for payment link creation
   */
  generatePaymentLinkHash(params: Omit<PaymentLinkRequest, 'hash'>): string {
    const { merchantSalt } = this.config;
    const hashString = `${params.key}|${params.txnid}|${params.amount}|${params.productinfo}|${params.firstname}|${params.email}|${params.udf1 || ''}|${params.udf2 || ''}|${params.udf3 || ''}|${params.udf4 || ''}|${params.udf5 || ''}||||||${merchantSalt}`;
    
    return crypto.createHash('sha512').update(hashString).digest('hex');
  }

  /**
   * Generate hash for transaction details verification
   */
  generateTransactionDetailsHash(params: Omit<TransactionDetailsRequest, 'hash'>): string {
    const { merchantSalt } = this.config;
    const hashString = `${params.key}|${params.txnid}|${params.amount}|${params.email}|${merchantSalt}`;
    
    return crypto.createHash('sha512').update(hashString).digest('hex');
  }

  /**
   * Verify response hash
   */
  verifyResponseHash(response: PaymentResponse): boolean {
    const { merchantSalt } = this.config;
    const hashString = `${merchantSalt}|${response.status}|||||||||||${response.udf5 || ''}|${response.udf4 || ''}|${response.udf3 || ''}|${response.udf2 || ''}|${response.udf1 || ''}|${response.email}|${response.firstname}|${response.productinfo}|${response.amount}|${response.txnid}|${this.config.merchantKey}`;
    
    const expectedHash = crypto.createHash('sha512').update(hashString).digest('hex');
    return expectedHash === response.hash;
  }

  /**
   * Create payment link
   */
  async createPaymentLink(paymentData: {
    txnid: string;
    amount: number;
    firstname: string;
    email: string;
    phone: string;
    productinfo: string;
    surl: string;
    furl: string;
    udf1?: string;
    udf2?: string;
    udf3?: string;
    udf4?: string;
    udf5?: string;
    expiryDate?: Date;
  }): Promise<PaymentLinkResponse> {
    try {
      // Check configuration before proceeding
      if (!this.isConfigured()) {
        throw new Error('Easebuzz service is not configured. Please set EASEBUZZ_MERCHANT_KEY and EASEBUZZ_MERCHANT_SALT environment variables.');
      }
      const requestData: Omit<PaymentLinkRequest, 'hash'> = {
        key: this.config.merchantKey,
        amount: paymentData.amount.toString(),
        txnid: paymentData.txnid,
        productinfo: paymentData.productinfo,
        firstname: paymentData.firstname,
        email: paymentData.email,
        phone: paymentData.phone,
        surl: paymentData.surl,
        furl: paymentData.furl,
        udf1: paymentData.udf1,
        udf2: paymentData.udf2,
        udf3: paymentData.udf3,
        udf4: paymentData.udf4,
        udf5: paymentData.udf5,
        send_email: 'false',
        send_sms: 'false',
      };

      // Add expiry date if provided
      if (paymentData.expiryDate) {
        const day = String(paymentData.expiryDate.getDate()).padStart(2, '0');
        const month = String(paymentData.expiryDate.getMonth() + 1).padStart(2, '0');
        const year = paymentData.expiryDate.getFullYear();
        const hours = String(paymentData.expiryDate.getHours()).padStart(2, '0');
        const minutes = String(paymentData.expiryDate.getMinutes()).padStart(2, '0');
        const seconds = String(paymentData.expiryDate.getSeconds()).padStart(2, '0');
        
        requestData.expiry_date = `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
      }

      const hash = this.generatePaymentLinkHash(requestData);
      const finalRequest: PaymentLinkRequest = { ...requestData, hash };

      const response = await fetch(this.config.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(finalRequest as any).toString(),
      });

      if (!response.ok) {
        throw new Error(`Easebuzz API request failed: ${response.status} ${response.statusText}`);
      }

      const result: PaymentLinkResponse = await response.json();
      return result;
    } catch (error) {
      console.error('Error creating payment link:', error);
      throw new Error(`Failed to create payment link: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get transaction details
   */
  async getTransactionDetails(txnid: string, amount: string, email: string): Promise<TransactionDetailsResponse> {
    try {
      const requestData: Omit<TransactionDetailsRequest, 'hash'> = {
        key: this.config.merchantKey,
        txnid,
        amount,
        email,
      };

      const hash = this.generateTransactionDetailsHash(requestData);
      const finalRequest: TransactionDetailsRequest = { ...requestData, hash };

      const apiUrl = this.config.env === 'production'
        ? 'https://pay.easebuzz.in/transaction/v1/retrieve'
        : 'https://testpay.easebuzz.in/transaction/v1/retrieve';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(finalRequest as any).toString(),
      });

      if (!response.ok) {
        throw new Error(`Easebuzz API request failed: ${response.status} ${response.statusText}`);
      }

      const result: TransactionDetailsResponse = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching transaction details:', error);
      throw new Error(`Failed to fetch transaction details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate a unique transaction ID
   */
  generateTransactionId(prefix = 'SCHOLAR'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Format amount for Easebuzz (should be in paisa for some APIs, rupees for others)
   */
  formatAmount(amount: number): string {
    return amount.toFixed(2);
  }

  /**
   * Check if service is properly configured
   */
  isConfigured(): boolean {
    return Boolean(this.config.merchantKey && this.config.merchantSalt);
  }

  /**
   * Get configuration for debugging (without sensitive data)
   */
  getConfig(): Omit<EasebuzzConfig, 'merchantSalt'> {
    const { merchantSalt, ...safeConfig } = this.config;
    return safeConfig;
  }
}

// Export singleton instance
export const easebuzzService = new EasebuzzService();

// Export types and classes
export { EasebuzzService };
export default easebuzzService; 